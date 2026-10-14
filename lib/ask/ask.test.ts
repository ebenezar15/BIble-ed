import { afterAll, describe, expect, it } from "vitest";
import { sql } from "@/lib/db/client";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import { retrieve } from "./retrieve";

const hasDb = Boolean(process.env.DATABASE_URL);
afterAll(async () => {
  if (hasDb) await sql.end();
});

describe("Ask prompt", () => {
  it("numbers every source and keeps the question last", () => {
    const msg = buildUserMessage("What is hesed?", [
      { n: 1, kind: "Word study", title: "hesed: culture", href: "/word/H2617A", text: "Covenant loyalty." },
      { n: 2, kind: "Verse", title: "Exodus 34:6", href: "/verse/Exo.34.6", text: "abundant in goodness" },
    ]);
    expect(msg).toContain('<source n="1"');
    expect(msg).toContain('<source n="2"');
    expect(msg.trim().endsWith("What is hesed?</question>")).toBe(true);
  });
  it("tells the model to answer only from the library", () => {
    expect(SYSTEM_PROMPT).toContain("not in the library");
    expect(SYSTEM_PROMPT).toMatch(/only/i);
  });
});

describe.skipIf(!hasDb)("retrieve", () => {
  it("finds word studies, verses and Fathers for a theological question", async () => {
    const sources = await retrieve("What does hesed mean?");
    expect(sources.length).toBeGreaterThan(3);
    expect(sources.some((s) => s.href.startsWith("/word/H2617"))).toBe(true);
    expect(sources.map((s) => s.n)).toEqual(sources.map((_, i) => i + 1));
  });
  it("returns nothing for gibberish", async () => {
    expect(await retrieve("qzxv wpqk")).toEqual([]);
  });
});
