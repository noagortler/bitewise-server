import mongoose, { Schema } from "mongoose";

const RestaurantSchema = new Schema(
  {
    googlePlaceId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String },
    website: { type: String },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Restaurant", RestaurantSchema);