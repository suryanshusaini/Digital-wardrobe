"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, useSpring, useMotionValue } from "framer-motion";
import { Heart, Check } from "lucide-react";
import { optimizeCloudinaryUrl } from "@/lib/cloudinaryUrl";

const BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const MAX_TILT = 5;

export interface WardrobeItem {
  _id: string;
  name: string;
  category: string;
  imageUrl: string;
  favourite?: boolean;
  dominantColor?: string;
  tags?: { weather: string[]; occasion: string[] };
  createdAt?: string;
}

interface ItemCardProps {
  item: WardrobeItem;
  onDelete?: (id: string) => void;
  onEdit?: (item: WardrobeItem) => void;
  onOpenDetail?: (item: WardrobeItem) => void;
  onToggleFavourite?: (id: string, isFav: boolean) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  priority?: boolean;
}

export default function ItemCard({
  item,
  onOpenDetail,
  onEdit,
  onToggleFavourite,
  selectable = false,
  selected = false,
  onToggleSelect,
  priority = false,
}: ItemCardProps) {
  const [isFav, setIsFav] = useState(Boolean(item.favourite));
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D perspective tilt springs
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const rotateXSpring = useSpring(rotateX, { stiffness: 220, damping: 24, mass: 0.5 });
  const rotateYSpring = useSpring(rotateY, { stiffness: 220, damping: 24, mass: 0.5 });

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (typeof window !== "undefined" && !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        return;
      }
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width;
      const cy = (e.clientY - rect.top) / rect.height;

      rotateY.set((cx - 0.5) * MAX_TILT * 2);
      rotateX.set(-(cy - 0.5) * MAX_TILT * 2);

      cardRef.current.style.setProperty("--mx", String(cx * 100));
      cardRef.current.style.setProperty("--my", String(cy * 100));
    },
    [rotateX, rotateY]
  );

  const handlePointerLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  const handleCardClick = () => {
    if (selectable) {
      onToggleSelect?.(item._id);
    } else if (onOpenDetail) {
      onOpenDetail(item);
    } else if (onEdit) {
      onEdit(item);
    }
  };

  const handleToggleFavourite = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
      // Revert on network failure
      setIsFav(!next);
      onToggleFavourite?.(item._id, !next);
    }
  };

  return (
    <motion.div
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-label={`${item.name}, ${item.category}`}
      className={`card card-interactive group relative aspect-[3/4] cursor-pointer overflow-hidden select-none ${
        selected ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-background" : ""
      }`}
      style={{
        perspective: "800px",
        rotateX: rotateXSpring,
        rotateY: rotateYSpring,
        transformStyle: "preserve-3d",
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Background mat with dominant color placeholder */}
      <div
        className="absolute inset-0 p-2"
        style={{
          backgroundColor: item.dominantColor
            ? `${item.dominantColor}15`
            : "var(--surface-mat)",
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-xl bg-surface-2">
          <Image
            src={optimizeCloudinaryUrl(item.imageUrl)}
            alt={item.name}
            fill
            className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            sizes="(max-width: 640px) 48vw, (max-width: 1024px) 240px, 260px"
            draggable={false}
          />
        </div>
      </div>

      {/* Selection checkbox pill */}
      {selectable && (
        <div
          className={`absolute top-3 left-3 z-30 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-all ${
            selected
              ? "border-accent bg-accent text-white"
              : "border-border/80 bg-surface/90 text-transparent hover:border-accent"
          }`}
          style={selected ? { background: "var(--accent)", borderColor: "var(--accent)" } : undefined}
          aria-hidden
        >
          <Check size={13} strokeWidth={2.5} />
        </div>
      )}

      {/* Favourite heart toggle button (top-right) */}
      <button
        type="button"
        onClick={handleToggleFavourite}
        className={`absolute top-3 right-3 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-surface/85 backdrop-blur-md transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
          isFav
            ? "text-accent opacity-100"
            : "text-muted opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:text-foreground"
        }`}
        style={isFav ? { color: "var(--accent)" } : undefined}
        aria-label={isFav ? `Unfavourite ${item.name}` : `Favourite ${item.name}`}
      >
        <Heart
          size={14}
          fill={isFav ? "currentColor" : "none"}
          strokeWidth={isFav ? 2 : 1.75}
        />
      </button>

      {/* Editorial caption bar at card base */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end bg-gradient-to-t from-background/95 via-background/70 to-transparent p-3 pt-8 pointer-events-none">
        <p className="font-serif text-[15px] font-normal leading-tight text-foreground truncate">
          {item.name}
        </p>
        <div className="mt-1 flex items-center gap-1.5 min-w-0">
          {item.dominantColor && (
            <span
              className="h-2 w-2 rounded-full border border-black/10 shrink-0"
              style={{ backgroundColor: item.dominantColor }}
              aria-hidden
            />
          )}
          <span className="eyebrow text-[9px] truncate">
            {item.category}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
