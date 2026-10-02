/**
 * Brand constants — single source of truth for the product name and tagline.
 * Use these in metadata, manifests, UI headings, and the README.
 * The personal heading "{FirstName}'s Wardrobe" is constructed at runtime and
 * lives in the component that reads the session — it does NOT use BRAND_NAME.
 */
export const BRAND_NAME = "Digital Wardrobe" as const;
export const BRAND_TAGLINE = "Your closet, curated." as const;
export const BRAND_SHORT_NAME = "Wardrobe" as const;
