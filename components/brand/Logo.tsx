"use client";

/**
 * Logo — the Digital Wardrobe brand mark.
 *
 * Variants:
 *  "mark"     — SVG icon only (Concept C: arch hanger + accent dot)
 *  "wordmark" — "Digital Wardrobe" in Cormorant Garamond, tight tracking
 *  "lockup"   — mark + "DIGITAL" eyebrow (Geist, wide) + wordmark
 *
 * The optional stroke-draw intro animation plays once per session
 * (guarded by sessionStorage) on first render. It is skipped entirely
 * under prefers-reduced-motion and never delays LCP because it runs
 * after mount via a useEffect (the SVG is visible before animation fires).
 */

import { useEffect, useRef } from "react";
import { BRAND_NAME } from "@/lib/brand";

// ── Types ──────────────────────────────────────────────────────────────────
export interface LogoProps {
  /** Which representation to render. Default: "lockup". */
  variant?: "mark" | "wordmark" | "lockup";
  /** Icon size in pixels (mark diameter). Default 28. */
  size?: number;
  /**
   * Play a one-time stroke-draw animation on mount.
   * Ignored under prefers-reduced-motion.
   * Default: false.
   */
  animated?: boolean;
  className?: string;
}

// ── Mark SVG paths (Concept C) ─────────────────────────────────────────────
// All path data coordinates for the arch hanger on a 24×24 grid.
// Broken out so we can apply stroke-dasharray animation per path.
const MARK_PATHS = [
  // Hook curl
  "M12 2 C12 2 13.5 2 13.5 3.5 C13.5 4.8 12 5.2 12 5.2",
  // Left shoulder arch
  "M12 5.2 C12 5.2 8 6.5 4.5 10",
  // Right shoulder arch
  "M12 5.2 C12 5.2 16 6.5 19.5 10",
  // Left vertical drop
  "M4.5 10 L3.5 17.5",
  // Right vertical drop
  "M19.5 10 L20.5 17.5",
  // Horizontal bar
  "M3.5 17.5 L20.5 17.5",
];

// ── Helpers ────────────────────────────────────────────────────────────────
const SESSION_KEY = "dw-logo-animated";

function hasReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hasPlayedThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return true; // fail-safe: skip animation if storage unavailable
  }
}

function markSessionPlayed() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // ignore
  }
}

// ── Mark component ─────────────────────────────────────────────────────────
function LogoMark({
  size = 28,
  animated = false,
  className = "",
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  const pathRefs = useRef<(SVGPathElement | SVGLineElement | null)[]>([]);

  useEffect(() => {
    if (!animated || hasReducedMotion() || hasPlayedThisSession()) {
      return;
    }

    // Measure total path lengths, set dasharray/offset to full length (hidden),
    // then transition dashoffset to 0 (drawn).
    pathRefs.current.forEach((el, i) => {
      if (!el) return;
      const len = (el as SVGGeometryElement).getTotalLength?.() ?? 30;
      el.style.strokeDasharray = `${len}`;
      el.style.strokeDashoffset = `${len}`;
      el.style.transition = `stroke-dashoffset ${0.4}s ${i * 0.07}s cubic-bezier(0.16,1,0.3,1)`;
    });

    // Trigger draw on next frame
    const raf = requestAnimationFrame(() => {
      pathRefs.current.forEach((el) => {
        if (!el) return;
        el.style.strokeDashoffset = "0";
      });
      markSessionPlayed();
    });

    return () => cancelAnimationFrame(raf);
  }, [animated]);

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ display: "block" }}
    >
      {/* Hook */}
      <path
        ref={(el) => { pathRefs.current[0] = el; }}
        d={MARK_PATHS[0]}
      />
      {/* Left arch */}
      <path ref={(el) => { pathRefs.current[1] = el; }} d={MARK_PATHS[1]} />
      {/* Right arch */}
      <path ref={(el) => { pathRefs.current[2] = el; }} d={MARK_PATHS[2]} />
      {/* Left drop */}
      <path ref={(el) => { pathRefs.current[3] = el; }} d={MARK_PATHS[3]} />
      {/* Right drop */}
      <path ref={(el) => { pathRefs.current[4] = el; }} d={MARK_PATHS[4]} />
      {/* Bar */}
      <path ref={(el) => { pathRefs.current[5] = el; }} d={MARK_PATHS[5]} />
      {/* Accent dot — always visible, no animation */}
      <circle
        cx="12"
        cy="13"
        r="1.2"
        fill="currentColor"
        stroke="none"
        className="text-accent"
        style={{ color: "var(--accent)" }}
      />
    </svg>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export default function Logo({
  variant = "lockup",
  size = 28,
  animated = false,
  className = "",
}: LogoProps) {
  const wordmarkStyle: React.CSSProperties = {
    fontFamily: "var(--font-heading-serif), Georgia, serif",
    letterSpacing: "-0.02em",
    fontWeight: 300,
    lineHeight: 1,
  };

  const eyebrowStyle: React.CSSProperties = {
    fontFamily: "var(--font-sans), system-ui, sans-serif",
    letterSpacing: "0.2em",
    fontSize: "9px",
    fontWeight: 500,
    textTransform: "uppercase",
    opacity: 0.55,
    lineHeight: 1,
  };

  if (variant === "mark") {
    return (
      <span
        role="img"
        aria-label={`${BRAND_NAME} logo`}
        className={className}
        style={{ display: "inline-flex" }}
      >
        <LogoMark size={size} animated={animated} />
      </span>
    );
  }

  if (variant === "wordmark") {
    return (
      <span
        role="img"
        aria-label={BRAND_NAME}
        className={`inline-flex items-baseline ${className}`}
      >
        <span style={{ ...wordmarkStyle, fontSize: `${size * 0.72}px` }} className="text-foreground">
          {BRAND_NAME}
        </span>
      </span>
    );
  }

  // lockup: mark + DIGITAL eyebrow + wordmark
  return (
    <span
      role="img"
      aria-label={`${BRAND_NAME} — Your closet, curated.`}
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      <LogoMark size={size} animated={animated} />
      <span className="flex flex-col justify-center gap-0.5">
        <span style={eyebrowStyle} className="text-muted">DIGITAL</span>
        <span style={{ ...wordmarkStyle, fontSize: `${Math.round(size * 0.57)}px` }} className="text-foreground">
          Wardrobe
        </span>
      </span>
    </span>
  );
}
