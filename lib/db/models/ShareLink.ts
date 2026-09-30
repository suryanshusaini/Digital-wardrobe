// lib/db/models/ShareLink.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IShareLink extends Document {
  userId: string;
  userName?: string;
  token: string;
  createdAt: Date;
}

const ShareLinkSchema = new Schema<IShareLink>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    userName: { type: String },
    token: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { strict: false }
);

export default mongoose.models.ShareLink ||
  mongoose.model<IShareLink>("ShareLink", ShareLinkSchema);
