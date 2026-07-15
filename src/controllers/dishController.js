import Dish from '../models/Dish.js'
import Restaurant from '../models/Restaurant.js'
import mongoose from 'mongoose'

// GET /api/dishes
export const getDishes = async (req, res) => {
  const { restaurantId, userId } = req.query

  if (!restaurantId && !userId) {
    return res.status(400).json({ message: 'restaurantId or userId is required' })
  }

  // When fetching by restaurantId, use an aggregation pipeline instead of
  // a regular find(). This groups all logs of the same dish together so that
  // if 3 people logged "mushroom burger", it return one result with logCount: 3
  // instead of 3 separate documents.

  try {
    if (restaurantId) {
      const dishes = await Dish.aggregate([
        { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId) } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$dishName',
            dishName: { $first: '$dishName' },
            freeFrom: { $first: '$freeFrom' },
            modifications: { $first: '$modifications' },
            otherModifications: { $first: '$otherModifications' },
            logCount: { $sum: 1 },
            lastLoggedAt: { $first: '$createdAt' },
            lastLoggedUserId: { $first: '$userId' },
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'lastLoggedUserId',
            foreignField: '_id',
            as: 'lastLoggedUser'
          }
        },
        { $unwind: '$lastLoggedUser' },
        {
          $project: {
            _id: 1,
            dishName: 1,
            freeFrom: 1,
            modifications: 1,
            otherModifications: 1,
            logCount: 1,
            lastLoggedAt: 1,
            lastLoggedBy: {
              $concat: [
                '$lastLoggedUser.firstName',
                ' ',
                { $substr: ['$lastLoggedUser.lastName', 0, 1] },
                '.'
              ]
            }
          }
        },
        { $sort: { dishName: 1 } }
      ])

      return res.status(200).json(dishes)
    }

    // When fetching by userId, join with restaurants to get the restaurant name
    const dishes = await Dish.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'restaurants',
          localField: 'restaurantId',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      { $unwind: '$restaurant' },
      {
        $project: {
          _id: 1,
          dishName: 1,
          freeFrom: 1,
          modifications: 1,
          otherModifications: 1,
          restaurantId: 1,
          restaurantName: '$restaurant.name',
          createdAt: 1,
        }
      }
    ])

    res.status(200).json(dishes)

  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}

// POST /api/dishes
export const logDish = async (req, res) => {
  const { restaurant, dish } = req.body

  if (!restaurant || !dish) {
    return res.status(400).json({ message: 'Restaurant and dish data are required' })
  }

  if (!dish.dishName) {
    return res.status(400).json({ message: 'Dish name is required' })
  }

  if (!dish.freeFrom || dish.freeFrom.length === 0) {
    return res.status(400).json({ message: 'At least one allergen must be selected' })
  }

  try {
    // Check if restaurant already exists, if not create it
    let existingRestaurant = await Restaurant.findOne({
      googlePlaceId: restaurant.googlePlaceId.trim(),
    })

    if (!existingRestaurant) {
      existingRestaurant = await Restaurant.create({
        googlePlaceId: restaurant.googlePlaceId.trim(),
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone || '',
        website: restaurant.website || '',
        location: {
          lat: restaurant.location.lat,
          lng: restaurant.location.lng,
        },
      })
    }

    // Normalize dish name to lowercase and trim whitespace
    const normalizedDishName = dish.dishName.trim().toLowerCase()

    const newDish = await Dish.create({
      restaurantId: existingRestaurant._id,
      userId: req.user._id,
      dishName: normalizedDishName,
      freeFrom: dish.freeFrom,
      modifications: dish.modifications || [],
      otherModifications: dish.otherModifications || '',
    })

    res.status(201).json(newDish)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}

// PUT /api/dishes/:id
export const updateDish = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id)

    if (!dish) {
      return res.status(404).json({ message: 'Dish not found' })
    }

    if (dish.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own dishes' })
    }

    const { dishName, freeFrom, modifications, otherModifications } = req.body

    if (dishName) dish.dishName = dishName.trim().toLowerCase()
    if (freeFrom) dish.freeFrom = freeFrom
    if (modifications) dish.modifications = modifications
    if (otherModifications !== undefined) dish.otherModifications = otherModifications

    await dish.save()

    res.status(200).json(dish)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}

// DELETE /api/dishes/:id
export const deleteDish = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id)

    if (!dish) {
      return res.status(404).json({ message: 'Dish not found' })
    }

    if (dish.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own dishes' })
    }

    await dish.deleteOne()

    res.status(200).json({ message: 'Dish deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}