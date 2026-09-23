"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import { optimizeCloudinaryUrl } from "@/lib/cloudinaryUrl";
import { useToast } from "@/components/ui/Toast";

const BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

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
}

export default function ItemCard({ item, onDelete, onEdit }: ItemCardProps) {
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    } catch (err) {
      console.error("Delete failed:", err);
      toast("Could not delete this piece", "error");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const showActions = Boolean(onEdit) || Boolean(onDelete);

  return (
    <motion.div
      className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl"
      onHoverEnd={() => setConfirmDelete(false)}
    >
      <Image
        src={optimizeCloudinaryUrl(item.imageUrl)}
        alt={item.name}
        fill
        className="object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-105"
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        sizes="(max-width: 640px) 48vw, (max-width: 1024px) 224px, 224px"
        draggable={false}
      />

      {showActions && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-end gap-2 p-2.5 opacity-100 transition-opacity duration-300 ease-out sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <AnimatePresence>
            {(Boolean(onEdit) || Boolean(onDelete)) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 rounded-full border border-white/50 bg-white/70 p-1 shadow-sm backdrop-blur-md"
              >
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                    className="rounded-full p-2 text-stone-800 transition-all duration-300 ease-out hover:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/20"
                    aria-label="Edit item"
                  >
                    <Pencil size={13} />
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-2 text-xs font-medium transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-stone-900/20 ${
                      confirmDelete
                        ? "bg-red-500 text-white"
                        : "text-stone-800 hover:bg-white"
                    }`}
                    aria-label={confirmDelete ? "Confirm delete" : "Delete item"}
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
