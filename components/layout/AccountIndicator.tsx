"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ChevronUp, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function AccountIndicator() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDeleteError(data.error || "Failed to delete account.");
        setIsDeleting(false);
        return;
      }
      // On success, sign out and redirect to /login
      await signOut({ callbackUrl: "/login" });
    } catch {
      setDeleteError("Network error while deleting account. Please try again.");
      setIsDeleting(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Don't render anything if unauthenticated or loading
  if (status === "loading" || !session?.user) {
    return null;
  }

  const user = session.user;
  const fullName = user.name || "Wardrobe User";
  const firstName = fullName.split(" ")[0];
  const email = user.email || "";
  const avatarUrl = user.image;

  return (
    <div
      ref={containerRef}
      className="fixed bottom-5 left-5 z-40 sm:bottom-6 sm:left-6 select-none"
    >
      {/* Popover Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute bottom-full mb-2 left-0 w-64 rounded-2xl bg-white/95 backdrop-blur-md border border-stone-200/80 shadow-lg shadow-stone-900/5 p-3.5 z-50 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-1 py-1">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-10 h-10 rounded-full object-cover border border-stone-200/80 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 text-stone-600 flex items-center justify-center font-medium text-sm shrink-0">
                  {firstName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-stone-900 truncate">
                  {fullName}
                </p>
                <p className="text-[11px] text-stone-400 truncate mt-0.5">
                  {email}
                </p>
              </div>
            </div>

            <div className="my-2.5 border-t border-stone-100" />

            <div className="mb-2">
              <ThemeToggle />
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors text-left group"
            >
              <LogOut
                size={14}
                className="text-stone-400 group-hover:text-stone-600 transition-colors shrink-0"
              />
              <span>Sign out</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                setShowDeleteModal(true);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50/70 rounded-xl transition-colors text-left group mt-0.5"
            >
              <Trash2
                size={14}
                className="text-red-400 group-hover:text-red-600 transition-colors shrink-0"
              />
              <span>Delete Account</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Deletion Re-Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => !isDeleting && setShowDeleteModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1a1714] rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 z-10 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-serif font-light tracking-tight text-stone-900 dark:text-stone-100">
                    Delete Account & Wardrobe
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Permanent action — cannot be undone
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                This will permanently delete your account, all archived clothing items, outfits, public share links, and purge all your photos from Cloudinary media storage.
              </p>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1.5">
                  Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  disabled={isDeleting}
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 px-3.5 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition"
                />
              </div>

              {deleteError && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-200 dark:border-red-900/30">
                  {deleteError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-full border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE" || isDeleting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Deleting…</span>
                    </>
                  ) : deleteError ? (
                    <span>Retry Deletion</span>
                  ) : (
                    <span>Permanently Delete</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pill Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full bg-white/90 hover:bg-white backdrop-blur-md border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-sm ${
          isOpen
            ? "border-stone-300 ring-2 ring-stone-200/60 bg-white"
            : "border-stone-200/70 hover:border-stone-300"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Account menu"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={fullName}
            className="w-7 h-7 rounded-full object-cover border border-stone-200/80 shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200 text-stone-600 flex items-center justify-center font-medium text-[11px] shrink-0">
            {firstName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-xs font-medium text-stone-700 max-w-[90px] truncate">
          {firstName}
        </span>
        <ChevronUp
          size={12}
          className={`text-stone-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
    </div>
  );
}
