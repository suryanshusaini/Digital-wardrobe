import { z } from "zod";

// ── Generic ObjectId Validation ──────────────────────────────────────────────
export const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const ObjectIdSchema = z
  .string()
  .trim()
  .regex(objectIdRegex, { message: "Invalid ID format" });

// ── Categories & Tags ────────────────────────────────────────────────────────
export const VALID_CATEGORIES = [
  "top",
  "bottom",
  "shoes",
  "accessory",
  "outfit",
] as const;

export const CategorySchema = z.enum(VALID_CATEGORIES);

export const WeatherTagSchema = z.string().trim().min(1).max(30);
export const OccasionTagSchema = z.string().trim().min(1).max(30);

// ── Item Schemas ─────────────────────────────────────────────────────────────
export const ItemCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  category: CategorySchema,
  weather: z.array(WeatherTagSchema).max(10).default([]),
  occasion: z.array(OccasionTagSchema).max(10).default([]),
});

export const ItemUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  category: CategorySchema.optional(),
  weather: z.array(WeatherTagSchema).max(10).optional(),
  occasion: z.array(OccasionTagSchema).max(10).optional(),
});

// ── Outfit Schemas ───────────────────────────────────────────────────────────
export const OutfitItemPlacementSchema = z.object({
  item: ObjectIdSchema,
  x: z.number().finite(),
  y: z.number().finite(),
  scale: z.number().positive().max(5).default(1),
  rotation: z.number().finite().default(0),
  zIndex: z.number().int().min(0).max(100).default(0),
});

export const OutfitCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  items: z.array(OutfitItemPlacementSchema).min(1, "Outfit must contain at least one piece").max(20),
  previewImage: z.string().url().optional(),
});

export const OutfitUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  items: z.array(OutfitItemPlacementSchema).min(1).max(20).optional(),
  previewImage: z.string().url().optional(),
});

// ── Auth Schemas ─────────────────────────────────────────────────────────────
export const SignupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters"),
  email: z.string().trim().email("Invalid email address").max(255).toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password too long"),
});

export const LoginSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255).toLowerCase(),
  password: z.string().min(1, "Password is required").max(100),
});

// ── Stylist Schemas ──────────────────────────────────────────────────────────
export const StylistRequestSchema = z.object({
  weather: z.string().trim().min(1, "Weather is required").max(50),
});

// ── Gemini AI Response Schemas (Untrusted Model Output) ─────────────────────
export const GeminiCategorizeOutputSchema = z.object({
  category: CategorySchema,
  weather: z.array(z.string().trim().max(30)).optional().default([]),
  occasion: z.array(z.string().trim().max(30)).optional().default([]),
});

export const GeminiStylistOutputSchema = z.object({
  top: z.string().trim().max(100).optional(),
  bottom: z.string().trim().max(100).optional(),
  shoes: z.string().trim().max(100).optional(),
  accessory: z.string().trim().max(100).optional(),
  reasoning: z.string().trim().max(500).optional(),
});

// ── Share Link Schemas ───────────────────────────────────────────────────────
export const ShareTokenSchema = z
  .string()
  .trim()
  .min(16, "Invalid token")
  .max(64, "Invalid token")
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid token format");
