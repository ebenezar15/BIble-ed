import { PRESET_IDS, type PresetId } from "./presets";

export type ThemeSettings = {
  preset: PresetId;
  mode: "light" | "dark" | "system";
  accent: string | null; // custom accent overrides the preset palette
  scale: number; // text size multiplier, 0.9–1.3
};

export const STORAGE_KEY = "logos.theme";
export const DEFAULT_SETTINGS: ThemeSettings = { preset: "parchment", mode: "system", accent: null, scale: 1 };

export function parseSettings(raw: string | null): ThemeSettings {
  let data: Record<string, unknown> = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  const s = { ...DEFAULT_SETTINGS };
  if (PRESET_IDS.includes(data.preset as PresetId)) s.preset = data.preset as PresetId;
  if (data.mode === "light" || data.mode === "dark" || data.mode === "system") s.mode = data.mode;
  if (typeof data.accent === "string" && /^#[0-9a-f]{6}$/i.test(data.accent)) s.accent = data.accent;
  if (typeof data.scale === "number" && data.scale >= 0.9 && data.scale <= 1.3) s.scale = data.scale;
  return s;
}
