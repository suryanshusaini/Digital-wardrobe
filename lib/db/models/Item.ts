// lib/db/models/Item.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IItem extends Document {
  name: string;
  category: "top" | "bottom" | "shoes" | "accessory" | "outfit";
  imageUrl: string;
  originalImageUrl?: string;
  model3dUrl?: string; // Future: URL to the generated .glb 3D model asset
  favourite?: boolean;
  dominantColor?: string;
  tags: {
    weather: string[];
    occasion: string[];
  };
  userId?: string;
  createdAt: Date;
}

const ItemSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ["top", "bottom", "shoes", "accessory", "outfit"],
      required: true,
    },
    imageUrl: { type: String, required: true },
    originalImageUrl: { type: String },
    model3dUrl: { type: String }, // Future: stores the .glb URL from 3D generation API
    favourite: { type: Boolean, default: false },
    dominantColor: { type: String, default: null },
    tags: {
      weather: [{ type: String }],
      occasion: [{ type: String }],
    },
    userId: { type: String, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { strict: false }
);

// Compound indexes for user wardrobe queries and category filtering
ItemSchema.index({ userId: 1, createdAt: -1 });
ItemSchema.index({ userId: 1, category: 1 });
ItemSchema.index({ userId: 1, favourite: 1 });

// In Next.js dev mode, delete stale cached model to ensure schema updates (such as enum values) re-register immediately
if (mongoose.models && mongoose.models.Item) {
  delete (mongoose.models as Record<string, unknown>).Item;
}

export default mongoose.model<IItem>("Item", ItemSchema);
