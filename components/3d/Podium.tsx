"use client";

import { Component, useState, useEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion } from "framer-motion";
import { optimizeCloudinaryUrl } from "@/lib/cloudinaryUrl";
import type { PodiumItem } from "@/components/3d/PodiumCanvas";

const PodiumCanvas = dynamic(() => import("@/components/3d/PodiumCanvas"), {
  ssr: false,
  loading: () => <PodiumSkeleton />,
});

const BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

/** Shimmer skeleton matching the actual 3D layout */
function PodiumSkeleton() {
  return (
    <div className="flex h-full items-center justify-center gap-4 px-8">
      {[0.72, 0.86, 1, 0.86, 0.72].map((scale, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl bg-stone-100"
          style={{
            width: `${Math.round(scale * 84)}px`,
            height: `${Math.round(scale * 120)}px`,
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

/** CSS fallback: a simple fan stack, no WebGL required */
function CssCardStack({
  items,
  selectedId,
  onSelect,
}: {
  items: PodiumItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative mx-auto flex h-full w-full max-w-md items-center justify-center [perspective:1200px]">
      {items.map((item, i) => {
        const active = selectedId === item._id;
        const offset = i - Math.floor(items.length / 2);
        return (
          <motion.button
            key={item._id}
            type="button"
            onClick={() => onSelect(item._id)}
            animate={{
              rotateY: active ? 0 : offset * 14,
              y: active ? -18 : Math.abs(offset) * 8,
              scale: active ? 1.08 : 0.92,
            }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute h-56 w-44 overflow-hidden rounded-2xl border border-stone-200/60 bg-[#f8f7f5] shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/30 dark:border-stone-800 dark:bg-[#201d19]"
            style={{
              transformStyle: "preserve-3d",
              zIndex: active ? 20 : 10 - Math.abs(offset),
            }}
            aria-label={`View ${item.name}`}
            aria-pressed={active}
          >
            <div className="relative h-full w-full bg-[var(--surface-mat)] p-2">
              <Image
                src={optimizeCloudinaryUrl(item.imageUrl)}
                alt={item.name}
                fill
                className="object-cover rounded-xl"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                sizes="176px"
              />
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

class WebGLBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  constructor(props: { children: ReactNode; onError: () => void }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export default function Podium({ items }: { items: PodiumItem[] }) {
  const [webgl] = useState(() => (typeof window !== "undefined" ? hasWebGL() : true));
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    items[0]?._id ?? null
  );
  const [reducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  const selected = items.find((i) => i._id === selectedId) ?? items[0];
  const useFallback = !webgl || failed;

  // Track active theme for 3D canvas and fallback styling
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.getAttribute("data-theme") === "dark";
  });

  // Observe theme changes on html[data-theme]
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      setIsDark(dark);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200/60 bg-white shadow-sm dark:border-stone-800 dark:bg-[#1a1714]">
      <div className="relative h-[460px] sm:h-[540px]">
        {useFallback ? (
          <CssCardStack
            items={items.slice(0, 5)}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        ) : (
          <WebGLBoundary onError={() => setFailed(true)}>
            <PodiumCanvas
              items={items}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id || null)}
              onContextLost={() => setFailed(true)}
              isDark={isDark}
            />
          </WebGLBoundary>
        )}
      </div>

      {/* ── Info Panel ── */}
      <div className="border-t border-stone-200/60 px-5 py-4 dark:border-stone-800/80">
        <div className="flex flex-col items-center gap-2 text-center">
          <motion.p
            key={selected?._id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="text-sm font-medium tracking-tight text-stone-900 dark:text-stone-100"
          >
            {selected?.name}
          </motion.p>
          <p className="text-[11px] capitalize text-stone-500 dark:text-stone-400">
            {selected?.category}
          </p>

          {/* Weather + Occasion tags */}
          {selected && (
            <div className="flex flex-wrap justify-center gap-1.5 pt-0.5">
              {selected.tags?.weather?.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-stone-200/60 bg-stone-50 px-2.5 py-0.5 text-[10px] capitalize text-stone-500 dark:border-stone-700/60 dark:bg-stone-800/50 dark:text-stone-400"
                >
                  {t}
                </span>
              ))}
              {selected.tags?.occasion?.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-stone-200/60 bg-stone-50 px-2.5 py-0.5 text-[10px] capitalize text-stone-500 dark:border-stone-700/60 dark:bg-stone-800/50 dark:text-stone-400"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Keyboard hint — hidden on touch/reduced-motion devices */}
          {!useFallback && !reducedMotion && (
            <p className="hidden pt-1 text-[10px] text-stone-400 dark:text-stone-500 sm:block">
              ← → to explore · click to focus · Esc to reset
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
