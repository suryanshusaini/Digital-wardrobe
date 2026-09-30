"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { logger } from "@/lib/logger";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalRouteError({ error, reset }: ErrorProps) {
  useEffect(() => {
    logger.error("Root route error captured", error, { digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-foreground transition-colors duration-200">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 text-center shadow-xs sm:p-10">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>

        <h1 className="mb-2 font-serif text-2xl font-light tracking-tight text-foreground sm:text-3xl">
          Something went wrong
        </h1>
        <p className="mb-8 text-xs text-muted sm:text-sm leading-relaxed">
          An unexpected error occurred while loading this view. Your wardrobe data remains safe and preserved.
        </p>

        {error.digest && (
          <p className="mb-6 rounded-lg bg-stone-100 dark:bg-stone-900/60 px-3 py-1.5 font-mono text-[11px] text-subtle">
            Code: {error.digest}
          </p>
        )}

        <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-medium text-accent-foreground shadow-xs transition-all duration-150 hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-xs font-medium text-foreground transition-colors duration-150 hover:bg-stone-100 dark:hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <Home className="h-3.5 w-3.5" />
            Return to Wardrobe
          </Link>
        </div>
      </div>
    </main>
  );
}
