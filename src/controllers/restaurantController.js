import Restaurant from "../models/Restaurant.js";

// Allergen-friendly dining is food-focused, so we only surface food-related
// places from Google. Google gives each place a list of types; a place counts
// as a food place if any of its types is in this set, or ends in "_restaurant"
// (covering cuisine-specific types like italian_restaurant, sushi_restaurant).
const FOOD_TYPES = new Set([
  "restaurant",
  "cafe",
  "bakery",
  "bar",
  "meal_takeaway",
  "meal_delivery",
  "fast_food_restaurant",
  "sandwich_shop",
  "coffee_shop",
  "breakfast_restaurant",
  "brunch_restaurant",
  "pizza_restaurant",
  "ice_cream_shop",
  "food",
]);

const isFoodPlace = (types) => {
  if (!types) return false;
  return types.some((type) => FOOD_TYPES.has(type) || type.endsWith("_restaurant"));
};

// GET /api/restaurants
// Accepts either viewport bounds (north/south/east/west) to return
// everything visible on the map, or a lat/lng center with a radius.
export const getRestaurants = async (req, res) => {
  const { lat, lng, radius = 5000, north, south, east, west } = req.query;

  let locationMatch;

  if (north && south && east && west) {
    locationMatch = {
      "location.lat": { $gte: parseFloat(south), $lte: parseFloat(north) },
      "location.lng": { $gte: parseFloat(west), $lte: parseFloat(east) },
    };
  } else if (lat && lng) {
    // Convert radius from meters to degrees (roughly 111,000 meters per degree)
    const radiusInDegrees = parseFloat(radius) / 111000;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    locationMatch = {
      "location.lat": { $gte: latNum - radiusInDegrees, $lte: latNum + radiusInDegrees },
      "location.lng": { $gte: lngNum - radiusInDegrees, $lte: lngNum + radiusInDegrees },
    };
  } else {
    return res.status(400).json({ message: "Either bounds (north, south, east, west) or lat and lng are required" });
  }

  try {
    // Join each restaurant with its dishes and collect the distinct set of
    // allergens its dishes are free from, so the map's allergen filter has
    // something to match against
    const restaurants = await Restaurant.aggregate([
      { $match: locationMatch },
      {
        $lookup: {
          from: "dishes",
          localField: "_id",
          foreignField: "restaurantId",
          as: "dishes",
        },
      },
      {
        $addFields: {
          allergens: {
            $reduce: {
              input: "$dishes.freeFrom",
              initialValue: [],
              in: { $setUnion: ["$$value", "$$this"] },
            },
          },
        },
      },
      { $project: { dishes: 0 } },
    ]);

    res.status(200).json(restaurants);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// GET /api/restaurants/search?query=...&lat=...&lng=...
export const searchRestaurants = async (req, res) => {
  const { query, lat, lng } = req.query;

  if (!query || !query.trim()) {
    return res.status(400).json({ message: "query is required" });
  }

  try {
    // Search our own restaurants collection by name, case-insensitive
    const onBitewise = await Restaurant.find({
      name: { $regex: query.trim(), $options: "i" },
    });

    const existingPlaceIds = new Set(onBitewise.map((r) => r.googlePlaceId));

    // Autocomplete (New) is built for search-as-you-type: it matches partial
    // input against place names, unlike Text Search which treats the input as
    // a full natural-language query. Same endpoint pattern as autocompleteCity
    // in geocodeController.js.
    //
    // The locationBias circle matters for short inputs: without it, Google
    // biases by IP over a huge area, and business results rank so poorly for
    // 1-3 character inputs that mostly cities/streets come back (which our
    // food filter then removes). Biasing to the user's location makes nearby
    // food places rank high enough to appear, and sorts results by proximity.
    // Autocomplete returns at most 5 suggestions total. The debug log showed
    // that broad filters let islands and lakes (also tagged "establishment")
    // consume all 5 slots. Requesting food types directly guarantees every
    // slot is a food business.
    const requestBody = {
      input: query.trim(),
      includedPrimaryTypes: ["restaurant", "cafe", "bakery", "bar", "meal_takeaway"],
    };

    if (lat && lng) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
          },
          radius: 15000.0,
        },
      };
    }

    const response = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();

    if (!data.suggestions) {
      return res.status(200).json({ onBitewise, fromGoogle: [] });
    }

    // Autocomplete predictions only include a name, place ID, and types.
    // Full details (address, phone, coordinates) require a separate
    // Place Details call, made only when the user selects a result.
    const fromGoogle = data.suggestions
      .filter((s) => s.placePrediction)
      .filter((s) => isFoodPlace(s.placePrediction.types))
      .filter((s) => !existingPlaceIds.has(s.placePrediction.placeId))
      .map((s) => ({
        googlePlaceId: s.placePrediction.placeId,
        name: s.placePrediction.structuredFormat?.mainText?.text || s.placePrediction.text?.text || "",
        address: s.placePrediction.structuredFormat?.secondaryText?.text || "",
      }));

    res.status(200).json({ onBitewise, fromGoogle });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// GET /api/restaurants/place-details/:placeId
// Fetches full details for a Google place after the user selects it from
// search results, since Autocomplete predictions don't include address,
// phone, website, or coordinates.
export const getPlaceDetails = async (req, res) => {
  const { placeId } = req.params;

  if (!placeId) {
    return res.status(400).json({ message: "placeId is required" });
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": "id,displayName,formattedAddress,location,nationalPhoneNumber,websiteUri",
        },
      }
    );

    const place = await response.json();

    if (!response.ok || !place.id) {
      return res.status(404).json({ message: "Place not found" });
    }

    res.status(200).json({
      googlePlaceId: place.id,
      name: place.displayName?.text || "",
      address: place.formattedAddress || "",
      phone: place.nationalPhoneNumber || "",
      website: place.websiteUri || "",
      location: {
        lat: place.location?.latitude,
        lng: place.location?.longitude,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// GET /api/restaurants/:id
export const getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.status(200).json(restaurant);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};