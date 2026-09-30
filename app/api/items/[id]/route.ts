import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import Item from "@/lib/db/models/Item";
import Outfit from "@/lib/db/models/Outfit";
import { auth } from "@/auth";

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/items/[id]">
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
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

    const deleted = await Item.findOneAndDelete({ _id: id, ...userMatch });
    if (!deleted) {
      return NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });
    }

    // Cascade delete: remove references to this item from any saved outfits
    try {
      await Outfit.updateMany(
        { "items.itemId": id, ...userMatch },
        { $pull: { items: { itemId: id } } }
      );
    } catch (cascadeError) {
      console.warn("Failed to cascade delete item from outfits:", cascadeError);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete item error:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/items/[id]">
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
  }
  const userEmail = session.user.email;
  const userId = session.user.id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, category, tags } = body as {
    name?: string;
    category?: string;
    tags?: { weather: string[]; occasion: string[] };
  };

  const validCategories = ["top", "bottom", "shoes", "accessory", "outfit"];
  if (category && !validCategories.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (category !== undefined) update.category = category;
  if (tags !== undefined) update.tags = tags;

  try {
    await connectToDatabase();
    const userMatch = {
      $or: [
        { userId: userEmail },
        ...(userId ? [{ userId }] : []),
        { userId: { $exists: false } },
      ],
    };

    const updated = await Item.findOneAndUpdate(
      { _id: id, ...userMatch },
      update,
      { new: true }
    );
    if (!updated) {
      return NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });
    }
    return NextResponse.json({ success: true, item: updated }, { status: 200 });
  } catch (error) {
    console.error("Update item error:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

