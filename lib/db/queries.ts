import "server-only";
import type { Query } from "@/lib/search/parse";
import { sql } from "./client";
import { sanitizeLexicon } from "./lexhtml";
import { morphParts } from "./morph";

export type LemmaRef = { id: string; lemma: string; translit: string; gloss: string; language: string; count: number };

export type TokenView = {
  pos: number;
  surface: string;
  translit: string;
  gloss: string;
  lemmaId: string | null;
  lemma: string | null;
  lemmaGloss: string | null;
  morph: string;
  morphLabel: string;
  srcRef: string;
  editions: string | null;
};

export type VerseView = {
  osis: string;
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  bookChapters: number;
  chapterVerses: number;
  language: "heb" | "grc";
  translations: { id: string; name: string; text: string }[];
  tokens: TokenView[];
  hebRef?: string;
  prev?: string;
  next?: string;
  textNote: "not-in-sblgnt" | "na28-fallback" | null;
};

export type LemmaView = {
  id: string;
  strongs: string;
  language: string;
  lemma: string;
  translit: string;
  pos: string;
  gloss: string;
  count: number;
  lexicon: { source: string; sourceId: string; attribution: string; html: string }[];
  root: { id: string; letters: string; gloss: string | null; family: LemmaRef[] } | null;
  senses: LemmaRef[];
  distribution: { book: string; name: string; count: number }[];
  glosses: { gloss: string; count: number }[];
  sourceAttribution: string;
};

const lemmaRefCols = sql`l.id, l.lemma, coalesce(l.translit, '') as translit, coalesce(l.gloss, '') as gloss,
  l.language, l.occurrences as count`;

async function morphLabels(codes: string[]): Promise<Map<string, string>> {
  const parts = [...new Set(codes.flatMap(morphParts))];
  if (!parts.length) return new Map();
  const rows = await sql<{ code: string; label: string }[]>`
    select code, label from morphology_code where code = any(${parts})`;
  return new Map(rows.map((r) => [r.code, r.label]));
}

export async function getVerse(osis: string): Promise<VerseView | null> {
  const [v] = await sql<
    { id: number; osis: string; book: string; name: string; chapter: number; verse: number; testament: string; chapters: number }[]
  >`select v.id, v.osis, v.book_id as book, b.name, v.chapter, v.verse, b.testament, b.chapters
    from verse v join book b on b.id = v.book_id where v.osis = ${osis}`;
  if (!v) return null;
  const [translations, tokens, heb, nav, count] = await Promise.all([
    sql<{ id: string; name: string; text: string }[]>`
      select t.id, t.name, tv.text from translation_verse tv join translation t on t.id = tv.translation_id
      where tv.verse_id = ${v.id} order by t.ord`,
    sql<Omit<TokenView, "morphLabel">[]>`
      select t.pos, t.surface, coalesce(t.translit, '') as translit, coalesce(t.gloss, '') as gloss,
             t.lemma_id as "lemmaId", l.lemma, l.gloss as "lemmaGloss", coalesce(t.morph, '') as morph,
             t.src_ref as "srcRef", t.editions
      from token t left join lemma l on l.id = t.lemma_id where t.verse_id = ${v.id} order by t.pos`,
    sql<{ source_ref: string }[]>`
      select source_ref from versification_map where verse_id = ${v.id} and scheme = 'heb' order by source_ref limit 1`,
    sql<{ id: number; osis: string }[]>`select id, osis from verse where id in (${v.id - 1}, ${v.id + 1})`,
    getChapterVerseCount(v.book, v.chapter),
  ]);
  const labels = await morphLabels(tokens.map((t) => t.morph));
  const isNT = v.testament === "NT";
  let textNote: VerseView["textNote"] = null;
  if (isNT && tokens.length === 0) textNote = "not-in-sblgnt";
  else if (isNT && tokens.some((t) => t.editions && !t.editions.split("+").includes("SBL"))) textNote = "na28-fallback";
  return {
    osis: v.osis,
    book: v.book,
    bookName: v.name,
    chapter: v.chapter,
    verse: v.verse,
    bookChapters: v.chapters,
    chapterVerses: count,
    language: isNT ? "grc" : "heb",
    translations: [...translations],
    tokens: tokens.map((t) => ({
      ...t,
      morphLabel: morphParts(t.morph)
        .map((p) => labels.get(p))
        .filter(Boolean)
        .join(" + "),
    })),
    hebRef: heb[0]?.source_ref,
    prev: nav.find((n) => n.id === v.id - 1)?.osis,
    next: nav.find((n) => n.id === v.id + 1)?.osis,
    textNote,
  };
}

export async function getChapterVerseCount(book: string, chapter: number): Promise<number> {
  const [r] = await sql<{ n: number }[]>`
    select count(*)::int as n from verse where book_id = ${book} and chapter = ${chapter}`;
  return r.n;
}

export async function getBookChapters(book: string): Promise<number> {
  const [r] = await sql<{ chapters: number }[]>`select chapters from book where id = ${book}`;
  return r?.chapters ?? 0;
}

export async function getLemma(id: string): Promise<LemmaView | null> {
  const [l] = await sql<
    (Omit<LemmaView, "lexicon" | "root" | "senses" | "distribution" | "glosses" | "sourceAttribution" | "count"> & {
      count: number;
      root_id: string | null;
      attribution: string;
    })[]
  >`select l.id, l.strongs, l.language, l.lemma, coalesce(l.translit, '') as translit, coalesce(l.pos, '') as pos,
       coalesce(l.gloss, '') as gloss, l.occurrences as count, l.root_id, s.attribution
    from lemma l join source s on s.id = l.source_id where l.id = ${id}`;
  if (!l) return null;
  const [lexicon, root, family, senses, distribution, glosses] = await Promise.all([
    sql<{ source: string; sourceId: string; attribution: string; html: string }[]>`
      select s.name as source, s.id as "sourceId", s.attribution, e.body_html as html
      from lexicon_entry e join source s on s.id = e.source_id where e.lemma_id = ${id}`,
    l.root_id
      ? sql<{ id: string; letters: string; gloss: string | null }[]>`select id, letters, gloss from root where id = ${l.root_id}`
      : Promise.resolve([]),
    l.root_id
      ? sql<LemmaRef[]>`select ${lemmaRefCols} from lemma l where l.root_id = ${l.root_id} and l.id <> ${id}
          order by l.occurrences desc limit 40`
      : Promise.resolve([] as LemmaRef[]),
    sql<LemmaRef[]>`select ${lemmaRefCols} from lemma l where l.strongs = ${l.strongs} and l.id <> ${id} order by l.id`,
    sql<{ book: string; name: string; count: number }[]>`
      select b.id as book, b.name, count(*)::int as count from token t
      join verse v on v.id = t.verse_id join book b on b.id = v.book_id
      where t.lemma_id = ${id} group by b.id, b.name, b.ord order by b.ord`,
    sql<{ gloss: string; count: number }[]>`
      select lower(trim(gloss)) as gloss, count(*)::int as count from token
      where lemma_id = ${id} and coalesce(gloss, '') <> '' group by 1 order by 2 desc limit 12`,
  ]);
  return {
    id: l.id,
    strongs: l.strongs,
    language: l.language,
    lemma: l.lemma,
    translit: l.translit,
    pos: l.pos,
    gloss: l.gloss,
    count: l.count,
    lexicon: lexicon.map((e) => ({ ...e, html: sanitizeLexicon(e.html) })),
    root: root[0] ? { ...root[0], family: [...family] } : null,
    senses: [...senses],
    distribution: [...distribution],
    glosses: [...glosses],
    sourceAttribution: l.attribution,
  };
}

export async function getOccurrences(
  lemmaId: string,
  page: number,
  pageSize = 50,
): Promise<{ total: number; rows: { osis: string; surface: string; gloss: string; kjv: string }[] }> {
  const [{ total }] = await sql<{ total: number }[]>`
    select count(*)::int as total from token where lemma_id = ${lemmaId}`;
  const rows = await sql<{ osis: string; surface: string; gloss: string; kjv: string }[]>`
    select v.osis, t.surface, coalesce(t.gloss, '') as gloss, coalesce(tv.text, '') as kjv
    from token t join verse v on v.id = t.verse_id
    left join translation_verse tv on tv.verse_id = v.id and tv.translation_id = 'kjv'
    where t.lemma_id = ${lemmaId} order by v.id, t.pos
    limit ${pageSize} offset ${page * pageSize}`;
  return { total, rows: [...rows] };
}

export async function searchLemmas(q: Query, limit = 24): Promise<LemmaRef[]> {
  switch (q.kind) {
    case "strongs": {
      const rows = await sql<LemmaRef[]>`select ${lemmaRefCols} from lemma l
        where l.id = any(${q.candidates}) or l.strongs = any(${q.candidates})
        order by l.occurrences desc, l.id limit ${limit}`;
      return [...rows];
    }
    case "hebrew":
    case "greek": {
      const lang = q.kind === "hebrew" ? ["heb", "arc"] : ["grc"];
      const rows = await sql<LemmaRef[]>`select ${lemmaRefCols} from lemma l
        where l.language = any(${lang}) and (l.lemma_plain = ${q.plain} or l.lemma_plain % ${q.plain})
        order by (l.lemma_plain = ${q.plain}) desc, similarity(l.lemma_plain, ${q.plain}) desc, l.occurrences desc
        limit ${limit}`;
      return [...rows];
    }
    case "text": {
      const word = q.raw.toLowerCase();
      const rows = await sql<LemmaRef[]>`select ${lemmaRefCols} from lemma l
        where l.translit_key = ${q.translitKey}
           or (length(${q.translitKey}) >= 4 and l.translit_key % ${q.translitKey})
           or fold(l.gloss) = fold(${word})
           or fold(l.gloss) like fold(${word}) || '%'
           or fold(l.gloss) like '% ' || fold(${word}) || '%'
        order by
          (l.translit_key = ${q.translitKey}) desc,
          case when l.translit_key = ${q.translitKey} then l.occurrences end desc nulls last,
          (fold(l.gloss) = fold(${word})) desc,
          similarity(coalesce(l.translit_key, ''), ${q.translitKey}) desc,
          l.occurrences desc
        limit ${limit}`;
      return [...rows];
    }
    default:
      return [];
  }
}

export async function searchText(
  raw: string,
  limit = 20,
): Promise<{ osis: string; translation: string; snippet: string }[]> {
  const rows = await sql<{ osis: string; translation: string; snippet: string }[]>`
    select distinct on (v.id) v.osis, t.name as translation,
      ts_headline('english', tv.text, websearch_to_tsquery('english', ${raw}),
        'StartSel=<mark>,StopSel=</mark>,MaxWords=30,MinWords=12') as snippet
    from translation_verse tv
    join verse v on v.id = tv.verse_id join translation t on t.id = tv.translation_id
    where to_tsvector('english', tv.text) @@ websearch_to_tsquery('english', ${raw})
      and tv.translation_id in ('kjv', 'bsb', 'web')
    order by v.id, t.ord
    limit ${limit}`;
  return [...rows];
}

export async function listSources(): Promise<
  { id: string; name: string; license: string; attribution: string; url: string; version: string | null }[]
> {
  const rows = await sql<
    { id: string; name: string; license: string; attribution: string; url: string; version: string | null }[]
  >`select id, name, license, attribution, url, version from source order by license, name`;
  return [...rows];
}
