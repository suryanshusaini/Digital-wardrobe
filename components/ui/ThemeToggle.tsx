"use client";

import { useState } from "react";
import { Sun, Moon, Laptop } from "lucide-react";

type ThemeMode = "system" | "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    const saved = localStorage.getItem("theme") as ThemeMode | null;
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
    return "system";
  });

  const changeTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    const root = document.documentElement;
    if (newTheme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", isDark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", newTheme);
    }
  };

  return (
    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-stone-100/70 border border-stone-200/60 text-xs">
      <span className="text-[11px] font-medium text-stone-500">Theme</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => changeTheme("light")}
          className={`p-1.5 rounded-lg transition-colors ${
            theme === "light"
              ? "bg-white text-stone-900 shadow-2xs"
              : "text-stone-400 hover:text-stone-700"
          }`}
          title="Light theme"
          aria-label="Light theme"
        >
          <Sun size={13} />
        </button>
        <button
          type="button"
          onClick={() => changeTheme("dark")}
          className={`p-1.5 rounded-lg transition-colors ${
            theme === "dark"
              ? "bg-white text-stone-900 shadow-2xs"
              : "text-stone-400 hover:text-stone-700"
          }`}
          title="Dark theme"
          aria-label="Dark theme"
        >
          <Moon size={13} />
        </button>
        <button
          type="button"
          onClick={() => changeTheme("system")}
          className={`p-1.5 rounded-lg transition-colors ${
            theme === "system"
              ? "bg-white text-stone-900 shadow-2xs"
              : "text-stone-400 hover:text-stone-700"
          }`}
          title="System theme"
          aria-label="System theme"
        >
          <Laptop size={13} />
        </button>
      </div>
    </div>
  );
}
