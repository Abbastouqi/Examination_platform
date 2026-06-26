"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx | undefined>(undefined);

/** Inline script (runs before paint) to apply the saved theme and avoid FOUC.
 *  Injected via <head> in the root layout. */
export const themeScript = `(function(){try{var t=localStorage.getItem('pg_theme');var d=t? t==='dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;var e=document.documentElement;if(d)e.classList.add('dark');else e.classList.remove('dark');}catch(e){}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  // Sync from the class the no-FOUC script already applied.
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setThemeState(isDark ? "dark" : "light");
  }, []);

  const apply = (t: Theme) => {
    const el = document.documentElement;
    if (t === "dark") el.classList.add("dark");
    else el.classList.remove("dark");
    try {
      localStorage.setItem("pg_theme", t);
    } catch {}
    setThemeState(t);
  };

  return (
    <Ctx.Provider
      value={{ theme, toggle: () => apply(theme === "dark" ? "light" : "dark"), setTheme: apply }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) return { theme: "light", toggle: () => {}, setTheme: () => {} };
  return ctx;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-ink-800 dark:hover:text-slate-200",
        className
      )}
    >
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
