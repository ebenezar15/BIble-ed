import "server-only";
import { entryHref, KIND_LABEL } from "@/lib/content/routes";
import { renderMarkdown } from "@/lib/content/markdown";
import { sql } from "./client";
import type { LemmaRef } from "./queries";

export type CitationView = {
  id: number;
  ref: string;
  url: string | null;
  workId: string | null;
  workTitle: string | null;
  copyright: string | null;
  verified: boolean;
};

export type BlockView = {
  id: number;
  section: string;
  title: string | null;
  type: string;
  consensus: string;
  status: "draft" | "reviewed";
  author: "claude" | "owner";
  bodyMd: string;
  bodyHtml: string;
  by: { id: string; name: string } | null;
  citations: CitationView[];
  needsSource: boolean;
};

export type EntrySummary = {
  kind: string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  refs: string[];
  data: Record<string, unknown>;
  ord: number;
};

export type EntryView = EntrySummary & { lemmas: LemmaRef[]; blocks: BlockView[] };

const lemmaCols = sql`l.id, l.lemma, coalesce(l.translit, '') as translit, coalesce(l.gloss, '') as gloss,
  l.language, l.occurrences as count`;

export async function getBlocks(kind: string, id: string): Promise<BlockView[]> {
  const rows = await sql<
    {
      id: number; section: string; title: string | null; type: string; consensus: string; status: "draft" | "reviewed";
      author: "claude" | "owner"; body_md: string; by_id: string | null; by_name: string | null;
    }[]
  >`select b.id, b.section, b.title, b.type, b.consensus, b.status, b.author, b.body_md,
       p.id as by_id, p.name as by_name
    from content_block b left join person p on p.id = b.by_person
    where b.subject_kind = ${kind} and b.subject_id = ${id}
    order by b.section, b.ord, b.id`;
  if (!rows.length) return [];
  const cites = await sql<(CitationView & { block_id: number })[]>`
    select c.id, c.block_id, c.ref, c.url, c.work_id as "workId", w.title as "workTitle", w.copyright, c.verified
    from citation c left join work w on w.id = c.work_id
    where c.block_id = any(${rows.map((r) => r.id)}) order by c.id`;
  return rows.map((r) => {
    const citations = cites.filter((c) => c.block_id === r.id).map(({ block_id: _, ...c }) => c);
    return {
      id: r.id,
      section: r.section,
      title: r.title,
      type: r.type,
      consensus: r.consensus,
      status: r.status,
      author: r.author,
      bodyMd: r.body_md,
      bodyHtml: renderMarkdown(r.body_md),
      by: r.by_id ? { id: r.by_id, name: r.by_name! } : null,
      citations,
      needsSource: r.type === "scholarly_interpretation" && citations.length === 0,
    };
  });
}

export async function getEntry(kind: string, slug: string): Promise<EntryView | null> {
  const [e] = await sql<(EntrySummary & { lemma_ids: string[] })[]>`
    select kind, slug, title, subtitle, summary, refs, data, ord, lemmas as lemma_ids
    from entry where kind = ${kind} and slug = ${slug}`;
  if (!e) return null;
  const [lemmas, blocks] = await Promise.all([
    e.lemma_ids.length
      ? sql<LemmaRef[]>`select ${lemmaCols} from lemma l where l.id = any(${e.lemma_ids})`
      : Promise.resolve([] as LemmaRef[]),
    getBlocks("entry", `${kind}/${slug}`),
  ]);
  const { lemma_ids: _, ...rest } = e;
  return { ...rest, lemmas: [...lemmas], blocks };
}

export async function listEntries(kind: string): Promise<EntrySummary[]> {
  const rows = await sql<EntrySummary[]>`
    select kind, slug, title, subtitle, summary, refs, data, ord from entry where kind = ${kind} order by ord, title`;
  return [...rows];
}

export async function entriesForVerse(osis: string): Promise<(EntrySummary & { href: string; label: string })[]> {
  const rows = await sql<EntrySummary[]>`
    select distinct e.kind, e.slug, e.title, e.subtitle, e.summary, e.refs, e.data, e.ord
    from entry_range r join entry e on e.kind = r.kind and e.slug = r.slug
    join verse v on v.osis = ${osis}
    where v.id between r.verse_start and r.verse_end and e.kind <> 'book'
    order by e.kind, e.ord`;
  return rows.map((r) => ({ ...r, href: entryHref(r.kind, r.slug), label: KIND_LABEL[r.kind] ?? r.kind }));
}

export type PersonView = {
  id: string; name: string; born: number | null; died: number | null; era: string | null; tradition: string | null;
  roles: string[]; summary: string | null;
  works: { id: string; title: string; year: number | null; copyright: string; edition: string | null; publisher: string | null; isbn: string | null }[];
  blocks: BlockView[];
};

export async function getPerson(id: string): Promise<PersonView | null> {
  const [p] = await sql<Omit<PersonView, "works" | "blocks">[]>`
    select id, name, born, died, era, tradition, roles, summary from person where id = ${id}`;
  if (!p) return null;
  const [works, blocks] = await Promise.all([
    sql<PersonView["works"]>`select id, title, year, copyright, edition, publisher, isbn from work
      where person_id = ${id} order by year nulls last, title`,
    getBlocks("person", id),
  ]);
  return { ...p, works: [...works], blocks };
}

export async function listPeople(): Promise<(Omit<PersonView, "works" | "blocks"> & { blockCount: number })[]> {
  const rows = await sql<(Omit<PersonView, "works" | "blocks"> & { blockCount: number })[]>`
    select p.id, p.name, p.born, p.died, p.era, p.tradition, p.roles, p.summary,
      (select count(*)::int from content_block b where b.subject_kind = 'person' and b.subject_id = p.id) as "blockCount"
    from person p order by coalesce(p.born, p.died, 3000), p.name`;
  return [...rows];
}

export async function getCrossRefs(osis: string, limit = 24) {
  const rows = await sql<{ start: string; end: string; votes: number; text: string | null }[]>`
    select s.osis as start, e.osis as "end", x.votes, tv.text
    from cross_reference x join verse f on f.id = x.from_verse
    join verse s on s.id = x.to_start join verse e on e.id = x.to_end
    left join translation_verse tv on tv.verse_id = s.id and tv.translation_id = 'kjv'
    where f.osis = ${osis} order by x.votes desc limit ${limit}`;
  return [...rows];
}

export async function getFatherComments(osis: string, limit = 40) {
  const rows = await sql<
    { id: number; father: string; quote: string; sourceTitle: string | null; sourceUrl: string | null; year: number | null }[]
  >`select c.id, c.father, c.quote, c.source_title as "sourceTitle", c.source_url as "sourceUrl", c.year
    from father_comment c join verse v on v.osis = ${osis}
    where v.id between c.verse_start and c.verse_end
    order by c.year nulls last, c.father limit ${limit}`;
  return [...rows];
}

export async function searchNames(q: string, limit = 40) {
  const rows = await sql<{ id: string; name: string; kind: string; brief: string | null; refCount: number }[]>`
    select id, name, kind, brief, ref_count as "refCount" from name_entry
    where fold(name) like fold(${q}) || '%' or fold(name) % fold(${q})
    order by (fold(name) = fold(${q})) desc, ref_count desc limit ${limit}`;
  return [...rows];
}

export async function getName(id: string) {
  const [n] = await sql<
    { id: string; name: string; kind: string; gender: string | null; brief: string | null; description: string | null;
      article: string | null; lemmaIds: string[]; refs: string[]; refCount: number }[]
  >`select id, name, kind, gender, brief, description, article, lemma_ids as "lemmaIds", refs, ref_count as "refCount"
    from name_entry where id = ${id}`;
  if (!n) return null;
  const lemmas = n.lemmaIds.length
    ? await sql<(LemmaRef & { meaning: string | null })[]>`
        select ${lemmaCols}, (select e.body_html from lexicon_entry e where e.lemma_id = l.id limit 1) as meaning
        from lemma l where l.id = any(${n.lemmaIds})`
    : [];
  return { ...n, lemmas: [...lemmas] };
}

export async function getLxxBridge(lemmaId: string): Promise<LemmaRef[]> {
  const rows = await sql<LemmaRef[]>`
    select ${lemmaCols} from lxx_bridge b join lemma l on l.id = case when b.hebrew_lemma = ${lemmaId}
      then b.greek_lemma else b.hebrew_lemma end
    where b.hebrew_lemma = ${lemmaId} or b.greek_lemma = ${lemmaId}
    order by l.occurrences desc limit 16`;
  return [...rows];
}

export async function searchContent(q: string, limit = 20) {
  const rows = await sql<{ kind: string; slug: string; title: string; summary: string | null; rank: number }[]>`
    with query as (select websearch_to_tsquery('english', ${q}) as tsq)
    select kind, slug, title, summary, max(rank) as rank from (
      select e.kind, e.slug, e.title, e.summary,
        ts_rank(to_tsvector('english', e.title || ' ' || coalesce(e.subtitle, '') || ' ' || coalesce(e.summary, '')), query.tsq) * 2 as rank
      from entry e, query
      where to_tsvector('english', e.title || ' ' || coalesce(e.subtitle, '') || ' ' || coalesce(e.summary, '')) @@ query.tsq
      union all
      select e.kind, e.slug, e.title, e.summary,
        ts_rank(to_tsvector('english', coalesce(b.title, '') || ' ' || b.body_md), query.tsq) as rank
      from content_block b join entry e on b.subject_kind = 'entry' and b.subject_id = e.kind || '/' || e.slug, query
      where to_tsvector('english', coalesce(b.title, '') || ' ' || b.body_md) @@ query.tsq
    ) hits group by kind, slug, title, summary order by rank desc limit ${limit}`;
  return rows.map((r) => ({
    href: entryHref(r.kind, r.slug),
    title: r.title,
    subtitle: r.summary ?? "",
    label: KIND_LABEL[r.kind] ?? r.kind,
  }));
}
