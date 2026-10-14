import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "./client";
import {
  getBlocks, getCrossRefs, getEntry, getFatherComments, getLxxBridge, getName, getPerson, listEntries,
  searchContent, searchNames, entriesForVerse,
} from "./content";

const hasDb = Boolean(process.env.DATABASE_URL);

async function wipe() {
  await sql`delete from content_block where subject_id like '%zz-t%' or coalesce(by_person,'') like 'zz-t%'`;
  await sql`delete from entry where slug like 'zz-t%'`;
  await sql`delete from work where id like 'zz-t%'`;
  await sql`delete from person where id like 'zz-t%'`;
}

beforeAll(async () => {
  if (!hasDb) return;
  await wipe();
  await sql`insert into person (id, name, roles) values ('zz-t-person', 'Zed Scholar', '{scholar}')`;
  await sql`insert into work (id, person_id, title, copyright) values ('zz-t-work', 'zz-t-person', 'Zed Book', 'copyrighted')`;
  await sql`insert into entry (kind, slug, title, summary, refs, lemmas, data, ord)
    values ('parable', 'zz-t-lost', 'Zed Lost Son', 'A father runs.', '{Luk.15.11-Luk.15.32}', '{G0025}', '{"gospels":["Luk"]}', 1)`;
  const [{ a, b }] = await sql`select (select id from verse where osis='Luk.15.11') a, (select id from verse where osis='Luk.15.32') b`;
  await sql`insert into entry_range (kind, slug, verse_start, verse_end) values ('parable', 'zz-t-lost', ${a}, ${b})`;
  const [{ id }] = await sql`insert into content_block (subject_kind, subject_id, section, type, by_person, body_md, ord)
    values ('entry', 'parable/zz-t-lost', 'voices', 'scholarly_interpretation', 'zz-t-person', 'The father runs (Luke 15:20).', 1) returning id`;
  await sql`insert into citation (block_id, work_id, ref) values (${id}, 'zz-t-work', 'ch. 3')`;
  await sql`insert into content_block (subject_kind, subject_id, section, type, body_md, ord)
    values ('entry', 'parable/zz-t-lost', 'voices', 'scholarly_interpretation', 'Uncited claim.', 2)`;
});
afterAll(async () => {
  if (!hasDb) return;
  await wipe();
  await sql.end();
});

describe.skipIf(!hasDb)("content queries", () => {
  it("getBlocks renders markdown, links verses and flags sources", async () => {
    const blocks = await getBlocks("entry", "parable/zz-t-lost");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].bodyHtml).toContain('href="/verse/Luk.15.20"');
    expect(blocks[0].by?.name).toBe("Zed Scholar");
    expect(blocks[0].citations[0]).toMatchObject({ ref: "ch. 3", workTitle: "Zed Book", verified: false });
    expect(blocks[0].needsSource).toBe(false);
    expect(blocks[1].needsSource).toBe(true);
    expect(blocks[0].status).toBe("draft");
  });

  it("getEntry and listEntries", async () => {
    const e = await getEntry("parable", "zz-t-lost");
    expect(e?.title).toBe("Zed Lost Son");
    expect(e?.lemmas[0].id).toBe("G0025");
    expect(e?.data).toEqual({ gospels: ["Luk"] });
    expect((await listEntries("parable")).map((x) => x.slug)).toContain("zz-t-lost");
    expect(await getEntry("parable", "nope")).toBeNull();
  });

  it("entriesForVerse finds entries whose range covers the verse", async () => {
    const hits = await entriesForVerse("Luk.15.20");
    expect(hits.map((h) => h.slug)).toContain("zz-t-lost");
  });

  it("getPerson returns works", async () => {
    const p = await getPerson("zz-t-person");
    expect(p?.works.map((w) => w.title)).toEqual(["Zed Book"]);
  });

  it("cross references, Fathers, names and the LXX bridge", async () => {
    const x = await getCrossRefs("Jhn.3.16");
    expect(x.length).toBeGreaterThan(5);
    expect(x[0].votes).toBeGreaterThanOrEqual(x[1].votes);
    const f = await getFatherComments("Jhn.3.16");
    expect(f.length).toBeGreaterThan(0);
    const names = await searchNames("Aaron");
    expect(names[0].name).toBe("Aaron");
    const aaron = await getName(names[0].id);
    expect(aaron?.lemmas.map((l) => l.id)).toContain("H0175");
    const bridge = await getLxxBridge("H2617A");
    expect(bridge.map((b) => b.id)).toContain("G1656");
  });

  it("searchContent finds entries", async () => {
    const r = await searchContent("father runs");
    expect(r.map((i) => i.href)).toContain("/parables/zz-t-lost");
  });
});
