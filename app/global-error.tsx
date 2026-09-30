"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    logger.error("Root layout error caught by global-error boundary", error, {
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-[#f8f7f5] px-6 text-[#1c1917] antialiased">
        <div className="w-full max-w-md rounded-3xl border border-stone-200/60 bg-white p-8 text-center shadow-xs sm:p-10">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 font-serif text-2xl text-stone-700">
            W
          </div>

          <h1 className="mb-2 font-serif text-2xl font-light tracking-tight text-stone-900 sm:text-3xl">
            System Error
          </h1>
          <p className="mb-8 text-xs text-stone-500 sm:text-sm leading-relaxed">
            The studio encountered a critical problem during initialization. Please reload to restore your session.
          </p>

          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#1c1917] px-6 py-2.5 text-xs font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            Reload Studio
          </button>
        </div>
      </body>
    </html>
  );
}
