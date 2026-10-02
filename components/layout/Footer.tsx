import Link from "next/link";
import Logo from "@/components/brand/Logo";
import { BRAND_NAME } from "@/lib/brand";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background py-8 text-xs text-muted transition-colors">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 sm:flex-row sm:px-8">
        <div className="flex items-center gap-2.5">
          <Logo variant="mark" size={18} className="text-muted opacity-70" />
          <span>&copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</span>
        </div>

        <nav className="flex items-center gap-5" aria-label="Footer Navigation">
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-xs"
          >
            Privacy Policy
          </Link>
          <span className="text-border" aria-hidden>
            &bull;
          </span>
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-xs"
          >
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
