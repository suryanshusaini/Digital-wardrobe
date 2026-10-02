// app/api/health/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import mongoose from "mongoose";
import { healthLimiter, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);

  // Rate limiting: 60 req/min per IP
  const rl = await healthLimiter.check(clientIp);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many health check requests." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const timestamp = new Date().toISOString();

  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("No database instance");
    }

    // Ping MongoDB
    await db.admin().ping();

    return NextResponse.json(
      {
        status: "ok",
        db: "ok",
        timestamp,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        db: "error",
        timestamp,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
