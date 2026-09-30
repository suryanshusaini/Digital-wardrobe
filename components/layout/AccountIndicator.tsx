"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ChevronUp } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function AccountIndicator() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-stone-600 hover:text-red-600 hover:bg-red-50/70 rounded-xl transition-colors text-left group"
            >
              <LogOut
                size={14}
                className="text-stone-400 group-hover:text-red-500 transition-colors shrink-0"
              />
              <span>Sign out</span>
            </button>
          </motion.div>
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
