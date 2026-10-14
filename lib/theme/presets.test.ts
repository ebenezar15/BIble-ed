import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { PRESET_IDS, PRESETS } from "./presets";

describe("theme presets", () => {
  it("has the six presets from the spec", () => {
    expect(PRESET_IDS).toEqual(["parchment", "lapis", "tekhelet", "olive", "sepia", "contrast"]);
  });

  const pairs = PRESET_IDS.flatMap((id) => (["light", "dark"] as const).map((mode) => [id, mode] as const));
  it.each(pairs)("%s/%s meets WCAG AA for text", (id, mode) => {
    const p = PRESETS[id][mode];
    for (const fg of [p.ink, p.muted, p.accent, p.hebrew, p.greek]) {
      expect(contrastRatio(fg, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(fg, p.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
