"use client";

/**
 * TodaysPick — AI stylist suggestion card.
 * - Triggered on user click (never on page load) to respect rate limits.
 * - Caches result in sessionStorage keyed by today's date (try/catch safe).
 * - Shows StitchLoader while loading, friendly error/empty states.
 * - "Try in Outfit Maker" action passes suggestion to parent.
 */

import { useState, useCallback } from "react";
import { Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import StitchLoader from "@/components/ui/StitchLoader";

interface TodaysPickProps {
  onTryInMaker: (suggestion: string, suggestedItemIds?: string[]) => void;
}

interface StylistResult {
  recommendation: string;
  suggestedItemIds?: string[];
}

const CACHE_KEY = `dw-todays-pick-${new Date().toISOString().slice(0, 10)}`;

function loadFromCache(): StylistResult | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as StylistResult;
  } catch {
    // ignore
  }
  return null;
}

function saveToCache(result: StylistResult) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
  } catch {
    // ignore
  }
}

export default function TodaysPick({ onTryInMaker }: TodaysPickProps) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    () => (loadFromCache() ? "success" : "idle")
  );
  const [result, setResult] = useState<StylistResult | null>(() => loadFromCache());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFetch = useCallback(async () => {
    setState("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/stylist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Suggest one outfit I can make with my wardrobe today. Keep it to 1-2 sentences.",
        }),
      });

      if (res.status === 429) {
        setErrorMsg("You've reached today's styling limit. Try again later.");
        setState("error");
        return;
      }
      if (!res.ok) {
        setErrorMsg("Could not reach the stylist right now. Try again.");
        setState("error");
        return;
      }

      const data = await res.json() as {
        recommendation?: string;
        explanation?: string;
        response?: string;
        suggestedItemIds?: string[];
      };
      const recommendation = data.explanation ?? data.recommendation ?? data.response ?? "";
      const suggestedItemIds = Array.isArray(data.suggestedItemIds) ? data.suggestedItemIds : [];
      if (!recommendation && suggestedItemIds.length === 0) {
        setErrorMsg("No suggestion returned. Try again.");
        setState("error");
        return;
      }
      const picked: StylistResult = { recommendation, suggestedItemIds };
      setResult(picked);
      saveToCache(picked);
      setState("success");
    } catch {
      setErrorMsg("Network error. Check your connection and try again.");
      setState("error");
    }
  }, []);

  return (
    <div className="card card-stitch rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-accent shrink-0" style={{ color: "var(--accent)" }} />
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Today&rsquo;s Pick</span>
      </div>

      {state === "idle" && (
        <button
          onClick={handleFetch}
          className="flex items-center gap-2 self-start rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          style={{ ["--hover-color" as string]: "var(--accent)" }}
        >
          <Sparkles size={12} aria-hidden />
          Curate today&rsquo;s look
        </button>
      )}

      {state === "loading" && (
        <div className="flex items-center gap-3 py-2">
          <StitchLoader size={28} label="Curating your look…" />
          <span className="text-xs text-muted">Consulting your wardrobe…</span>
        </div>
      )}

      {state === "success" && result && (
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-foreground">{result.recommendation}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTryInMaker(result.recommendation, result.suggestedItemIds)}
              className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              Try in Outfit Maker
              <ArrowRight size={12} />
            </button>
            <button
              onClick={() => { setResult(null); setState("idle"); }}
              className="rounded-full p-2 text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              aria-label="Refresh suggestion"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted">{errorMsg}</p>
          <button
            onClick={handleFetch}
            className="self-start text-xs font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none"
            style={{ color: "var(--accent)" }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
