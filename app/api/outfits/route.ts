// app/api/outfits/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import Outfit, { type IOutfit, type IOutfitItem } from "@/lib/db/models/Outfit";
import { auth } from "@/auth";

import { logger, getRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const userId = session.user.id;

    await connectToDatabase();

    const query = {
      $or: [
        { userId: userEmail },
        ...(userId ? [{ userId }] : []),
      ],
    };

    const outfits = await Outfit.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, outfits }, { status: 200 });
  } catch (error) {
    logger.error("Failed to fetch outfits", error, { requestId });
    return NextResponse.json(
      { error: "Failed to fetch outfits" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, items } = (body || {}) as { name?: string; items?: unknown[] };

    if (!name || typeof name !== "string" || name.trim().length === 0 || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Name and a non-empty items array are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const outfit: IOutfit = await Outfit.create({
      name: name.trim().slice(0, 100),
      items: items as IOutfitItem[],
      userId: userEmail,
    });

    return NextResponse.json({ success: true, outfit }, { status: 201 });
  } catch (error) {
    logger.error("Failed to create outfit", error, { requestId });
    return NextResponse.json(
      { error: "Failed to save outfit" },
      { status: 500 }
    );
  }
}
