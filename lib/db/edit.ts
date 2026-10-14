import "server-only";
import { BLOCK_SECTIONS, BLOCK_TYPES, CONSENSUS } from "@/lib/content/enums";
import { sql } from "./client";

export type BlockInput = {
  id?: number;
  subject: string; // lemma:H2617A | verse:Jhn.3.16 | entry:parable/lost-son | person:irenaeus
  section: string;
  type: string;
  title?: string | null;
  by?: string | null;
  consensus?: string;
  body: string;
  reviewed?: boolean;
};

const SUBJECT = /^(lemma|verse|entry|person):(.+)$/;

/** Returns an error message, or null when the input is valid. */
export function validateBlockInput(b: BlockInput): string | null {
  if (!SUBJECT.test(b.subject)) return "The subject must look like lemma:H2617A, verse:Jhn.3.16 or entry:parable/slug.";
  if (!(BLOCK_TYPES as readonly string[]).includes(b.type)) return `Unknown content type "${b.type}".`;
  if (!(BLOCK_SECTIONS as readonly string[]).includes(b.section)) return `Unknown section "${b.section}".`;
  if (b.consensus && !(CONSENSUS as readonly string[]).includes(b.consensus)) return `Unknown consensus "${b.consensus}".`;
  if (!b.body.trim()) return "Write something before saving.";
  return null;
}

export async function saveBlock(b: BlockInput): Promise<number> {
  const err = validateBlockInput(b);
  if (err) throw new Error(err);
  const [, kind, id] = b.subject.match(SUBJECT)!;
  const status = b.reviewed ? "reviewed" : "draft";
  if (b.id) {
    await sql`update content_block set section = ${b.section}, type = ${b.type}, title = ${b.title ?? null},
      by_person = ${b.by || null}, consensus = ${b.consensus ?? "n/a"}, body_md = ${b.body}, status = ${status},
      author = 'owner', updated_at = now() where id = ${b.id}`;
    return b.id;
  }
  const [row] = await sql<{ id: number }[]>`
    insert into content_block (subject_kind, subject_id, section, title, type, by_person, consensus, body_md, status, author, ord)
    values (${kind}, ${id}, ${b.section}, ${b.title ?? null}, ${b.type}, ${b.by || null}, ${b.consensus ?? "n/a"},
            ${b.body}, ${status}, 'owner', 1000) returning id`;
  return row.id;
}

export async function deleteBlock(id: number): Promise<void> {
  await sql`delete from content_block where id = ${id}`;
}

export async function addCitation(blockId: number, c: { ref: string; workId?: string | null; url?: string | null }) {
  if (!c.ref.trim()) throw new Error("A citation needs a reference, such as a chapter, section or page.");
  const [row] = await sql<{ id: number }[]>`
    insert into citation (block_id, work_id, ref, url) values (${blockId}, ${c.workId || null}, ${c.ref.trim()}, ${c.url || null})
    returning id`;
  await sql`update content_block set author = 'owner', updated_at = now() where id = ${blockId}`;
  return row.id;
}

export async function setCitationVerified(id: number, verified: boolean) {
  await sql`update citation set verified = ${verified}, verified_at = case when ${verified} then now() end where id = ${id}`;
  await sql`update content_block set author = 'owner' where id = (select block_id from citation where id = ${id})`;
}

export async function deleteCitation(id: number) {
  await sql`delete from citation where id = ${id}`;
}

export type Note = {
  id: number;
  subjectKind: string;
  subjectId: string;
  workId: string | null;
  workTitle: string | null;
  page: string | null;
  body: string;
  updatedAt: Date;
};

export async function addNote(n: { subject: string; body: string; page?: string | null; workId?: string | null }) {
  const m = n.subject.match(SUBJECT);
  if (!m) throw new Error("Unknown subject for this note.");
  if (!n.body.trim()) throw new Error("Write something before saving.");
  const [row] = await sql<{ id: number }[]>`
    insert into user_note (subject_kind, subject_id, work_id, page, body_md)
    values (${m[1]}, ${m[2]}, ${n.workId || null}, ${n.page || null}, ${n.body}) returning id`;
  return row.id;
}

export async function updateNote(id: number, body: string, page?: string | null) {
  await sql`update user_note set body_md = ${body}, page = ${page || null}, updated_at = now() where id = ${id}`;
}

export async function deleteNote(id: number) {
  await sql`delete from user_note where id = ${id}`;
}

export async function listNotes(subject?: string): Promise<Note[]> {
  const m = subject?.match(SUBJECT);
  const rows = await sql<Note[]>`
    select n.id, n.subject_kind as "subjectKind", n.subject_id as "subjectId", n.work_id as "workId",
      w.title as "workTitle", n.page, n.body_md as body, n.updated_at as "updatedAt"
    from user_note n left join work w on w.id = n.work_id
    ${m ? sql`where n.subject_kind = ${m[1]} and n.subject_id = ${m[2]}` : sql``}
    order by n.updated_at desc`;
  return [...rows];
}

export function notesToMarkdown(notes: Note[]): string {
  const lines = ["# My notes (Logos Relational)", ""];
  for (const n of notes) {
    lines.push(`## ${n.subjectKind}: ${n.subjectId}`);
    const src = [n.workTitle, n.page].filter(Boolean).join(", ");
    if (src) lines.push(`*${src}*`);
    lines.push("", n.body, "", `<sub>Updated ${new Date(n.updatedAt).toISOString().slice(0, 10)}</sub>`, "");
  }
  return lines.join("\n");
}

export async function listWorks() {
  const rows = await sql<{ id: string; title: string; author: string | null; copyright: string }[]>`
    select w.id, w.title, p.name as author, w.copyright from work w left join person p on p.id = w.person_id
    order by p.name nulls last, w.title`;
  return [...rows];
}
