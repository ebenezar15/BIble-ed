import { describe, expect, it } from "vitest";
import { DAILY_VERSES, EXAMPLE_WORDS, verseForDay } from "./examples";

describe("examples", () => {
  it("has the ten worked examples from the brief", () => expect(EXAMPLE_WORDS).toHaveLength(10));
  it("picks a stable verse for a given day", () => {
    const d = new Date(Date.UTC(2026, 9, 14));
    expect(verseForDay(d)).toBe(verseForDay(new Date(Date.UTC(2026, 9, 14, 23))));
    expect(DAILY_VERSES).toContain(verseForDay(d));
  });
});
