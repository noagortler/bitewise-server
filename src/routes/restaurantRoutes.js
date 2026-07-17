import express from "express";
import { getRestaurants, searchRestaurants, getPlaceDetails, getRestaurantById } from "../controllers/restaurantController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.get("/", isAuthenticated, getRestaurants);
router.get("/search", isAuthenticated, searchRestaurants);
router.get("/place-details/:placeId", isAuthenticated, getPlaceDetails);
router.get("/:id", isAuthenticated, getRestaurantById);

export default router;