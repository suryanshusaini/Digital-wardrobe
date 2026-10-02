import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import Item, { type IItem } from "@/lib/db/models/Item";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { auth } from "@/auth";
import { uploadLimiter } from "@/lib/rateLimit";
import { ItemCreateSchema } from "@/lib/validation/schemas";
import { logger, getRequestId } from "@/lib/logger";
import sharp from "sharp";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userEmail = session.user.email;

    // Rate limit: 10 uploads per minute per user
    const rl = await uploadLimiter.check(userEmail);
    if (!rl.allowed) {
      logger.warn("Upload rate limit exceeded", { requestId, route: "/api/upload" });
      return NextResponse.json(
        { error: "Upload limit reached. Please wait a moment." },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfter) },
        }
      );
    }

    const formData = await req.formData();
    const file = (formData.get("file") || formData.get("imageFile") || formData.get("image")) as File | null;
    const nameRaw = (formData.get("name") as string) || file?.name?.split(".")[0] || "Clothing Item";
    const categoryRaw = (formData.get("category") as string) || "top";
    const weatherRaw = (formData.get("weather") as string) || "";
    const occasionRaw = (formData.get("occasion") as string) || "";
    const weatherList = weatherRaw.split(",").map((s) => s.trim()).filter(Boolean);
    const occasionList = occasionRaw.split(",").map((s) => s.trim()).filter(Boolean);

    // Validate payload fields with Zod
    const validation = ItemCreateSchema.safeParse({
      name: nameRaw,
      category: categoryRaw.toLowerCase(),
      weather: weatherList,
      occasion: occasionList,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid item metadata provided" },
        { status: 400 }
      );
    }

    const { name, category, weather, occasion } = validation.data;

    if (!file || typeof file === "string" || file.size === 0) {
      return NextResponse.json({ error: "No valid file uploaded" }, { status: 400 });
    }

    // Server-side size caps: 4.5MB for HEIC (Vercel payload constraint), 15MB for other files
    const isHeic = file.type === "image/heic" || file.type === "image/heif" || /\.(heic|heif)$/i.test(file.name);
    const MAX_BYTES = isHeic ? 4.5 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: isHeic ? "HEIC file exceeds 4.5MB host limit" : "File exceeds 15MB size limit" },
        { status: 400 }
      );
    }

    // Read incoming file into ArrayBuffer and Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file signature (magic numbers) to prevent extension spoofing
    const isValidSignature = (() => {
      if (buffer.length < 4) return false;
      // JPEG: FF D8 FF
      if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
      // PNG: 89 50 4E 47
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
      // GIF: 47 49 46 38
      if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
      // WEBP: "RIFF" .... "WEBP"
      if (
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
      ) {
        return true;
      }
      // HEIC/HEIF: "ftyp" in bytes 4..8
      if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
        return true;
      }
      return false;
    })();

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Invalid image format. Supported formats: JPEG, PNG, WEBP, GIF, and HEIC." },
        { status: 400 }
      );
    }

    // Extract dominant color for smooth card blur-up placeholder
    let dominantColor: string | null = null;
    try {
      if (!isHeic) {
        const { data } = await sharp(buffer).resize(1, 1).raw().toBuffer({ resolveWithObject: true });
        const [r, g, b] = data;
        dominantColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      }
    } catch {
      // Fallback
    }

    // Stream uploaded image directly to Cloudinary without processing
    const cloudinaryResponse = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "digital-wardrobe" }, (error, result) => {
          if (error || !result) reject(error || new Error("Cloudinary upload failed"));
          else resolve(result);
        })
        .end(buffer);
    });

    await connectDB();
    const newItem: IItem = await Item.create({
      name,
      category,
      imageUrl: cloudinaryResponse.secure_url,
      tags: { weather, occasion },
      userId: userEmail,
      favourite: false,
      dominantColor: dominantColor ?? "#f5f5f4",
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: unknown) {
    logger.error("Upload pipeline error", error, { requestId });
    const message = error instanceof Error ? error.message : "Failed to process image";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
