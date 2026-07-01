import express from "express";
import { getUser, updateUser, addFavourite, removeFavourite } from "../controllers/userController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.get("/:id", isAuthenticated, getUser);
router.put("/:id", isAuthenticated, updateUser);
router.post("/:id/favourites/:restaurantId", isAuthenticated, addFavourite);
router.delete("/:id/favourites/:restaurantId", isAuthenticated, removeFavourite);

export default router;