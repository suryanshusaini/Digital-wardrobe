"use client";

import { motion } from "framer-motion";

export function GallerySkeleton() {
  return (
    <div className="space-y-12" aria-busy="true" aria-label="Loading wardrobe">
      {[0, 1, 2].map((row) => (
        <section key={row}>
          <div className="mb-4 flex items-center justify-between">
            <div className="h-5 w-24 animate-pulse rounded-full bg-stone-200/80 dark:bg-stone-800" />
            <div className="h-3 w-12 animate-pulse rounded-full bg-stone-200/60 dark:bg-stone-800/60" />
          </div>
          <div className="flex gap-4 overflow-hidden -mx-5 px-5 sm:-mx-8 sm:px-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] w-44 shrink-0 animate-pulse rounded-2xl border border-stone-200/60 bg-white dark:border-stone-800 dark:bg-[#1a1714] sm:w-52"
                style={{ animationDelay: `${(row * 5 + i) * 80}ms` }}
              >
                <div className="h-full w-full rounded-2xl bg-gradient-to-br from-stone-100 via-stone-50 to-stone-100 dark:from-stone-800/40 dark:via-stone-800/20 dark:to-stone-800/40" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function ArchiveEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-3xl border border-stone-200/60 bg-white px-6 py-16 text-center dark:border-stone-800 dark:bg-[#1a1714]"
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-stone-300 dark:border-stone-700 text-stone-400">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-7 w-7"
        >
          <path d="M12 3a2.5 2.5 0 0 0-2.5 2.5c0 1.5 2.5 2 2.5 3.5" />
          <path d="M12 9 2.5 16.5a1.5 1.5 0 0 0 .9 2.5h17.2a1.5 1.5 0 0 0 .9-2.5L12 9z" />
        </svg>
      </div>
      <p className="max-w-sm text-sm font-medium tracking-tight text-stone-900 dark:text-stone-100">
        Your digital archive is empty. Add your first piece.
      </p>
      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 max-w-xs">
        Studio-ready pieces will appear here the moment you upload them above.
      </p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 rounded-full bg-accent px-5 py-2.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Upload Piece
        </button>
      )}
    </motion.div>
  );
}
