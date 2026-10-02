/**
 * Shared Framer Motion variants, easing curves, spring presets, and duration
 * constants. Import from here instead of repeating magic numbers across files.
 */

// ── Easing ────────────────────────────────────────────────────────────────
/** Premium deceleration — feels weighty and intentional. */
export const easePremium = [0.16, 1, 0.3, 1] as const;
/** Standard ease-out for small UI elements. */
export const easeOut = [0.22, 1, 0.36, 1] as const;
/** Symmetric ease-in-out for reversible transitions. */
export const easeInOut = [0.65, 0, 0.35, 1] as const;

// ── Duration constants (ms) ───────────────────────────────────────────────
export const duration = {
  /** Micro-interactions: opacity changes, icon swaps. */
  micro: 0.12,
  /** Standard UI transitions: drawers, tooltips, chips. */
  base: 0.24,
  /** Page reveals and hero entrances. */
  reveal: 0.7,
  /** Slow, atmospheric transitions. */
  slow: 1.0,
} as const;

// ── Spring presets ────────────────────────────────────────────────────────
/** Snappy spring for small interactive elements (chips, pills, icons). */
export const springSnappy = {
  type: "spring" as const,
  stiffness: 380,
  damping: 30,
  mass: 0.8,
};

/** Premium spring for cards, modals, large panels — weighted, not bouncy. */
export const springPremium = {
  type: "spring" as const,
  stiffness: 260,
  damping: 28,
  mass: 1,
};

/** Soft spring for large elements: overlays, sheets, heroes. */
export const springSoft = {
  type: "spring" as const,
  stiffness: 160,
  damping: 26,
  mass: 1.2,
};

/** Card lift spring for hover states. */
export const springHover = {
  type: "spring" as const,
  stiffness: 300,
  damping: 25,
};

// ── Reusable animation variants ───────────────────────────────────────────
/** Standard fade-up entrance: use as spread `{...fadeUp}`. */
export const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: duration.base, ease: easeOut },
};

/** View transition used between page-level views. */
export const viewTransition = {
  initial: { opacity: 0, y: 12, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(4px)" },
  transition: { duration: 0.22, ease: easeOut },
};

/** Staggered container: wrap children in this, add `custom={index}` to each child. */
export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

/** Child variant for stagger groups. */
export const staggerChild = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easePremium },
  },
};

/** Scale-in for modals and dialogs. */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.97 },
  transition: springPremium,
};
