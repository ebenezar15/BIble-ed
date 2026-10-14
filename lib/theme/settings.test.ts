import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "./settings";

describe("parseSettings", () => {
  it("returns defaults for missing or broken input", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("{not json")).toEqual(DEFAULT_SETTINGS);
  });
  it("keeps valid fields and drops invalid ones", () => {
    const s = parseSettings(JSON.stringify({ preset: "lapis", mode: "dark", accent: "#123abc", scale: 1.2 }));
    expect(s).toEqual({ preset: "lapis", mode: "dark", accent: "#123abc", scale: 1.2 });
    const bad = parseSettings(JSON.stringify({ preset: "neon", mode: "dim", accent: "red", scale: 9 }));
    expect(bad).toEqual(DEFAULT_SETTINGS);
  });
});
