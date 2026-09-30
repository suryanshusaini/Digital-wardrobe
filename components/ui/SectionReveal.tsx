"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface SectionRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Delay before the reveal starts (ms). Useful for staggered sections. */
  delay?: number;
  /** Y-axis distance to travel on reveal (px). Default 20. */
  yOffset?: number;
  /** Whether to stagger direct children. Default false. */
  stagger?: boolean;
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

/**
 * Wraps a section in a scroll-triggered reveal animation (fade + rise).
 * Automatically respects prefers-reduced-motion — only opacity animates when reduced.
 * Uses once:true so the animation only fires once per page load.
 */
export function SectionReveal({
  children,
  className,
  delay = 0,
  yOffset = 20,
  stagger = false,
}: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px 0px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={stagger ? staggerContainer : undefined}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      transition={
        stagger
          ? undefined
          : {
              duration: 0.4,
              delay: delay / 1000,
              ease: [0.22, 1, 0.36, 1],
            }
      }
      style={{ "--reveal-y": `${yOffset}px` } as React.CSSProperties}
    >
      {/* When not staggering, wrap in a single child animator */}
      {stagger ? (
        children
      ) : (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: yOffset },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{
            duration: 0.4,
            delay: delay / 1000,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * A single item variant for use inside a staggered SectionReveal container.
 */
export function RevealItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Re-export a convenience alias
export default SectionReveal;
