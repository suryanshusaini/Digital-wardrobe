"use client";

import { useState } from "react";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const WEATHER_OPTIONS = [
  { id: "mild", label: "Mild · 18°C", emoji: "🌤️" },
  { id: "sunny", label: "Sunny · Warm", emoji: "☀️" },
  { id: "cold", label: "Cold · Crisp", emoji: "❄️" },
  { id: "rainy", label: "Rainy · Overcast", emoji: "🌧️" },
  { id: "hot", label: "Hot · Summer", emoji: "🏖️" },
];

interface OutfitRecommendation {
  top?: string;
  bottom?: string;
  shoes?: string;
  accessory?: string;
  reasoning?: string;
}

export default function StylistRecommender() {
  const { toast } = useToast();
  const [selectedWeather, setSelectedWeather] = useState("mild");
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<OutfitRecommendation | null>(null);

  const handleGetRecommendation = async () => {
    setLoading(true);
    setRecommendation(null);
    try {
      const res = await fetch("/api/stylist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weather: selectedWeather }),
      });

      if (res.status === 429) {
        toast("Stylist rate limit reached. Please wait a moment.", "error");
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast(data.error || "Could not generate outfit recommendation.", "error");
        return;
      }

      setRecommendation(data.recommendation);
      toast("Look curated for your day", "success");
    } catch {
      toast("Network error communicating with AI stylist.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-xs transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-accent" />
        <h3 className="text-sm font-medium tracking-tight text-foreground">
          AI Personal Stylist
        </h3>
      </div>
      <p className="text-xs text-muted leading-relaxed mb-4">
        Curate a cohesive look from your wardrobe tailored to the day&apos;s weather.
      </p>

      {/* Weather Selector */}
      <div className="flex flex-wrap gap-2 mb-5">
        {WEATHER_OPTIONS.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => setSelectedWeather(w.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
              selectedWeather === w.id
                ? "bg-accent text-accent-foreground shadow-2xs"
                : "bg-surface border border-border text-muted hover:text-foreground"
            }`}
          >
            <span aria-hidden>{w.emoji}</span>
            <span>{w.label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleGetRecommendation}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-xs font-medium hover:opacity-90 active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        {loading ? (
          <>
            <Loader2 size={13} className="animate-spin text-accent" />
            <span>Consulting archive…</span>
          </>
        ) : (
          <>
            <span>Curate Outfit</span>
            <ArrowRight size={13} />
          </>
        )}
      </button>

      {/* Recommendation Result */}
      {recommendation && (
        <div className="mt-5 pt-5 border-t border-border space-y-3">
          <p className="text-xs font-serif font-light text-foreground text-sm tracking-tight">
            Curator&apos;s Selection
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {recommendation.top && (
              <div className="rounded-xl border border-border bg-background p-3">
                <span className="text-[10px] uppercase text-muted tracking-wider block mb-0.5">Top</span>
                <span className="font-medium text-foreground">{recommendation.top}</span>
              </div>
            )}
            {recommendation.bottom && (
              <div className="rounded-xl border border-border bg-background p-3">
                <span className="text-[10px] uppercase text-muted tracking-wider block mb-0.5">Bottom</span>
                <span className="font-medium text-foreground">{recommendation.bottom}</span>
              </div>
            )}
            {recommendation.shoes && (
              <div className="rounded-xl border border-border bg-background p-3">
                <span className="text-[10px] uppercase text-muted tracking-wider block mb-0.5">Shoes</span>
                <span className="font-medium text-foreground">{recommendation.shoes}</span>
              </div>
            )}
            {recommendation.accessory && (
              <div className="rounded-xl border border-border bg-background p-3">
                <span className="text-[10px] uppercase text-muted tracking-wider block mb-0.5">Accessory</span>
                <span className="font-medium text-foreground">{recommendation.accessory}</span>
              </div>
            )}
          </div>
          {recommendation.reasoning && (
            <p className="text-xs text-muted italic bg-background/50 rounded-xl p-3 border border-border">
              &ldquo;{recommendation.reasoning}&rdquo;
            </p>
          )}
        </div>
      )}
    </section>
  );
}
