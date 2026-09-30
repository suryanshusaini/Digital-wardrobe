import type { Metadata } from "next";

/**
 * Public share pages should not be indexed by search engines:
 * - They expose personal wardrobe data under a private token
 * - The token is personal and can be revoked
 * - There is no canonical URL benefit to indexing them
 */
export const metadata: Metadata = {
  title: "Shared Wardrobe — My Wardrobe",
  description: "Browse this shared digital wardrobe collection.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
