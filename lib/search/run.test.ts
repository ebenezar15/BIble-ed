import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { data } from "@/lib/data/server";
import { runSearch as run } from "./run";

// Runs against the exported library in public/data (python -m logos_etl.export_static).
const hasData = existsSync("public/data/meta.json");
const runSearch = (q: string) => run(data, q);

describe.skipIf(!hasData)("runSearch", () => {
  it("redirects a verse reference to the verse page", async () => {
    expect((await runSearch("John 3:16")).redirect).toBe("/verse/?ref=Jhn.3.16");
  });
  it("redirects a chapter reference to its first verse", async () => {
    expect((await runSearch("Ps 23")).redirect).toBe("/verse/?ref=Psa.23.1");
  });
  it("explains an impossible chapter instead of failing", async () => {
    const r = await runSearch("John 30:1");
    expect(r.redirect).toBeUndefined();
    expect(r.notice).toContain("21 chapters");
    expect(r.groups[0].items[0].href).toBe("/verse/?ref=Jhn.21.1");
  });
  it("explains an unknown book and suggests similar names", async () => {
    const r = await runSearch("Hezekiah 1:1");
    expect(r.notice).toContain("No book called “Hezekiah”");
    const r2 = await runSearch("Johnn 3:16");
    expect(r2.notice).toContain("John");
  });
  it("redirects a Hebrew-numbered reference to the English verse", async () => {
    const r = await runSearch("Mal 3:19");
    expect(r.redirect).toBe("/verse/?ref=Mal.4.1");
  });
  it("explains an impossible verse", async () => {
    const r = await runSearch("John 3:99");
    expect(r.notice).toContain("36 verses");
  });
  it("finds hesed by transliteration, most frequent sense first", async () => {
    const r = await runSearch("hesed");
    const words = r.groups.find((g) => g.module === "Words");
    expect(words?.items[0].href).toBe("/word/?id=H2617A");
  });
  it("offers Hebrew and Greek for a bare Strong's number", async () => {
    const r = await runSearch("2617");
    const hrefs = r.groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs.some((h) => h.startsWith("/word/?id=H2617"))).toBe(true);
    expect(hrefs.some((h) => h.startsWith("/word/?id=G2617"))).toBe(true);
  });
  it("redirects a Strong's number with a single lemma", async () => {
    expect((await runSearch("G26")).redirect).toBe("/word/?id=G0026");
  });
  it("searches verse text for English phrases", async () => {
    const r = await runSearch("only begotten son");
    const verses = r.groups.find((g) => g.module === "Verses");
    expect(verses?.items.map((i) => i.href)).toContain("/verse/?ref=Jhn.3.16");
  });
  it("finds proper names", async () => {
    const r = await runSearch("Melchizedek");
    const names = r.groups.find((g) => g.module === "Names");
    expect(names?.items[0].href).toMatch(/^\/name\/\?id=Melchizedek/);
  });
  it("returns nothing for empty input", async () => {
    expect((await runSearch("  ")).groups).toEqual([]);
  });
});
