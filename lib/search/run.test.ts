import { afterAll, describe, expect, it } from "vitest";
import { sql } from "@/lib/db/client";
import { runSearch } from "./run";

const hasDb = Boolean(process.env.DATABASE_URL);
afterAll(async () => {
  if (hasDb) await sql.end();
});

describe.skipIf(!hasDb)("runSearch", () => {
  it("redirects a verse reference to the verse page", async () => {
    expect((await runSearch("John 3:16")).redirect).toBe("/verse/Jhn.3.16");
  });
  it("redirects a chapter reference to its first verse", async () => {
    expect((await runSearch("Ps 23")).redirect).toBe("/verse/Psa.23.1");
  });
  it("explains an impossible chapter instead of failing", async () => {
    const r = await runSearch("John 30:1");
    expect(r.redirect).toBeUndefined();
    expect(r.notice).toContain("21 chapters");
    expect(r.groups[0].items[0].href).toBe("/verse/Jhn.21.1");
  });
  it("explains an unknown book and suggests similar names", async () => {
    const r = await runSearch("Hezekiah 1:1");
    expect(r.notice).toContain("No book called “Hezekiah”");
    const r2 = await runSearch("Johnn 3:16");
    expect(r2.notice).toContain("John");
  });
  it("redirects a Hebrew-numbered reference to the English verse", async () => {
    const r = await runSearch("Mal 3:19");
    expect(r.redirect).toBe("/verse/Mal.4.1");
  });
  it("explains an impossible verse", async () => {
    const r = await runSearch("John 3:99");
    expect(r.notice).toContain("36 verses");
  });
  it("finds hesed by transliteration, most frequent sense first", async () => {
    const r = await runSearch("hesed");
    const words = r.groups.find((g) => g.module === "Words");
    expect(words?.items[0].href).toBe("/word/H2617A");
  });
  it("offers Hebrew and Greek for a bare Strong's number", async () => {
    const r = await runSearch("2617");
    const hrefs = r.groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs.some((h) => h.startsWith("/word/H2617"))).toBe(true);
    expect(hrefs.some((h) => h.startsWith("/word/G2617"))).toBe(true);
  });
  it("redirects a Strong's number with a single lemma", async () => {
    expect((await runSearch("G26")).redirect).toBe("/word/G0026");
  });
  it("searches verse text for English phrases", async () => {
    const r = await runSearch("only begotten son");
    const verses = r.groups.find((g) => g.module === "Verses");
    expect(verses?.items.map((i) => i.href)).toContain("/verse/Jhn.3.16");
  });
  it("finds proper names", async () => {
    const r = await runSearch("Melchizedek");
    const names = r.groups.find((g) => g.module === "Names");
    expect(names?.items[0].href).toMatch(/^\/names\/Melchizedek/);
  });
  it("returns nothing for empty input", async () => {
    expect((await runSearch("  ")).groups).toEqual([]);
  });
});
