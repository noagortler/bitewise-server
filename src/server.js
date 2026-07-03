import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";
import dishRoutes from "./routes/dishRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/dishes", dishRoutes);

app.get("/", (req, res) => {
  res.send("Bitewise API is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});