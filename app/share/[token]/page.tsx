// app/share/[token]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  Box,
  Layers,
  Eye,
  AlertCircle,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import ItemCard from "@/components/ui/ItemCard";
import SavedOutfits, { type SavedOutfit } from "@/components/ui/SavedOutfits";
import { ArchiveEmptyState } from "@/components/ui/GalleryStates";

const Podium = dynamic(() => import("@/components/3d/Podium"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 w-full items-center justify-center rounded-3xl border border-border bg-surface">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-accent" />
        <p className="text-xs text-muted">Preparing studio…</p>
      </div>
    </div>
  ),
});

type ReadOnlyViewMode = "gallery" | "podium" | "outfits";

interface WardrobeItem {
  _id: string;
  name: string;
  category: string;
  imageUrl: string;
  tags?: { weather: string[]; occasion: string[] };
  createdAt?: string;
}

const CATEGORY_ROWS: { key: string; label: string }[] = [
  { key: "top", label: "Tops" },
  { key: "bottom", label: "Bottoms" },
  { key: "shoes", label: "Shoes" },
  { key: "accessory", label: "Accessories" },
  { key: "outfit", label: "Outfit Photos" },
];

const READONLY_MODES: {
  id: ReadOnlyViewMode;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "gallery", label: "Gallery", icon: LayoutGrid },
  { id: "podium", label: "3D Podium", icon: Box },
  { id: "outfits", label: "Saved Outfits", icon: Layers },
];

export default function SharedWardrobePage() {
  const params = useParams();
  const token = params?.token as string | undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string>("");
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [outfits, setOutfits] = useState<SavedOutfit[]>([]);
  const [viewMode, setViewMode] = useState<ReadOnlyViewMode>("gallery");

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    async function loadSharedWardrobe() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/share/${token}`, { cache: "no-store" });
        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok || !data.success) {
          setError(data.error || "This link is invalid or has expired");
          return;
        }

        setOwnerName(data.ownerName || "Wardrobe Owner");
        setItems(data.items || []);
        setOutfits(data.outfits || []);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load shared wardrobe:", err);
        setError("This link is invalid or has expired");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSharedWardrobe();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // ── Error state ─────────────────────────────────────────────────────────────
  if (!loading && error) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 transition-colors duration-200">
        <div className="w-full max-w-md bg-surface rounded-3xl p-8 border border-border shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-accent mx-auto flex items-center justify-center mb-4">
            <AlertCircle size={26} />
          </div>
          <h1 className="text-xl font-serif font-light text-foreground mb-2">
            Link Unavailable
          </h1>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            {error}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-xs font-medium hover:opacity-90 transition-all duration-150 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <ArrowLeft size={13} />
            <span>Go to Wardrobe</span>
          </Link>
        </div>
      </main>
    );
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center transition-colors duration-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-stone-300 border-t-accent rounded-full animate-spin" />
          <p className="text-xs text-muted font-medium tracking-wide">
            Loading shared wardrobe…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      {/* ── Read-only Top Banner ───────────────────────────────────────────── */}
      <aside
        aria-label="Shared view notice"
        className="bg-stone-900 text-stone-200 text-xs py-2.5 px-4 sticky top-0 z-30 shadow-xs border-b border-stone-800"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center">
          <Eye size={13} className="text-stone-400 shrink-0" />
          <span className="font-normal text-stone-300">
            You&apos;re viewing{" "}
            <strong className="text-white font-medium">{ownerName}</strong>
            &apos;s wardrobe &mdash;{" "}
            <span className="text-stone-400">read only</span>
          </span>
        </div>
      </aside>

      {/* ── Content Container ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto w-full px-5 sm:px-8 py-10 flex-1">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-12">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-light tracking-tight text-foreground">
              {ownerName}&apos;s Wardrobe
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              {items.length} {items.length === 1 ? "item" : "items"} &bull;{" "}
              {outfits.length} saved {outfits.length === 1 ? "look" : "looks"}
            </p>
          </div>

          {/* Read-only view toggle */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-full p-1 shadow-xs overflow-x-auto max-w-full scrollbar-hide shrink-0 self-start sm:self-auto">
            {READONLY_MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors duration-200 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                  viewMode === id
                    ? "text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {viewMode === id && (
                  <motion.div
                    layoutId="shared-view-pill"
                    className="absolute inset-0 rounded-full bg-accent shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={13} className="relative z-10 shrink-0" />
                <span className="relative z-10">{label}</span>
              </button>
            ))}
          </div>
        </header>

        {/* ── Views ────────────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {/* ══════════════════════════════ GALLERY ════════════════════════ */}
          {viewMode === "gallery" && (
            <motion.div
              key="shared-gallery"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-56 gap-2 bg-surface rounded-3xl border border-border p-8 text-center">
                  <p className="text-foreground text-sm font-medium">
                    This wardrobe is empty.
                  </p>
                  <p className="text-muted text-xs">
                    No items have been added to this collection yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-12">
                  {CATEGORY_ROWS.map(({ key, label }) => {
                    const rowItems = items.filter((i) => i.category === key);
                    if (rowItems.length === 0) return null;

                    return (
                      <section key={key}>
                        {/* Row Header */}
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-serif font-light tracking-tight text-foreground">
                            {label}
                          </h2>
                          <span className="text-xs text-muted">
                            {rowItems.length}{" "}
                            {rowItems.length === 1 ? "item" : "items"}
                          </span>
                        </div>

                        {/* Snap-scroll row with read-only ItemCards */}
                        <div className="snap-row scrollbar-hide -mx-5 flex gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8">
                          {rowItems.map((item, itemIdx) => (
                            <motion.div
                              key={item._id}
                              className="snap-start shrink-0 w-48 sm:w-56"
                              initial={{ opacity: 0, y: 10, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{
                                duration: 0.22,
                                delay: Math.min(itemIdx * 0.05, 0.4),
                                ease: "easeOut",
                              }}
                            >
                              <ItemCard item={item} />
                            </motion.div>
                          ))}
                          <div className="shrink-0 w-5 sm:w-8" aria-hidden />
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {viewMode === "podium" && (
            <motion.div
              key="shared-podium"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-6">
                <h2 className="text-lg font-serif font-light tracking-tight text-foreground">
                  3D Studio Podium
                </h2>
                <p className="mt-0.5 text-sm text-muted">
                  Recent pieces from {ownerName}&apos;s collection
                </p>
              </div>

              {items.length === 0 ? (
                <ArchiveEmptyState />
              ) : (
                <Podium items={items.slice(0, 5)} />
              )}
            </motion.div>
          )}

          {/* ═════════════════════════════ MY OUTFITS ═══════════════════════ */}
          {viewMode === "outfits" && (
            <motion.div
              key="shared-outfits"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <SavedOutfits readOnly={true} initialOutfits={outfits} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
