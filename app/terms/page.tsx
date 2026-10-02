import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — My Wardrobe",
  description: "Simple, plain-language terms of service for Digital Wardrobe.",
};

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground px-5 py-12 sm:px-8 transition-colors duration-200">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-md px-1 py-0.5"
        >
          <ArrowLeft size={13} />
          <span>Back to Wardrobe</span>
        </Link>

        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-accent">
            <BookOpen size={13} />
            <span>Clear & Fair Terms</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-tight text-foreground">
            Terms of Service
          </h1>
          <p className="text-sm text-muted">
            Last updated: October 2026 &bull; Written in plain human language
          </p>
        </div>

        {/* Content Card */}
        <div className="space-y-8 rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-accent" />
              <h2 className="text-base font-serif font-normal text-foreground">
                1. Your Content Belongs to You
              </h2>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              You retain full copyright and ownership of any photos, garment details, and outfit compositions you upload or create in Digital Wardrobe. We only host and process your assets to provide you with the wardrobe archive and styling experience. We will never sell your photos or use them for third-party advertising.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 pt-6 border-t border-border">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-accent" />
              <h2 className="text-base font-serif font-normal text-foreground">
                2. Acceptable Use
              </h2>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Digital Wardrobe is an editorial utility for personal wardrobe management. By using the service, you agree not to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted pl-1 leading-relaxed">
              <li>Upload illegal, harmful, or copyright-infringing imagery.</li>
              <li>Attempt to reverse-engineer, disrupt, or exploit the API endpoints or distributed rate limiters.</li>
              <li>Use automated scripts to mass-scrape public shared lookbook URLs.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 pt-6 border-t border-border">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-accent" />
              <h2 className="text-base font-serif font-normal text-foreground">
                3. AI Stylist & Recommendations
              </h2>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              AI garment categorization and styling recommendations are powered by Google Gemini. Recommendations are provided for creative inspiration; we make no guarantees regarding color matching accuracy or weather precision.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 pt-6 border-t border-border">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-accent" />
              <h2 className="text-base font-serif font-normal text-foreground">
                4. Account Termination & Complete Data Purge
              </h2>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              You are free to stop using Digital Wardrobe at any time. When you initiate account deletion from the Settings menu, your data (wardrobe items, saved outfits, shared link tokens, and Cloudinary media assets) is removed from live systems immediately; backups expire after [N] days.
            </p>
            <p className="text-xs text-muted leading-relaxed pt-2">
              For deletion assistance or questions regarding your account data, please contact{" "}
              <a
                href="mailto:support@yourdomain.com"
                className="font-medium text-foreground underline hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-xs"
              >
                [support@yourdomain.com]
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
