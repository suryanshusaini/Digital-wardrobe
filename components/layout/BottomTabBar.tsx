"use client";

/**
 * BottomTabBar — mobile-only (hidden on sm+) bottom navigation.
 * 4 tabs matching the 4 view modes. Safe-area insets, 44px+ targets,
 * sliding accent indicator via Framer Motion layoutId.
 */

import { motion } from "framer-motion";
import { LayoutGrid, Shirt, Box, Layers, type LucideIcon } from "lucide-react";
import { springSnappy } from "@/lib/motion";

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { id: "gallery", label: "Gallery", icon: LayoutGrid },
  { id: "outfitmaker", label: "Maker", icon: Shirt },
  { id: "podium", label: "Podium", icon: Box },
  { id: "outfits", label: "Outfits", icon: Layers },
];

interface BottomTabBarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

export default function BottomTabBar({ activeView, onNavigate }: BottomTabBarProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeView === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 min-h-[52px] text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-inset"
              style={{ color: isActive ? "var(--accent)" : "var(--muted)" }}
            >
              {/* Sliding accent underline indicator */}
              {isActive && (
                <motion.span
                  layoutId="tab-indicator"
                  transition={springSnappy}
                  className="absolute inset-x-3 top-0 h-0.5 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              )}
              <Icon size={18} aria-hidden />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
