import express from "express";
import { getDishes, logDish, updateDish, deleteDish } from "../controllers/dishController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.get("/", isAuthenticated, getDishes);
router.post("/", isAuthenticated, logDish);
router.put("/:id", isAuthenticated, updateDish);
router.delete("/:id", isAuthenticated, deleteDish);

export default router;