import type { Palette } from "./contrast";

export const PRESET_IDS = ["parchment", "lapis", "tekhelet", "olive", "sepia", "contrast"] as const;
export type PresetId = (typeof PRESET_IDS)[number];
export type Mode = "light" | "dark";

/**
 * Each palette draws on the world of the text: vellum and iron-gall ink, lapis lazuli,
 * the tabernacle's blue (tekhelet), purple (argaman) and scarlet, olive and clay lamps.
 */
export const PRESETS: Record<PresetId, { name: string; blurb: string; light: Palette; dark: Palette }> = {
  parchment: {
    name: "Parchment",
    blurb: "Vellum, iron-gall ink and gold leaf",
    light: {
      bg: "#f2ead8", surface: "#f8f3e7", surface2: "#e8dcc2", ink: "#2a2118", muted: "#5e5140",
      accent: "#7a4f00", accent2: "#35546f", border: "#d6c7a6", hebrew: "#5a2d1c", greek: "#2f4a63",
    },
    dark: {
      bg: "#1d1812", surface: "#252017", surface2: "#2f281d", ink: "#eee4cf", muted: "#bfb197",
      accent: "#e0b456", accent2: "#9cb9d4", border: "#433a2b", hebrew: "#e8b49a", greek: "#a9c6e0",
    },
  },
  lapis: {
    name: "Midnight Lapis",
    blurb: "Lapis lazuli flecked with gold",
    light: {
      bg: "#eef2f9", surface: "#f8fafd", surface2: "#dde5f2", ink: "#121c33", muted: "#47546e",
      accent: "#1d4fa3", accent2: "#80600a", border: "#c5d1e6", hebrew: "#1a3d80", greek: "#6b4f07",
    },
    dark: {
      bg: "#0d1626", surface: "#132036", surface2: "#1a2a45", ink: "#e5ebf5", muted: "#a5b2c9",
      accent: "#8fb3f0", accent2: "#d9bf6e", border: "#263a5c", hebrew: "#a9c4f5", greek: "#e3cb80",
    },
  },
  tekhelet: {
    name: "Tekhelet",
    blurb: "Tabernacle blue, purple and scarlet",
    light: {
      bg: "#f1f2f8", surface: "#fafbfe", surface2: "#e1e3f0", ink: "#151a33", muted: "#4a4f6b",
      accent: "#1e4596", accent2: "#74286b", border: "#cacee3", hebrew: "#9a1f2b", greek: "#5f2a8a",
    },
    dark: {
      bg: "#10132a", surface: "#161a37", surface2: "#1e2346", ink: "#e6e8f5", muted: "#abafcb",
      accent: "#90acf2", accent2: "#e39ad6", border: "#2c3260", hebrew: "#f2959c", greek: "#c8a5ef",
    },
  },
  olive: {
    name: "Olive & Clay",
    blurb: "Olive leaves and clay lamps",
    light: {
      bg: "#eef0e5", surface: "#f8f9f2", surface2: "#dfe3d0", ink: "#1f2418", muted: "#4f5741",
      accent: "#4c5c1d", accent2: "#8a4a2c", border: "#c9cfb5", hebrew: "#7c3e22", greek: "#3e5218",
    },
    dark: {
      bg: "#161a10", surface: "#1d2216", surface2: "#262c1d", ink: "#e8ebdc", muted: "#b2b99f",
      accent: "#b9cc7a", accent2: "#e3a07e", border: "#353d29", hebrew: "#eba889", greek: "#c4d68a",
    },
  },
  sepia: {
    name: "Sepia Scroll",
    blurb: "Low-glare reading, like an old scroll",
    light: {
      bg: "#f0e6cf", surface: "#f5eedc", surface2: "#e5d8b9", ink: "#3a2b1d", muted: "#5f4c36",
      accent: "#77461f", accent2: "#4f5a2a", border: "#d5c39d", hebrew: "#6e3a1a", greek: "#4a5520",
    },
    dark: {
      bg: "#211a12", surface: "#282017", surface2: "#31281d", ink: "#e6d6b8", muted: "#bba98a",
      accent: "#d9a46f", accent2: "#bcc48b", border: "#463a2b", hebrew: "#e3ae86", greek: "#c5cd94",
    },
  },
  contrast: {
    name: "High Contrast",
    blurb: "Maximum legibility",
    light: {
      bg: "#ffffff", surface: "#ffffff", surface2: "#ebebeb", ink: "#000000", muted: "#2b2b2b",
      accent: "#0033cc", accent2: "#8a0000", border: "#000000", hebrew: "#000000", greek: "#000000",
    },
    dark: {
      bg: "#000000", surface: "#000000", surface2: "#1f1f1f", ink: "#ffffff", muted: "#e0e0e0",
      accent: "#ffd400", accent2: "#7fd4ff", border: "#ffffff", hebrew: "#ffffff", greek: "#ffffff",
    },
  },
};

export const PALETTE_VARS: Record<keyof Palette, string> = {
  bg: "--bg", surface: "--surface", surface2: "--surface-2", ink: "--ink", muted: "--muted",
  accent: "--accent", accent2: "--accent-2", border: "--border", hebrew: "--hebrew", greek: "--greek",
};

export function paletteCss(p: Palette): string {
  return (Object.keys(PALETTE_VARS) as (keyof Palette)[]).map((k) => `${PALETTE_VARS[k]}:${p[k]}`).join(";");
}
