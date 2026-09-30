"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, AlertTriangle } from "lucide-react";

type ToastTone = "success" | "info" | "error";

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed top-5 right-5 z-[80] flex flex-col items-end gap-2 sm:top-6 sm:right-6"
      >
        <AnimatePresence>
          {toasts.map((item) => (
            <motion.div
              key={item.id}
              role={item.tone === "error" ? "alert" : "status"}
              initial={{ opacity: 0, x: 28, y: -6 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 18 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-stone-200/60 bg-white/95 px-3.5 py-2.5 shadow-lg shadow-stone-900/8 backdrop-blur-md dark:border-stone-700/80 dark:bg-[#1e1b18]/95 dark:text-stone-100"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  item.tone === "error"
                    ? "bg-red-500 text-white"
                    : item.tone === "info"
                      ? "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200"
                      : "bg-accent text-accent-foreground"
                }`}
              >
                {item.tone === "error" ? (
                  <AlertTriangle size={12} />
                ) : item.tone === "info" ? (
                  <Info size={12} />
                ) : (
                  <Check size={12} />
                )}
              </span>
              <p className="pr-1 text-xs font-medium tracking-tight text-stone-900 dark:text-stone-100">
                {item.message}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
