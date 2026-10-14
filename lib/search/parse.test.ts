import { describe, expect, it } from "vitest";
import { parseQuery } from "./parse";
import { translitKey } from "./normalize";

describe("references", () => {
  it.each([
    ["Jn 3:16", { book: "Jhn", chapter: 3, verse: 16 }],
    ["John 3.16", { book: "Jhn", chapter: 3, verse: 16 }],
    ["jhn 3 16", { book: "Jhn", chapter: 3, verse: 16 }],
    ["Gen.1.1", { book: "Gen", chapter: 1, verse: 1 }],
    ["1 Cor 13", { book: "1Co", chapter: 13 }],
    ["I Corinthians 13", { book: "1Co", chapter: 13 }],
    ["1Co 13", { book: "1Co", chapter: 13 }],
    ["Ps 23", { book: "Psa", chapter: 23 }],
    ["Psalm 23:1", { book: "Psa", chapter: 23, verse: 1 }],
    ["Song of Songs 2:4", { book: "Sng", chapter: 2, verse: 4 }],
    ["1 Cor 13:4-7", { book: "1Co", chapter: 13, verse: 4, endVerse: 7 }],
    ["Gen 1:1–2:3", { book: "Gen", chapter: 1, verse: 1, endChapter: 2, endVerse: 3 }],
    ["Gen 1-3", { book: "Gen", chapter: 1, endChapter: 3 }],
    ["Jude 5", { book: "Jud", chapter: 1, verse: 5 }],
    ["  rom 8:28  ", { book: "Rom", chapter: 8, verse: 28 }],
  ])("%s", (input, expected) => {
    expect(parseQuery(input)).toEqual({ kind: "reference", ...expected });
  });

  it("an unknown book name is not a reference", () => {
    expect(parseQuery("Hezekiah 1:1").kind).toBe("text");
  });
});

describe("Strong's numbers", () => {
  it.each([
    ["H2617", ["H2617"]],
    ["h2617", ["H2617"]],
    ["H2617A", ["H2617A"]],
    ["G26", ["G0026"]],
    ["g0026", ["G0026"]],
    ["2617", ["H2617", "G2617"]],
    ["Strong's 26", ["H0026", "G0026"]],
    ["strongs G3341", ["G3341"]],
    ["Strong’s 26", ["H0026", "G0026"]],
  ])("%s", (input, candidates) => {
    expect(parseQuery(input)).toEqual({ kind: "strongs", candidates });
  });
});

describe("original scripts", () => {
  it("pointed Hebrew", () => expect(parseQuery("חֶסֶד")).toEqual({ kind: "hebrew", plain: "חסד" }));
  it("unpointed Hebrew", () => expect(parseQuery("חסד")).toEqual({ kind: "hebrew", plain: "חסד" }));
  it("accented Greek", () => expect(parseQuery("ἀγάπη")).toEqual({ kind: "greek", plain: "αγαπη" }));
});

describe("text", () => {
  it("transliterations fold to the same key", () => {
    const a = parseQuery("hesed");
    const b = parseQuery("chesed");
    expect(a.kind).toBe("text");
    expect(a).toMatchObject({ translitKey: translitKey("hesed") });
    expect(b).toMatchObject({ translitKey: translitKey("hesed") });
  });
  it("English word", () => expect(parseQuery("grace")).toMatchObject({ kind: "text", raw: "grace" }));
  it("empty input", () => expect(parseQuery("   ")).toEqual({ kind: "empty" }));
});
