"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { UploadCloud, Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

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
          : "bg-surface-2 text-muted hover:text-foreground"
      }`}
    >
      {label}
    </motion.button>
  );
}

export interface UploadedItem {
  _id: string;
  name: string;
  category: string;
  imageUrl: string;
  tags?: { weather: string[]; occasion: string[] };
  createdAt?: string;
}

/**
 * Resizes and compresses an image on the client before upload:
 * Max dimension: 2048px, Quality: 0.85 JPEG.
 * Handles HEIC/HEIF by canvas fallback if browser supports or passes blob.
 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    // If SVG, gif, or HEIC (which canvas cannot decode in Chrome/Firefox), return file as-is
    if (
      file.type === "image/svg+xml" ||
      file.type === "image/gif" ||
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      /\.(heic|heif)$/i.test(file.name)
    ) {
      resolve(file);
      return;
    }

    const img = document.createElement("img");
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 2048;
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          resolve(blob || file);
        },
        "image/jpeg",
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

export default function UploadCard({
  onUploadComplete,
}: {
  onUploadComplete?: (newItem?: UploadedItem) => void;
}) {
  const { toast } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0 - 100
  const [isProcessing, setIsProcessing] = useState(false); // After 100% XHR progress
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categorizedBy, setCategorizedBy] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>("top");
  const [weather, setWeather] = useState<string[]>([]);
  const [occasion, setOccasion] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggle = (
    list: string[],
    setList: (v: string[]) => void,
    val: string
  ) => {
    setList(
      list.includes(val) ? list.filter((t) => t !== val) : [...list, val]
    );
  };

  const autoCategorize = useCallback(
    async (file: File) => {
      if (category === "outfit") return;
      setIsCategorizing(true);
      setCategorizedBy(null);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/categorize", {
          method: "POST",
          body: fd,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.category) {
            setCategory(data.category);
            if (Array.isArray(data.weather) && data.weather.length > 0) {
              setWeather(data.weather);
            }
            if (Array.isArray(data.occasion) && data.occasion.length > 0) {
              setOccasion(data.occasion);
            }
            setCategorizedBy(data.source || "ai");
          }
        }
      } catch {
        // Non-fatal
      } finally {
        setIsCategorizing(false);
      }
    },
    [category]
  );

  const dragCounter = useRef(0);

  const validateAndSetFile = useCallback(
    (file: File) => {
      setErrorMessage(null);

      const isHeic =
        file.type === "image/heic" ||
        file.type === "image/heif" ||
        /\.(heic|heif)$/i.test(file.name);

      // HEIC files cannot be compressed on the client by canvas in Chrome/Firefox.
      // They are sent uncompressed to the server for Cloudinary conversion.
      // Target hosts (e.g. Vercel serverless functions) cap incoming request bodies at 4.5MB.
      const MAX_HEIC_SIZE = 4.5 * 1024 * 1024;
      if (isHeic && file.size > MAX_HEIC_SIZE) {
        const msg =
          "Apple HEIC photos must be under 4.5MB for server processing. For larger photos, select JPG/PNG or export to JPG.";
        setErrorMessage(msg);
        toast(msg, "error");
        return;
      }

      // For standard compressible images (JPEG, PNG, WebP), client compresses them before POSTing
      const MAX_SIZE = 15 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        const msg = "File exceeds 15MB limit. Please choose a smaller photo.";
        setErrorMessage(msg);
        toast(msg, "error");
        return;
      }

      // Validate mime / extension
      const isImage =
        file.type.startsWith("image/") ||
        /\.(jpe?g|png|webp|avif|heic|heif)$/i.test(file.name);
      if (!isImage) {
        const msg =
          "Unsupported file type. Please upload a JPG, PNG, WEBP, or HEIC photo.";
        setErrorMessage(msg);
        toast(msg, "error");
        return;
      }

      setSelectedFile(file);
      if (category !== "outfit") {
        autoCategorize(file);
      }
    },
    [autoCategorize, category, toast]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDragOver(false);
      dragCounter.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCounter.current = 0;
      const file = e.dataTransfer.files?.[0];
      if (file) {
        validateAndSetFile(file);
      }
    },
    [validateAndSetFile]
  );

  const reset = () => {
    setSelectedFile(null);
    setWeather([]);
    setOccasion([]);
    setCategory("top");
    setIsCategorizing(false);
    setCategorizedBy(null);
    setUploadProgress(0);
    setIsProcessing(false);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // XHR upload tracking for real upload progress + indeterminate processing state
  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadProgress(0);
    setIsProcessing(false);
    setErrorMessage(null);

    try {
      // 1. Client-side compression
      const compressedBlob = await compressImage(selectedFile);
      const formData = new FormData();
      formData.append("file", compressedBlob, selectedFile.name);
      formData.append("name", selectedFile.name.replace(/\.[^/.]+$/, ""));
      formData.append("category", category);
      formData.append("weather", weather.join(","));
      formData.append("occasion", occasion.join(","));

      // 2. XMLHttpRequest for upload progress tracking
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percent);
          if (percent >= 100) {
            setIsProcessing(true);
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success && data.item) {
              onUploadComplete?.(data.item);
              reset();
              toast("Piece added to your archive", "success");
            } else {
              const err = data.error || "Upload failed.";
              setErrorMessage(err);
              toast(err, "error");
              setIsUploading(false);
              setIsProcessing(false);
            }
          } catch {
            setErrorMessage("Failed to parse response.");
            toast("Upload failed.", "error");
            setIsUploading(false);
            setIsProcessing(false);
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            const err = data.error || `Upload error (${xhr.status})`;
            setErrorMessage(err);
            toast(err, "error");
          } catch {
            setErrorMessage("Upload failed.");
            toast("Upload failed.", "error");
          }
          setIsUploading(false);
          setIsProcessing(false);
        }
      };

      xhr.onerror = () => {
        setErrorMessage("Network error during upload. Please try again.");
        toast("Network error during upload.", "error");
        setIsUploading(false);
        setIsProcessing(false);
      };

      xhr.send(formData);
    } catch {
      setErrorMessage("Compression failed. Please try again.");
      toast("Error preparing image.", "error");
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  // ── Expanded tag panel (shown after file is chosen) ──────────────────────
  if (selectedFile) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full space-y-4 card p-5"
      >
        {/* File info */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-surface-2 flex items-center justify-center shrink-0">
            <UploadCloud size={18} className="text-muted" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {selectedFile.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Tag before archiving
              </span>
              {/\.(heic|heif)$/i.test(selectedFile.name) && (
                <span className="inline-flex items-center rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  HEIC · Cloudinary auto-converts
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Category */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider font-medium">
              Category
            </p>
            {isCategorizing && (
              <span className="flex items-center gap-1 text-[11px] text-stone-400 animate-pulse font-normal">
                <Sparkles size={11} className="text-amber-500" />
                <span>AI analyzing…</span>
              </span>
            )}
            {!isCategorizing && categorizedBy && (
              <span className="flex items-center gap-1 text-[10px] text-accent bg-accent-light border border-accent/20 px-2 py-0.5 rounded-full font-medium">
                <Sparkles size={10} className="text-accent" />
                <span>Auto-detected</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <TagPill
                key={cat}
                label={cap(cat)}
                active={category === cat}
                onToggle={() => {
                  setCategory(cat);
                  setCategorizedBy(null);
                }}
              />
            ))}
          </div>
        </div>

        {/* Weather */}
        <div>
          <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2 font-medium">
            Weather
          </p>
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
        <div>
          <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2 font-medium">
            Occasion
          </p>
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

        {/* Progress & Processing States */}
        {isUploading && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Loader2 size={12} className="animate-spin text-accent" />
                {isProcessing ? "Processing & archiving in studio…" : `Uploading ${uploadProgress}%`}
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full bg-accent transition-all duration-300 ${
                  isProcessing ? "w-full animate-pulse" : ""
                }`}
                style={{ width: isProcessing ? "100%" : `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message with retry */}
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive-bg p-2.5 text-xs text-destructive">
            <AlertCircle size={14} className="shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button
              type="button"
              onClick={handleUpload}
              className="inline-flex items-center gap-1 font-medium underline hover:no-underline"
            >
              <RefreshCw size={11} />
              Retry
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            disabled={isUploading}
            className="flex-1 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent-hover rounded-full py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 shadow-xs hover:shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {isUploading ? "Uploading…" : "Add to Archive"}
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Default dropzone ──────────────────────────────────────────────────────
  return (
    <motion.div
      className={`relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed p-6 transition-all duration-300 ease-out ${
        isDragOver
          ? "border-accent bg-accent-soft/40 scale-[1.015]"
          : "border-border bg-surface hover:border-border-strong"
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      whileHover={{ scale: 1.008 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-accent-soft/80 backdrop-blur-[2px] pointer-events-none">
          <UploadCloud size={38} className="text-accent animate-bounce mb-1" />
          <span className="text-xs font-semibold text-accent tracking-wider uppercase">
            Release to archive piece
          </span>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
        onChange={handleFileSelect}
        aria-label="Upload wardrobe photo"
      />
      <div className="flex flex-col items-center text-muted pointer-events-none">
        <UploadCloud size={32} className={`mb-2 transition-transform duration-300 ${isDragOver ? "scale-110 text-accent" : ""}`} />
        <span className="text-sm font-medium text-foreground">
          Add to wardrobe
        </span>
        <span className="text-xs text-muted mt-0.5">
          {isDragOver ? "Drop photo to upload" : "Drop image or click to browse"}
        </span>
      </div>

      {/* Category selector on initial dropzone */}
      <div
        className="relative z-10 mt-4 flex flex-wrap gap-1.5 justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCategory(cat);
            }}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
              category === cat
                ? "bg-accent text-accent-foreground shadow-2xs"
                : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            {cap(cat)}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
