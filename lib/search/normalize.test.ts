import { describe, expect, it } from "vitest";
import cases from "@/db/seed/translit-cases.json";
import { stripGreek, stripHebrew, translitKey } from "./normalize";

describe("translitKey (mirrors etl/logos_etl/text.py)", () => {
  it.each(cases.equal_groups)("folds %s together", (...group: string[]) => {
    expect(new Set(group.map(translitKey)).size).toBe(1);
  });
  it.each(cases.different)("keeps %s and %s apart", (a, b) => {
    expect(translitKey(a)).not.toBe(translitKey(b));
  });
});

describe("script stripping", () => {
  it.each(cases.hebrew_plain)("stripHebrew(%s) = %s", (raw, plain) => {
    expect(stripHebrew(raw)).toBe(plain);
  });
  it.each(cases.greek_plain)("stripGreek(%s) = %s", (raw, plain) => {
    expect(stripGreek(raw)).toBe(plain);
  });
});
