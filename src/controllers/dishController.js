import Dish from "../models/Dish.js";
import Restaurant from "../models/Restaurant.js";

// GET /api/dishes
export const getDishes = async (req, res) => {
  const { restaurantId, userId } = req.query;

  if (!restaurantId && !userId) {
    return res.status(400).json({ message: "restaurantId or userId is required" });
  }

  try {
    const query = restaurantId ? { restaurantId } : { userId };

    const dishes = await Dish.find(query).sort({ createdAt: -1 });

    res.status(200).json(dishes);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// POST /api/dishes
export const logDish = async (req, res) => {
  const { restaurant, dish } = req.body;

  if (!restaurant || !dish) {
    return res.status(400).json({ message: "Restaurant and dish data are required" });
  }

  if (!dish.dishName) {
    return res.status(400).json({ message: "Dish name is required" });
  }

  if (!dish.freeFrom || dish.freeFrom.length === 0) {
    return res.status(400).json({ message: "At least one allergen must be selected" });
  }

  try {
    // Check if restaurant already exists, if not create it
    let existingRestaurant = await Restaurant.findOne({
      googlePlaceId: restaurant.googlePlaceId.trim(),
    });

    if (!existingRestaurant) {
      existingRestaurant = await Restaurant.create({
        googlePlaceId: restaurant.googlePlaceId.trim(),
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone || "",
        website: restaurant.website || "",
        location: {
          lat: restaurant.location.lat,
          lng: restaurant.location.lng,
        },
      });
    }

    // Normalize dish name to lowercase and trim whitespace
    const normalizedDishName = dish.dishName.trim().toLowerCase();

    const newDish = await Dish.create({
      restaurantId: existingRestaurant._id,
      userId: req.user._id,
      dishName: normalizedDishName,
      freeFrom: dish.freeFrom,
      modifications: dish.modifications || [],
      otherModifications: dish.otherModifications || "",
    });

    res.status(201).json(newDish);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// PUT /api/dishes/:id
export const updateDish = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);

    if (!dish) {
      return res.status(404).json({ message: "Dish not found" });
    }

    if (dish.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only edit your own dishes" });
    }

    const { dishName, freeFrom, modifications, otherModifications } = req.body;

    if (dishName) dish.dishName = dishName.trim().toLowerCase();
    if (freeFrom) dish.freeFrom = freeFrom;
    if (modifications) dish.modifications = modifications;
    if (otherModifications !== undefined) dish.otherModifications = otherModifications;

    await dish.save();

    res.status(200).json(dish);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// DELETE /api/dishes/:id
export const deleteDish = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);

    if (!dish) {
      return res.status(404).json({ message: "Dish not found" });
    }

    if (dish.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own dishes" });
    }

    await dish.deleteOne();

    res.status(200).json({ message: "Dish deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};