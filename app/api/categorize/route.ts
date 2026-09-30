// app/api/categorize/route.ts
import { NextResponse } from "next/server";

const VALID_CATEGORIES = ["top", "bottom", "shoes", "accessory", "outfit"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

interface CategorizationResult {
  category: Category;
  weather: string[];
  occasion: string[];
  source: "ai" | "heuristic";
}

function detectFromFilename(filename: string): CategorizationResult {
  const lower = filename.toLowerCase();

  // Shoes & footwear
  if (
    lower.includes("shoe") ||
    lower.includes("sneaker") ||
    lower.includes("boot") ||
    lower.includes("heel") ||
    lower.includes("loafer") ||
    lower.includes("sandal") ||
    lower.includes("slide") ||
    lower.includes("footwear") ||
    lower.includes("runner")
  ) {
    return {
      category: "shoes",
      weather: ["sunny", "mild"],
      occasion: lower.includes("heel") || lower.includes("loafer") ? ["formal"] : ["casual"],
      source: "heuristic",
    };
  }

  // Bottoms
  if (
    lower.includes("pant") ||
    lower.includes("trouser") ||
    lower.includes("jean") ||
    lower.includes("denim") ||
    lower.includes("short") ||
    lower.includes("skirt") ||
    lower.includes("legging") ||
    lower.includes("jogger") ||
    lower.includes("chino")
  ) {
    return {
      category: "bottom",
      weather: lower.includes("short") ? ["hot", "sunny"] : ["mild"],
      occasion: ["casual"],
      source: "heuristic",
    };
  }

  // Accessories
  if (
    lower.includes("hat") ||
    lower.includes("cap") ||
    lower.includes("beanie") ||
    lower.includes("bag") ||
    lower.includes("belt") ||
    lower.includes("scarf") ||
    lower.includes("glove") ||
    lower.includes("glass") ||
    lower.includes("watch") ||
    lower.includes("necklace") ||
    lower.includes("jewelry") ||
    lower.includes("wallet") ||
    lower.includes("tie")
  ) {
    return {
      category: "accessory",
      weather: lower.includes("beanie") || lower.includes("scarf") ? ["cold"] : ["sunny"],
      occasion: ["casual"],
      source: "heuristic",
    };
  }

  // Tops & outerwear (default)
  const isCold =
    lower.includes("hoodie") ||
    lower.includes("jacket") ||
    lower.includes("coat") ||
    lower.includes("sweater") ||
    lower.includes("cardigan");

  return {
    category: "top",
    weather: isCold ? ["cold"] : ["sunny", "mild"],
    occasion: lower.includes("blazer") || lower.includes("suit") ? ["formal"] : ["casual"],
    source: "heuristic",
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    const fileName = file.name || "clothing.jpg";
    const mimeType = file.type || "image/jpeg";

    // ── 1. If GEMINI_API_KEY is available, call Gemini Vision API ────────────
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");

        const prompt = `Analyze this fashion item image.
Identify its category and output ONLY valid JSON matching this exact schema:
{
  "category": "top" | "bottom" | "shoes" | "accessory",
  "weather": string[], // Choose 1-2 from: ["sunny", "rainy", "cold", "hot", "mild"]
  "occasion": string[] // Choose 1-2 from: ["casual", "formal", "sport", "party", "beach"]
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType: mimeType,
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            const cat = parsed.category?.toLowerCase();
            if (VALID_CATEGORIES.includes(cat as Category)) {
              return NextResponse.json({
                success: true,
                category: cat,
                weather: Array.isArray(parsed.weather) ? parsed.weather : ["mild"],
                occasion: Array.isArray(parsed.occasion) ? parsed.occasion : ["casual"],
                source: "ai",
              });
            }
          }
        }
      } catch (geminiError) {
        console.warn("Gemini vision analysis failed, falling back to heuristics:", geminiError);
      }
    }

    // ── 2. Heuristic fallback based on filename and image traits ─────────────
    const result = detectFromFilename(fileName);
    return NextResponse.json({
      success: true,
      category: result.category,
      weather: result.weather,
      occasion: result.occasion,
      source: result.source,
    });
  } catch (error) {
    console.error("Auto-categorize error:", error);
    return NextResponse.json(
      { success: true, category: "top", weather: [], occasion: [], source: "fallback" },
      { status: 200 }
    );
  }
}
