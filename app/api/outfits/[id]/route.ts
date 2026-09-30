// app/api/outfits/[id]/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import Outfit from "@/lib/db/models/Outfit";
import { auth } from "@/auth";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/outfits/[id]">
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid outfit ID" }, { status: 400 });
  }

  const userEmail = session.user.email;
  const userId = session.user.id;

  try {
    await connectToDatabase();
    const userMatch = {
      $or: [
        { userId: userEmail },
        ...(userId ? [{ userId }] : []),
        { userId: { $exists: false } },
      ],
    };

    const outfit = await Outfit.findOne({ _id: id, ...userMatch });
    if (!outfit) {
      return NextResponse.json({ error: "Outfit not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, outfit }, { status: 200 });
  } catch (error) {
    console.error("Fetch outfit error:", error);
    return NextResponse.json(
      { error: "Failed to fetch outfit" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/outfits/[id]">
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid outfit ID" }, { status: 400 });
  }
  const userEmail = session.user.email;
  const userId = session.user.id;

  try {
    await connectToDatabase();
    const userMatch = {
      $or: [
        { userId: userEmail },
        ...(userId ? [{ userId }] : []),
        { userId: { $exists: false } },
      ],
    };

    const deleted = await Outfit.findOneAndDelete({ _id: id, ...userMatch });
    if (!deleted) {
      return NextResponse.json({ error: "Outfit not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete outfit error:", error);
    return NextResponse.json(
      { error: "Failed to delete outfit" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/outfits/[id]">
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid outfit ID" }, { status: 400 });
  }
  const userEmail = session.user.email;
  const userId = session.user.id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, items } = body as {
    name?: string;
    items?: unknown[];
  };

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (items !== undefined) update.items = items;

  try {
    await connectToDatabase();
    const userMatch = {
      $or: [
        { userId: userEmail },
        ...(userId ? [{ userId }] : []),
        { userId: { $exists: false } },
      ],
    };

    const updated = await Outfit.findOneAndUpdate(
      { _id: id, ...userMatch },
      update,
      { new: true }
    );
    if (!updated) {
      return NextResponse.json({ error: "Outfit not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, outfit: updated }, { status: 200 });
  } catch (error) {
    console.error("Update outfit error:", error);
    return NextResponse.json(
      { error: "Failed to update outfit" },
      { status: 500 }
    );
  }
}

