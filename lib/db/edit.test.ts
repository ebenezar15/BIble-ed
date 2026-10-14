import { afterAll, describe, expect, it } from "vitest";
import { sql } from "./client";
import { getBlocks } from "./content";
import {
  addCitation, addNote, deleteBlock, deleteNote, listNotes, notesToMarkdown, saveBlock, setCitationVerified,
  validateBlockInput,
} from "./edit";

const hasDb = Boolean(process.env.DATABASE_URL);
afterAll(async () => {
  if (!hasDb) return;
  await sql`delete from content_block where subject_id = 'Zzz.1.1'`;
  await sql`delete from user_note where subject_id = 'Zzz.1.1'`;
  await sql.end();
});

describe("validateBlockInput", () => {
  it("rejects unknown types and empty bodies", () => {
    expect(validateBlockInput({ subject: "verse:Jhn.3.16", section: "lens", type: "opinion", body: "x" })).toContain("type");
    expect(validateBlockInput({ subject: "verse:Jhn.3.16", section: "lens", type: "lens_commentary", body: " " })).toContain("Write");
    expect(validateBlockInput({ subject: "nope", section: "lens", type: "lens_commentary", body: "x" })).toContain("subject");
    expect(validateBlockInput({ subject: "verse:Jhn.3.16", section: "lens", type: "lens_commentary", body: "x" })).toBeNull();
  });
});

describe.skipIf(!hasDb)("editing (integration)", () => {
  it("saves owner blocks as reviewed, adds and verifies citations, deletes", async () => {
    const id = await saveBlock({ subject: "verse:Zzz.1.1", section: "notes", type: "lens_commentary", body: "Mine", reviewed: true });
    let [b] = await getBlocks("verse", "Zzz.1.1");
    expect(b).toMatchObject({ author: "owner", status: "reviewed", bodyMd: "Mine" });
    const cid = await addCitation(id, { ref: "Against Heresies 5.16.3", workId: "irenaeus-against-heresies" });
    await setCitationVerified(cid, true);
    [b] = await getBlocks("verse", "Zzz.1.1");
    expect(b.citations[0]).toMatchObject({ verified: true, workTitle: "Against Heresies" });
    await saveBlock({ id, subject: "verse:Zzz.1.1", section: "notes", type: "lens_commentary", body: "Edited", reviewed: false });
    [b] = await getBlocks("verse", "Zzz.1.1");
    expect(b).toMatchObject({ bodyMd: "Edited", status: "draft", author: "owner" });
    await deleteBlock(id);
    expect(await getBlocks("verse", "Zzz.1.1")).toHaveLength(0);
  });

  it("notes: add, list, export, delete", async () => {
    const id = await addNote({ subject: "verse:Zzz.1.1", body: "A thought *here*", page: "p. 12", workId: null });
    const notes = await listNotes();
    expect(notes.find((n) => n.id === id)?.body).toBe("A thought *here*");
    const md = notesToMarkdown(notes.filter((n) => n.id === id));
    expect(md).toContain("A thought *here*");
    expect(md).toContain("p. 12");
    await deleteNote(id);
    expect((await listNotes()).find((n) => n.id === id)).toBeUndefined();
  });
});
