import { describe, expect, it } from "vitest";
import cases from "@/db/seed/stem-cases.json";
import { highlight, parseTextQuery, rankText, similarity, stem } from "./match";

describe("stem (shared with the Python exporter)", () => {
  it.each(cases as [string, string][])("%s → %s", (word, out) => expect(stem(word)).toBe(out));
});

describe("text queries", () => {
  const q = (s: string) => parseTextQuery(s)!;
  it("needs every word, ignoring stop words and word endings", () => {
    expect(rankText(q("the only begotten son"), "he gave his only begotten Son")).toBeGreaterThan(0);
    expect(rankText(q("only begotten daughter"), "he gave his only begotten Son")).toBe(0);
    expect(rankText(q("loving"), "God so loved the world")).toBeGreaterThan(0);
  });
  it("supports quoted phrases, exclusions and OR", () => {
    expect(rankText(q('"son only"'), "his only begotten Son")).toBe(0);
    expect(rankText(q('"only begotten"'), "his only begotten Son")).toBeGreaterThan(0);
    expect(rankText(q("son -begotten"), "his only begotten Son")).toBe(0);
    expect(rankText(q("daughter or son"), "his only begotten Son")).toBeGreaterThan(0);
  });
  it("returns null for stop words alone", () => expect(parseTextQuery("the and of")).toBeNull());
  it("highlights matches and escapes HTML", () => {
    expect(highlight("<b> God so loved", q("love"))).toBe("&lt;b&gt; God so <mark>loved</mark>");
  });
  it("trims long text to a window around the first hit", () => {
    const text = Array.from({ length: 60 }, (_, i) => `w${i}`).join(" ") + " grace " + "x ".repeat(40);
    const out = highlight(text, q("grace"), 20);
    expect(out.startsWith("… ")).toBe(true);
    expect(out).toContain("<mark>grace</mark>");
    expect(out.endsWith(" …")).toBe(true);
  });
});

describe("similarity", () => {
  it("behaves like pg_trgm", () => {
    expect(similarity("hesed", "hesed")).toBe(1);
    expect(similarity("hesed", "heset")).toBeGreaterThan(0.3);
    expect(similarity("hesed", "agape")).toBe(0);
  });
});
