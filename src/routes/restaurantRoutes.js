import express from "express";
import { getRestaurants, getRestaurantById } from "../controllers/restaurantController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.get("/", isAuthenticated, getRestaurants);
router.get("/:id", isAuthenticated, getRestaurantById);

export default router;