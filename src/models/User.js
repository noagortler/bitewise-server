import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    allergens: { type: [String], default: [] },
    favourites: [{ type: Schema.Types.ObjectId, ref: "Restaurant" }],
    defaultLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);