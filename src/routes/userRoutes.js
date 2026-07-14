import express from "express";
import { getCurrentUser, getUser, updateUser, deleteUser, addFavourite, removeFavourite } from "../controllers/userController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();
router.get("/me", isAuthenticated, getCurrentUser);
router.get("/:id", isAuthenticated, getUser);
router.put("/:id", isAuthenticated, updateUser);
router.delete("/:id", isAuthenticated, deleteUser);
router.post("/:id/favourites/:restaurantId", isAuthenticated, addFavourite);
router.delete("/:id/favourites/:restaurantId", isAuthenticated, removeFavourite);

export default router;