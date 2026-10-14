import { afterAll, describe, expect, it } from "vitest";
import { sql } from "./client";
import { getChapterVerseCount, getLemma, getOccurrences, getVerse, listSources, searchLemmas, searchText } from "./queries";

const hasDb = Boolean(process.env.DATABASE_URL);
afterAll(async () => {
  if (hasDb) await sql.end();
});

describe.skipIf(!hasDb)("query layer (integration)", () => {
  it("getVerse returns Hebrew tokens and the Hebrew numbering for Mal 4:1", async () => {
    const v = await getVerse("Mal.4.1");
    expect(v?.hebRef).toBe("Mal.3.19");
    expect(v?.language).toBe("heb");
    expect(v?.tokens.length).toBeGreaterThan(5);
    expect(v?.translations.map((t) => t.id)).toContain("kjv");
    expect(v?.prev).toBe("Mal.3.18");
  });

  it("getVerse labels Greek morphology and links lemmas", async () => {
    const v = await getVerse("Jhn.3.16");
    const loved = v?.tokens.find((t) => t.surface.startsWith("ἠγάπησεν"));
    expect(loved?.lemmaId).toBe("G0025");
    expect(loved?.morphLabel).toContain("Aorist");
    expect(v?.next).toBe("Jhn.3.17");
  });

  it("getVerse flags verses absent from SBLGNT", async () => {
    const v = await getVerse("Mat.17.21");
    expect(v?.textNote).toBe("not-in-sblgnt");
    expect(v?.tokens).toHaveLength(0);
  });

  it("getVerse returns null for a missing verse", async () => {
    expect(await getVerse("Jhn.30.1")).toBeNull();
  });

  it("getLemma returns lexicon, root family, senses and counts for hesed", async () => {
    const l = await getLemma("H2617A");
    expect(l?.count).toBeGreaterThan(200);
    expect(l?.root?.letters).toBe("חסד");
    expect(l?.root?.family.map((f) => f.id)).toContain("H2623");
    expect(l?.senses.map((s) => s.id)).toContain("H2617B");
    expect(l?.lexicon[0].html).toContain("kindness");
    expect(l?.distribution.find((d) => d.book === "Psa")?.count).toBeGreaterThan(100);
    expect(l?.glosses[0].count).toBeGreaterThan(10);
  });

  it("getOccurrences pages through the concordance", async () => {
    const page = await getOccurrences("G0026", 0, 10);
    expect(page.total).toBe(116);
    expect(page.rows).toHaveLength(10);
    expect(page.rows[0].kjv.length).toBeGreaterThan(0);
  });

  it("searchLemmas finds unpointed Hebrew, Strong's bases and transliterations", async () => {
    const heb = await searchLemmas({ kind: "hebrew", plain: "חסד" });
    expect(heb.map((l) => l.id)).toContain("H2617A");
    const strongs = await searchLemmas({ kind: "strongs", candidates: ["H2617"] });
    expect(strongs.map((l) => l.id).sort()).toEqual(["H2617A", "H2617B"]);
    const translit = await searchLemmas({ kind: "text", raw: "hesed", translitKey: "hesed" });
    expect(translit[0].id).toBe("H2617A");
    const english = await searchLemmas({ kind: "text", raw: "reconciliation", translitKey: "reconciliation" });
    expect(english.map((l) => l.id)).toContain("G2643");
  });

  it("searchText finds verses by English words", async () => {
    const hits = await searchText("only begotten son");
    expect(hits.map((h) => h.osis)).toContain("Jhn.3.16");
  });

  it("chapter counts and sources", async () => {
    expect(await getChapterVerseCount("Jhn", 3)).toBe(36);
    expect(await getChapterVerseCount("Jhn", 30)).toBe(0);
    const sources = await listSources();
    expect(sources.find((s) => s.id === "step-tahot")?.license).toBe("CC BY 4.0");
  });
});
