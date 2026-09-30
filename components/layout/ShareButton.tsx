"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Copy, Check, RefreshCw, X, Globe } from "lucide-react";

export default function ShareButton() {
  const { status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "authenticated") {
    return null;
  }

  const handleOpen = async () => {
    setIsOpen(true);
    setError(null);
    if (!shareUrl) {
      setIsLoading(true);
      try {
        const res = await fetch("/api/share", { method: "POST" });
        const data = await res.json();
        if (data.success && data.shareUrl) {
          setShareUrl(data.shareUrl);
        } else {
          setError(data.error || "Failed to generate link");
        }
      } catch (err) {
        console.error("Share error:", err);
        setError("Failed to generate link");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback for non-secure contexts
      const el = document.createElement("textarea");
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleRevoke = async () => {
    setIsRevoking(true);
    setError(null);
    try {
      const res = await fetch("/api/share", { method: "DELETE" });
      const data = await res.json();
      if (data.success && data.shareUrl) {
        setShareUrl(data.shareUrl);
      } else {
        setError(data.error || "Failed to revoke link");
      }
    } catch (err) {
      console.error("Revoke error:", err);
      setError("Failed to revoke link");
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-stone-200 text-stone-700 hover:text-stone-900 hover:border-stone-300 hover:bg-stone-50 active:scale-[0.98] shadow-xs hover:shadow-sm text-xs font-medium transition-all duration-150 cursor-pointer shrink-0"
        title="Share public wardrobe link"
      >
        <Share2 size={13} className="text-stone-500 shrink-0" />
        <span>Share</span>
      </button>

      {/* Share Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-100 z-10 space-y-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-accent-light border border-accent/20 flex items-center justify-center text-accent shrink-0">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-stone-900">
                      Share Wardrobe
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Public read-only link to your collection
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* URL field */}
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-stone-300 border-t-accent rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs">
                  {error}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-1.5 bg-stone-50 border border-stone-200 rounded-2xl">
                    <input
                      readOnly
                      value={shareUrl}
                      className="flex-1 bg-transparent px-2.5 py-1 text-xs text-stone-700 select-all outline-none font-mono"
                    />
                    <button
                      onClick={handleCopy}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 ${
                        copied
                          ? "bg-green-600 text-white shadow-xs"
                          : "bg-accent text-accent-foreground hover:bg-accent-hover shadow-xs hover:shadow-sm"
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check size={13} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy link</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-stone-400 leading-relaxed px-1">
                    Anyone with this link can view your Gallery and Saved Outfits.
                    They cannot edit, upload, or see your private account details.
                  </p>
                </div>
              )}

              {/* Footer actions */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <button
                  onClick={handleRevoke}
                  disabled={isRevoking || isLoading}
                  className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Generate a brand-new link, invalidating previous ones"
                >
                  <RefreshCw
                    size={12}
                    className={isRevoking ? "animate-spin" : ""}
                  />
                  <span>Revoke & generate new link</span>
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
