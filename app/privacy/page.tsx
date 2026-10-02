import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, Eye, Lock, Trash2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — My Wardrobe",
  description: "Plain language overview of how your data and images are handled.",
};

export default function PrivacyPage() {
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
            <Shield size={13} />
            <span>Privacy & Data Sovereignty</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted">
            Last updated: October 2026 &bull; Plain language data transparency
          </p>
        </div>

        {/* Content Card */}
        <div className="space-y-8 rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-accent" />
              <h2 className="text-base font-serif font-normal text-foreground">
                1. What We Store
              </h2>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              We collect only the bare minimum data required to organize and display your wardrobe:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted pl-1 leading-relaxed">
              <li>
                <strong className="text-foreground">Account Information:</strong> Your name, email address, and a securely salted bcrypt password hash (or Google OAuth profile identifier). We never store plaintext passwords.
              </li>
              <li>
                <strong className="text-foreground">Wardrobe Pieces:</strong> Uploaded clothing photos, item names, garment categories (tops, bottoms, shoes, etc.), and tags (weather, occasion).
              </li>
              <li>
                <strong className="text-foreground">Saved Outfits:</strong> Canvas coordinate placements, layer orders, rotation angles, and lookbook snapshots.
              </li>
              <li>
                <strong className="text-foreground">Share Tokens:</strong> Random UUID tokens generated only when you explicitly share your wardrobe.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 pt-6 border-t border-border">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-accent" />
              <h2 className="text-base font-serif font-normal text-foreground">
                2. Third-Party Processors
              </h2>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              To deliver 3D rendering, image transformations, and AI styling, we partner with trusted infrastructure providers:
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
              <div className="rounded-2xl border border-border bg-background p-4 space-y-1.5">
                <h3 className="text-xs font-semibold text-foreground">Cloudinary</h3>
                <p className="text-[11px] text-muted leading-relaxed">
                  Stores your uploaded images and generates responsive, optimized WebP/AVIF formats and WebGL 3:4 texture crops.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4 space-y-1.5">
                <h3 className="text-xs font-semibold text-foreground">Google Gemini Flash</h3>
                <p className="text-[11px] text-muted leading-relaxed">
                  Analyzes clothing photos during upload to auto-detect categories and powers the AI Personal Stylist. Prompts are never used to train public models.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4 space-y-1.5">
                <h3 className="text-xs font-semibold text-foreground">MongoDB Atlas</h3>
                <p className="text-[11px] text-muted leading-relaxed">
                  Provides encrypted at-rest database storage for your item metadata, saved outfits, and user profile.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4 space-y-1.5">
                <h3 className="text-xs font-semibold text-foreground">Upstash Redis</h3>
                <p className="text-[11px] text-muted leading-relaxed">
                  Enforces rate limits to defend against brute-force attacks and abuse. No wardrobe photos or passwords touch Redis.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 pt-6 border-t border-border">
            <div className="flex items-center gap-2">
              <Trash2 size={16} className="text-red-500" />
              <h2 className="text-base font-serif font-normal text-foreground">
                3. How to Delete Your Data
              </h2>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              You maintain total ownership of your archive. You can permanently delete your data at any time:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-muted pl-1 leading-relaxed">
              <li>
                <strong className="text-foreground">Individual Pieces:</strong> Click any garment in your gallery and tap the trash icon to immediately remove the item and delete its asset.
              </li>
              <li>
                <strong className="text-foreground">Complete Account Deletion:</strong> Tap your profile avatar in the bottom-left corner, select <strong className="text-red-600">Delete Account</strong>, and type <code className="rounded bg-stone-100 dark:bg-stone-800 px-1 py-0.5 font-mono text-red-600">DELETE</code>.
              </li>
              <li>
                <strong className="text-foreground">Data Purge & Backups:</strong> When you delete your account, your wardrobe pieces, outfits, share tokens, and user credentials are removed from live systems immediately; backups expire after [N] days. All corresponding image files are permanently erased from Cloudinary media storage.
              </li>
            </ul>

            <div className="pt-3">
              <p className="text-xs text-muted">
                For deletion inquiries, data portability requests, or privacy questions, please contact{" "}
                <a
                  href="mailto:privacy@yourdomain.com"
                  className="font-medium text-foreground underline hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-xs"
                >
                  [privacy@yourdomain.com]
                </a>
                .
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
