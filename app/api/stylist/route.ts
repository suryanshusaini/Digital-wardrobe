// app/api/stylist/route.ts
// AI Stylist endpoint — recommends an outfit from the user's wardrobe based on weather
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import Item from "@/lib/db/models/Item";
import { stylistLimiter } from "@/lib/rateLimit";

interface StylistRequest {
  weather: string; // e.g. "sunny", "cold", "rainy", "hot", "mild"
}

export async function POST(req: Request) {
  try {
    // ── Auth gate ─────────────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.email;

    // ── Rate limit: 10 AI requests per minute per user ────────────────────────
    const rl = stylistLimiter.check(userId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before requesting another suggestion." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      );
    }

    // ── Parse request body ────────────────────────────────────────────────────
    const body = (await req.json()) as StylistRequest;
    const weather = body.weather?.trim() || "mild";

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
      const errText = await geminiRes.text();
      console.error("Gemini stylist error:", errText);
      return NextResponse.json(
        { error: "AI stylist is temporarily unavailable. Please try again." },
        { status: 502 }
      );
    }

    const geminiData = await geminiRes.json();
    const rawText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parsed: { suggestedItemIds: string[]; explanation: string };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("Failed to parse Gemini stylist response:", rawText);
      return NextResponse.json(
        { error: "AI returned an unexpected response format. Please retry." },
        { status: 500 }
      );
    }

    // Validate that returned IDs actually belong to this user's wardrobe
    const validIds = new Set(items.map((i) => i._id.toString()));
    const safeIds = (parsed.suggestedItemIds ?? []).filter((id) =>
      validIds.has(id)
    );

    return NextResponse.json({
      suggestedItemIds: safeIds,
      explanation: parsed.explanation ?? "",
      source: "ai",
    });
  } catch (error: unknown) {
    console.error("AI Stylist error:", error);
    const message =
      error instanceof Error ? error.message : "Stylist service error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
