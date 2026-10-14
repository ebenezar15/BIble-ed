import { describe, expect, it } from "vitest";
import { contrastRatio, paletteFromAccent } from "./contrast";

describe("contrastRatio", () => {
  it("black on white is 21:1", () => expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1));
  it("is symmetric", () => expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(contrastRatio("#ffffff", "#777777")));
  it("accepts 3-digit hex", () => expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 1));
});

describe("paletteFromAccent", () => {
  it.each([
    ["#7c3aed", "dark"],
    ["#7c3aed", "light"],
    ["#ffee00", "light"],
    ["#0a0a40", "dark"],
  ] as const)("%s %s keeps text and accent readable", (hex, mode) => {
    const p = paletteFromAccent(hex, mode);
    expect(contrastRatio(p.ink, p.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.muted, p.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.accent, p.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.ink, p.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
