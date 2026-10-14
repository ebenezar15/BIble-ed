"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { paletteFromAccent } from "@/lib/theme/contrast";
import { PALETTE_VARS } from "@/lib/theme/presets";
import { DEFAULT_SETTINGS, parseSettings, STORAGE_KEY, type ThemeSettings } from "@/lib/theme/settings";

type Ctx = { settings: ThemeSettings; update: (patch: Partial<ThemeSettings>) => void; scheme: "light" | "dark" };
const ThemeContext = createContext<Ctx | null>(null);

function systemScheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(s: ThemeSettings): "light" | "dark" {
  const root = document.documentElement;
  const scheme = s.mode === "system" ? systemScheme() : s.mode;
  root.dataset.preset = s.preset;
  root.dataset.scheme = scheme;
  root.style.setProperty("--fs-scale", String(s.scale));
  for (const v of Object.values(PALETTE_VARS)) root.style.removeProperty(v);
  if (s.accent) {
    const p = paletteFromAccent(s.accent, scheme);
    for (const [k, v] of Object.entries(PALETTE_VARS)) root.style.setProperty(v, p[k as keyof typeof p]);
  }
  return scheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [scheme, setScheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {}
    const s = parseSettings(saved);
    setSettings(s);
    setScheme(apply(s));
  }, []);

  useEffect(() => {
    if (settings.mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setScheme(apply(settings));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings]);

  const update = useCallback((patch: Partial<ThemeSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      setScheme(apply(next));
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ settings, update, scheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
