import "server-only";
import { BOOK_BY_ID, BOOKS, bookKey, formatRef } from "@/lib/books";
import { getBookChapters, getChapterVerseCount, searchLemmas, searchText, type LemmaRef } from "@/lib/db/queries";
import { parseQuery, type Query } from "./parse";

export type SearchItem = {
  href: string;
  title: string;
  subtitle: string;
  lang?: "he" | "grc";
  translit?: string;
  tag?: string; // Strong's id
  count?: number;
};
export type SearchGroup = { module: "Words" | "Verses" | "Topics"; items: SearchItem[] };
export type SearchResult = { query: Query; redirect?: string; groups: SearchGroup[]; notice?: string };

export function lemmaItem(l: LemmaRef): SearchItem {
  return {
    href: `/word/${l.id}`,
    title: l.lemma,
    subtitle: l.gloss,
    translit: l.translit,
    tag: l.id,
    count: l.count,
    lang: l.language === "grc" ? "grc" : "he",
  };
}

const REFERENCE_SHAPE = /^((?:[123]\s*)?[a-z][a-z\s]*?)\s*\d+(?:\s*[:.\s]\s*\d+)?(?:\s*[-–—]\s*\d+)?$/i;

function distance(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length];
}

/** Book names closest to what was typed, for "did you mean". */
export function similarBooks(name: string, limit = 3): string[] {
  const key = bookKey(name);
  return BOOKS.map((b) => ({ b, d: Math.min(...[b.name, ...b.abbrevs].map((a) => distance(key, bookKey(a)))) }))
    .filter((x) => x.d <= Math.max(2, Math.floor(key.length / 3)))
    .sort((x, y) => x.d - y.d || x.b.ord - y.b.ord)
    .slice(0, limit)
    .map((x) => x.b.name);
}

async function resolveReference(q: Extract<Query, { kind: "reference" }>): Promise<SearchResult> {
  const book = BOOK_BY_ID.get(q.book)!;
  const chapters = await getBookChapters(q.book);
  if (q.chapter < 1 || q.chapter > chapters) {
    const last = `${q.book}.${chapters}.1`;
    return {
      query: q,
      notice: `No such verse: ${book.name} has ${chapters} chapter${chapters === 1 ? "" : "s"}.`,
      groups: [{ module: "Verses", items: [{ href: `/verse/${last}`, title: formatRef(last), subtitle: "Last chapter" }] }],
    };
  }
  const verses = await getChapterVerseCount(q.book, q.chapter);
  const verse = q.verse ?? 1;
  if (verse < 1 || verse > verses) {
    const last = `${q.book}.${q.chapter}.${verses}`;
    return {
      query: q,
      notice: `No such verse: ${book.name} ${q.chapter} has ${verses} verses.`,
      groups: [{ module: "Verses", items: [{ href: `/verse/${last}`, title: formatRef(last), subtitle: "Last verse" }] }],
    };
  }
  return { query: q, redirect: `/verse/${q.book}.${q.chapter}.${verse}`, groups: [] };
}

export async function runSearch(input: string): Promise<SearchResult> {
  const query = parseQuery(input);
  switch (query.kind) {
    case "empty":
      return { query, groups: [] };
    case "reference":
      return resolveReference(query);
    case "strongs": {
      const lemmas = await searchLemmas(query);
      if (lemmas.length === 1) return { query, redirect: `/word/${lemmas[0].id}`, groups: [] };
      return {
        query,
        groups: lemmas.length ? [{ module: "Words", items: lemmas.map(lemmaItem) }] : [],
        notice: lemmas.length ? undefined : `No Strong's entry ${query.candidates.join(" or ")}.`,
      };
    }
    case "hebrew":
    case "greek": {
      const lemmas = await searchLemmas(query);
      return { query, groups: lemmas.length ? [{ module: "Words", items: lemmas.map(lemmaItem) }] : [] };
    }
    case "text": {
      const shape = query.raw.match(REFERENCE_SHAPE);
      let notice: string | undefined;
      let textQuery = query.raw;
      if (shape) {
        const name = shape[1].trim();
        const near = similarBooks(name);
        notice = `No book called “${name}”.` + (near.length ? ` Did you mean ${near.join(", ")}?` : "");
        textQuery = name;
      }
      const [lemmas, verses] = await Promise.all([
        searchLemmas(shape ? { ...query, raw: textQuery } : query, 12),
        searchText(textQuery, 20),
      ]);
      const groups: SearchGroup[] = [];
      if (lemmas.length) groups.push({ module: "Words", items: lemmas.map(lemmaItem) });
      if (verses.length) {
        groups.push({
          module: "Verses",
          items: verses.map((v) => ({ href: `/verse/${v.osis}`, title: formatRef(v.osis), subtitle: v.snippet })),
        });
      }
      return { query, groups, notice };
    }
  }
}
