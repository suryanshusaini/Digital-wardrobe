"use client";

/**
 * Reveal — IntersectionObserver-based entrance animation.
 * Fades + translates children up once when they enter the viewport.
 * - Only triggers below the fold (rootMargin: "-5% 0px").
 * - Once only: never re-triggers on scroll-up.
 * - No-ops completely under prefers-reduced-motion.
 * - Zero React re-renders after mount (CSS class swap only).
 */

import { useEffect, useRef, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Delay before the entrance starts, in ms. Default 0. */
  delay?: number;
  className?: string;
}

export default function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Skip entirely under reduced-motion — the element is already visible
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    // Start hidden
    el.style.opacity = "0";
    el.style.transform = "translateY(12px)";
    el.style.transition = `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.disconnect();
        }
      },
      { rootMargin: "-5% 0px", threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
