import "server-only";
import { formatRef } from "@/lib/books";
import { SECTION_TITLES } from "@/lib/content/sections";
import { subjectHref, subjectLabel } from "@/lib/content/subject";
import { sql } from "@/lib/db/client";
import { translitKey } from "@/lib/search/normalize";
import type { Source } from "./prompt";

const STOP = new Set(
  "what does mean the and for with how why who was were are is in of to a an on about did jesus god bible word words what's this that from".split(" "),
);
const clip = (s: string, n = 1400) => (s.length > n ? `${s.slice(0, n)}…` : s);
const stripHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Gather the library material most relevant to a question: word studies, articles, verses, Fathers. */
export async function retrieve(question: string): Promise<Source[]> {
  const terms = question.toLowerCase().match(/[\p{L}']+/gu)?.filter((t) => t.length > 2 && !STOP.has(t)) ?? [];
  if (!terms.length) return [];
  const orQuery = terms.join(" or ");
  const keys = terms.map(translitKey);

  const [lemmas, blocks, verses, fathers] = await Promise.all([
    sql<{ id: string; lemma: string; translit: string; gloss: string; body: string | null }[]>`
      select l.id, l.lemma, coalesce(l.translit, '') as translit, coalesce(l.gloss, '') as gloss,
        (select e.body_html from lexicon_entry e where e.lemma_id = l.id limit 1) as body
      from lemma l where l.translit_key = any(${keys}) order by l.occurrences desc limit 3`,
    sql<{ kind: string; id: string; section: string; type: string; title: string | null; body: string; by: string | null }[]>`
      select b.subject_kind as kind, b.subject_id as id, b.section, b.type, b.title, b.body_md as body, p.name as by
      from content_block b left join person p on p.id = b.by_person,
        websearch_to_tsquery('english', ${orQuery}) q
      where to_tsvector('english', coalesce(b.title, '') || ' ' || b.body_md) @@ q
      order by ts_rank(to_tsvector('english', coalesce(b.title, '') || ' ' || b.body_md), q) desc limit 10`,
    sql<{ osis: string; text: string }[]>`
      select v.osis, tv.text from translation_verse tv join verse v on v.id = tv.verse_id,
        websearch_to_tsquery('english', ${orQuery}) q
      where tv.translation_id = 'bsb' and to_tsvector('english', tv.text) @@ q
      order by ts_rank(to_tsvector('english', tv.text), q) desc limit 4`,
    sql<{ father: string; osis: string; quote: string }[]>`
      select c.father, v.osis, c.quote from father_comment c join verse v on v.id = c.verse_start,
        websearch_to_tsquery('english', ${orQuery}) q
      where to_tsvector('english', c.quote) @@ q
      order by ts_rank(to_tsvector('english', c.quote), q) desc limit 3`,
  ]);

  // Blocks attached to the matched words come first: they are the word studies themselves.
  const lemmaBlocks = lemmas.length
    ? await sql<{ id: string; section: string; type: string; body: string; by: string | null }[]>`
        select b.subject_id as id, b.section, b.type, b.body_md as body, p.name as by
        from content_block b left join person p on p.id = b.by_person
        where b.subject_kind = 'lemma' and b.subject_id = any(${lemmas.map((l) => l.id)})
          and b.section in ('meaning', 'culture', 'translation_history', 'lens', 'legal_history')
        order by array_position(array['meaning','lens','culture','translation_history','legal_history']::text[], b.section)
        limit 6`
    : [];

  const out: Omit<Source, "n">[] = [];
  const seen = new Set<string>();
  const push = (s: Omit<Source, "n">) => {
    const key = `${s.href}|${s.text.slice(0, 60)}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  };
  const typeLabel = (t: string, by: string | null) =>
    t === "scholarly_interpretation" && by ? `View of ${by}` : t.replace(/_/g, " ");

  for (const l of lemmas) {
    push({ kind: "Lexicon (lexical fact)", title: `${l.lemma} ${l.translit}: ${l.gloss}`, href: `/word/${l.id}`, text: clip(stripHtml(l.body ?? l.gloss), 1000) });
  }
  for (const b of lemmaBlocks) {
    push({ kind: typeLabel(b.type, b.by), title: `${b.id}: ${SECTION_TITLES[b.section] ?? b.section}`, href: `/word/${b.id}`, text: clip(b.body) });
  }
  for (const b of blocks) {
    const subject = `${b.kind}:${b.id}`;
    push({
      kind: typeLabel(b.type, b.by),
      title: `${subjectLabel(subject)}: ${b.title ?? SECTION_TITLES[b.section] ?? b.section}`,
      href: subjectHref(subject),
      text: clip(b.body),
    });
  }
  for (const v of verses) push({ kind: "Scripture (BSB)", title: formatRef(v.osis), href: `/verse/${v.osis}`, text: v.text });
  for (const f of fathers) {
    push({ kind: "Church Father (public-domain translation)", title: `${f.father} on ${formatRef(f.osis)}`, href: `/verse/${f.osis}`, text: clip(f.quote, 1000) });
  }
  return out.slice(0, 16).map((s, i) => ({ ...s, n: i + 1 }));
}
