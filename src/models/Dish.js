import mongoose, { Schema } from "mongoose";

const DishSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dishName: { type: String, required: true },
    freeFrom: { type: [String], required: true },
    modifications: { type: [String], default: [] },
    otherModifications: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Dish", DishSchema);