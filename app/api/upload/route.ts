import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import Item, { type IItem } from "@/lib/db/models/Item";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { auth } from "@/auth";
import { uploadLimiter } from "@/lib/rateLimit";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const VALID_CATEGORIES = ["top", "bottom", "shoes", "accessory", "outfit"] as const;
type ValidCategory = (typeof VALID_CATEGORIES)[number];

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userEmail = session.user.email;

    // Rate limit: 15 uploads per minute per user
    const rl = uploadLimiter.check(userEmail);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many uploads. Please wait a moment and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      );
    }

    const formData = await req.formData();
    const file = (formData.get("file") || formData.get("imageFile") || formData.get("image")) as File | null;
    const name = (formData.get("name") as string) || file?.name?.split(".")[0] || "Clothing Item";
    const categoryRaw = (formData.get("category") as string) || "top";
    const weatherRaw = (formData.get("weather") as string) || "";
    const occasionRaw = (formData.get("occasion") as string) || "";
    const weather = weatherRaw.split(",").filter(Boolean);
    const occasion = occasionRaw.split(",").filter(Boolean);

    if (!file || typeof file === "string" || file.size === 0) {
      return NextResponse.json({ error: "No valid file uploaded" }, { status: 400 });
    }

    // Server-side size cap (15MB)
    const MAX_BYTES = 15 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File exceeds 15MB size limit" },
        { status: 400 }
      );
    }

    const category = categoryRaw.toLowerCase() as ValidCategory;
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
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
    });

    // ── Phase 4: 3D Asset Pipeline (non-blocking placeholder) ─────────────────
    //
    // Once a 3D generation API key is configured, enable this block to
    // automatically convert every uploaded clothing photo into a .glb 3D model.
    //
    // Supported providers:
    //   • Tripo3D  — https://platform.tripo3d.ai/docs
    //   • Meshy    — https://docs.meshy.ai/api-image-to-3d
    //
    // The call is wrapped in `void` so it NEVER blocks or delays this response.
    // On success it patches model3dUrl onto the Item document in the background.
    //
    // void (async () => {
    //   try {
    //     const api3dKey = process.env.TRIPO3D_API_KEY; // or MESHY_API_KEY
    //     if (!api3dKey) return;
    //
    //     // Submit the image buffer to the 3D generation queue
    //     const form = new FormData();
    //     form.append("image", new Blob([buffer], { type: file.type }), file.name);
    //     form.append("mode", "refine");          // refine | draft
    //
    //     const submitRes = await fetch("https://platform.tripo3d.ai/v2/3dmodel", {
    //       method: "POST",
    //       headers: { Authorization: `Bearer ${api3dKey}` },
    //       body: form,
    //     });
    //
    //     if (!submitRes.ok) return;
    //     const { task_id } = await submitRes.json();
    //
    //     // Poll until model is ready (max ~5 min)
    //     for (let attempt = 0; attempt < 30; attempt++) {
    //       await new Promise((r) => setTimeout(r, 10_000)); // wait 10 s
    //       const pollRes = await fetch(
    //         `https://platform.tripo3d.ai/v2/3dmodel/${task_id}`,
    //         { headers: { Authorization: `Bearer ${api3dKey}` } }
    //       );
    //       if (!pollRes.ok) continue;
    //       const { status, output } = await pollRes.json();
    //       if (status === "success" && output?.model) {
    //         // Patch the model URL onto the Item document
    //         await Item.findByIdAndUpdate(newItem._id, {
    //           model3dUrl: output.model, // HTTPS URL to the .glb file
    //         });
    //         console.log(`3D model generated for item ${newItem._id}: ${output.model}`);
    //         break;
    //       }
    //       if (status === "failed") break;
    //     }
    //   } catch (err3d) {
    //     // Non-fatal — log and continue; the 2D item still works fine
    //     console.warn("3D generation pipeline error (non-blocking):", err3d);
    //   }
    // })();
    // ── End of 3D pipeline placeholder ───────────────────────────────────────

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: unknown) {
    console.error("Upload pipeline error:", error);
    const message = error instanceof Error ? error.message : "Failed to process image";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
