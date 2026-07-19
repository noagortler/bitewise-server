import User from "../models/User.js";

// GET /api/users/me
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("favourites", "name");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

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

  // Capitalize names the same way registration does
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  try {
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== req.params.id) {
        return res.status(409).json({ message: "Email already in use" });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        firstName: firstName ? capitalize(firstName) : undefined,
        lastName: lastName ? capitalize(lastName) : undefined,
        email,
        allergens,
        defaultLocation,
      },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// DELETE /api/users/:id
export const deleteUser = async (req, res) => {
  if (req.user._id.toString() !== req.params.id) {
    return res.status(403).json({ message: "You can only delete your own account" });
  }

  try {
    await User.findByIdAndDelete(req.params.id);
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Error logging out" });
      res.status(200).json({ message: "Account deleted successfully" });
    });
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

    if (user.favourites.includes(req.params.restaurantId)) {
      return res.status(409).json({ message: "Restaurant already in favourites" });
    }

    user.favourites.push(req.params.restaurantId);
    await user.save();

    // Populate so the frontend gets names for the saved restaurants list
    await user.populate("favourites", "name");

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

    if (!user.favourites.includes(req.params.restaurantId)) {
      return res.status(404).json({ message: "Restaurant not found in favourites" });
    }

    user.favourites = user.favourites.filter(
      (id) => id.toString() !== req.params.restaurantId
    );
    await user.save();

    // Populate so the frontend gets names for the saved restaurants list
    await user.populate("favourites", "name");

    res.status(200).json({ _id: user._id, favourites: user.favourites });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};