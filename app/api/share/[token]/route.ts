import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import ShareLink from "@/lib/db/models/ShareLink";
import Item from "@/lib/db/models/Item";
import Outfit from "@/lib/db/models/Outfit";
import { shareReadLimiter, getClientIp } from "@/lib/rateLimit";
import { ShareTokenSchema } from "@/lib/validation/schemas";
import { logger, getRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/share/[token]">
) {
  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);

  // Rate limit: 60 reads per minute per IP
  const rl = await shareReadLimiter.check(clientIp);
  if (!rl.allowed) {
    logger.warn("Public share read rate limit exceeded", { requestId, clientIp });
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const { token } = await ctx.params;
  const tokenValidation = ShareTokenSchema.safeParse(token);
  if (!tokenValidation.success) {
    return NextResponse.json(
      { error: "Invalid share link format" },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const link = await ShareLink.findOne({ token: tokenValidation.data });
    if (!link) {
      return NextResponse.json(
        { error: "This link is invalid or has expired" },
        { status: 404 }
      );
    }

    // STRICT PRIVACY: Project ONLY public presentation fields.
    // Explicitly exclude userId, user email, private notes, and internal document keys.
    const [rawItems, rawOutfits] = await Promise.all([
      Item.find({ userId: link.userId })
        .select("_id name category imageUrl tags createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      Outfit.find({ userId: link.userId })
        .select("_id name items previewImage createdAt")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // Sanitize items: strip any accidental internal fields
    const publicItems = rawItems.map((item) => ({
      _id: String(item._id),
      name: item.name,
      category: item.category,
      imageUrl: item.imageUrl,
      tags: item.tags,
      createdAt: item.createdAt,
    }));

    const publicOutfits = rawOutfits.map((outfit) => ({
      _id: String(outfit._id),
      name: outfit.name,
      items: outfit.items,
      createdAt: outfit.createdAt,
    }));

    // Sanitize owner name: only show first name or display name, never email
    const safeOwnerName = (link.userName || "Wardrobe Owner")
      .split("@")[0]
      .trim();

    return NextResponse.json(
      {
        success: true,
        ownerName: safeOwnerName,
        items: publicItems,
        outfits: publicOutfits,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Public share lookup error", error, { requestId });
    return NextResponse.json(
      { error: "Failed to fetch shared wardrobe" },
      { status: 500 }
    );
  }
}
