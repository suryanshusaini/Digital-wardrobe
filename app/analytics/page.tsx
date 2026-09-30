// app/analytics/page.tsx
// Analytics Dashboard — Server Component
// Fetches the user's items server-side and renders wardrobe insights.
// Bars animate with CSS @keyframes via the .analytics-bar class in globals.css.
import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongodb";
import Item from "@/lib/db/models/Item";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StylistRecommender from "@/components/ui/StylistRecommender";

export const metadata: Metadata = {
  title: "Analytics — My Wardrobe",
  description: "Insights into your digital wardrobe collection.",
  robots: { index: false },
};

// Inline colours — Tailwind v4 purges unused custom tokens, so we use style={}
const CATEGORY_META: Record<string, { label: string; color: string; emoji: string }> = {
  top:       { label: "Tops",        color: "#c8a882", emoji: "👕" },
  bottom:    { label: "Bottoms",     color: "#a8a29e", emoji: "👖" },
  shoes:     { label: "Shoes",       color: "#b85d3b", emoji: "👟" },
  accessory: { label: "Accessories", color: "#d6cfc8", emoji: "👜" },
  outfit:    { label: "Outfit Photos", color: "#e7d5b3", emoji: "✨" },
};

interface CategoryCount { category: string; count: number }

export default async function AnalyticsPage() {
  // ── Auth guard ───────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  // ── Fetch ────────────────────────────────────────────────────────────────────
  await connectDB();
  const items = await Item.find({
    $or: [{ userId: session.user.email }, { userId: session.user.id }],
  })
    .select("category")
    .lean();

  const totalItems = items.length;

  // ── Aggregate ────────────────────────────────────────────────────────────────
  const countMap: Record<string, number> = {};
  for (const item of items) {
    const cat = item.category as string;
    countMap[cat] = (countMap[cat] ?? 0) + 1;
  }

  const categoryCounts: CategoryCount[] = Object.entries(countMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const maxCount = categoryCounts[0]?.count ?? 1;

  return (
    <main className="min-h-dvh bg-background text-foreground px-5 py-10 md:px-8 transition-colors duration-200">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-md px-1 py-0.5"
        >
          <ArrowLeft size={12} />
          <span>Back to Wardrobe</span>
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-serif font-light tracking-tight text-foreground sm:text-3xl">
            Wardrobe Analytics
          </h1>
          <p className="mt-1 text-sm text-muted">
            Insights into your digital closet
          </p>
        </div>

        {/* ── Stat cards ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Items"
            value={totalItems.toString()}
            subtitle="in your wardrobe"
            icon="🗄️"
          />
          <StatCard
            title="Most Worn Color"
            value="Coming soon"
            subtitle="Tracked after next upload"
            icon="🎨"
            muted
          />
          <StatCard
            title="Wardrobe Value"
            value="Coming soon"
            subtitle="Add prices to items"
            icon="💰"
            muted
          />
        </div>

        {/* ── Items by Category ─────────────────────────────────────────────────── */}
        <section
          className="rounded-2xl border border-border bg-surface p-6 shadow-xs transition-colors"
          aria-label="Items by category"
        >
          <h2 className="mb-5 text-xs font-medium uppercase tracking-wider text-muted">
            Items by Category
          </h2>

          {categoryCounts.length === 0 ? (
            <p className="py-6 text-center text-sm text-subtle">
              No items yet — upload your first piece to see insights here.
            </p>
          ) : (
            <div className="space-y-5">
              {categoryCounts.map(({ category, count }, i) => {
                const meta = CATEGORY_META[category] ?? { label: category, emoji: "📦", color: "#a8a29e" };
                const barPct = Math.round((count / maxCount) * 100);

                return (
                  <div key={category}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-foreground">
                        <span aria-hidden>{meta.emoji}</span>
                        <span>{meta.label}</span>
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {count}
                      </span>
                    </div>
                    {/* CSS-animated bar — grows from 0 to target width via globals.css */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800" role="meter" aria-valuenow={barPct} aria-valuemin={0} aria-valuemax={100} aria-label={`${meta.label}: ${count} items`}>
                      <div
                        className="analytics-bar h-1.5 rounded-full animate-in"
                        style={{
                          "--bar-target": `${barPct}%`,
                          "--bar-delay": `${i * 80}ms`,
                          backgroundColor: meta.color,
                        } as React.CSSProperties}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── AI Stylist Interactive Recommender ──────────────────────────────── */}
        <StylistRecommender />
      </div>
    </main>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  subtitle,
  icon,
  muted = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs transition-colors">
      <div className="mb-2 text-2xl" aria-hidden>{icon}</div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
        {title}
      </p>
      <p className={`mt-1 text-2xl font-light tracking-tight ${muted ? "text-stone-300 dark:text-stone-600" : "text-foreground"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-subtle">{subtitle}</p>
    </div>
  );
}
