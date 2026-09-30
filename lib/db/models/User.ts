// lib/db/models/User.ts
import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  email: string;
  password?: string; // Optional — Google OAuth users won't have one
  name: string;
  image?: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // select: false means password is never returned in queries by default
    // — you must explicitly add .select("+password") when you need it
    password: {
      type: String,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
);

// Pre-save hook: hash the password only if it was newly set or modified.
// In Mongoose 9, async pre-hooks can return/throw without calling next().
UserSchema.pre("save", async function () {
  // Only hash if the password field was modified (or is new)
  if (!this.isModified("password") || !this.password) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password as string, salt);
});

// Prevent model recompilation in Next.js dev hot-reload cycles
if (mongoose.models && mongoose.models.User) {
  delete (mongoose.models as Record<string, unknown>).User;
}

export default mongoose.model<IUser>("User", UserSchema);
