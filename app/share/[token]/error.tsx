"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { logger } from "@/lib/logger";

interface ShareErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ShareRouteError({ error }: ShareErrorProps) {
  useEffect(() => {
    logger.error("Share route error captured", error, { digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-foreground transition-colors duration-200">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 text-center shadow-xs sm:p-10">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-accent">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>

        <h1 className="mb-2 font-serif text-2xl font-light tracking-tight text-foreground sm:text-3xl">
          Lookbook Unavailable
        </h1>
        <p className="mb-8 text-xs text-muted sm:text-sm leading-relaxed">
          This shared wardrobe link could not be loaded or has expired. Please check with the curator for an updated link.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-medium text-accent-foreground shadow-xs transition-all duration-150 hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Visit Digital Wardrobe
        </Link>
      </div>
    </main>
  );
}
