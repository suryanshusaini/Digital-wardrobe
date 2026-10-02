// app/api/account/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import Item from "@/lib/db/models/Item";
import Outfit from "@/lib/db/models/Outfit";
import ShareLink from "@/lib/db/models/ShareLink";
import { v2 as cloudinary } from "cloudinary";
import { extractCloudinaryPublicId } from "@/lib/cloudinaryUrl";
import { logger, getRequestId } from "@/lib/logger";
import mongoose from "mongoose";
import { accountDeleteLimiter, getClientIp } from "@/lib/rateLimit";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const userId = session.user.id;

    // Rate-limit account deletion (5 attempts / min per user and per IP)
    const [userRl, ipRl] = await Promise.all([
      accountDeleteLimiter.check(`user:${userEmail}`),
      accountDeleteLimiter.check(`ip:${clientIp}`),
    ]);
    if (!userRl.allowed || !ipRl.allowed) {
      const retryAfter = Math.max(userRl.retryAfter, ipRl.retryAfter);
      return NextResponse.json(
        { error: "Too many deletion requests. Please wait before retrying." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    // Require explicit confirmation payload: { confirm: "DELETE" }
    let body: { confirm?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty if called without json
    }

    if (body.confirm !== "DELETE") {
      return NextResponse.json(
        { error: "Account deletion requires explicit confirmation ('DELETE')." },
        { status: 400 }
      );
    }

    await connectDB();

    const userMatch = {
      $or: [
        { userId: userEmail },
        ...(userId ? [{ userId }] : []),
      ],
    };

    // 1. Collect user items and outfits
    const [userItems, userOutfits] = await Promise.all([
      Item.find(userMatch).select("_id imageUrl originalImageUrl").lean(),
      Outfit.find(userMatch).select("_id items").lean(),
    ]);

    // Helper to safely destroy a Cloudinary asset with { invalidate: true }
    const destroyAsset = async (publicId: string): Promise<boolean> => {
      try {
        const res = await cloudinary.uploader.destroy(publicId, { invalidate: true });
        if (res?.result === "ok" || res?.result === "not found") {
          return true;
        }
        logger.warn("Cloudinary asset destroy reported non-ok status", {
          requestId,
          status: res?.result,
          assetSuffix: publicId.slice(-6),
        });
        return false;
      } catch (cErr) {
        logger.warn("Cloudinary asset destroy failed during account deletion", {
          requestId,
          assetSuffix: publicId.slice(-6),
          errorMessage: cErr instanceof Error ? cErr.message : "Cloudinary destroy exception",
        });
        return false;
      }
    };

    // 2. Process each item: attempt Cloudinary destroy on its images
    const successfulItemIds: mongoose.Types.ObjectId[] = [];
    let failedItemCount = 0;

    await Promise.all(
      userItems.map(async (it) => {
        const pids: string[] = [];
        if (it.imageUrl) {
          const pid = extractCloudinaryPublicId(it.imageUrl);
          if (pid) pids.push(pid);
        }
        if (it.originalImageUrl) {
          const pid = extractCloudinaryPublicId(it.originalImageUrl);
          if (pid) pids.push(pid);
        }

        // If item has no Cloudinary images, it is safe to delete
        if (pids.length === 0) {
          successfulItemIds.push(it._id as mongoose.Types.ObjectId);
          return;
        }

        const results = await Promise.all(pids.map((pid) => destroyAsset(pid)));
        const allSucceeded = results.every(Boolean);

        if (allSucceeded) {
          successfulItemIds.push(it._id as mongoose.Types.ObjectId);
        } else {
          failedItemCount += 1;
        }
      })
    );

    // Also attempt destroy on any outfit image assets (with { invalidate: true })
    const outfitPids = new Set<string>();
    for (const outfit of userOutfits) {
      if (Array.isArray(outfit.items)) {
        for (const it of outfit.items) {
          if (it.imageUrl) {
            const pid = extractCloudinaryPublicId(it.imageUrl);
            if (pid) outfitPids.add(pid);
          }
        }
      }
    }
    await Promise.allSettled(
      Array.from(outfitPids).map((pid) => destroyAsset(pid))
    );

    // 3. Partial failure handling: if any item's Cloudinary destroy failed,
    // do NOT delete that item's DB record, do NOT delete user record, and ask user to retry.
    if (failedItemCount > 0) {
      if (successfulItemIds.length > 0) {
        await Item.deleteMany({ _id: { $in: successfulItemIds } });
      }

      logger.warn("Account deletion completed partially due to Cloudinary destroy errors", {
        requestId,
        deletedItemsCount: successfulItemIds.length,
        failedItemCount,
        remainingItemsCount: userItems.length - successfulItemIds.length,
      });

      return NextResponse.json(
        {
          success: false,
          partial: true,
          error: `Could not delete ${failedItemCount} item image(s) from cloud storage. Database records for those items and your account have been retained. Please retry deletion.`,
          failedCount: failedItemCount,
          deletedCount: successfulItemIds.length,
        },
        { status: 502 }
      );
    }

    // 4. Everything succeeded: purge all database records for this user
    const [deletedItems, deletedOutfits, deletedShares, deletedUser] = await Promise.all([
      Item.deleteMany(userMatch),
      Outfit.deleteMany(userMatch),
      ShareLink.deleteMany({ userId: userEmail }),
      User.deleteOne({
        $or: [
          { email: userEmail },
          ...(userId ? [{ _id: userId }] : []),
        ],
      }),
    ]);

    logger.info("Account deletion completed successfully", {
      requestId,
      deletedItemsCount: deletedItems.deletedCount,
      deletedOutfitsCount: deletedOutfits.deletedCount,
      deletedSharesCount: deletedShares.deletedCount,
      deletedUserCount: deletedUser.deletedCount,
    });

    return NextResponse.json({
      success: true,
      message: "Account and all associated wardrobe data successfully deleted.",
    });
  } catch (error) {
    logger.error("Account deletion error occurred", error, { requestId });
    return NextResponse.json(
      { error: "Failed to delete account. Please try again or contact support." },
      { status: 500 }
    );
  }
}
