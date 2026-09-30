// app/api/share/[token]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import ShareLink from "@/lib/db/models/ShareLink";
import Item from "@/lib/db/models/Item";
import Outfit from "@/lib/db/models/Outfit";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/share/[token]">
) {
  const { token } = await ctx.params;

  if (!token) {
    return NextResponse.json(
      { error: "Token is required" },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const link = await ShareLink.findOne({ token });
    if (!link) {
      return NextResponse.json(
        { error: "This link is invalid or has expired" },
        { status: 404 }
      );
    }

    // Safely query owner's items and outfits — NEVER expose owner email or private account data
    const [items, outfits] = await Promise.all([
      Item.find({ userId: link.userId }).sort({ createdAt: -1 }),
      Outfit.find({ userId: link.userId }).sort({ createdAt: -1 }),
    ]);

    return NextResponse.json(
      {
        success: true,
        ownerName: link.userName || "Wardrobe Owner",
        items,
        outfits,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Public share lookup error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shared wardrobe" },
      { status: 500 }
    );
  }
}
