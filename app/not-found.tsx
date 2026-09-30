import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found — My Wardrobe",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-foreground transition-colors duration-200">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-10 text-center shadow-xs">
        <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-2xl border border-border bg-stone-50 dark:bg-stone-900/60 font-serif text-2xl text-foreground">
          W
        </div>
        <p className="mb-1 font-serif text-4xl font-light tracking-tight text-foreground">404</p>
        <h1 className="mb-3 text-base font-medium tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mb-8 text-xs text-muted leading-relaxed">
          This piece or collection doesn&apos;t exist in your archive.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-medium text-accent-foreground shadow-xs transition-all duration-150 hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Return to Wardrobe
        </Link>
      </div>
    </main>
  );
}
