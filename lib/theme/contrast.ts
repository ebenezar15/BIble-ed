export type Palette = {
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
  border: string;
  hebrew: string;
  greek: string;
};

function rgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

export function hsl(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

/** Move lightness away from the backgrounds until the colour reads at ≥ 4.5:1 on all of them. */
function readable(h: number, s: number, l: number, backgrounds: string[], darken: boolean): string {
  let light = l;
  for (let i = 0; i < 100; i++) {
    const c = hsl(h, s, light);
    if (backgrounds.every((bg) => contrastRatio(c, bg) >= 4.5)) return c;
    light += darken ? -1 : 1;
    if (light < 0 || light > 100) break;
  }
  return darken ? "#000000" : "#ffffff";
}

/** Build a full palette from one accent colour picked by the user. */
export function paletteFromAccent(hex: string, mode: "light" | "dark"): Palette {
  const [h, s, l] = hexToHsl(hex);
  const tint = Math.min(s, 35);
  const light = mode === "light";
  const bg = light ? hsl(h, tint, 96) : hsl(h, tint, 9);
  const surface = light ? hsl(h, tint * 0.6, 99) : hsl(h, tint, 13);
  const surface2 = light ? hsl(h, tint, 92) : hsl(h, tint, 17);
  const backs = [bg, surface];
  const accent = readable(h, Math.max(s, 45), l, backs, light);
  const accent2 = readable((h + 150) % 360, Math.max(s * 0.7, 35), l, backs, light);
  return {
    bg,
    surface,
    surface2,
    ink: readable(h, 30, light ? 14 : 92, backs, light),
    muted: readable(h, 12, light ? 38 : 70, backs, light),
    accent,
    accent2,
    border: light ? hsl(h, tint, 84) : hsl(h, tint, 24),
    hebrew: accent2,
    greek: accent,
  };
}
