"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { X, Shirt, Pencil, Trash2, Calendar, Tag, Heart } from "lucide-react";
import { optimizeCloudinaryUrl } from "@/lib/cloudinaryUrl";
import type { WardrobeItem } from "@/components/ui/ItemCard";
import { springPremium } from "@/lib/motion";

interface ItemDetailSheetProps {
  item: WardrobeItem | null;
  onClose: () => void;
  onEdit: (item: WardrobeItem) => void;
  onDelete: (id: string) => void;
  onAddToOutfit: (item: WardrobeItem) => void;
  onToggleFavourite?: (id: string, isFav: boolean) => void;
}

interface ItemDetailModalProps {
  item: WardrobeItem;
  onClose: () => void;
  onEdit: (item: WardrobeItem) => void;
  onDelete: (id: string) => void;
  onAddToOutfit: (item: WardrobeItem) => void;
  onToggleFavourite?: (id: string, isFav: boolean) => void;
}

function ItemDetailModal({
  item,
  onClose,
  onEdit,
  onDelete,
  onAddToOutfit,
  onToggleFavourite,
}: ItemDetailModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isFav, setIsFav] = useState(() => Boolean(item.favourite));

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const formattedDate = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const handleToggleFav = async () => {
    const next = !isFav;
    setIsFav(next);
    onToggleFavourite?.(item._id, next);
    try {
      await fetch(`/api/items/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favourite: next }),
      });
    } catch {
      setIsFav(!next);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

        {/* Desktop: Right Slide-Over / Mobile: Bottom Sheet */}
        <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={item.name}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={springPremium}
            className="w-screen max-w-md bg-surface border-l border-border shadow-2xl flex flex-col justify-between overflow-y-auto"
          >
            {/* Header with close and favourite button */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/90 px-6 py-4 backdrop-blur-md">
              <span className="eyebrow">{item.category}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleFav}
                  className={`rounded-full p-2 transition-colors ${
                    isFav
                      ? "text-accent bg-accent/10"
                      : "text-muted hover:text-foreground hover:bg-surface-2"
                  }`}
                  style={isFav ? { color: "var(--accent)" } : undefined}
                  aria-label={isFav ? "Unfavourite" : "Favourite"}
                >
                  <Heart size={16} fill={isFav ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-muted hover:text-foreground hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  aria-label="Close detail view"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 px-6 py-6 space-y-6">
              {/* Full Uncropped Garment Image */}
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-xs">
                <Image
                  src={optimizeCloudinaryUrl(item.imageUrl)}
                  alt={item.name}
                  fill
                  className="object-contain object-center p-3"
                  sizes="(max-width: 640px) 100vw, 420px"
                  priority
                />
              </div>

              {/* Title & Category */}
              <div>
                <h2 className="font-serif text-2xl font-light text-foreground tracking-tight">
                  {item.name}
                </h2>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground">
                    {item.category.toUpperCase()}
                  </span>
                  {item.dominantColor && (
                    <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted">
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: item.dominantColor }}
                      />
                      <span className="font-mono text-[10px]">{item.dominantColor}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags Section */}
              <div className="space-y-4 rounded-2xl border border-border bg-surface-2 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted">
                  <Tag size={13} />
                  <span>Tags & Attributes</span>
                </div>

                {/* Weather */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted mb-1.5 font-medium">Weather</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags?.weather && item.tags.weather.length > 0 ? (
                      item.tags.weather.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-surface border border-border px-2.5 py-0.5 text-xs text-foreground"
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted italic">No weather tags</span>
                    )}
                  </div>
                </div>

                {/* Occasion */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted mb-1.5 font-medium">Occasion</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags?.occasion && item.tags.occasion.length > 0 ? (
                      item.tags.occasion.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-surface border border-border px-2.5 py-0.5 text-xs text-foreground"
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted italic">No occasion tags</span>
                    )}
                  </div>
                </div>

                {/* Creation date */}
                {formattedDate && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border/60 text-[11px] text-muted">
                    <Calendar size={12} />
                    <span>Archived on {formattedDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div className="sticky bottom-0 z-20 border-t border-border bg-surface/95 px-6 py-4 backdrop-blur-md space-y-2">
              <button
                type="button"
                onClick={() => {
                  onAddToOutfit(item);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                style={{ background: "var(--accent)" }}
              >
                <Shirt size={14} />
                Stage in Outfit Maker
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onEdit(item);
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface py-2 text-xs font-medium text-foreground hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <Pencil size={13} />
                  Edit details
                </button>

                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface py-2 text-xs font-medium text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(item._id);
                      onClose();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-destructive py-2 text-xs font-medium text-white hover:bg-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  >
                    Confirm delete
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
    </div>
  );
}

export default function ItemDetailSheet({
  item,
  onClose,
  onEdit,
  onDelete,
  onAddToOutfit,
  onToggleFavourite,
}: ItemDetailSheetProps) {
  return (
    <AnimatePresence>
      {item && (
        <ItemDetailModal
          key={item._id}
          item={item}
          onClose={onClose}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddToOutfit={onAddToOutfit}
          onToggleFavourite={onToggleFavourite}
        />
      )}
    </AnimatePresence>
  );
}
