// app/api/outfits/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import Outfit, { type IOutfit, type IOutfitItem } from "@/lib/db/models/Outfit";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const userId = session.user.id;

    await connectToDatabase();

    // Auto-claim legacy outfits without userId for current user in MongoDB directly
    try {
      await Outfit.collection.updateMany(
        {
          $or: [
            { userId: { $exists: false } },
            { userId: null },
            { userId: "" },
          ],
        },
        { $set: { userId: userEmail } }
      );
    } catch (claimErr) {
      console.warn("Outfit auto-claim notice:", claimErr);
    }

    const query = {
      $or: [
        { userId: userEmail },
        ...(userId ? [{ userId }] : []),
        { userId: { $exists: false } },
        { userId: null },
        { userId: "" },
      ],
    };

    const outfits = await Outfit.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, outfits }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch outfits:", error);
    return NextResponse.json(
      { error: "Failed to fetch outfits" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;

    const body = await request.json();
    const { name, items } = body as { name: string; items: unknown[] };

    if (!name || typeof name !== "string" || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "name and a non-empty items array are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const outfit: IOutfit = await Outfit.create({
      name: name.trim(),
      items: items as IOutfitItem[],
      userId: userEmail,
    });

    return NextResponse.json({ success: true, outfit }, { status: 201 });
  } catch (error) {
    console.error("Failed to create outfit:", error);
    return NextResponse.json(
      { error: "Failed to save outfit" },
      { status: 500 }
    );
  }
}
