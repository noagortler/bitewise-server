import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import Restaurant from "./models/Restaurant.js";
import Dish from "./models/Dish.js";

dotenv.config();

const SEED_EMAIL_DOMAIN = "@bitewise-demo.com";
const SEED_PASSWORD = "password123";

const seedUsers = [
  { firstName: "Maya", lastName: "Chen", allergens: ["peanuts", "tree nuts"] },
  { firstName: "Liam", lastName: "Fraser", allergens: ["gluten"] },
  { firstName: "Priya", lastName: "Sharma", allergens: ["dairy", "eggs"] },
  { firstName: "Diego", lastName: "Morales", allergens: ["shellfish", "fish"] },
  { firstName: "Hannah", lastName: "Kowalski", allergens: ["soy", "sesame"] },
  { firstName: "Jordan", lastName: "Lee", allergens: ["gluten", "dairy"] },
];

// Real restaurants, looked up on Google Places by these search queries
const restaurantQueries = [
  "Blue Canoe Waterfront Restaurant Richmond BC",        // 0
  "Pajo's at the Wharf Steveston Richmond BC",           // 1
  "Dinesty Dumpling House Richmond BC",                  // 2
  "Chef Tony Seafood Restaurant Richmond BC",            // 3
  "Cactus Club Cafe Richmond Centre Richmond BC",        // 4
  "Deer Garden Signatures Richmond BC",                  // 5
  "The Naam Restaurant Vancouver BC",                    // 6
  "Chambar Restaurant Vancouver BC",                     // 7
  "Nuba in Gastown Vancouver BC",                        // 8
  "Fable Kitchen Vancouver BC",                          // 9
  "Hokkaido Ramen Santouka Robson Vancouver BC",         // 10
  "Phnom Penh Restaurant Vancouver BC",                  // 11
  "Anton's Pasta Bar Burnaby BC",                        // 12
  "Sushi Garden Burnaby BC",                             // 13
  "Anh and Chi Main Street Vancouver BC",                // 14
  "The Acorn Restaurant Main Street Vancouver BC",       // 15
  "Sula Indian Restaurant Commercial Drive Vancouver BC",// 16
  "Via Tevere Pizzeria Napoletana Vancouver BC",         // 17
  "Havana Restaurant Commercial Drive Vancouver BC",     // 18
  "Meet on Main Vancouver BC",                           // 19
];

// restaurant index refers to restaurantQueries order
const seedDishes = [
  // Blue Canoe (0)
  { restaurant: 0, dishName: "grilled wild salmon", freeFrom: ["gluten", "dairy", "peanuts", "tree nuts"], modifications: ["No sauce"] },
  { restaurant: 0, dishName: "west coast salad", freeFrom: ["gluten", "eggs", "shellfish"], modifications: ["No dressing"], otherModifications: "dressing on the side" },
  // Pajo's (1)
  { restaurant: 1, dishName: "grilled cod and chips", freeFrom: ["dairy", "peanuts", "tree nuts", "shellfish"], modifications: ["GF substitution"], otherModifications: "grilled instead of battered" },
  { restaurant: 1, dishName: "salmon burger", freeFrom: ["dairy", "peanuts", "shellfish"], modifications: ["No bun"] },
  // Dinesty (2)
  { restaurant: 2, dishName: "steamed pork buns", freeFrom: ["dairy", "peanuts", "tree nuts", "fish"], modifications: [] },
  { restaurant: 2, dishName: "stir fried rice cakes", freeFrom: ["dairy", "peanuts", "eggs"], modifications: ["No sauce"] },
  // Chef Tony (3)
  { restaurant: 3, dishName: "ginger steamed fish", freeFrom: ["gluten", "dairy", "peanuts", "tree nuts"], modifications: [] },
  { restaurant: 3, dishName: "chicken lettuce wraps", freeFrom: ["gluten", "dairy", "eggs"], modifications: ["No sauce"] },
  // Cactus Club (4)
  { restaurant: 4, dishName: "grilled chicken rice bowl", freeFrom: ["gluten", "dairy", "peanuts", "tree nuts"], modifications: ["No sauce"] },
  { restaurant: 4, dishName: "tuna poke bowl", freeFrom: ["gluten", "dairy", "eggs"], modifications: ["Other"], otherModifications: "no sesame seeds" },
  // Deer Garden (5)
  { restaurant: 5, dishName: "fish soup rice noodles", freeFrom: ["gluten", "dairy", "eggs", "peanuts"], modifications: [] },
  { restaurant: 5, dishName: "lemongrass chicken vermicelli", freeFrom: ["gluten", "dairy", "eggs", "shellfish"], modifications: ["No sauce"] },
  // The Naam (6)
  { restaurant: 6, dishName: "dragon bowl", freeFrom: ["dairy", "eggs", "fish", "shellfish"], modifications: [] },
  { restaurant: 6, dishName: "veggie burger", freeFrom: ["dairy", "eggs", "fish", "shellfish"], modifications: ["No bun", "No cheese"] },
  // Chambar (7)
  { restaurant: 7, dishName: "lamb tagine", freeFrom: ["gluten", "dairy", "peanuts", "shellfish"], modifications: [] },
  { restaurant: 7, dishName: "moules frites", freeFrom: ["gluten", "peanuts", "tree nuts", "eggs"], modifications: ["No butter"] },
  // Nuba (8)
  { restaurant: 8, dishName: "najib's special cauliflower", freeFrom: ["gluten", "dairy", "eggs", "peanuts", "fish"], modifications: [] },
  { restaurant: 8, dishName: "chicken shawarma plate", freeFrom: ["peanuts", "tree nuts", "fish", "shellfish"], modifications: ["No sauce"], otherModifications: "no tahini" },
  // Fable (9)
  { restaurant: 9, dishName: "roast chicken", freeFrom: ["gluten", "peanuts", "tree nuts", "shellfish"], modifications: ["No gravy"] },
  { restaurant: 9, dishName: "seasonal vegetable plate", freeFrom: ["gluten", "dairy", "eggs", "fish", "shellfish"], modifications: ["No butter"] },
  // Santouka (10)
  { restaurant: 10, dishName: "shio ramen", freeFrom: ["dairy", "peanuts", "tree nuts", "shellfish"], modifications: ["Other"], otherModifications: "no egg" },
  { restaurant: 10, dishName: "toroniku ramen", freeFrom: ["dairy", "peanuts", "shellfish"], modifications: [] },
  // Phnom Penh (11)
  { restaurant: 11, dishName: "phnom penh chicken wings", freeFrom: ["dairy", "peanuts", "tree nuts", "shellfish"], modifications: [] },
  { restaurant: 11, dishName: "beef luc lac with rice", freeFrom: ["dairy", "peanuts", "eggs", "shellfish"], modifications: ["No sauce"] },
  // Anton's (12)
  { restaurant: 12, dishName: "gluten free penne arrabbiata", freeFrom: ["gluten", "eggs", "peanuts"], modifications: ["GF substitution", "No cheese"] },
  { restaurant: 12, dishName: "chicken piccata", freeFrom: ["peanuts", "tree nuts", "sesame", "soy"], modifications: [] },
  // Sushi Garden (13)
  { restaurant: 13, dishName: "salmon sashimi", freeFrom: ["gluten", "dairy", "eggs", "peanuts", "tree nuts", "soy", "sesame"], modifications: [] },
  { restaurant: 13, dishName: "chicken teriyaki don", freeFrom: ["dairy", "peanuts", "tree nuts", "fish", "shellfish"], modifications: ["Other"], otherModifications: "no sesame seeds" },
  // Anh and Chi (14)
  { restaurant: 14, dishName: "pho ga", freeFrom: ["gluten", "dairy", "eggs", "peanuts"], modifications: [] },
  { restaurant: 14, dishName: "goi cuon salad rolls", freeFrom: ["gluten", "dairy", "eggs"], modifications: ["Other"], otherModifications: "no peanut sauce" },
  // The Acorn (15)
  { restaurant: 15, dishName: "harvest bowl", freeFrom: ["dairy", "eggs", "fish", "shellfish"], modifications: [] },
  { restaurant: 15, dishName: "gluten free gnocchi", freeFrom: ["gluten", "eggs", "fish", "shellfish"], modifications: ["No cheese"] },
  // Sula (16)
  { restaurant: 16, dishName: "chana masala", freeFrom: ["gluten", "dairy", "eggs", "fish", "shellfish"], modifications: ["Other"], otherModifications: "no ghee" },
  { restaurant: 16, dishName: "tandoori chicken", freeFrom: ["gluten", "peanuts", "tree nuts", "shellfish"], modifications: [] },
  // Via Tevere (17)
  { restaurant: 17, dishName: "gluten free margherita pizza", freeFrom: ["gluten", "eggs", "peanuts", "tree nuts"], modifications: ["GF substitution"] },
  { restaurant: 17, dishName: "insalata mista", freeFrom: ["gluten", "dairy", "eggs", "fish"], modifications: ["No dressing"] },
  // Havana (18)
  { restaurant: 18, dishName: "cuban roast chicken", freeFrom: ["gluten", "dairy", "peanuts", "tree nuts"], modifications: [] },
  { restaurant: 18, dishName: "plantain bowl", freeFrom: ["gluten", "dairy", "eggs", "shellfish"], modifications: ["No sauce"] },
  // Meet on Main (19)
  { restaurant: 19, dishName: "green goddess bowl", freeFrom: ["dairy", "eggs", "fish", "shellfish"], modifications: [] },
  { restaurant: 19, dishName: "beyond burger", freeFrom: ["dairy", "eggs", "fish", "shellfish"], modifications: ["No bun"] },
];

// Extra logs of popular dishes by other users (index refers to seedDishes order)
const extraLogs = [
  { dish: 0, times: 2 },  // grilled wild salmon -> 3 loggers
  { dish: 4, times: 1 },  // steamed pork buns -> 2
  { dish: 8, times: 2 },  // grilled chicken rice bowl -> 3
  { dish: 12, times: 3 }, // dragon bowl -> 4
  { dish: 16, times: 2 }, // najib's special cauliflower -> 3
  { dish: 18, times: 1 }, // roast chicken -> 2
  { dish: 20, times: 2 }, // shio ramen -> 3
  { dish: 22, times: 1 }, // phnom penh chicken wings -> 2
  { dish: 24, times: 1 }, // gluten free penne arrabbiata -> 2
  { dish: 26, times: 2 }, // salmon sashimi -> 3
  { dish: 28, times: 2 }, // pho ga -> 3
  { dish: 30, times: 1 }, // harvest bowl -> 2
  { dish: 34, times: 2 }, // gluten free margherita pizza -> 3
  { dish: 38, times: 1 }, // green goddess bowl -> 2
];

// Look up one restaurant on Google Places Text Search (New)
const fetchRestaurantFromGoogle = async (query) => {
  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.websiteUri",
        },
        body: JSON.stringify({ textQuery: query }),
        // Give up after 10 seconds so one stalled request can't hang the seed
        signal: AbortSignal.timeout(10000),
      }
    );

    const data = await response.json();
    const place = data.places?.[0];

    if (!place) return null;

    return {
      googlePlaceId: place.id,
      name: place.displayName?.text || "",
      address: place.formattedAddress || "",
      phone: place.nationalPhoneNumber || "",
      website: place.websiteUri || "",
      location: {
        lat: place.location?.latitude,
        lng: place.location?.longitude,
      },
    };
  } catch (error) {
    console.warn(`Fetch failed for "${query}": ${error.message}`);
    return null;
  }
};

const daysAgo = (min, max) => {
  const days = min + Math.random() * (max - min);
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const seed = async () => {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error("GOOGLE_MAPS_API_KEY is missing - run this from the server folder so .env is loaded");
      process.exit(1);
    }

    await connectDB();

    // Remove previous seed data only: demo users, their dishes, old fake restaurants
    const oldSeedUsers = await User.find({ email: { $regex: `${SEED_EMAIL_DOMAIN}$` } });
    const oldFakeRestaurants = await Restaurant.find({ googlePlaceId: { $regex: "^seed-" } });

    await Dish.deleteMany({
      $or: [
        { userId: { $in: oldSeedUsers.map((u) => u._id) } },
        { restaurantId: { $in: oldFakeRestaurants.map((r) => r._id) } },
      ],
    });
    await User.deleteMany({ email: { $regex: `${SEED_EMAIL_DOMAIN}$` } });
    await Restaurant.deleteMany({ googlePlaceId: { $regex: "^seed-" } });

    console.log("Cleared previous seed data");

    // Create users
    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);
    const createdUsers = await User.insertMany(
      seedUsers.map((u) => ({
        firstName: u.firstName,
        lastName: u.lastName,
        email: `${u.firstName.toLowerCase()}.${u.lastName.toLowerCase()}${SEED_EMAIL_DOMAIN}`,
        password: hashedPassword,
        allergens: u.allergens,
      }))
    );
    console.log(`Created ${createdUsers.length} users`);

    // Fetch each restaurant from Google. Existing ones (matched by place ID
    // or name) are refreshed in place so their dishes stay attached. If the
    // same restaurant exists more than once (e.g. an old placeholder entry
    // plus one created through the app), the duplicates are merged into the
    // one holding the real place ID before refreshing.
    const restaurants = [];
    for (const query of restaurantQueries) {
      const fromGoogle = await fetchRestaurantFromGoogle(query);

      if (!fromGoogle) {
        console.warn(`WARNING: no Google result for "${query}" - skipping`);
        restaurants.push(null);
        continue;
      }

      const candidates = await Restaurant.find({
        $or: [
          { googlePlaceId: fromGoogle.googlePlaceId },
          { name: new RegExp(`^${escapeRegex(fromGoogle.name)}$`, "i") },
        ],
      });

      // Prefer the doc already holding the real place ID as the keeper
      let doc =
        candidates.find((c) => c.googlePlaceId === fromGoogle.googlePlaceId) ||
        candidates[0] ||
        null;

      if (doc) {
        const duplicates = candidates.filter((c) => !c._id.equals(doc._id));
        for (const dup of duplicates) {
          await Dish.updateMany({ restaurantId: dup._id }, { restaurantId: doc._id });
          await User.updateMany(
            { favourites: dup._id },
            { $addToSet: { favourites: doc._id } }
          );
          await User.updateMany(
            { favourites: dup._id },
            { $pull: { favourites: dup._id } }
          );
          await dup.deleteOne();
          console.log(`Merged duplicate: ${dup.name}`);
        }

        doc.googlePlaceId = fromGoogle.googlePlaceId;
        doc.name = fromGoogle.name;
        doc.address = fromGoogle.address;
        doc.phone = fromGoogle.phone;
        doc.website = fromGoogle.website;
        doc.location = fromGoogle.location;
        await doc.save();
        console.log(`Refreshed existing: ${doc.name} (${doc.address})`);
      } else {
        doc = await Restaurant.create(fromGoogle);
        console.log(`Created: ${doc.name} (${doc.address})`);
      }
      restaurants.push(doc);
    }

    // Create dishes, backdated over the past ~3 months
    const dishDocs = [];
    seedDishes.forEach((d, i) => {
      const restaurant = restaurants[d.restaurant];
      if (!restaurant) return;

      const loggedAt = daysAgo(20, 90);
      dishDocs.push({
        restaurantId: restaurant._id,
        userId: createdUsers[i % createdUsers.length]._id,
        dishName: d.dishName,
        freeFrom: d.freeFrom,
        modifications: (d.modifications || []).filter((m) => m !== "Other"),
        otherModifications: d.otherModifications || "",
        createdAt: loggedAt,
        updatedAt: loggedAt,
      });
    });

    const createdDishes = await Dish.insertMany(dishDocs, { timestamps: false });
    console.log(`Created ${createdDishes.length} dishes`);

    // Re-log popular dishes as other users with recent dates
    const extraDocs = [];
    extraLogs.forEach(({ dish, times }) => {
      const original = seedDishes[dish];
      const restaurant = restaurants[original.restaurant];
      if (!restaurant) return;

      for (let t = 1; t <= times; t++) {
        const loggedAt = daysAgo(0, 20);
        extraDocs.push({
          restaurantId: restaurant._id,
          userId: createdUsers[(dish + t) % createdUsers.length]._id,
          dishName: original.dishName,
          freeFrom: original.freeFrom,
          modifications: (original.modifications || []).filter((m) => m !== "Other"),
          otherModifications: original.otherModifications || "",
          createdAt: loggedAt,
          updatedAt: loggedAt,
        });
      }
    });

    const createdExtraLogs = await Dish.insertMany(extraDocs, { timestamps: false });
    console.log(`Created ${createdExtraLogs.length} extra dish logs for community counts`);

    console.log("Seed complete");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
};

seed();