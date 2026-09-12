// lib/db/models/Item.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IItem extends Document {
  name: string;
  category: "top" | "bottom" | "shoes" | "accessory";
  imageUrl: string;
  originalImageUrl?: string;
  tags: {
    weather: string[];
    occasion: string[];
  };
  createdAt: Date;
}

const ItemSchema: Schema = new Schema({
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ["top", "bottom", "shoes", "accessory"],
    required: true,
  },
  imageUrl: { type: String, required: true },
  originalImageUrl: { type: String },
  tags: {
    weather: [{ type: String }],
    occasion: [{ type: String }],
  },
  createdAt: { type: Date, default: Date.now },
});

// Prevent Mongoose from compiling the model multiple times in Next.js
export default mongoose.models.Item ||
  mongoose.model<IItem>("Item", ItemSchema);
