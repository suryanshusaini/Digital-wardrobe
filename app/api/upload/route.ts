import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import Item from "@/lib/db/models/Item";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 1. Send file to Remove.bg
    const removeBgFormData = new FormData();
    removeBgFormData.append("image_file", file);
    removeBgFormData.append("size", "auto");

    const removeBgResponse = await fetch(
      "https://api.remove.bg/v1.0/removebg",
      {
        method: "POST",
        headers: {
          "X-Api-Key": process.env.REMOVE_BG_API_KEY as string,
        },
        body: removeBgFormData,
      },
    );

    if (!removeBgResponse.ok) {
      throw new Error("Failed to remove background");
    }

    // 2. Convert the clean image to a Buffer
    const arrayBuffer = await removeBgResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Upload the clean Buffer to Cloudinary
    const cloudinaryResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "digital_wardrobe" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      uploadStream.end(buffer);
    });

    // 4. Save to MongoDB
    await connectToDatabase();

    const newItem = await Item.create({
      name: file.name.split(".")[0],
      category: "top",
      imageUrl: (cloudinaryResult as any).secure_url,
      tags: { weather: [], occasion: [] },
    });

    return NextResponse.json({ success: true, item: newItem }, { status: 201 });
  } catch (error) {
    console.error("Upload pipeline error:", error);
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 },
    );
  }
}
