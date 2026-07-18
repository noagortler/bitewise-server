import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import Restaurant from "./models/Restaurant.js";
import Dish from "./models/Dish.js";

dotenv.config();

// All seeded data is tagged so it can be found and replaced on re-runs
// without ever touching real users or restaurants:
// - seeded users have emails ending in @bitewise-demo.com
// - seeded restaurants have googlePlaceIds starting with "seed-"

const SEED_EMAIL_DOMAIN = "@bitewise-demo.com";
const SEED_PLACE_PREFIX = "seed-";
const SEED_PASSWORD = "password123";

const seedUsers = [
  { firstName: "Maya", lastName: "Chen", allergens: ["peanuts", "tree nuts"] },
  { firstName: "Liam", lastName: "Fraser", allergens: ["gluten"] },
  { firstName: "Priya", lastName: "Sharma", allergens: ["dairy", "eggs"] },
  { firstName: "Diego", lastName: "Morales", allergens: ["shellfish", "fish"] },
  { firstName: "Hannah", lastName: "Kowalski", allergens: ["soy", "sesame"] },
  { firstName: "Jordan", lastName: "Lee", allergens: ["gluten", "dairy"] },
];

const seedRestaurants = [
  // Richmond
  { name: "Steveston Harbour Grill", address: "3866 Bayview St, Richmond, BC", lat: 49.1245, lng: -123.1836 },
  { name: "Golden Bao Dumpling House", address: "8100 Ackroyd Rd, Richmond, BC", lat: 49.1697, lng: -123.1365 },
  { name: "Cedar & Sage Kitchen", address: "6551 No 3 Rd, Richmond, BC", lat: 49.1691, lng: -123.1367 },
  { name: "Marigold South Indian Kitchen", address: "8291 Alexandra Rd, Richmond, BC", lat: 49.1785, lng: -123.1291 },
  { name: "The Gluten Free Bakehouse", address: "12240 2nd Ave, Richmond, BC", lat: 49.1252, lng: -123.1901 },
  { name: "Pho Garden Lane", address: "8888 Odlin Cres, Richmond, BC", lat: 49.1836, lng: -123.1287 },
  // Vancouver
  { name: "Kits Beach Taqueria", address: "2211 Cornwall Ave, Vancouver, BC", lat: 49.2725, lng: -123.1524 },
  { name: "The Copper Skillet", address: "845 Granville St, Vancouver, BC", lat: 49.2806, lng: -123.1211 },
  { name: "Nonna Rosa Trattoria", address: "1523 Commercial Dr, Vancouver, BC", lat: 49.2721, lng: -123.0696 },
  { name: "Lotus Vegan House", address: "3305 Cambie St, Vancouver, BC", lat: 49.2571, lng: -123.1149 },
  { name: "Salt & Anchor Fish Bar", address: "1505 W 2nd Ave, Vancouver, BC", lat: 49.2707, lng: -123.1408 },
  { name: "Hokkaido Ramen Yokocho", address: "601 Robson St, Vancouver, BC", lat: 49.2799, lng: -123.1188 },
  // Burnaby
  { name: "Heights Falafel Co", address: "4125 Hastings St, Burnaby, BC", lat: 49.2812, lng: -123.0231 },
  { name: "Maple & Oat Brunch Bar", address: "4501 Kingsway, Burnaby, BC", lat: 49.2296, lng: -123.0076 },
];

// Dish index maps to seedRestaurants order. freeFrom values must be
// lowercase to match how the app stores them. Every allergen in the app
// appears at least twice so each filter chip has matches to show.
const seedDishes = [
  // Steveston Harbour Grill
  { restaurant: 0, dishName: "grilled salmon bowl", freeFrom: ["gluten", "dairy", "peanuts", "tree nuts"], modifications: ["No sauce"] },
  { restaurant: 0, dishName: "cedar plank chicken", freeFrom: ["gluten", "shellfish", "fish"], modifications: ["GF substitution"] },
  { restaurant: 0, dishName: "harbour caesar salad", freeFrom: ["peanuts", "tree nuts", "shellfish"], modifications: ["No croutons"], otherModifications: "dressing on the side" },
  // Golden Bao Dumpling House
  { restaurant: 1, dishName: "steamed chicken bao", freeFrom: ["peanuts", "tree nuts", "dairy"], modifications: [] },
  { restaurant: 1, dishName: "rice noodle rolls", freeFrom: ["gluten", "peanuts", "dairy", "eggs"], modifications: ["No sauce"] },
  // Cedar & Sage Kitchen
  { restaurant: 2, dishName: "roasted squash salad", freeFrom: ["gluten", "dairy", "eggs", "soy"], modifications: ["No cheese"] },
  { restaurant: 2, dishName: "herb chicken plate", freeFrom: ["gluten", "peanuts", "sesame"], modifications: ["No butter"] },
  { restaurant: 2, dishName: "quinoa power bowl", freeFrom: ["gluten", "dairy", "eggs", "fish", "shellfish"], modifications: ["No dressing"] },
  // Marigold South Indian Kitchen
  { restaurant: 3, dishName: "masala dosa", freeFrom: ["gluten", "eggs", "peanuts", "tree nuts"], modifications: [] },
  { restaurant: 3, dishName: "coconut vegetable curry", freeFrom: ["gluten", "dairy", "eggs", "fish", "shellfish"], modifications: ["Other"], otherModifications: "mild spice" },
  // The Gluten Free Bakehouse
  { restaurant: 4, dishName: "banana chocolate muffin", freeFrom: ["gluten", "peanuts"], modifications: [] },
  { restaurant: 4, dishName: "sourdough avocado toast", freeFrom: ["gluten", "dairy", "eggs"], modifications: ["No garnish"] },
  // Pho Garden Lane
  { restaurant: 5, dishName: "chicken pho", freeFrom: ["gluten", "dairy", "eggs", "peanuts"], modifications: ["Other"], otherModifications: "no bean sprouts" },
  { restaurant: 5, dishName: "vermicelli lemongrass bowl", freeFrom: ["gluten", "dairy", "peanuts", "tree nuts"], modifications: ["No sauce"] },
  // Kits Beach Taqueria
  { restaurant: 6, dishName: "corn tortilla chicken tacos", freeFrom: ["gluten", "peanuts", "tree nuts", "sesame"], modifications: ["No cheese"] },
  { restaurant: 6, dishName: "carnitas rice bowl", freeFrom: ["gluten", "dairy", "eggs", "soy"], modifications: ["No mayo"] },
  // The Copper Skillet
  { restaurant: 7, dishName: "steak frites", freeFrom: ["gluten", "eggs", "peanuts", "shellfish"], modifications: ["No butter", "No gravy"] },
  { restaurant: 7, dishName: "roast chicken dinner", freeFrom: ["peanuts", "tree nuts", "fish", "shellfish"], modifications: ["No gravy"] },
  // Nonna Rosa Trattoria
  { restaurant: 8, dishName: "gluten free penne pomodoro", freeFrom: ["gluten", "eggs", "peanuts"], modifications: ["GF substitution", "No cheese"] },
  { restaurant: 8, dishName: "chicken piccata", freeFrom: ["peanuts", "tree nuts", "sesame", "soy"], modifications: [] },
  // Lotus Vegan House
  { restaurant: 9, dishName: "buddha bowl", freeFrom: ["dairy", "eggs", "fish", "shellfish"], modifications: ["No sauce"] },
  { restaurant: 9, dishName: "tofu banh mi", freeFrom: ["dairy", "eggs", "peanuts", "fish"], modifications: ["No mayo"] },
  { restaurant: 9, dishName: "mushroom pho", freeFrom: ["dairy", "eggs", "gluten", "fish", "shellfish"], modifications: [] },
  // Salt & Anchor Fish Bar
  { restaurant: 10, dishName: "grilled halibut and chips", freeFrom: ["dairy", "peanuts", "tree nuts", "shellfish"], modifications: ["GF substitution"], otherModifications: "grilled instead of battered" },
  { restaurant: 10, dishName: "seared tuna salad", freeFrom: ["gluten", "dairy", "eggs", "shellfish"], modifications: ["No dressing"] },
  // Hokkaido Ramen Yokocho
  { restaurant: 11, dishName: "shoyu ramen", freeFrom: ["dairy", "peanuts", "tree nuts", "shellfish"], modifications: ["Other"], otherModifications: "no egg" },
  { restaurant: 11, dishName: "gluten free rice ramen", freeFrom: ["gluten", "dairy", "peanuts"], modifications: ["GF substitution"] },
  // Heights Falafel Co
  { restaurant: 12, dishName: "falafel plate", freeFrom: ["gluten", "dairy", "eggs", "peanuts", "fish"], modifications: ["Other"], otherModifications: "no tahini" },
  { restaurant: 12, dishName: "chicken shawarma wrap", freeFrom: ["peanuts", "tree nuts", "sesame", "fish", "shellfish"], modifications: ["No sauce"] },
  // Maple & Oat Brunch Bar
  { restaurant: 13, dishName: "oat flour pancakes", freeFrom: ["gluten", "peanuts", "tree nuts"], modifications: ["No butter"] },
  { restaurant: 13, dishName: "veggie scramble", freeFrom: ["gluten", "dairy", "soy", "sesame"], modifications: ["No cheese"] },
];

const seed = async () => {
  try {
    await connectDB();

    // Remove any previously seeded data (and only seeded data)
    const oldSeedUsers = await User.find({ email: { $regex: `${SEED_EMAIL_DOMAIN}$` } });
    const oldSeedRestaurants = await Restaurant.find({ googlePlaceId: { $regex: `^${SEED_PLACE_PREFIX}` } });

    await Dish.deleteMany({
      $or: [
        { userId: { $in: oldSeedUsers.map((u) => u._id) } },
        { restaurantId: { $in: oldSeedRestaurants.map((r) => r._id) } },
      ],
    });
    await User.deleteMany({ email: { $regex: `${SEED_EMAIL_DOMAIN}$` } });
    await Restaurant.deleteMany({ googlePlaceId: { $regex: `^${SEED_PLACE_PREFIX}` } });

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

    // Create restaurants
    const createdRestaurants = await Restaurant.insertMany(
      seedRestaurants.map((r, i) => ({
        googlePlaceId: `${SEED_PLACE_PREFIX}${String(i + 1).padStart(3, "0")}`,
        name: r.name,
        address: r.address,
        phone: "",
        website: "",
        location: { lat: r.lat, lng: r.lng },
      }))
    );
    console.log(`Created ${createdRestaurants.length} restaurants`);

    // Create dishes, spreading them across the seeded users
    const createdDishes = await Dish.insertMany(
      seedDishes.map((d, i) => ({
        restaurantId: createdRestaurants[d.restaurant]._id,
        userId: createdUsers[i % createdUsers.length]._id,
        dishName: d.dishName,
        freeFrom: d.freeFrom,
        modifications: (d.modifications || []).filter((m) => m !== "Other"),
        otherModifications: d.otherModifications || "",
      }))
    );
    console.log(`Created ${createdDishes.length} dishes`);

    console.log("Seed complete");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
};

seed();