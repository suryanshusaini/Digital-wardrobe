"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { X, ExternalLink } from "lucide-react";
import { optimizeCloudinaryUrl } from "@/lib/cloudinaryUrl";

const CATEGORIES = ["top", "bottom", "shoes", "accessory", "outfit"] as const;
const WEATHER_TAGS = ["sunny", "rainy", "cold", "hot", "mild"];
const OCCASION_TAGS = ["casual", "formal", "sport", "party", "beach"];

function cap(s: string) {
  return s === "outfit" ? "Outfit" : s.charAt(0).toUpperCase() + s.slice(1);
}

function TagPill({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.94 }}
      animate={active ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
        active
          ? "bg-accent text-accent-foreground shadow-xs hover:bg-accent-hover"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
      }`}
    >
      {label}
    </motion.button>
  );
}

export interface EditItemShape {
  _id: string;
  name: string;
  category: string;
  imageUrl?: string;
  tags?: { weather: string[]; occasion: string[] };
}

interface EditModalProps {
  item: EditItemShape;
  onClose: () => void;
  onSave: (updated: EditItemShape) => void;
}

export default function EditModal({ item, onClose, onSave }: EditModalProps) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [weather, setWeather] = useState<string[]>(item.tags?.weather ?? []);
  const [occasion, setOccasion] = useState<string[]>(
    item.tags?.occasion ?? []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (
    list: string[],
    setList: (v: string[]) => void,
    val: string
  ) => {
    setList(
      list.includes(val) ? list.filter((t) => t !== val) : [...list, val]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/items/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          tags: { weather, occasion },
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Unknown error");
      }
      const data = await res.json();
      onSave(data.item);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative bg-white dark:bg-[#1e1b18] border border-stone-200/60 dark:border-stone-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 z-10 text-stone-900 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-serif font-light tracking-tight text-stone-900 dark:text-stone-100">
            Piece Details
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label="Close modal"
          >
            <X size={15} className="text-stone-500" />
          </button>
        </div>

        {/* Full Uncropped Photo View */}
        {item.imageUrl && (
          <div className="mb-5 flex flex-col items-center">
            <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden bg-[var(--surface-mat)] border border-stone-200/60 dark:border-stone-800 flex items-center justify-center p-3">
              <Image
                src={optimizeCloudinaryUrl(item.imageUrl)}
                alt={item.name}
                fill
                className="object-contain p-2 rounded-xl"
                sizes="(max-width: 640px) 90vw, 400px"
              />
            </div>
            <a
              href={item.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-md px-2 py-0.5"
            >
              <span>View full resolution image</span>
              <ExternalLink size={11} />
            </a>
          </div>
        )}

        {/* Name */}
        <div className="mb-5">
          <label className="block text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2 font-medium">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="w-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 rounded-xl px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-[var(--ring)] transition-colors"
            placeholder="Item name"
          />
        </div>

        {/* Category */}
        <div className="mb-5">
          <label className="block text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2 font-medium">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <TagPill
                key={cat}
                label={cap(cat)}
                active={category === cat}
                onToggle={() => setCategory(cat)}
              />
            ))}
          </div>
        </div>

        {/* Weather */}
        <div className="mb-5">
          <label className="block text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2 font-medium">
            Weather
          </label>
          <div className="flex flex-wrap gap-2">
            {WEATHER_TAGS.map((tag) => (
              <TagPill
                key={tag}
                label={cap(tag)}
                active={weather.includes(tag)}
                onToggle={() => toggle(weather, setWeather, tag)}
              />
            ))}
          </div>
        </div>

        {/* Occasion */}
        <div className="mb-6">
          <label className="block text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2 font-medium">
            Occasion
          </label>
          <div className="flex flex-wrap gap-2">
            {OCCASION_TAGS.map((tag) => (
              <TagPill
                key={tag}
                label={cap(tag)}
                active={occasion.includes(tag)}
                onToggle={() => toggle(occasion, setOccasion, tag)}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500 mb-4 -mt-2">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent-hover rounded-full py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-xs hover:shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
