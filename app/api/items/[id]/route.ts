import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import Item from "@/lib/db/models/Item";
import Outfit from "@/lib/db/models/Outfit";
import { auth } from "@/auth";
import { ObjectIdSchema, ItemUpdateSchema } from "@/lib/validation/schemas";
import { logger, getRequestId } from "@/lib/logger";

export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/items/[id]">
) {
  const requestId = getRequestId(req);
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const idValidation = ObjectIdSchema.safeParse(id);
  if (!idValidation.success || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid item ID format" }, { status: 400 });
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
      logger.warn("Failed to cascade delete item from outfits", {
        requestId,
        itemId: id,
        error: cascadeError instanceof Error ? cascadeError.message : "Cascade error",
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("Delete item error", error, { requestId, itemId: id });
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
  const requestId = getRequestId(req);
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const idValidation = ObjectIdSchema.safeParse(id);
  if (!idValidation.success || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid item ID format" }, { status: 400 });
  }
  const userEmail = session.user.email;
  const userId = session.user.id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bodyValidation = ItemUpdateSchema.safeParse(body);
  if (!bodyValidation.success) {
    return NextResponse.json({ error: "Invalid item update data" }, { status: 400 });
  }

  const { name, category, weather, occasion } = bodyValidation.data;

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (category !== undefined) update.category = category;
  if (weather !== undefined || occasion !== undefined) {
    update.tags = {
      ...(weather !== undefined ? { weather } : {}),
      ...(occasion !== undefined ? { occasion } : {}),
    };
  }

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
    logger.error("Update item error", error, { requestId, itemId: id });
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

