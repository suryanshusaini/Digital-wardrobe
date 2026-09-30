// lib/db/models/Outfit.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IOutfitItem {
  itemId: mongoose.Types.ObjectId;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  zIndex: number;
  rotation: number;
}

export interface IOutfit extends Document {
  name: string;
  items: IOutfitItem[];
  userId?: string;
  createdAt: Date;
}

const OutfitItemSchema = new Schema<IOutfitItem>({
  itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
  imageUrl: { type: String, required: true },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  width: { type: Number, default: 150 },
  zIndex: { type: Number, default: 1 },
  rotation: { type: Number, default: 0 },
});

const OutfitSchema = new Schema<IOutfit>(
  {
    name: { type: String, required: true },
    items: [OutfitItemSchema],
    userId: { type: String, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { strict: false }
);

// Compound index for user outfits query ordered by date
OutfitSchema.index({ userId: 1, createdAt: -1 });

// In Next.js dev mode, delete stale cached model to ensure schema updates re-register immediately
if (mongoose.models && mongoose.models.Outfit) {
  delete (mongoose.models as Record<string, unknown>).Outfit;
}

export default mongoose.model<IOutfit>("Outfit", OutfitSchema);
