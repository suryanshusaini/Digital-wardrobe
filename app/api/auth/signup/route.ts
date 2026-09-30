import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import { authLimiter, getClientIp } from "@/lib/rateLimit";
import { SignupSchema } from "@/lib/validation/schemas";
import { logger, getRequestId } from "@/lib/logger";

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);

  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // ── Zod Validation ────────────────────────────────────────────────────────
    const validation = SignupSchema.safeParse(rawBody);
    if (!validation.success) {
      const issue = validation.error.issues[0]?.message || "Invalid account details";
      return NextResponse.json({ error: issue }, { status: 400 });
    }

    const { name, email, password } = validation.data;

    // ── Rate Limiting (5/min per IP + email) ───────────────────────────────────
    const rlKey = `${clientIp}:${email}`;
    const rl = await authLimiter.check(rlKey);
    if (!rl.allowed) {
      logger.warn("Signup rate limit exceeded", { requestId, clientIp, email });
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    // ── Database ──────────────────────────────────────────────────────────────
    await connectDB();

    // Check for existing user (case-insensitive)
    const existing = await User.findOne({ email });
    if (existing) {
      // Avoid revealing whether an email exists for security (email enumeration prevention)
      return NextResponse.json(
        { error: "Unable to create account with these details. If you already have an account, please sign in." },
        { status: 400 }
      );
    }

    // Create user — pre-save hook in User.ts hashes password with bcrypt cost 12
    const user = await User.create({
      name,
      email,
      password,
    });

    logger.info("New user registered successfully", { requestId, email });

    // Never return the password — respond with safe user fields only
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Signup error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
