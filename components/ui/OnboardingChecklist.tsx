"use client";

/**
 * OnboardingChecklist — first-run progress card.
 * Derived entirely from live data (no stored text).
 * Dismissible via localStorage. Hidden when all 4 steps complete.
 * Animated checkmarks via CSS transition.
 */

import { useMemo, useState, useSyncExternalStore } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";

const DISMISS_KEY = "dw-onboarding-dismissed";
const PODIUM_OPENED_KEY = "dw-podium-opened";

interface OnboardingChecklistProps {
  userId?: string;
  pieceCount: number;
  outfitCount: number;
  hasShared: boolean;
  hasPodiumOpened?: boolean;
}

interface Step {
  id: string;
  label: string;
  done: boolean;
}

const emptySubscribe = () => () => {};

const podiumSubscribe = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("dw-podium-opened", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("dw-podium-opened", callback);
    window.removeEventListener("storage", callback);
  };
};

export default function OnboardingChecklist({
  userId,
  pieceCount,
  outfitCount,
  hasShared,
  hasPodiumOpened = false,
}: OnboardingChecklistProps) {
  const [userDismissed, setUserDismissed] = useState(false);
  const dismissKey = userId ? `${DISMISS_KEY}-${userId}` : DISMISS_KEY;

  // Read client mount state safely without setState in effect
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Read localStorage dismiss state
  const storedDismissed = useSyncExternalStore(
    emptySubscribe,
    () => {
      try {
        return localStorage.getItem(dismissKey) === "1";
      } catch {
        return false;
      }
    },
    () => false
  );

  // Read localStorage podium state reactively
  const storedPodiumOpened = useSyncExternalStore(
    podiumSubscribe,
    () => getPodiumOpened(userId),
    () => false
  );

  const steps = useMemo((): Step[] => [
    { id: "pieces", label: "Add 3 pieces to your wardrobe", done: pieceCount >= 3 },
    { id: "outfit", label: "Create your first outfit", done: outfitCount >= 1 },
    { id: "podium", label: "Open the 3D Studio Podium", done: hasPodiumOpened || storedPodiumOpened },
    { id: "share", label: "Share your lookbook", done: hasShared },
  ], [pieceCount, outfitCount, hasPodiumOpened, storedPodiumOpened, hasShared]);

  const allDone = steps.every((s) => s.done);
  const completedCount = steps.filter((s) => s.done).length;

  const handleDismiss = () => {
    setUserDismissed(true);
    try { localStorage.setItem(dismissKey, "1"); } catch { /* ignore */ }
  };

  // Don't render: not mounted on client, dismissed, or all done
  if (!isClient || userDismissed || storedDismissed || allDone) return null;

  return (
    <div className="card rounded-2xl p-4 mb-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted mb-0.5">Getting started</p>
          <p className="text-sm font-medium text-foreground">{completedCount} of {steps.length} done</p>
        </div>
        <button
          onClick={handleDismiss}
          className="mt-0.5 shrink-0 rounded-full p-1 text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-label="Dismiss onboarding"
        >
          <X size={13} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-surface-2" style={{ background: "var(--surface-2, #faf9f7)" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${(completedCount / steps.length) * 100}%`,
            background: "var(--accent)",
          }}
        />
      </div>

      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-2.5">
            <span
              className="shrink-0 transition-all duration-300"
              style={{ color: step.done ? "var(--accent)" : "var(--muted)" }}
            >
              {step.done
                ? <CheckCircle2 size={15} />
                : <Circle size={15} />}
            </span>
            <span
              className={`text-xs transition-colors duration-300 ${step.done ? "line-through text-muted" : "text-foreground"}`}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Utility: call this when user opens the podium tab to mark it opened. */
export function markPodiumOpened(userId?: string) {
  const key = userId ? `${PODIUM_OPENED_KEY}-${userId}` : PODIUM_OPENED_KEY;
  try {
    localStorage.setItem(key, "1");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("dw-podium-opened"));
    }
  } catch { /* ignore */ }
}

/** Utility: read whether podium was opened (safe). */
export function getPodiumOpened(userId?: string): boolean {
  const key = userId ? `${PODIUM_OPENED_KEY}-${userId}` : PODIUM_OPENED_KEY;
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
}
