"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { LayoutGrid, Shirt, Box, Layers, Search, X, type LucideIcon } from "lucide-react";
import dynamic from "next/dynamic";
import UploadCard from "@/components/ui/UploadCard";
import ItemCard from "@/components/ui/ItemCard";
import EditModal from "@/components/ui/EditModal";
import SavedOutfits, { type SavedOutfit } from "@/components/ui/SavedOutfits";
import ShareButton from "@/components/layout/ShareButton";
import { ArchiveEmptyState, GallerySkeleton } from "@/components/ui/GalleryStates";
import { useToast } from "@/components/ui/Toast";
import SectionReveal from "@/components/ui/SectionReveal";
import { OutfitMakerErrorBoundary } from "@/components/ui/OutfitMakerErrorBoundary";

// Dynamic imports to keep initial bundle lean (3D and canvas editor code split)
const Podium = dynamic(() => import("@/components/3d/Podium"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 w-full items-center justify-center rounded-3xl border border-stone-200/60 bg-white dark:border-stone-800 dark:bg-[#1a1714]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-accent" />
        <p className="text-xs text-stone-500">Preparing studio…</p>
      </div>
    </div>
  ),
});

const OutfitMaker = dynamic(() => import("@/components/ui/OutfitMaker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 w-full items-center justify-center rounded-3xl border border-stone-200/60 bg-white dark:border-stone-800 dark:bg-[#1a1714]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-accent" />
        <p className="text-xs text-stone-500">Loading Outfit Maker…</p>
      </div>
    </div>
  ),
});

type ViewMode = "gallery" | "outfitmaker" | "podium" | "outfits";

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

const VIEW_MODES: { id: ViewMode; label: string; icon: LucideIcon }[] = [
  { id: "gallery", label: "Gallery", icon: LayoutGrid },
  { id: "outfitmaker", label: "Outfit Maker", icon: Shirt },
  { id: "podium", label: "3D Podium", icon: Box },
  { id: "outfits", label: "My Outfits", icon: Layers },
];

const viewTransition = {
  initial: { opacity: 0, y: 12, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(4px)" },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

export default function Home() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [editingOutfit, setEditingOutfit] = useState<SavedOutfit | null>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const hasFetched = useRef(false);

  const rawName = session?.user?.name?.trim();
  const firstName = rawName ? rawName.split(/\s+/)[0] : null;
  const headingText =
    status === "authenticated" && firstName
      ? `${firstName}${firstName.toLowerCase().endsWith("s") ? "'" : "'s"} Wardrobe`
      : "My Wardrobe";

  // ── Sticky header scroll detection with hysteresis guard ─────────────────
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => {
    if (y > 24 && !headerScrolled) {
      setHeaderScrolled(true);
    } else if (y <= 24 && headerScrolled) {
      setHeaderScrolled(false);
    }
  });

  // ── Single fetch on mount (no double-fetch) ───────────────────────────
  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/items", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch {
      // Silent on initial mount
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchItems();
  }, [fetchItems]);

  const handleDelete = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item._id !== id));
  }, []);

  const handleEdit = useCallback(
    (updated: WardrobeItem) => {
      setItems((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item))
      );
      toast("Piece updated");
    },
    [toast]
  );

  const handleUploadComplete = useCallback(
    (newItem?: WardrobeItem) => {
      if (newItem && newItem._id) {
        setItems((prev) => [newItem, ...prev.filter((i) => i._id !== newItem._id)]);
        toast("Piece added to archive");
      } else {
        fetchItems();
      }
    },
    [fetchItems, toast]
  );

  // Filtered items based on search and category filter
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags?.weather?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.tags?.occasion?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategoryFilter === "all" || item.category === selectedCategoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategoryFilter]);

  // Progressive pagination: slice if collection exceeds ~48-50 items
  const PAGE_SIZE = 48;
  const filterKey = `${searchQuery}:${selectedCategoryFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  // Adjust pagination during render when search query or filter changes (no cascading effect render)
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  // Infinite scroll trigger when reaching bottom of large collections
  useEffect(() => {
    if (filteredItems.length <= visibleCount) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 24, filteredItems.length));
        }
      },
      { rootMargin: "300px" }
    );

    const el = loadMoreSentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [filteredItems.length, visibleCount]);

  const visibleItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  return (
    <main className="min-h-dvh bg-background text-foreground pb-28 sm:pb-32 transition-colors duration-200">
      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div
        className={`sticky top-0 z-20 transition-all duration-300 ease-out ${
          headerScrolled
            ? "border-b border-border bg-background/90 backdrop-blur-md shadow-xs"
            : ""
        }`}
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <header className="flex flex-col justify-between gap-4 py-6 sm:flex-row sm:items-center sm:py-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-foreground shadow-2xs sm:h-11 sm:w-11">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 sm:h-6 sm:w-6"
                  aria-hidden="true"
                >
                  <path d="M12 3a2.5 2.5 0 0 0-2.5 2.5c0 1.5 2.5 2 2.5 3.5" />
                  <path d="M12 9 2.5 16.5a1.5 1.5 0 0 0 .9 2.5h17.2a1.5 1.5 0 0 0 .9-2.5L12 9z" />
                </svg>
                <span className="sr-only">Wardrobe</span>
              </div>
              <div>
                <h1 className="text-2xl font-serif font-light tracking-tight text-foreground sm:text-3xl">
                  {headingText}
                </h1>
                <p className="mt-0.5 text-xs text-muted sm:text-sm">
                  {items.length} {items.length === 1 ? "piece" : "pieces"} archived
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2.5 self-start sm:flex-nowrap sm:self-auto">
              <ShareButton />
              <nav
                className="scrollbar-hide flex max-w-full shrink-0 items-center gap-1 overflow-x-auto rounded-full border border-border bg-surface p-1 shadow-xs"
                aria-label="View mode"
              >
                {VIEW_MODES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setViewMode(id)}
                    aria-current={viewMode === id ? "true" : undefined}
                    className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                      viewMode === id
                        ? "text-white"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {viewMode === id && (
                      <motion.div
                        layoutId="view-pill"
                        className="absolute inset-0 rounded-full bg-accent shadow-sm"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon size={13} className="relative z-10 shrink-0" aria-hidden />
                    <span className="relative z-10">{label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </header>
        </div>
      </div>

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-5 pt-4 sm:px-8">
        <AnimatePresence mode="wait">
          {/* ═══════════════════ GALLERY ══════════════════════════════════ */}
          {viewMode === "gallery" && (
            <motion.div key="gallery" {...viewTransition}>
              {/* Above-the-fold upload card rendered directly (no opacity 0 on LCP) */}
              <div className="mb-10 w-full max-w-sm sm:max-w-md">
                <UploadCard onUploadComplete={handleUploadComplete} />
              </div>

              {/* Gallery Filter & Search Bar */}
              {items.length > 0 && (
                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Search input */}
                  <div className="relative w-full sm:max-w-xs">
                    <Search
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search archive…"
                      className="w-full rounded-full border border-border bg-surface pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-[var(--ring)] transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-0.5 rounded-full"
                        aria-label="Clear search"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
                    <button
                      onClick={() => setSelectedCategoryFilter("all")}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                        selectedCategoryFilter === "all"
                          ? "bg-foreground text-background shadow-2xs"
                          : "bg-surface border border-border text-muted hover:text-foreground"
                      }`}
                    >
                      All ({items.length})
                    </button>
                    {CATEGORY_ROWS.map(({ key, label }) => {
                      const count = items.filter((i) => i.category === key).length;
                      if (count === 0) return null;
                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedCategoryFilter(key)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                            selectedCategoryFilter === key
                              ? "bg-foreground text-background shadow-2xs"
                              : "bg-surface border border-border text-muted hover:text-foreground"
                          }`}
                        >
                          {label} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {loading ? (
                <GallerySkeleton />
              ) : items.length === 0 ? (
                <ArchiveEmptyState onAction={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
              ) : filteredItems.length === 0 ? (
                <div className="rounded-3xl border border-border bg-surface p-12 text-center">
                  <p className="text-sm font-medium text-foreground">No pieces match your search.</p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategoryFilter("all");
                    }}
                    className="mt-3 text-xs text-accent hover:underline font-medium"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="space-y-12">
                  {CATEGORY_ROWS.map(({ key, label }, categoryIdx) => {
                    const rowItems = visibleItems.filter((i) => i.category === key);
                    if (rowItems.length === 0) return null;

                    // SectionReveal used for below-the-fold categories (first row renders directly for instant LCP)
                    const content = (
                      <section>
                        <div className="mb-4 flex items-center justify-between">
                          <h2 className="text-xl font-serif font-light tracking-tight text-foreground">
                            {label}
                          </h2>
                          <span className="text-xs text-muted">
                            {rowItems.length} {rowItems.length === 1 ? "piece" : "pieces"}
                          </span>
                        </div>

                        <div className="snap-row scrollbar-hide -mx-5 flex gap-4 overflow-x-auto px-5 pb-3 sm:-mx-8 sm:px-8 [contain:content]">
                          <AnimatePresence>
                            {rowItems.map((item, itemIdx) => (
                              <motion.div
                                key={item._id}
                                className="w-44 shrink-0 snap-start sm:w-52"
                                layout
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{
                                  duration: 0.24,
                                  delay: Math.min(itemIdx * 0.04, 0.3),
                                  ease: [0.22, 1, 0.36, 1],
                                }}
                              >
                                <ItemCard
                                  item={item}
                                  onDelete={handleDelete}
                                  onEdit={setEditingItem}
                                  priority={categoryIdx === 0 && itemIdx < 4}
                                />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          <div className="w-5 shrink-0 sm:w-8" aria-hidden />
                        </div>
                      </section>
                    );

                    if (categoryIdx === 0) {
                      return <div key={key}>{content}</div>;
                    }

                    return (
                      <SectionReveal
                        key={key}
                        delay={categoryIdx * 30}
                        className="[content-visibility:auto] [contain-intrinsic-size:auto_320px]"
                      >
                        {content}
                      </SectionReveal>
                    );
                  })}

                  {/* Infinite scroll sentinel & progressive load button for >50 item archives */}
                  {filteredItems.length > visibleCount && (
                    <div
                      ref={loadMoreSentinelRef}
                      className="pt-6 pb-2 flex flex-col items-center justify-center gap-2"
                    >
                      <button
                        onClick={() =>
                          setVisibleCount((prev) =>
                            Math.min(prev + 24, filteredItems.length)
                          )
                        }
                        className="rounded-full border border-border bg-surface px-6 py-2.5 text-xs font-medium text-foreground hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] cursor-pointer"
                      >
                        Show more pieces ({filteredItems.length - visibleCount} remaining)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════ OUTFIT MAKER ═════════════════════════════ */}
          {viewMode === "outfitmaker" && (
            <motion.div key="outfitmaker" {...viewTransition}>
              <div className="mb-5">
                <h2 className="text-xl font-serif font-light tracking-tight text-foreground">
                  Outfit Maker
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Stage tops over bottoms, rotate and resize, then export a lookbook card.
                </p>
              </div>
              <OutfitMakerErrorBoundary>
                <OutfitMaker
                  items={items}
                  initialOutfit={editingOutfit}
                  onOutfitSaved={() => {
                    setEditingOutfit(null);
                  }}
                />
              </OutfitMakerErrorBoundary>
            </motion.div>
          )}

          {/* ═══════════════════ MY OUTFITS ═══════════════════════════════ */}
          {viewMode === "outfits" && (
            <motion.div key="outfits" {...viewTransition}>
              <SavedOutfits
                onLoadIntoMaker={(outfit) => {
                  setEditingOutfit(outfit);
                  setViewMode("outfitmaker");
                }}
                onNavigateToMaker={() => {
                  setEditingOutfit(null);
                  setViewMode("outfitmaker");
                }}
              />
            </motion.div>
          )}

          {/* ═══════════════════ 3D PODIUM ════════════════════════════════ */}
          {viewMode === "podium" && (
            <motion.div key="podium" {...viewTransition}>
              <div className="mb-6">
                <h2 className="text-xl font-serif font-light tracking-tight text-foreground">
                  3D Studio Podium
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Your archive presented on a revolving studio showcase
                </p>
              </div>

              {items.length === 0 ? (
                <ArchiveEmptyState onAction={() => setViewMode("gallery")} />
              ) : (
                <Podium items={items} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Edit Modal with Full Uncropped Detail View ────────────────────── */}
      <AnimatePresence>
        {editingItem && (
          <EditModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onSave={(updated) => {
              handleEdit(updated as WardrobeItem);
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
