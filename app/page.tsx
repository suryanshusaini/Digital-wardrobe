"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import {
  LayoutGrid,
  Shirt,
  Box,
  Layers,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Trash2,
  Moon,
  Sun,
  Monitor,
  Heart,
  Rows,
  Check,
  type LucideIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import UploadCard from "@/components/ui/UploadCard";
import ItemCard, { type WardrobeItem } from "@/components/ui/ItemCard";
import ItemDetailSheet from "@/components/ui/ItemDetailSheet";
import EditModal from "@/components/ui/EditModal";
import SavedOutfits, { type SavedOutfit } from "@/components/ui/SavedOutfits";
import ShareButton from "@/components/layout/ShareButton";
import { ArchiveEmptyState, GallerySkeleton } from "@/components/ui/GalleryStates";
import { useToast } from "@/components/ui/Toast";
import SectionReveal from "@/components/ui/SectionReveal";
import { OutfitMakerErrorBoundary } from "@/components/ui/OutfitMakerErrorBoundary";
import Logo from "@/components/brand/Logo";
import CommandPalette from "@/components/ui/CommandPalette";
import BottomTabBar from "@/components/layout/BottomTabBar";
import StitchLoader from "@/components/ui/StitchLoader";
import TodaysPick from "@/components/ui/TodaysPick";
import OnboardingChecklist, { markPodiumOpened } from "@/components/ui/OnboardingChecklist";
import { viewTransition, springPremium } from "@/lib/motion";
import { BRAND_NAME } from "@/lib/brand";

// ── Dynamic imports — zero initial bundle ─────────────────────────────────
const Podium = dynamic(() => import("@/components/3d/Podium"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 w-full items-center justify-center rounded-3xl border border-border bg-surface">
      <div className="flex flex-col items-center gap-3">
        <StitchLoader size={36} label="Preparing studio…" />
        <p className="text-xs text-muted">Preparing studio…</p>
      </div>
    </div>
  ),
});

const OutfitMaker = dynamic(() => import("@/components/ui/OutfitMaker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 w-full items-center justify-center rounded-3xl border border-border bg-surface">
      <div className="flex flex-col items-center gap-3">
        <StitchLoader size={36} label="Loading Outfit Maker…" />
        <p className="text-xs text-muted">Loading Outfit Maker…</p>
      </div>
    </div>
  ),
});

// ── Types ──────────────────────────────────────────────────────────────────
type ViewMode = "gallery" | "outfitmaker" | "podium" | "outfits";
type SortOption = "newest" | "oldest" | "name" | "category";

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

// ── Inner component (needs useSearchParams) ────────────────────────────────
function HomeInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // ── Derive view from URL — no useState for viewMode ──────────────────────
  const viewParam = searchParams.get("view");
  const viewMode: ViewMode =
    viewParam === "outfitmaker" || viewParam === "podium" || viewParam === "outfits"
      ? viewParam
      : "gallery";

  const userId = session?.user?.email ?? "";

  // ── Data ──────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [outfitCount, setOutfitCount] = useState(0);
  const [hasShared, setHasShared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [editingOutfit, setEditingOutfit] = useState<SavedOutfit | null>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  // ── Layout & View State ───────────────────────────────────────────────────
  const [layoutMode, setLayoutMode] = useState<"rows" | "grid">(() => {
    if (typeof window === "undefined") return "rows";
    try {
      const stored = localStorage.getItem("dw-layout-mode");
      return stored === "grid" ? "grid" : "rows";
    } catch {
      return "rows";
    }
  });

  const handleSetLayoutMode = useCallback((mode: "rows" | "grid") => {
    setLayoutMode(mode);
    try {
      localStorage.setItem("dw-layout-mode", mode);
    } catch {
      // ignore
    }
  }, []);

  // ── Sort & Filter State ───────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [favouriteOnly, setFavouriteOnly] = useState(false);
  const [weatherFilter, setWeatherFilter] = useState<string>("all");
  const [occasionFilter, setOccasionFilter] = useState<string>("all");

  // ── Selection Mode State ──────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Detail Sheet State ────────────────────────────────────────────────────
  const [detailItem, setDetailItem] = useState<WardrobeItem | null>(null);

  // ── Pending Deletes Ref (for 5s Undo) ──────────────────────────────────────
  const pendingDeletesRef = useRef<Map<string, { timeout: NodeJS.Timeout; items: WardrobeItem[] }>>(new Map());

  // ── Category row scroll refs ──────────────────────────────────────────────
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollCategoryRow = useCallback((key: string, direction: -1 | 1) => {
    const el = rowRefs.current[key];
    if (el) {
      el.scrollBy({ left: direction * 420, behavior: "smooth" });
    }
  }, []);

  const hasFetched = useRef(false);

  const navigateTo = useCallback(
    (view: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (view === "gallery") {
        params.delete("view");
      } else {
        params.set("view", view);
      }
      // Track podium opens for onboarding checklist (per user)
      if (view === "podium") {
        markPodiumOpened(userId);
      }
      router.replace(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, userId]
  );

  // ── Theme ─────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    if (typeof window === "undefined") return "system";
    const stored = localStorage.getItem("theme");
    return (stored as "light" | "dark" | "system") ?? "system";
  });

  const applyTheme = useCallback((t: "light" | "dark" | "system") => {
    setTheme(t);
    try { localStorage.setItem("theme", t); } catch { /* ignore */ }
    const isDark =
      t === "dark" ||
      (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    // Sync themeColor meta tag
    const metaTheme = document.querySelector("meta[name='theme-color']");
    if (metaTheme) metaTheme.setAttribute("content", isDark ? "#141210" : "#f8f7f5");
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    applyTheme(next);
  }, [theme, applyTheme]);

  // ── Account / avatar menu ─────────────────────────────────────────────────
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Close avatar menu on outside click
  useEffect(() => {
    if (!avatarOpen) return;
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [avatarOpen]);

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/login" });
      } else if (res.status === 502) {
        const data = await res.json() as { failedCount?: number; deletedCount?: number };
        setDeleteError(
          `Partial deletion: ${data.deletedCount ?? 0} pieces removed, ${data.failedCount ?? 0} failed. Please retry.`
        );
        setIsDeleting(false);
        return;
      } else {
        setDeleteError("Deletion failed. Please try again.");
        setIsDeleting(false);
        return;
      }
    } catch {
      setDeleteError("Network error. Please try again.");
      setIsDeleting(false);
    }
  };

  // ── Command palette ───────────────────────────────────────────────────────
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName))
      ) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Scroll / header ───────────────────────────────────────────────────────
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => {
    if (y > 24 && !headerScrolled) setHeaderScrolled(true);
    else if (y <= 24 && headerScrolled) setHeaderScrolled(false);
  });

  // ── User info ─────────────────────────────────────────────────────────────
  const rawName = session?.user?.name?.trim();
  const firstName = rawName ? rawName.split(/\s+/)[0] : null;
  const headingText =
    status === "authenticated" && firstName
      ? `${firstName}${firstName.toLowerCase().endsWith("s") ? "'" : "'s"} Wardrobe`
      : BRAND_NAME;
  const userInitial = (session?.user?.name?.[0] ?? session?.user?.email?.[0] ?? "?").toUpperCase();

  // ── Preload suggested pieces into OutfitMaker ──────────────────────────────
  const handleTryInMaker = useCallback(
    (_recommendation: string, suggestedIds?: string[]) => {
      const ids = suggestedIds && suggestedIds.length > 0 ? suggestedIds : [];
      const matched = items.filter((i) => ids.includes(i._id));
      const targetItems = matched.length > 0 ? matched : items.slice(0, 3);

      const defaultPositions: Record<string, { x: number; y: number; width: number; zIndex: number }> = {
        top: { x: 180, y: 40, width: 170, zIndex: 30 },
        bottom: { x: 185, y: 180, width: 160, zIndex: 20 },
        shoes: { x: 195, y: 320, width: 140, zIndex: 10 },
        accessory: { x: 320, y: 50, width: 90, zIndex: 40 },
      };

      const stagedOutfit: SavedOutfit = {
        _id: "todays-pick-" + Date.now(),
        name: "Today's Pick",
        createdAt: new Date().toISOString(),
        items: targetItems.map((item, idx) => {
          const pos = defaultPositions[item.category] ?? {
            x: 150 + idx * 20,
            y: 80 + idx * 60,
            width: 150,
            zIndex: idx + 1,
          };
          return {
            itemId: item._id,
            imageUrl: item.imageUrl,
            x: pos.x,
            y: pos.y,
            width: pos.width,
            zIndex: pos.zIndex,
            rotation: 0,
          };
        }),
      };

      setEditingOutfit(stagedOutfit);
      navigateTo("outfitmaker");
    },
    [items, navigateTo]
  );

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    try {
      const [itemsRes, outfitsRes, shareRes] = await Promise.all([
        fetch("/api/items", { cache: "no-store" }),
        fetch("/api/outfits", { cache: "no-store" }),
        fetch("/api/share", { cache: "no-store" }),
      ]);
      if (itemsRes.ok) {
        const data = await itemsRes.json() as { success: boolean; items: WardrobeItem[] };
        if (data.success && Array.isArray(data.items)) setItems(data.items);
      }
      if (outfitsRes.ok) {
        const data = await outfitsRes.json() as { outfits?: unknown[] };
        setOutfitCount(Array.isArray(data.outfits) ? data.outfits.length : 0);
      }
      if (shareRes.ok) {
        const data = await shareRes.json() as { hasShared?: boolean };
        if (typeof data.hasShared === "boolean") setHasShared(data.hasShared);
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

  // ── 5-second Undo Deletion ────────────────────────────────────────────────
  const handleDeleteWithUndo = useCallback(
    (itemsToDelete: WardrobeItem[]) => {
      if (itemsToDelete.length === 0) return;
      const idsToDelete = new Set(itemsToDelete.map((i) => i._id));

      // Optimistically remove from state
      setItems((prev) => prev.filter((i) => !idsToDelete.has(i._id)));

      // Clear from selection if selected
      setSelectedIds((prev) => {
        const next = new Set(prev);
        itemsToDelete.forEach((i) => next.delete(i._id));
        return next;
      });

      // Close detail sheet if showing one of these items
      setDetailItem((current) => (current && idsToDelete.has(current._id) ? null : current));

      const batchId = Math.random().toString(36).substring(2, 9);
      const timer = setTimeout(async () => {
        pendingDeletesRef.current.delete(batchId);
        for (const item of itemsToDelete) {
          try {
            await fetch(`/api/items/${item._id}`, { method: "DELETE" });
          } catch {
            // Restore on server failure
            setItems((prev) => [item, ...prev]);
            toast(`Failed to permanently delete ${item.name}`, "error");
          }
        }
      }, 5000);

      pendingDeletesRef.current.set(batchId, { timeout: timer, items: itemsToDelete });

      const msg =
        itemsToDelete.length === 1
          ? `"${itemsToDelete[0].name}" removed from archive`
          : `${itemsToDelete.length} pieces removed from archive`;

      toast(msg, {
        action: {
          label: "Undo",
          onClick: () => {
            const pending = pendingDeletesRef.current.get(batchId);
            if (pending) {
              clearTimeout(pending.timeout);
              pendingDeletesRef.current.delete(batchId);
              setItems((prev) => [...itemsToDelete, ...prev]);
              toast(
                itemsToDelete.length === 1
                  ? "Piece restored"
                  : `${itemsToDelete.length} pieces restored`
              );
            }
          },
        },
        duration: 5000,
      });
    },
    [toast]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const item = items.find((i) => i._id === id);
      if (item) {
        handleDeleteWithUndo([item]);
      } else {
        setItems((prev) => prev.filter((i) => i._id !== id));
      }
    },
    [items, handleDeleteWithUndo]
  );

  // Cleanup pending deletes on unmount
  useEffect(() => {
    const pending = pendingDeletesRef.current;
    return () => {
      pending.forEach(({ timeout, items: toDelete }) => {
        clearTimeout(timeout);
        toDelete.forEach((item) => {
          fetch(`/api/items/${item._id}`, { method: "DELETE", keepalive: true }).catch(() => {});
        });
      });
      pending.clear();
    };
  }, []);

  const handleToggleFavourite = useCallback((id: string, isFav: boolean) => {
    setItems((prev) =>
      prev.map((i) => (i._id === id ? { ...i, favourite: isFav } : i))
    );
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      if (newItem?._id) {
        setItems((prev) => [newItem, ...prev.filter((i) => i._id !== newItem._id)]);
        toast("Piece added to archive");
      } else {
        fetchItems();
      }
    },
    [fetchItems, toast]
  );

  // ── Available metadata for filter controls ────────────────────────────────
  const availableWeather = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.tags?.weather?.forEach((w) => set.add(w.toLowerCase())));
    return Array.from(set).sort();
  }, [items]);

  const availableOccasion = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.tags?.occasion?.forEach((o) => set.add(o.toLowerCase())));
    return Array.from(set).sort();
  }, [items]);

  const favCount = useMemo(() => items.filter((i) => Boolean(i.favourite)).length, [items]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategoryFilter !== "all" ||
    favouriteOnly ||
    weatherFilter !== "all" ||
    occasionFilter !== "all";

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategoryFilter("all");
    setFavouriteOnly(false);
    setWeatherFilter("all");
    setOccasionFilter("all");
  }, []);

  // ── Filtering and sorting ─────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = items.filter((item) => {
      if (favouriteOnly && !item.favourite) return false;
      if (selectedCategoryFilter !== "all" && item.category !== selectedCategoryFilter) return false;
      if (weatherFilter !== "all") {
        if (!item.tags?.weather?.some((w) => w.toLowerCase() === weatherFilter)) return false;
      }
      if (occasionFilter !== "all") {
        if (!item.tags?.occasion?.some((o) => o.toLowerCase() === occasionFilter)) return false;
      }
      if (q) {
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCategory = item.category.toLowerCase().includes(q);
        const matchesWeather = item.tags?.weather?.some((t) => t.toLowerCase().includes(q));
        const matchesOccasion = item.tags?.occasion?.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesCategory && !matchesWeather && !matchesOccasion) return false;
      }
      return true;
    });

    return [...result].sort((a, b) => {
      if (sortBy === "newest") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
      if (sortBy === "oldest") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "category") {
        return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      }
      return 0;
    });
  }, [items, searchQuery, selectedCategoryFilter, favouriteOnly, weatherFilter, occasionFilter, sortBy]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i._id)));
    }
  }, [selectedIds.size, filteredItems]);

  const handleStageSelectedInMaker = useCallback(() => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    handleTryInMaker("selected", ids);
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [selectedIds, handleTryInMaker]);

  const handleDeleteSelected = useCallback(() => {
    const selectedItems = items.filter((i) => selectedIds.has(i._id));
    if (selectedItems.length > 0) {
      handleDeleteWithUndo(selectedItems);
      setSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [items, selectedIds, handleDeleteWithUndo]);

  const PAGE_SIZE = 48;
  const filterKey = `${searchQuery}:${selectedCategoryFilter}:${favouriteOnly}:${weatherFilter}:${occasionFilter}:${sortBy}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

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
    return () => { if (el) observer.unobserve(el); };
  }, [filteredItems.length, visibleCount]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount]
  );

  // ── Category stats for hero ───────────────────────────────────────────────
  const categoryCount = useMemo(
    () => new Set(items.filter((i) => i.category !== "outfit").map((i) => i.category)).size,
    [items]
  );

  // ── Share URL helper for command palette ──────────────────────────────────
  const copyShareLink = useCallback(async () => {
    try {
      const res = await fetch("/api/share", { method: "POST" });
      if (res.ok) {
        const data = await res.json() as { token?: string; shareUrl?: string };
        if (data.token) {
          const url = data.shareUrl || `${window.location.origin}/share/${data.token}`;
          await navigator.clipboard.writeText(url);
          setHasShared(true);
          toast("Share link copied!");
        }
      }
    } catch {
      toast("Could not copy share link", "error");
    }
  }, [toast]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Command Palette ──────────────────────────────────────────────── */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={items}
        onNavigate={navigateTo}
        onAddPiece={() => navigateTo("gallery")}
        onNewOutfit={() => navigateTo("outfitmaker")}
        onToggleTheme={toggleTheme}
        onCopyShareLink={copyShareLink}
      />

      {/* ── Mobile Bottom Tab Bar ────────────────────────────────────────── */}
      <BottomTabBar activeView={viewMode} onNavigate={navigateTo} />

      <main className="min-h-dvh bg-background text-foreground pb-20 sm:pb-8 transition-colors duration-200">
        {/* ── Sticky top bar ──────────────────────────────────────────────── */}
        <div
          className={`sticky top-0 z-20 transition-all duration-300 ease-out ${
            headerScrolled
              ? "border-b border-border bg-background/90 backdrop-blur-md shadow-xs"
              : ""
          }`}
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <header className="flex items-center justify-between gap-4 py-4 sm:py-5">
              {/* Left: Logo lockup */}
              <div className="flex items-center gap-3 min-w-0">
                <Logo variant="lockup" size={26} animated className="shrink-0" />
              </div>

              {/* Centre: View switcher (desktop only) */}
              <nav
                className="hidden sm:flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-xs"
                aria-label="View mode"
              >
                {VIEW_MODES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => navigateTo(id)}
                    aria-current={viewMode === id ? "true" : undefined}
                    className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                      viewMode === id ? "text-white" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {viewMode === id && (
                      <motion.div
                        layoutId="view-pill"
                        className="absolute inset-0 rounded-full shadow-sm"
                        style={{ background: "var(--accent)" }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon size={13} className="relative z-10 shrink-0" aria-hidden />
                    <span className="relative z-10">{label}</span>
                  </button>
                ))}
              </nav>

              {/* Right: search trigger + share + avatar menu */}
              <div className="flex shrink-0 items-center gap-2">
                {/* Search / ⌘K trigger */}
                <button
                  onClick={() => setPaletteOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs text-muted hover:text-foreground hover:border-border-strong transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  aria-label="Open search"
                >
                  <Search size={13} aria-hidden />
                  <span className="hidden sm:inline">Search</span>
                  <kbd className="hidden sm:inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-subtle">⌘K</kbd>
                </button>

                {/* Share button */}
                <ShareButton />

                {/* Avatar / account menu */}
                <div ref={avatarRef} className="relative">
                  <button
                    onClick={() => setAvatarOpen((o) => !o)}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-border-strong transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    aria-label="Account menu"
                    aria-expanded={avatarOpen}
                  >
                    {session?.user?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={session.user.image}
                        alt={session.user.name ?? "Avatar"}
                        className="h-6 w-6 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent"
                        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                        {userInitial}
                      </span>
                    )}
                    <ChevronDown
                      size={12}
                      className={`text-muted transition-transform duration-200 ${avatarOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>

                  <AnimatePresence>
                    {avatarOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: -4 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border bg-surface shadow-lg z-50 overflow-hidden"
                      >
                        {/* User info */}
                        {session?.user && (
                          <div className="border-b border-border px-4 py-3">
                            <p className="text-xs font-medium text-foreground truncate">
                              {session.user.name ?? session.user.email}
                            </p>
                            {session.user.email && session.user.name && (
                              <p className="text-[10px] text-muted truncate">{session.user.email}</p>
                            )}
                          </div>
                        )}

                        {/* Theme toggle */}
                        <div className="border-b border-border px-4 py-2">
                          <p className="eyebrow mb-2">Theme</p>
                          <div className="flex gap-1">
                            {(["light", "dark", "system"] as const).map((t) => (
                              <button
                                key={t}
                                onClick={() => applyTheme(t)}
                                className={`flex flex-1 flex-col items-center gap-1 rounded-xl p-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                                  theme === t
                                    ? "bg-accent-soft text-accent"
                                    : "text-muted hover:text-foreground hover:bg-surface-2"
                                }`}
                                style={theme === t ? { background: "var(--accent-soft)", color: "var(--accent)" } : undefined}
                                aria-pressed={theme === t}
                              >
                                {t === "light" ? <Sun size={14} /> : t === "dark" ? <Moon size={14} /> : <Monitor size={14} />}
                                <span className="capitalize">{t}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Links */}
                        <div className="py-1">
                          <a
                            href="/privacy"
                            className="flex items-center px-4 py-2.5 text-xs text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                            onClick={() => setAvatarOpen(false)}
                          >
                            Privacy Policy
                          </a>
                          <a
                            href="/terms"
                            className="flex items-center px-4 py-2.5 text-xs text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                            onClick={() => setAvatarOpen(false)}
                          >
                            Terms of Service
                          </a>
                        </div>

                        {/* Danger zone */}
                        <div className="border-t border-border py-1">
                          {!confirmDelete ? (
                            <button
                              onClick={() => setConfirmDelete(true)}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-destructive hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                            >
                              <Trash2 size={13} />
                              Delete account
                            </button>
                          ) : (
                            <div className="px-4 py-3 space-y-2">
                              <p className="text-[11px] font-medium text-destructive">
                                Type DELETE to confirm permanent deletion.
                              </p>
                              <input
                                type="text"
                                value={deleteInput}
                                onChange={(e) => setDeleteInput(e.target.value)}
                                placeholder="DELETE"
                                className="w-full rounded-lg border border-destructive/40 bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-destructive/40"
                              />
                              {deleteError && (
                                <p className="text-[10px] text-destructive">{deleteError}</p>
                              )}
                              <button
                                onClick={handleDeleteAccount}
                                disabled={deleteInput !== "DELETE" || isDeleting}
                                className="w-full rounded-lg bg-destructive px-3 py-2 text-xs font-medium text-white disabled:opacity-50 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                              >
                                {isDeleting ? "Deleting…" : deleteError ? "Retry deletion" : "Permanently delete"}
                              </button>
                              <button
                                onClick={() => { setConfirmDelete(false); setDeleteInput(""); setDeleteError(null); }}
                                className="w-full text-[11px] text-muted hover:text-foreground"
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-muted hover:text-foreground hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                          >
                            <LogOut size={13} />
                            Sign out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </header>
          </div>
        </div>

        {/* ── Page content ───────────────────────────────────────────────── */}
        <div className="mx-auto max-w-7xl px-5 pt-4 sm:px-8">
          <AnimatePresence mode="wait">
            {/* ══════════════════ GALLERY ══════════════════════════════════ */}
            {viewMode === "gallery" && (
              <motion.div key="gallery" {...viewTransition}>

                {/* ── Hero card ──────────────────────────────────────────── */}
                <div className="card card-stitch mb-8 p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                    <div>
                      {/* Greeting */}
                      {status === "loading" ? (
                        <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-2 mb-2" />
                      ) : (
                        <h1 className="text-h2 text-foreground mb-1">
                          {(() => {
                            const hour = new Date().getHours();
                            const greeting =
                              hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
                            return firstName ? `${greeting}, ${firstName}.` : greeting + ".";
                          })()}
                        </h1>
                      )}
                      <p className="text-sm text-muted">
                        {headingText}
                      </p>

                      {/* Count-up stats */}
                      <div className="mt-4 flex items-center gap-5 tabular-nums">
                        <div>
                          <p className="text-2xl font-serif font-light text-foreground">{items.length}</p>
                          <p className="eyebrow mt-0.5">{items.length === 1 ? "piece" : "pieces"}</p>
                        </div>
                        <div className="h-8 w-px bg-border" aria-hidden />
                        <div>
                          <p className="text-2xl font-serif font-light text-foreground">{outfitCount}</p>
                          <p className="eyebrow mt-0.5">outfits</p>
                        </div>
                        {categoryCount > 0 && (
                          <>
                            <div className="h-8 w-px bg-border" aria-hidden />
                            <div>
                              <p className="text-2xl font-serif font-light text-foreground">{categoryCount}</p>
                              <p className="eyebrow mt-0.5">{categoryCount === 1 ? "category" : "categories"}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end sm:gap-2">
                      <button
                        onClick={() => navigateTo("outfitmaker")}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-muted hover:text-foreground hover:border-border-strong transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                      >
                        <Shirt size={13} aria-hidden /> Make an outfit
                      </button>
                      <button
                        onClick={() => navigateTo("podium")}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-muted hover:text-foreground hover:border-border-strong transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                      >
                        <Box size={13} aria-hidden /> Open podium
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Onboarding checklist ──────────────────────────────── */}
                <OnboardingChecklist
                  userId={userId}
                  pieceCount={items.length}
                  outfitCount={outfitCount}
                  hasShared={hasShared}
                />

                {/* ── Upload card ───────────────────────────────────────── */}
                <div className="mb-10 w-full max-w-sm sm:max-w-md">
                  <UploadCard onUploadComplete={handleUploadComplete} />
                </div>

                {/* ── Today's Pick ──────────────────────────────────────── */}
                {items.length > 0 && (
                  <div className="mb-8 max-w-md">
                    <TodaysPick onTryInMaker={handleTryInMaker} />
                  </div>
                )}

                {/* ── Gallery toolbar: search, layout, sort, selection ──────── */}
                {items.length > 0 && (
                  <div className="mb-8 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {/* Search Input */}
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

                      {/* Controls: Sort, Layout Switcher, Select mode */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Sort select */}
                        <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 shadow-2xs">
                          <span className="text-[11px] text-muted font-medium">Sort:</span>
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            aria-label="Sort pieces by"
                            className="bg-transparent text-xs text-foreground font-medium outline-none cursor-pointer"
                          >
                            <option value="newest" className="bg-surface text-foreground">Newest</option>
                            <option value="oldest" className="bg-surface text-foreground">Oldest</option>
                            <option value="name" className="bg-surface text-foreground">Name (A–Z)</option>
                            <option value="category" className="bg-surface text-foreground">Category</option>
                          </select>
                        </div>

                        {/* Layout switcher: Rows vs Grid */}
                        <div className="flex items-center rounded-full border border-border bg-surface p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleSetLayoutMode("rows")}
                            aria-label="Horizontal rows view"
                            aria-pressed={layoutMode === "rows"}
                            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all cursor-pointer ${
                              layoutMode === "rows"
                                ? "bg-foreground text-background shadow-2xs"
                                : "text-muted hover:text-foreground"
                            }`}
                          >
                            <Rows size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetLayoutMode("grid")}
                            aria-label="Grid view"
                            aria-pressed={layoutMode === "grid"}
                            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all cursor-pointer ${
                              layoutMode === "grid"
                                ? "bg-foreground text-background shadow-2xs"
                                : "text-muted hover:text-foreground"
                            }`}
                          >
                            <LayoutGrid size={13} />
                          </button>
                        </div>

                        {/* Selection mode toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectionMode((prev) => !prev);
                            if (selectionMode) setSelectedIds(new Set());
                          }}
                          aria-pressed={selectionMode}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                            selectionMode
                              ? "bg-accent text-white"
                              : "border border-border bg-surface text-muted hover:text-foreground hover:border-border-strong"
                          }`}
                          style={selectionMode ? { background: "var(--accent)" } : undefined}
                        >
                          <Check size={12} strokeWidth={2.5} />
                          <span>{selectionMode ? "Done" : "Select"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter chips & metadata row */}
                    <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
                      <button
                        onClick={() => setSelectedCategoryFilter("all")}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] whitespace-nowrap ${
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
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                              selectedCategoryFilter === key
                                ? "bg-foreground text-background shadow-2xs"
                                : "bg-surface border border-border text-muted hover:text-foreground"
                            }`}
                          >
                            {label} ({count})
                          </button>
                        );
                      })}

                      {/* Favourites filter toggle */}
                      <button
                        onClick={() => setFavouriteOnly((f) => !f)}
                        aria-pressed={favouriteOnly}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                          favouriteOnly
                            ? "bg-accent text-white shadow-2xs"
                            : "bg-surface border border-border text-muted hover:text-foreground"
                        }`}
                        style={favouriteOnly ? { background: "var(--accent)" } : undefined}
                      >
                        <Heart size={12} fill={favouriteOnly ? "currentColor" : "none"} />
                        <span>Favourites {favCount > 0 ? `(${favCount})` : ""}</span>
                      </button>

                      {/* Weather tag filter if tags exist */}
                      {availableWeather.length > 0 && (
                        <select
                          value={weatherFilter}
                          onChange={(e) => setWeatherFilter(e.target.value)}
                          aria-label="Filter by weather tag"
                          className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-foreground outline-none cursor-pointer"
                        >
                          <option value="all" className="bg-surface text-foreground">Weather: All</option>
                          {availableWeather.map((w) => (
                            <option key={w} value={w} className="bg-surface text-foreground capitalize">
                              Weather: {w}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Occasion tag filter if tags exist */}
                      {availableOccasion.length > 0 && (
                        <select
                          value={occasionFilter}
                          onChange={(e) => setOccasionFilter(e.target.value)}
                          aria-label="Filter by occasion tag"
                          className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-foreground outline-none cursor-pointer"
                        >
                          <option value="all" className="bg-surface text-foreground">Occasion: All</option>
                          {availableOccasion.map((o) => (
                            <option key={o} value={o} className="bg-surface text-foreground capitalize">
                              Occasion: {o}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Clear active filters button */}
                      {hasActiveFilters && (
                        <button
                          onClick={clearAllFilters}
                          className="text-xs text-muted hover:text-foreground px-2 py-1 underline underline-offset-2 cursor-pointer transition-colors"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Gallery content ───────────────────────────────────── */}
                {loading ? (
                  <GallerySkeleton />
                ) : items.length === 0 ? (
                  <ArchiveEmptyState onAction={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
                ) : filteredItems.length === 0 ? (
                  <div className="card rounded-3xl p-12 text-center">
                    <p className="text-sm font-medium text-foreground">No pieces match your search or filters.</p>
                    <button
                      onClick={clearAllFilters}
                      className="mt-3 text-xs font-medium hover:underline underline-offset-2 cursor-pointer"
                      style={{ color: "var(--accent)" }}
                    >
                      Clear filters
                    </button>
                  </div>
                ) : layoutMode === "grid" ? (
                  /* ── Unified Grid View ───────────────────────────────── */
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <span className="eyebrow">
                        Showing {visibleItems.length} of {filteredItems.length} {filteredItems.length === 1 ? "piece" : "pieces"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      <AnimatePresence>
                        {visibleItems.map((item, itemIdx) => (
                          <motion.div
                            key={item._id}
                            layout
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{
                              duration: 0.24,
                              delay: Math.min(itemIdx * 0.02, 0.2),
                              ease: [0.22, 1, 0.36, 1],
                            }}
                          >
                            <ItemCard
                              item={item}
                              selectable={selectionMode}
                              selected={selectedIds.has(item._id)}
                              onToggleSelect={handleToggleSelect}
                              onOpenDetail={setDetailItem}
                              onEdit={setEditingItem}
                              onDelete={handleDelete}
                              onToggleFavourite={handleToggleFavourite}
                              priority={itemIdx < 6}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    {filteredItems.length > visibleCount && (
                      <div ref={loadMoreSentinelRef} className="pt-8 pb-2 flex flex-col items-center justify-center gap-2">
                        <button
                          onClick={() => setVisibleCount((prev) => Math.min(prev + 24, filteredItems.length))}
                          className="rounded-full border border-border bg-surface px-6 py-2.5 text-xs font-medium text-foreground hover:bg-surface-2 transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] cursor-pointer"
                        >
                          Show more pieces ({filteredItems.length - visibleCount} remaining)
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Category Rows View ──────────────────────────────── */
                  <div className="space-y-12">
                    {CATEGORY_ROWS.map(({ key, label }, categoryIdx) => {
                      const rowItems = visibleItems.filter((i) => i.category === key);
                      if (rowItems.length === 0) return null;

                      const content = (
                        <section>
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <h2 className="text-h3 text-foreground">{label}</h2>
                              <span className="eyebrow">
                                {rowItems.length} {rowItems.length === 1 ? "piece" : "pieces"}
                              </span>
                            </div>

                            {/* Desktop scroll arrows */}
                            <div className="hidden sm:flex items-center gap-1.5">
                              <button
                                onClick={() => scrollCategoryRow(key, -1)}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-muted hover:text-foreground hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] cursor-pointer"
                                aria-label={`Scroll ${label} left`}
                              >
                                <ChevronLeft size={14} />
                              </button>
                              <button
                                onClick={() => scrollCategoryRow(key, 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-muted hover:text-foreground hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] cursor-pointer"
                                aria-label={`Scroll ${label} right`}
                              >
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>

                          <div
                            ref={(el) => {
                              rowRefs.current[key] = el;
                            }}
                            className="snap-row scrollbar-hide -mx-5 flex gap-4 overflow-x-auto px-5 pb-3 sm:-mx-8 sm:px-8 [contain:content]"
                          >
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
                                    selectable={selectionMode}
                                    selected={selectedIds.has(item._id)}
                                    onToggleSelect={handleToggleSelect}
                                    onOpenDetail={setDetailItem}
                                    onEdit={setEditingItem}
                                    onDelete={handleDelete}
                                    onToggleFavourite={handleToggleFavourite}
                                    priority={categoryIdx === 0 && itemIdx < 4}
                                  />
                                </motion.div>
                              ))}
                            </AnimatePresence>
                            <div className="w-5 shrink-0 sm:w-8" aria-hidden />
                          </div>
                        </section>
                      );

                      if (categoryIdx === 0) return <div key={key}>{content}</div>;
                      return (
                        <SectionReveal key={key} delay={categoryIdx * 30} className="[content-visibility:auto] [contain-intrinsic-size:auto_320px]">
                          {content}
                        </SectionReveal>
                      );
                    })}

                    {filteredItems.length > visibleCount && (
                      <div ref={loadMoreSentinelRef} className="pt-6 pb-2 flex flex-col items-center justify-center gap-2">
                        <button
                          onClick={() => setVisibleCount((prev) => Math.min(prev + 24, filteredItems.length))}
                          className="rounded-full border border-border bg-surface px-6 py-2.5 text-xs font-medium text-foreground hover:bg-surface-2 transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] cursor-pointer"
                        >
                          Show more pieces ({filteredItems.length - visibleCount} remaining)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ══════════════════ OUTFIT MAKER ═════════════════════════════ */}
            {viewMode === "outfitmaker" && (
              <motion.div key="outfitmaker" {...viewTransition}>
                <div className="mb-5">
                  <h2 className="text-h2 text-foreground">Outfit Maker</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Stage tops over bottoms, rotate and resize, then export a lookbook card.
                  </p>
                </div>
                <OutfitMakerErrorBoundary>
                  <OutfitMaker
                    items={items}
                    initialOutfit={editingOutfit}
                    onOutfitSaved={() => { setEditingOutfit(null); }}
                  />
                </OutfitMakerErrorBoundary>
              </motion.div>
            )}

            {/* ══════════════════ MY OUTFITS ═══════════════════════════════ */}
            {viewMode === "outfits" && (
              <motion.div key="outfits" {...viewTransition}>
                <SavedOutfits
                  onLoadIntoMaker={(outfit) => {
                    setEditingOutfit(outfit);
                    navigateTo("outfitmaker");
                  }}
                  onNavigateToMaker={() => {
                    setEditingOutfit(null);
                    navigateTo("outfitmaker");
                  }}
                />
              </motion.div>
            )}

            {/* ══════════════════ 3D PODIUM ════════════════════════════════ */}
            {viewMode === "podium" && (
              <motion.div key="podium" {...viewTransition}>
                <div className="mb-6">
                  <h2 className="text-h2 text-foreground">3D Studio Podium</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Your archive presented on a revolving studio showcase
                  </p>
                </div>
                {(() => {
                  const podiumItems = items.filter((item) => item.category !== "outfit");
                  return podiumItems.length === 0 ? (
                    <ArchiveEmptyState onAction={() => navigateTo("gallery")} />
                  ) : (
                    <Podium items={podiumItems} />
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Edit Modal ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {editingItem && (
            <EditModal
              item={editingItem}
              onClose={() => setEditingItem(null)}
              onSave={(updated) => { handleEdit(updated as WardrobeItem); }}
            />
          )}
        </AnimatePresence>

        {/* ── Item Detail Slide-over Sheet ───────────────────────────────── */}
        <ItemDetailSheet
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onEdit={(item) => {
            setEditingItem(item);
            setDetailItem(null);
          }}
          onDelete={(id) => {
            const target = items.find((i) => i._id === id);
            if (target) handleDeleteWithUndo([target]);
            setDetailItem(null);
          }}
          onAddToOutfit={(item) => {
            handleTryInMaker("detail", [item._id]);
            setDetailItem(null);
          }}
          onToggleFavourite={handleToggleFavourite}
        />

        {/* ── Floating selection bar ────────────────────────────────────── */}
        <AnimatePresence>
          {selectionMode && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={springPremium}
              className="fixed bottom-20 sm:bottom-8 inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
            >
              <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-surface/95 backdrop-blur-md px-5 py-2.5 shadow-2xl">
                <span className="text-xs font-medium text-foreground">
                  {selectedIds.size} selected
                </span>
                <div className="h-4 w-px bg-border" />
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-muted hover:text-foreground font-medium cursor-pointer"
                >
                  {selectedIds.size === filteredItems.length && filteredItems.length > 0
                    ? "Deselect all"
                    : "Select all"}
                </button>
                {selectedIds.size > 0 && (
                  <>
                    <div className="h-4 w-px bg-border" />
                    <button
                      type="button"
                      onClick={handleStageSelectedInMaker}
                      className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-accent-hover transition-colors cursor-pointer"
                      style={{ background: "var(--accent)" }}
                    >
                      <Shirt size={12} />
                      <span>Stage outfit</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="flex items-center gap-1.5 rounded-full border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  </>
                )}
                <div className="h-4 w-px bg-border" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedIds(new Set());
                  }}
                  className="rounded-full p-1 text-muted hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Exit selection mode"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}

// ── Wrap in Suspense for useSearchParams ───────────────────────────────────
export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background">
          <StitchLoader size={40} label="Loading wardrobe…" />
        </div>
      }
    >
      <HomeInner />
    </Suspense>
  );
}
