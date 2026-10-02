"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, AlertTriangle, X } from "lucide-react";
import { springPremium } from "@/lib/motion";

export type ToastTone = "success" | "info" | "error";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  tone?: ToastTone;
  action?: ToastAction;
  duration?: number;
}

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
  duration: number;
  createdAt: number;
}

interface ToastContextValue {
  toast: (message: string, toneOrOptions?: ToastTone | ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / item.duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss(item.id);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [item.id, item.duration, onDismiss]);

  return (
    <motion.div
      layout
      role={item.tone === "error" ? "alert" : "status"}
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.94 }}
      transition={springPremium}
      className="pointer-events-auto relative flex min-w-[280px] max-w-md items-center justify-between gap-3 overflow-hidden rounded-full border border-stone-800/40 bg-[#1c1917]/95 px-4 py-2.5 text-[#f8f7f5] shadow-2xl backdrop-blur-md dark:border-stone-300/40 dark:bg-[#f5f3ef]/95 dark:text-[#1c1917]"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${
            item.tone === "error"
              ? "bg-red-500"
              : item.tone === "info"
                ? "bg-stone-500"
                : "bg-[var(--accent)]"
          }`}
        >
          {item.tone === "error" ? (
            <AlertTriangle size={11} />
          ) : item.tone === "info" ? (
            <Info size={11} />
          ) : (
            <Check size={11} />
          )}
        </span>
        <p className="truncate text-xs font-medium tracking-tight">
          {item.message}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss(item.id);
            }}
            className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] dark:bg-black/10 dark:hover:bg-black/20"
          >
            {item.action.label}
          </button>
        )}
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          className="rounded-full p-1 opacity-60 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          aria-label="Dismiss notification"
        >
          <X size={12} />
        </button>
      </div>

      {/* Progress line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/20 dark:bg-black/20"
      >
        <div
          className="h-full bg-[var(--accent)] transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, toneOrOptions: ToastTone | ToastOptions = "success") => {
      const opts: ToastOptions =
        typeof toneOrOptions === "string"
          ? { tone: toneOrOptions }
          : toneOrOptions;

      const tone = opts.tone ?? "success";
      const action = opts.action;
      const duration = opts.duration ?? (action ? 5000 : 3800);
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      setToasts((prev) => [
        ...prev.slice(-2), // Keep up to 3 toasts max
        { id, message, tone, action, duration, createdAt: Date.now() },
      ]);
    },
    []
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-6 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center gap-2 px-4"
      >
        <AnimatePresence>
          {toasts.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
