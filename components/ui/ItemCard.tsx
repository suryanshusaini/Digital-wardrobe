"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useSpring, useMotionValue } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import { optimizeCloudinaryUrl } from "@/lib/cloudinaryUrl";
import { useToast } from "@/components/ui/Toast";

// Tiny Cloudinary blur placeholder or 1x1 data url
const BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const MAX_TILT = 6;

interface WardrobeItem {
  _id: string;
  name: string;
  category: string;
  imageUrl: string;
  tags?: { weather: string[]; occasion: string[] };
}

interface ItemCardProps {
  item: WardrobeItem;
  onDelete?: (id: string) => void;
  onEdit?: (item: WardrobeItem) => void;
  priority?: boolean;
}

export default function ItemCard({
  item,
  onDelete,
  onEdit,
  priority = false,
}: ItemCardProps) {
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 3D perspective tilt springs driven directly by motion values (no React state updates on mouse move)
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const rotateXSpring = useSpring(rotateX, { stiffness: 180, damping: 22, mass: 0.6 });
  const rotateYSpring = useSpring(rotateY, { stiffness: 180, damping: 22, mass: 0.6 });

  // Specular highlight position driven via motion values
  const highlightX = useMotionValue(50);
  const highlightY = useMotionValue(50);
  const highlightOpacity = useMotionValue(0);

  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only enable tilt under (hover: hover) and (pointer: fine)
      if (typeof window !== "undefined" && !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        return;
      }
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width;
      const cy = (e.clientY - rect.top) / rect.height;

      rotateY.set((cx - 0.5) * MAX_TILT * 2);
      rotateX.set(-(cy - 0.5) * MAX_TILT * 2);

      highlightX.set(cx * 100);
      highlightY.set(cy * 100);
      highlightOpacity.set(0.18);
    },
    [rotateX, rotateY, highlightX, highlightY, highlightOpacity]
  );

  const handleMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    highlightOpacity.set(0);
    setConfirmDelete(false);
  }, [rotateX, rotateY, highlightOpacity]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/items/${item._id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete?.(item._id);
        toast("Piece removed from archive");
      } else {
        toast("Could not delete this piece", "error");
      }
    } catch {
      toast("Could not delete this piece", "error");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const showActions = Boolean(onEdit) || Boolean(onDelete);

  return (
    <motion.div
      ref={cardRef}
      className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-sm dark:border-stone-800 dark:bg-[#1a1714]"
      style={{
        perspective: "900px",
        rotateX: rotateXSpring,
        rotateY: rotateYSpring,
        transformStyle: "preserve-3d",
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => onEdit?.(item)}
    >
      {/* Photo-mat tile: uses --surface-mat token ensuring #f8f7f5 baked-in backgrounds appear as clean editorial photo tiles in dark mode */}
      <div className="absolute inset-0 bg-[var(--surface-mat)] p-2">
        <div className="relative h-full w-full overflow-hidden rounded-xl">
          <Image
            src={optimizeCloudinaryUrl(item.imageUrl)}
            alt={item.name}
            fill
            className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            sizes="(max-width: 640px) 48vw, (max-width: 1024px) 224px, 224px"
            draggable={false}
          />
        </div>
      </div>

      {/* Soft specular highlight driven via motion values without re-rendering */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-200"
        style={{
          background: "radial-gradient(circle 80px at 50% 50%, rgba(255,255,255,0.55) 0%, transparent 70%)",
          opacity: highlightOpacity,
        }}
        aria-hidden
      />

      {/* Action buttons — visible on hover (desktop) or always (mobile) */}
      {showActions && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-end gap-2 p-2.5 opacity-100 transition-opacity duration-300 ease-out sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <AnimatePresence>
            {(Boolean(onEdit) || Boolean(onDelete)) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-white/95 p-1 shadow-sm backdrop-blur-sm dark:border-stone-700/80 dark:bg-stone-900/90"
              >
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                    className="rounded-full p-2 text-stone-800 transition-all duration-200 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] dark:text-stone-200 dark:hover:bg-stone-800"
                    aria-label={`Edit ${item.name}`}
                  >
                    <Pencil size={13} />
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-2 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50 ${
                      confirmDelete
                        ? "bg-red-500 text-white"
                        : "text-stone-800 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                    }`}
                    aria-label={
                      confirmDelete
                        ? `Confirm delete ${item.name}`
                        : `Delete ${item.name}`
                    }
                  >
                    {isDeleting ? "…" : confirmDelete ? "Sure?" : <Trash2 size={13} />}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
