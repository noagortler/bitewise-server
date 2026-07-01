import bcrypt from "bcrypt";
import passport from "passport";
import User from "../models/User.js";

// POST /api/auth/register
export const register = async (req, res) => {
  const { firstName, lastName, email, password, allergens } = req.body;

  try {
    // Check if a user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      allergens: allergens || [],
    });

    res.status(201).json({
      _id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      allergens: newUser.allergens,
      createdAt: newUser.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// POST /api/auth/login
export const login = (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      return res.status(401).json({ message: info?.message || "Login failed" });
    }

    req.logIn(user, (err) => {
      if (err) return next(err);

      res.status(200).json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        allergens: user.allergens,
        favourites: user.favourites,
        defaultLocation: user.defaultLocation,
        createdAt: user.createdAt,
      });
    });
  })(req, res, next);
};

// POST /api/auth/logout
export const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.status(200).json({ message: "Logged out successfully" });
  });
};

// PUT /api/auth/password
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "All password fields are required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "New passwords do not match" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters" });
  }

  try {
    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};