"use client";

/**
 * StitchLoader — a needle-and-thread SVG that draws itself in a loop.
 * Replaces generic spinners. Respects prefers-reduced-motion (shows static dots).
 */

interface StitchLoaderProps {
  size?: number;
  className?: string;
  label?: string;
}

export default function StitchLoader({
  size = 40,
  className = "",
  label = "Loading…",
}: StitchLoaderProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-flex flex-col items-center gap-2 ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        className="motion-safe:animate-none"
      >
        {/* Dashed stitch path that animates its stroke-dashoffset */}
        <path
          d="M6 20 C6 20 10 10 20 10 C30 10 34 20 34 20 C34 20 30 30 20 30 C10 30 6 20 6 20"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 4"
          className="text-accent motion-reduce:hidden"
          style={{ color: "var(--accent)" }}
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="-20"
            dur="0.9s"
            repeatCount="indefinite"
          />
        </path>

        {/* Needle tip */}
        <circle
          cx="34"
          cy="20"
          r="2"
          fill="currentColor"
          className="text-accent motion-reduce:opacity-60"
          style={{ color: "var(--accent)" }}
        />

        {/* Reduced-motion fallback: three static dots */}
        <g className="hidden motion-reduce:block">
          <circle cx="14" cy="20" r="2" fill="currentColor" opacity="0.3" style={{ color: "var(--muted)" }} />
          <circle cx="20" cy="20" r="2" fill="currentColor" opacity="0.6" style={{ color: "var(--muted)" }} />
          <circle cx="26" cy="20" r="2" fill="currentColor" style={{ color: "var(--muted)" }} />
        </g>
      </svg>

      <span className="sr-only">{label}</span>
    </span>
  );
}
