"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Edit3,
  ExternalLink,
  Plus,
  Sparkles,
  Calendar,
  X,
  Check,
} from "lucide-react";
import { optimizeCloudinaryUrl } from "@/lib/cloudinaryUrl";
import { useToast } from "@/components/ui/Toast";

const BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export interface SavedOutfitItem {
  itemId: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  zIndex: number;
  rotation: number;
}

export interface SavedOutfit {
  _id: string;
  name: string;
  items: SavedOutfitItem[];
  createdAt: string;
}

interface SavedOutfitsProps {
  onLoadIntoMaker?: (outfit: SavedOutfit) => void;
  onNavigateToMaker?: () => void;
  readOnly?: boolean;
  initialOutfits?: SavedOutfit[];
}

export default function SavedOutfits({
  onLoadIntoMaker,
  onNavigateToMaker,
  readOnly = false,
  initialOutfits,
}: SavedOutfitsProps) {
  const { toast } = useToast();
  const [internalOutfits, setInternalOutfits] = useState<SavedOutfit[]>(
    initialOutfits || []
  );
  const [loading, setLoading] = useState(!initialOutfits);
  const outfits = readOnly && initialOutfits ? initialOutfits : internalOutfits;
  const [selectedOutfit, setSelectedOutfit] = useState<SavedOutfit | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!initialOutfits && !readOnly) {
      async function load() {
        try {
          const res = await fetch("/api/outfits", { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          if (isMounted && data.success) {
            setInternalOutfits(data.outfits || []);
          }
        } catch (err) {
          console.error("Failed to load saved outfits:", err);
        } finally {
          if (isMounted) setLoading(false);
        }
      }
      load();
    }
    return () => {
      isMounted = false;
    };
  }, [initialOutfits, readOnly]);

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/outfits/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInternalOutfits((prev) => prev.filter((o) => o._id !== id));
        if (selectedOutfit?._id === id) setSelectedOutfit(null);
        toast("Outfit deleted");
      }
    } catch (err) {
      console.error("Failed to delete outfit:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRename = async (id: string, newName: string) => {
    if (!newName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/outfits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        await res.json();
        setInternalOutfits((prev) =>
          prev.map((o) => (o._id === id ? { ...o, name: newName.trim() } : o))
        );
        if (selectedOutfit?._id === id) {
          setSelectedOutfit((prev) => (prev ? { ...prev, name: newName.trim() } : null));
        }
      }
    } catch (err) {
      console.error("Failed to rename outfit:", err);
    } finally {
      setEditingId(null);
    }
  };

  // ── Empty State ─────────────────────────────────────────────────────────────
  if (!loading && outfits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 bg-white border border-stone-100 rounded-3xl text-center shadow-xs">
        <div className="w-16 h-16 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center mb-4 text-stone-400">
          <Sparkles size={26} strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-medium text-stone-900 mb-1">
          No outfits saved yet
        </h3>
        <p className="text-sm text-stone-400 max-w-sm mb-6 leading-relaxed">
          {readOnly
            ? "No styled looks have been created in this wardrobe yet."
            : "Create and assemble your styled looks using clothing items from your wardrobe."}
        </p>
        {!readOnly && onNavigateToMaker && (
          <button
            onClick={onNavigateToMaker}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-accent-foreground text-xs font-medium hover:bg-accent-hover transition-all shadow-sm"
          >
            <Plus size={14} />
            <span>Create an Outfit in Outfit Maker</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-light tracking-tight text-stone-900">
            {readOnly ? "Saved Outfits" : "My Outfits"}
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            {outfits.length} saved {outfits.length === 1 ? "look" : "looks"}
          </p>
        </div>
        {!readOnly && onNavigateToMaker && (
          <button
            onClick={onNavigateToMaker}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-accent-foreground text-xs font-medium hover:bg-accent-hover active:scale-[0.98] transition-all duration-150 shadow-xs hover:shadow-sm cursor-pointer"
          >
            <Plus size={13} />
            <span>New Outfit</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-stone-100 p-4 h-72 animate-pulse"
            >
              <div className="w-full h-48 bg-stone-50 rounded-xl mb-3" />
              <div className="h-4 bg-stone-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-stone-50 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : (
        /* ── Outfits Grid ────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {outfits.map((outfit, index) => (
            <motion.div
              key={outfit._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{
                scale: 1.02,
                y: -3,
                boxShadow: "0 14px 30px rgba(28,25,23,0.10), 0 4px 12px rgba(28,25,23,0.04)",
              }}
              transition={{
                duration: 0.2,
                delay: Math.min(index * 0.05, 0.4),
                ease: "easeOut",
              }}
              onClick={() => setSelectedOutfit(outfit)}
              className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-xs transform-gpu will-change-transform"
            >
              {/* Normalized Fixed-Box Thumbnail Row */}
              <div className="relative w-full h-56 sm:h-60 bg-stone-50/70 overflow-hidden border-b border-stone-100 flex items-center justify-center p-4">
                {outfit.items.length === 0 ? (
                  <span className="text-xs text-stone-300">Empty outfit</span>
                ) : (
                  <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 w-full max-w-full px-2">
                    {/* Render up to 3 items in fixed bounding boxes */}
                    {outfit.items.slice(0, 3).map((item, idx) => (
                      <div
                        key={idx}
                        className={`relative rounded-2xl bg-white border border-stone-100 shadow-2xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 transform-gpu will-change-transform ${
                          outfit.items.length === 1
                            ? "w-28 h-28 sm:w-32 sm:h-32 p-3"
                            : outfit.items.length === 2
                            ? "w-22 h-22 sm:w-26 sm:h-26 p-2.5"
                            : "w-18 h-18 sm:w-22 sm:h-22 p-2"
                        }`}
                      >
                        <div className="relative w-full h-full">
                          <Image
                            src={optimizeCloudinaryUrl(item.imageUrl)}
                            alt="Clothing piece"
                            fill
                            placeholder="blur"
                            blurDataURL={BLUR_DATA_URL}
                            className="object-contain"
                            sizes="120px"
                            draggable={false}
                          />
                        </div>
                      </div>
                    ))}

                    {/* +N More Badge if outfit has >3 items */}
                    {outfit.items.length > 3 && (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-stone-100/90 border border-stone-200 flex flex-col items-center justify-center text-stone-600 font-medium text-xs shadow-2xs shrink-0">
                        <span>+{outfit.items.length - 3}</span>
                        <span className="text-[10px] text-stone-400 font-normal">
                          more
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Piece count pill */}
                <div className="absolute top-3 right-3 px-2.5 py-0.5 bg-accent-light text-accent border border-accent/20 rounded-full text-[10px] font-medium shadow-2xs">
                  {outfit.items.length} {outfit.items.length === 1 ? "piece" : "pieces"}
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-3">
                  {editingId === outfit._id ? (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(outfit._id, editingName);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="w-full px-2 py-0.5 text-sm bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-900"
                      />
                      <button
                        onClick={() => handleRename(outfit._id, editingName)}
                        className="p-1 hover:bg-stone-100 rounded text-stone-700"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-medium text-stone-900 truncate">
                        {outfit.name}
                      </h3>
                      {!readOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(outfit._id);
                            setEditingName(outfit.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-stone-50 rounded text-stone-400 hover:text-stone-700 transition-opacity"
                          title="Rename"
                        >
                          <Edit3 size={12} />
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-400">
                    <Calendar size={11} />
                    <span>
                      {new Date(outfit.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {!readOnly && (
                  <div className="flex items-center gap-1 shrink-0">
                    {onLoadIntoMaker && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadIntoMaker(outfit);
                        }}
                        className="p-2 bg-stone-50 hover:bg-stone-900 hover:text-white rounded-full text-stone-600 transition-colors shadow-2xs"
                        title="Load into Outfit Maker"
                      >
                        <ExternalLink size={13} />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (deletingId === outfit._id) {
                          handleDelete(outfit._id, e);
                        } else {
                          setDeletingId(outfit._id);
                          setTimeout(() => setDeletingId(null), 3000);
                        }
                      }}
                      className={`p-2 rounded-full transition-colors shadow-2xs ${
                        deletingId === outfit._id
                          ? "bg-red-500 text-white"
                          : "bg-stone-50 hover:bg-red-50 text-stone-400 hover:text-red-500"
                      }`}
                      title={deletingId === outfit._id ? "Confirm delete" : "Delete outfit"}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Outfit Detail Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedOutfit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl border border-stone-100 w-full max-w-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-stone-900">
                    {selectedOutfit.name}
                  </h3>
                  <p className="text-xs text-stone-400">
                    {selectedOutfit.items.length} pieces assembled
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOutfit(null)}
                  className="p-1.5 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body: Full Canvas Display */}
              <div className="relative w-full h-80 sm:h-96 bg-[#f8f7f5] overflow-hidden">
                {selectedOutfit.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: "absolute",
                      left: `${item.x}px`,
                      top: `${item.y}px`,
                      width: `${item.width}px`,
                      zIndex: item.zIndex,
                      transform: `rotate(${item.rotation || 0}deg)`,
                    }}
                    className="aspect-square"
                  >
                    <div className="relative w-full h-full drop-shadow-md">
                      <Image
                        src={optimizeCloudinaryUrl(item.imageUrl)}
                        alt="Outfit piece"
                        fill
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        className="object-contain"
                        sizes="200px"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className={`px-6 py-4 border-t border-stone-100 flex items-center bg-white ${
                readOnly ? "justify-end" : "justify-between"
              }`}>
                {!readOnly && (
                  <button
                    onClick={() => handleDelete(selectedOutfit._id)}
                    className="text-xs text-stone-400 hover:text-red-500 font-medium transition-colors"
                  >
                    Delete outfit
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedOutfit(null)}
                    className="px-4 py-2 rounded-full border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 hover:border-stone-300 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                  >
                    Close
                  </button>
                  {!readOnly && onLoadIntoMaker && (
                    <button
                      onClick={() => {
                        onLoadIntoMaker(selectedOutfit);
                        setSelectedOutfit(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-accent text-accent-foreground text-xs font-medium hover:bg-accent-hover active:scale-[0.98] transition-all duration-150 shadow-xs hover:shadow-sm cursor-pointer"
                    >
                      <ExternalLink size={13} />
                      <span>Edit in Outfit Maker</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
