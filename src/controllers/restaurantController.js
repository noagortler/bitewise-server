import Restaurant from "../models/Restaurant.js";

// GET /api/restaurants
export const getRestaurants = async (req, res) => {
  const { lat, lng, radius = 5000 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ message: "lat and lng are required" });
  }

  // Convert radius from meters to degrees (roughly 111,000 meters per degree)
  const radiusInDegrees = parseFloat(radius) / 111000;

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  try {
    const restaurants = await Restaurant.find({
      "location.lat": { $gte: latNum - radiusInDegrees, $lte: latNum + radiusInDegrees },
      "location.lng": { $gte: lngNum - radiusInDegrees, $lte: lngNum + radiusInDegrees },
    });

    res.status(200).json(restaurants);
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