// app/api/share/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import ShareLink from "@/lib/db/models/ShareLink";
import { auth } from "@/auth";
import crypto from "crypto";
import { shareCreateLimiter } from "@/lib/rateLimit";
import { logger, getRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const userName = session.user.name || "Wardrobe Owner";

    const rl = await shareCreateLimiter.check(userEmail);
    if (!rl.allowed) {
      logger.warn("Share link rate limit exceeded", { requestId });
      return NextResponse.json(
        { error: "Too many share requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    await connectToDatabase();

    // Check if user already has an active share token
    let link = await ShareLink.findOne({ userId: userEmail });

    if (!link) {
      const token = crypto.randomUUID();
      link = await ShareLink.create({
        userId: userEmail,
        userName,
        token,
      });
    }

    // Build the absolute shareable URL based on the request host
    const origin = req.nextUrl.origin;
    const shareUrl = `${origin}/share/${link.token}`;

    return NextResponse.json({
      success: true,
      token: link.token,
      shareUrl,
    });
  } catch (error) {
    logger.error("Generate share link error", error, { requestId });
    return NextResponse.json(
      { error: "Failed to generate share link" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = getRequestId(req);
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const userName = session.user.name || "User";

    await connectToDatabase();

    const action = req.nextUrl.searchParams.get("action");
    if (action === "revoke_only") {
      await ShareLink.findOneAndDelete({ userId: userEmail });
      return NextResponse.json({
        success: true,
        revoked: true,
        shareUrl: null,
        message: "Share link revoked. Your wardrobe is now private.",
      });
    }

    const newToken = crypto.randomUUID();
    const link = await ShareLink.findOneAndUpdate(
      { userId: userEmail },
      { token: newToken, userName, createdAt: new Date() },
      { upsert: true, new: true }
    );

    const origin = req.nextUrl.origin;
    const shareUrl = `${origin}/share/${link.token}`;

    return NextResponse.json({
      success: true,
      token: link.token,
      shareUrl,
      message: "Share link revoked and regenerated",
    });
  } catch (error) {
    logger.error("Revoke share link error", error, { requestId });
    return NextResponse.json(
      { error: "Failed to revoke share link" },
      { status: 500 }
    );
  }
}
