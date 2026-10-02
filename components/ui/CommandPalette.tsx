"use client";

/**
 * CommandPalette — ⌘K / Ctrl+K / "/" search and navigation dialog.
 *
 * Accessible: focus trap, aria-modal, listbox semantics, arrow keys,
 * Enter, Escape. Spring scale + blur backdrop. No new dependencies.
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LayoutGrid, Shirt, Box, Layers, Plus, Palette, Share2, Moon, X } from "lucide-react";
import { springPremium } from "@/lib/motion";

// ── Types ──────────────────────────────────────────────────────────────────
interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  section: "pieces" | "views" | "actions";
  icon: React.ReactNode;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: Array<{ _id: string; name: string; category: string; tags?: { weather: string[]; occasion: string[] } }>;
  onNavigate: (view: string) => void;
  onAddPiece: () => void;
  onNewOutfit: () => void;
  onToggleTheme: () => void;
  onCopyShareLink: () => void;
}

// ── Fuzzy match helper ─────────────────────────────────────────────────────
function matches(haystack: string, needle: string): boolean {
  if (!needle) return true;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  let hi = 0;
  for (let ni = 0; ni < n.length; ni++) {
    hi = h.indexOf(n[ni], hi);
    if (hi === -1) return false;
    hi++;
  }
  return true;
}

function CommandPaletteModal({
  onClose,
  items,
  onNavigate,
  onAddPiece,
  onNewOutfit,
  onToggleTheme,
  onCopyShareLink,
}: Omit<CommandPaletteProps, "open">) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Focus input on mount without setting state in effect
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Static action items
  const staticItems = useCallback((): PaletteItem[] => [
    // Views
    { id: "v-gallery", label: "Gallery", sublabel: "View all pieces", section: "views", icon: <LayoutGrid size={14} />, onSelect: () => { onNavigate("gallery"); onClose(); } },
    { id: "v-outfitmaker", label: "Outfit Maker", sublabel: "Create a new look", section: "views", icon: <Shirt size={14} />, onSelect: () => { onNavigate("outfitmaker"); onClose(); } },
    { id: "v-podium", label: "3D Podium", sublabel: "Studio showcase", section: "views", icon: <Box size={14} />, onSelect: () => { onNavigate("podium"); onClose(); } },
    { id: "v-outfits", label: "My Outfits", sublabel: "Saved looks", section: "views", icon: <Layers size={14} />, onSelect: () => { onNavigate("outfits"); onClose(); } },
    // Actions
    { id: "a-add", label: "Add piece", sublabel: "Upload a new garment", section: "actions", icon: <Plus size={14} />, onSelect: () => { onAddPiece(); onClose(); } },
    { id: "a-outfit", label: "New outfit", sublabel: "Open Outfit Maker", section: "actions", icon: <Palette size={14} />, onSelect: () => { onNewOutfit(); onClose(); } },
    { id: "a-share", label: "Copy share link", sublabel: "Share your wardrobe", section: "actions", icon: <Share2 size={14} />, onSelect: () => { onCopyShareLink(); onClose(); } },
    { id: "a-theme", label: "Toggle theme", sublabel: "Switch light / dark", section: "actions", icon: <Moon size={14} />, onSelect: () => { onToggleTheme(); onClose(); } },
  ], [onNavigate, onClose, onAddPiece, onNewOutfit, onToggleTheme, onCopyShareLink]);

  // Piece items from wardrobe
  const pieceItems = useCallback((): PaletteItem[] =>
    items
      .filter((item) =>
        !query ||
        matches(item.name, query) ||
        matches(item.category, query) ||
        item.tags?.weather?.some((t) => matches(t, query)) ||
        item.tags?.occasion?.some((t) => matches(t, query))
      )
      .slice(0, 6)
      .map((item) => ({
        id: `p-${item._id}`,
        label: item.name,
        sublabel: item.category,
        section: "pieces" as const,
        icon: <span className="h-3.5 w-3.5 rounded-sm bg-stone-200 dark:bg-stone-700 inline-block" />,
        onSelect: () => { onNavigate("gallery"); onClose(); },
      })),
  [items, query, onNavigate, onClose]);

  const allItems = useCallback((): PaletteItem[] => {
    const pieces = query ? pieceItems() : [];
    const statics = query
      ? staticItems().filter((s) => matches(s.label, query) || matches(s.sublabel ?? "", query))
      : staticItems();
    return [...pieces, ...statics];
  }, [query, pieceItems, staticItems]);

  const results = allItems();

  // Keep active item scrolled into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[activeIdx]?.onSelect();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  // Group results by section
  const sections: Array<{ key: string; label: string; ids: string[] }> = [
    { key: "pieces", label: "Pieces", ids: results.filter((r) => r.section === "pieces").map((r) => r.id) },
    { key: "views", label: "Views", ids: results.filter((r) => r.section === "views").map((r) => r.id) },
    { key: "actions", label: "Actions", ids: results.filter((r) => r.section === "actions").map((r) => r.id) },
  ].filter((s) => s.ids.length > 0);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="palette-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog */}
      <motion.div
        key="palette-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -4 }}
        transition={springPremium}
        className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <Search size={15} className="shrink-0 text-muted" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            placeholder="Search pieces, go to view, run action…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-subtle outline-none"
            aria-autocomplete="list"
            aria-controls="palette-list"
            aria-activedescendant={results[activeIdx] ? `palette-item-${results[activeIdx].id}` : undefined}
          />
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        <ul
          id="palette-list"
          ref={listRef}
          role="listbox"
          className="max-h-80 overflow-y-auto py-2"
        >
          {results.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted">
              No results for &ldquo;{query}&rdquo;
            </li>
          )}

          {sections.map((section) => (
            <li key={section.key} role="presentation">
              <p className="px-4 pb-1 pt-3 text-[10px] font-medium uppercase tracking-[0.18em] text-subtle">
                {section.label}
              </p>
              <ul role="group">
                {results
                  .filter((r) => r.section === section.key)
                  .map((result) => {
                    const flatIdx = results.findIndex((r) => r.id === result.id);
                    const isActive = flatIdx === activeIdx;
                    return (
                      <li
                        key={result.id}
                        id={`palette-item-${result.id}`}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveIdx(flatIdx)}
                        onClick={result.onSelect}
                        className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          isActive
                            ? "bg-accent/8 text-foreground"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        <span className={`shrink-0 ${isActive ? "text-accent" : ""}`}
                          style={isActive ? { color: "var(--accent)" } : undefined}>
                          {result.icon}
                        </span>
                        <span className="flex-1 truncate font-medium text-foreground">{result.label}</span>
                        {result.sublabel && (
                          <span className="shrink-0 text-xs text-subtle capitalize">{result.sublabel}</span>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </li>
          ))}
        </ul>

        {/* Footer keyboard hint */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
          <div className="flex items-center gap-3 text-[10px] text-subtle">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> select</span>
            <span><kbd className="font-mono">Esc</kbd> close</span>
          </div>
          <span className="text-[10px] text-subtle">⌘K</span>
        </div>
      </motion.div>
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function CommandPalette(props: CommandPaletteProps) {
  return (
    <AnimatePresence>
      {props.open && <CommandPaletteModal {...props} />}
    </AnimatePresence>
  );
}
