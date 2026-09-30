// app/api/items/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import Item from "@/lib/db/models/Item";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const userId = session.user.id;

    await connectToDatabase();

    // Auto-claim any unassigned / default items for the active user in MongoDB directly
    try {
      await Item.collection.updateMany(
        {
          $or: [
            { userId: { $exists: false } },
            { userId: null },
            { userId: "" },
            { userId: "default-user" },
          ],
        },
        { $set: { userId: userEmail } }
      );
    } catch (claimErr) {
      console.warn("Item auto-claim notice:", claimErr);
    }

    // Query items belonging to the user, with safety fallback for unassigned items
    const query = {
      $or: [
        { userId: userEmail },
        ...(userId ? [{ userId }] : []),
        { userId: { $exists: false } },
        { userId: null },
        { userId: "" },
        { userId: "default-user" },
      ],
    };

    const items = await Item.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, items }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch items:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

