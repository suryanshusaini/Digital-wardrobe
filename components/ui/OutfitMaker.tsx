"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { motion, useMotionValue, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Save, X, Plus, RotateCw, Download, Camera } from "lucide-react";
import { optimizeCloudinaryUrl } from "@/lib/cloudinaryUrl";
import { downloadDataUrl, exportLookbookCard } from "@/lib/lookbook";
import { useToast } from "@/components/ui/Toast";

const BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const CATEGORY_Z: Record<string, number> = {
  shoes: 10,
  bottom: 20,
  top: 30,
  accessory: 40,
};

interface WardrobeItem {
  _id: string;
  name: string;
  category: string;
  imageUrl: string;
}

interface CanvasItem {
  id: string;
  itemId: string;
  imageUrl: string;
  name: string;
  category: string;
  x: number;
  y: number;
  width: number;
  zIndex: number;
  rotation: number;
}

function defaultPose(
  category: string,
  canvasW: number,
  canvasH: number
): { x: number; y: number; width: number } {
  const poses: Record<string, { x: number; y: number; width: number }> = {
    shoes: { x: canvasW / 2 - 70, y: canvasH * 0.62, width: 140 },
    bottom: { x: canvasW / 2 - 80, y: canvasH * 0.36, width: 160 },
    top: { x: canvasW / 2 - 86, y: canvasH * 0.1, width: 172 },
    accessory: { x: canvasW / 2 + 48, y: canvasH * 0.08, width: 92 },
  };
  return poses[category] ?? { x: canvasW / 2 - 75, y: canvasH / 2 - 90, width: 150 };
}

function DraggableItem({
  item,
  canvasRef,
  isSelected,
  onSelect,
  onRemove,
  onChange,
}: {
  item: CanvasItem;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onChange: (id: string, patch: Partial<CanvasItem>) => void;
}) {
  const x = useMotionValue(item.x);
  const y = useMotionValue(item.y);

  useEffect(() => {
    x.set(item.x);
    y.set(item.y);
  }, [item.x, item.y, x, y]);

  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startW = item.width;
    const move = (ev: PointerEvent) => {
      const next = Math.min(280, Math.max(72, startW + (ev.clientX - startX)));
      onChange(item.id, { width: next });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startRotate = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const el = e.currentTarget.parentElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const move = (ev: PointerEvent) => {
      const angle = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI;
      onChange(item.id, { rotation: Math.round(angle + 90) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <motion.div
      drag
      dragConstraints={canvasRef}
      dragMomentum={false}
      dragElastic={0}
      style={{
        x,
        y,
        position: "absolute",
        top: 0,
        left: 0,
        width: item.width,
        zIndex: isSelected ? item.zIndex + 200 : item.zIndex,
        touchAction: "none",
        cursor: "grab",
        rotate: item.rotation,
      }}
      onDragEnd={() => onChange(item.id, { x: x.get(), y: y.get() })}
      onTap={onSelect}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
    >
      <div
        className={`relative select-none ${
          isSelected ? "ring-2 ring-stone-900 ring-offset-2 rounded-lg" : ""
        }`}
        style={{ width: item.width, height: item.width * 1.25 }}
      >
        <Image
          src={optimizeCloudinaryUrl(item.imageUrl)}
          alt={item.name}
          fill
          className="object-contain"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          sizes="200px"
          draggable={false}
        />
      </div>

      {isSelected && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-3 -right-3 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white shadow-md transition-colors hover:bg-red-500"
            aria-label="Remove from canvas"
          >
            <X size={11} />
          </button>
          <button
            onPointerDown={startRotate}
            className="absolute -top-3 left-1/2 z-50 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-stone-200/60 bg-white/85 text-stone-700 shadow-sm backdrop-blur-md"
            aria-label="Rotate piece"
          >
            <RotateCw size={11} />
          </button>
          <button
            onPointerDown={startResize}
            className="absolute -bottom-2 -right-2 z-50 h-4 w-4 rounded-full border border-stone-200 bg-white shadow-sm"
            aria-label="Resize piece"
          />
        </>
      )}
    </motion.div>
  );
}

const SIDEBAR_CATS = ["all", "top", "bottom", "shoes", "accessory"];

interface OutfitMakerProps {
  items: WardrobeItem[];
  initialOutfit?: {
    _id?: string;
    name?: string;
    items: {
      itemId: string;
      imageUrl: string;
      x: number;
      y: number;
      width: number;
      zIndex: number;
      rotation: number;
    }[];
  } | null;
  onOutfitSaved?: () => void;
}

export default function OutfitMaker({
  items,
  initialOutfit,
  onOutfitSaved,
}: OutfitMakerProps) {
  const { toast } = useToast();
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarCat, setSidebarCat] = useState("all");
  const [savePrompt, setSavePrompt] = useState(false);
  const [outfitName, setOutfitName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [lookbookUrl, setLookbookUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [loadedOutfitId, setLoadedOutfitId] = useState<string | null>(null);

  if (initialOutfit && (initialOutfit._id || "temp") !== loadedOutfitId) {
    setLoadedOutfitId(initialOutfit._id || "temp");
    setOutfitName(initialOutfit.name || "");
    const outfitPrefix = initialOutfit._id || "outfit";
    const loaded: CanvasItem[] = (initialOutfit.items || []).map((it, idx) => {
      const matchedItem = items.find((w) => w._id === it.itemId);
      return {
        id: `loaded-${outfitPrefix}-${idx}`,
        itemId: it.itemId,
        imageUrl: it.imageUrl,
        name: matchedItem?.name || "Piece",
        category: matchedItem?.category || "top",
        x: it.x,
        y: it.y,
        width: it.width || 150,
        zIndex: it.zIndex || CATEGORY_Z[matchedItem?.category || "top"] || idx + 1,
        rotation: it.rotation || 0,
      };
    });
    setCanvasItems(loaded);
  }

  const styleableItems = items.filter((i) => i.category !== "outfit");
  const sidebarItems =
    sidebarCat === "all"
      ? styleableItems
      : styleableItems.filter((i) => i.category === sidebarCat);

  const addToCanvas = useCallback((item: WardrobeItem) => {
    const el = canvasRef.current;
    const pose = defaultPose(
      item.category,
      el?.offsetWidth ?? 400,
      el?.offsetHeight ?? 500
    );
    const id = `${item._id}-${Date.now()}`;
    setCanvasItems((prev) => {
      const already = prev.filter((p) => p.category === item.category).length;
      return [
        ...prev,
        {
          id,
          itemId: item._id,
          imageUrl: item.imageUrl,
          name: item.name,
          category: item.category,
          x: pose.x + already * 18,
          y: pose.y + already * 10,
          width: pose.width,
          zIndex: CATEGORY_Z[item.category] ?? 10,
          rotation: 0,
        },
      ];
    });
    setSelectedId(id);
  }, []);

  const removeFromCanvas = useCallback((id: string) => {
    setCanvasItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);
  }, []);

  const handleChange = useCallback((id: string, patch: Partial<CanvasItem>) => {
    setCanvasItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
    );
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        selectedId &&
        document.activeElement?.tagName !== "INPUT"
      ) {
        removeFromCanvas(selectedId);
      }
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, removeFromCanvas]);

  const handleSave = async () => {
    if (!outfitName.trim() || canvasItems.length === 0) return;
    setIsSaving(true);
    const payload = {
      name: outfitName.trim(),
      items: canvasItems.map(({ itemId, imageUrl, x, y, width, zIndex, rotation }) => ({
        itemId,
        imageUrl,
        x,
        y,
        width,
        zIndex,
        rotation,
      })),
    };

    try {
      const res = await fetch("/api/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast("Outfit saved to your lookbook");
        setSavePrompt(false);
        setOutfitName("");
        onOutfitSaved?.();
      } else {
        toast("Could not save this outfit", "error");
      }
    } catch (err) {
      console.error("Save outfit error:", err);
      toast("Could not save this outfit", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLookbook = async () => {
    const el = canvasRef.current;
    if (!el || canvasItems.length === 0) return;
    setIsExporting(true);
    try {
      const dataUrl = await exportLookbookCard({
        stageWidth: el.offsetWidth,
        stageHeight: el.offsetHeight,
        items: canvasItems,
        title: outfitName.trim() || "Lookbook",
      });
      setLookbookUrl(dataUrl);
      toast("Lookbook card ready", "info");
    } catch (err) {
      console.error(err);
      toast("Could not generate lookbook (image CORS)", "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative flex h-[75vh] flex-col gap-4 sm:flex-row">
      <aside className="hidden sm:flex sm:w-60 shrink-0 flex-col overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-sm">
        <div className="shrink-0 border-b border-stone-200/60 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-500">
            Wardrobe
          </p>
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            {SIDEBAR_CATS.map((cat) => (
              <motion.button
                key={cat}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setSidebarCat(cat)}
                className={`shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-300 ease-out select-none ${
                  sidebarCat === cat
                    ? "bg-stone-900 text-white shadow-xs"
                    : "bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900"
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-3">
          {sidebarItems.length === 0 ? (
            <p className="col-span-2 py-8 text-center text-xs text-stone-500">
              No items
            </p>
          ) : (
            sidebarItems.map((item) => (
              <motion.button
                key={item._id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                onClick={() => addToCanvas(item)}
                title={`Add ${item.name}`}
                className="group/si relative aspect-square overflow-hidden rounded-xl border border-stone-200/60 bg-stone-50 dark:border-stone-800 dark:bg-[#201d19]"
              >
                <div className="relative h-full w-full bg-[var(--surface-mat)] p-1.5">
                  <Image
                    src={optimizeCloudinaryUrl(item.imageUrl)}
                    alt={item.name}
                    fill
                    className="object-contain transition-transform duration-500 group-hover/si:scale-105"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    sizes="80px"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-colors group-hover/si:bg-black/5">
                  <Plus
                    size={16}
                    className="text-stone-700 opacity-0 transition-opacity group-hover/si:opacity-100"
                  />
                </div>
              </motion.button>
            ))
          )}
        </div>
      </aside>

      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs sm:hidden">
            <div
              className="absolute inset-0"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="relative z-10 flex max-h-[70vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-stone-200/60 p-4">
                <div>
                  <h3 className="text-sm font-medium text-stone-900">
                    Add Wardrobe Pieces
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Tap any item to stage it on canvas
                  </p>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex gap-1.5 overflow-x-auto border-b border-stone-200/60 px-4 py-2 scrollbar-hide">
                {SIDEBAR_CATS.map((cat) => (
                  <motion.button
                    key={cat}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setSidebarCat(cat)}
                    className={`shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-all duration-300 ease-out select-none ${
                      sidebarCat === cat
                        ? "bg-stone-900 text-white"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </motion.button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2.5 overflow-y-auto p-4">
                {sidebarItems.map((item) => (
                  <button
                    key={item._id}
                    onClick={() => addToCanvas(item)}
                    className="relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-stone-200/60 bg-stone-50 transition-transform active:scale-95"
                  >
                    <div className="relative h-full w-full p-1.5">
                      <Image
                        src={optimizeCloudinaryUrl(item.imageUrl)}
                        alt={item.name}
                        fill
                        className="object-contain"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        sizes="100px"
                      />
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-t border-stone-200/60 bg-stone-50 p-3 text-center">
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-full cursor-pointer rounded-full bg-stone-900 py-2 text-xs font-medium text-white transition-all duration-300 ease-out active:scale-[0.98]"
                >
                  Done Adding
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center justify-between gap-2 px-1 sm:hidden">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs transition-all duration-300 ease-out active:scale-[0.98]"
          >
            <Plus size={13} />
            <span>Add Pieces</span>
          </button>
          <span className="text-[11px] text-stone-500">
            {canvasItems.length} piece{canvasItems.length !== 1 ? "s" : ""} on canvas
          </span>
        </div>

        <div
          ref={canvasRef}
          className="relative flex-1 touch-none overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-sm"
          onClick={() => setSelectedId(null)}
        >
          {canvasItems.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-stone-200">
                <Plus size={18} className="text-stone-300" />
              </div>
              <p className="text-xs text-stone-500">
                <span className="sm:hidden">Tap &quot;Add Pieces&quot; above to stage items here</span>
                <span className="hidden sm:inline">Click items on the left to compose a look</span>
              </p>
            </div>
          )}

          <AnimatePresence>
            {canvasItems.map((item) => (
              <DraggableItem
                key={item.id}
                item={item}
                canvasRef={canvasRef}
                isSelected={selectedId === item.id}
                onSelect={() => setSelectedId(item.id)}
                onRemove={() => removeFromCanvas(item.id)}
                onChange={handleChange}
              />
            ))}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-xs text-stone-500">
            {canvasItems.length === 0
              ? "Canvas empty"
              : `${canvasItems.length} item${canvasItems.length !== 1 ? "s" : ""}${selectedId ? " · drag, rotate, resize" : ""}`}
          </p>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={handleLookbook}
              disabled={canvasItems.length === 0 || isExporting}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-stone-200/60 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition-all duration-300 ease-out hover:border-stone-300 hover:bg-stone-50 active:scale-[0.98] disabled:opacity-30"
            >
              <Camera size={13} />
              {isExporting ? "Composing…" : "Lookbook"}
            </button>

            {savePrompt ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <input
                  autoFocus
                  value={outfitName}
                  onChange={(e) => setOutfitName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") setSavePrompt(false);
                  }}
                  placeholder="Name this outfit…"
                  className="w-40 rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-900 placeholder:text-stone-300 transition-all duration-300 ease-out focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/15"
                />
                <button
                  onClick={() => setSavePrompt(false)}
                  className="cursor-pointer rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition-all duration-300 ease-out hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !outfitName.trim()}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-all duration-300 ease-out hover:bg-stone-800 active:scale-[0.98] disabled:opacity-40"
                >
                  <Save size={13} />
                  {isSaving ? "Saving…" : "Save"}
                </button>
              </motion.div>
            ) : (
              <button
                onClick={() => canvasItems.length > 0 && setSavePrompt(true)}
                disabled={canvasItems.length === 0}
                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white transition-all duration-300 ease-out hover:bg-stone-800 active:scale-[0.98] disabled:opacity-30"
              >
                <Save size={13} />
                Save Outfit
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {lookbookUrl && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-stone-200/60 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-stone-200/60 px-5 py-3">
                <p className="text-sm font-medium tracking-tight text-stone-900">
                  Lookbook card
                </p>
                <button
                  onClick={() => setLookbookUrl(null)}
                  className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="bg-[#f8f7f5] p-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lookbookUrl}
                  alt="Lookbook preview"
                  className="mx-auto max-h-[62vh] w-auto rounded-sm shadow-lg"
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-stone-200/60 px-5 py-3">
                <button
                  onClick={() =>
                    downloadDataUrl(
                      lookbookUrl,
                      `${(outfitName || "lookbook").replace(/\s+/g, "-").toLowerCase()}.png`
                    )
                  }
                  className="flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-xs font-medium text-white transition-all duration-300 ease-out hover:bg-stone-800"
                >
                  <Download size={13} />
                  Download
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
