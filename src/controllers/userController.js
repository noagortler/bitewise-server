import User from "../models/User.js";

// GET /api/users/:id
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// PUT /api/users/:id
export const updateUser = async (req, res) => {
  if (req.user._id.toString() !== req.params.id) {
    return res.status(403).json({ message: "You can only update your own account" });
  }

  const { firstName, lastName, email, allergens, defaultLocation } = req.body;

  try {
    // Check if email is already in use by another account
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== req.params.id) {
        return res.status(409).json({ message: "Email already in use" });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, email, allergens, defaultLocation },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// POST /api/users/:id/favourites/:restaurantId
export const addFavourite = async (req, res) => {
  if (req.user._id.toString() !== req.params.id) {
    return res.status(403).json({ message: "You can only update your own favourites" });
  }

  try {
    const user = await User.findById(req.params.id);

    // Check if restaurant is already in favourites
    if (user.favourites.includes(req.params.restaurantId)) {
      return res.status(409).json({ message: "Restaurant already in favourites" });
    }

    user.favourites.push(req.params.restaurantId);
    await user.save();

    res.status(200).json({ _id: user._id, favourites: user.favourites });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// DELETE /api/users/:id/favourites/:restaurantId
export const removeFavourite = async (req, res) => {
  if (req.user._id.toString() !== req.params.id) {
    return res.status(403).json({ message: "You can only update your own favourites" });
  }

  try {
    const user = await User.findById(req.params.id);

    // Check if restaurant is actually in favourites
    if (!user.favourites.includes(req.params.restaurantId)) {
      return res.status(404).json({ message: "Restaurant not found in favourites" });
    }

    user.favourites = user.favourites.filter(
      (id) => id.toString() !== req.params.restaurantId
    );
    await user.save();

    res.status(200).json({ _id: user._id, favourites: user.favourites });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};