// app/api/stylist/route.ts
// AI Stylist endpoint — recommends an outfit from the user's wardrobe based on weather
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import Item from "@/lib/db/models/Item";
import { stylistMinuteLimiter, stylistDayLimiter } from "@/lib/rateLimit";
import { StylistRequestSchema } from "@/lib/validation/schemas";
import { logger, getRequestId } from "@/lib/logger";
import { z } from "zod";

const GeminiStylistSchema = z.object({
  suggestedItemIds: z.array(z.string()).default([]),
  explanation: z.string().default("Curated for current conditions."),
});

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  try {
    // ── Auth gate ─────────────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.email;

    // ── Rate limits: 5/min and 50/day per user ────────────────────────────────
    const minRl = await stylistMinuteLimiter.check(userId);
    if (!minRl.allowed) {
      logger.warn("Stylist minute limit exceeded", { requestId, route: "/api/stylist", userId });
      return NextResponse.json(
        { error: "Too many stylist requests. Please wait a moment." },
        {
          status: 429,
          headers: { "Retry-After": String(minRl.retryAfter) },
        }
      );
    }

    const dayRl = await stylistDayLimiter.check(userId);
    if (!dayRl.allowed) {
      logger.warn("Stylist daily limit exceeded", { requestId, route: "/api/stylist", userId });
      return NextResponse.json(
        { error: "Daily styling limit reached. Please check back tomorrow." },
        {
          status: 429,
          headers: { "Retry-After": String(dayRl.retryAfter) },
        }
      );
    }

    // ── Parse and validate request body with Zod ──────────────────────────────
    let rawJson: unknown;
    try {
      rawJson = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const bodyValidation = StylistRequestSchema.safeParse(rawJson);
    if (!bodyValidation.success) {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
    }

    const weather = bodyValidation.data.weather;

    // ── Fetch user's wardrobe items ───────────────────────────────────────────
    await connectDB();
    const items = await Item.find({
      $or: [{ userId }, { userId: session.user.id }],
    })
      .select("_id name category tags imageUrl")
      .lean();

    if (!items.length) {
      return NextResponse.json(
        { error: "Your wardrobe is empty. Add some items first!" },
        { status: 400 }
      );
    }

    // ── Format wardrobe as a compact prompt context ───────────────────────────
    const wardrobeContext = items
      .map(
        (item) =>
          `ID:${item._id} | ${item.category} | "${item.name}" | weather:${(item.tags?.weather ?? []).join(",")} | occasion:${(item.tags?.occasion ?? []).join(",")}`
      )
      .join("\n");

    const prompt = `You are a personal stylist AI. The user wants an outfit recommendation for ${weather} weather.

Here is their wardrobe (one item per line):
${wardrobeContext}

Task: Choose the best outfit for "${weather}" weather. Pick one item from each relevant category (top, bottom, shoes, accessory — accessory is optional). Prioritize items whose weather tags include "${weather}". If no exact match, pick the most suitable item.

Respond ONLY with valid JSON matching this exact schema:
{
  "suggestedItemIds": ["<mongodb_id_1>", "<mongodb_id_2>", ...],
  "explanation": "<one short sentence explaining the outfit choice>"
}

Do not include any other text or markdown.`;

    // ── Call Gemini 1.5 Flash ─────────────────────────────────────────────────
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      // Graceful fallback: return weather-filtered items without AI
      const filtered = items.filter((item) =>
        (item.tags?.weather ?? []).includes(weather)
      );
      const fallbackIds = filtered
        .slice(0, 4)
        .map((i) => i._id.toString());

      return NextResponse.json({
        suggestedItemIds: fallbackIds,
        explanation: `Showing items tagged for ${weather} weather (AI unavailable — set GEMINI_API_KEY to enable AI styling).`,
        source: "heuristic",
      });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
            maxOutputTokens: 256,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      logger.warn("Gemini stylist API error, falling back to heuristics", { requestId });
      const filtered = items.filter((item) => (item.tags?.weather ?? []).includes(weather));
      const fallbackIds = filtered.slice(0, 4).map((i) => i._id.toString());
      return NextResponse.json({
        suggestedItemIds: fallbackIds.length ? fallbackIds : items.slice(0, 4).map((i) => i._id.toString()),
        explanation: `Curated selection for ${weather} weather conditions.`,
        source: "heuristic",
      });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let rawParsed: unknown = null;
    try {
      rawParsed = JSON.parse(rawText);
    } catch {
      logger.warn("Failed to parse Gemini raw response as JSON", { requestId });
    }

    // Validate with Zod
    const modelValidation = GeminiStylistSchema.safeParse(rawParsed);
    if (!modelValidation.success) {
      logger.warn("Gemini response failed Zod validation, falling back to heuristics", {
        requestId,
        errors: modelValidation.error.issues,
      });
      const filtered = items.filter((item) => (item.tags?.weather ?? []).includes(weather));
      const fallbackIds = filtered.slice(0, 4).map((i) => i._id.toString());
      return NextResponse.json({
        suggestedItemIds: fallbackIds.length ? fallbackIds : items.slice(0, 4).map((i) => i._id.toString()),
        explanation: `Curated selection for ${weather} weather conditions.`,
        source: "heuristic",
      });
    }

    // Validate that returned IDs actually belong to this user's wardrobe
    const validIds = new Set(items.map((i) => i._id.toString()));
    const safeIds = modelValidation.data.suggestedItemIds.filter((id) => validIds.has(id));

    return NextResponse.json({
      suggestedItemIds: safeIds.length ? safeIds : items.slice(0, 4).map((i) => i._id.toString()),
      explanation: modelValidation.data.explanation,
      source: "ai",
    });
  } catch (error: unknown) {
    logger.error("AI Stylist unhandled error", error, { requestId });
    return NextResponse.json(
      { error: "An unexpected error occurred while styling." },
      { status: 500 }
    );
  }
}
