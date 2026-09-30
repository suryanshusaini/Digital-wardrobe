import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found — My Wardrobe",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#f8f7f5] px-6">
      <div className="w-full max-w-sm rounded-3xl border border-stone-200/60 bg-white p-10 text-center shadow-sm">
        <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-dashed border-stone-300 text-stone-400">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <path d="M12 3a2.5 2.5 0 0 0-2.5 2.5c0 1.5 2.5 2 2.5 3.5" />
            <path d="M12 9 2.5 16.5a1.5 1.5 0 0 0 .9 2.5h17.2a1.5 1.5 0 0 0 .9-2.5L12 9z" />
          </svg>
        </div>
        <p className="mb-1 text-4xl font-light tracking-tight text-stone-900">404</p>
        <h1 className="mb-3 text-base font-medium tracking-tight text-stone-900">
          Page not found
        </h1>
        <p className="mb-8 text-sm text-stone-500">
          This page doesn&apos;t exist in your archive.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/30"
        >
          Back to Wardrobe
        </Link>
      </div>
    </main>
  );
}
