import express from "express";
import { register, login, logout, changePassword } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.put("/password", changePassword);

export default router;