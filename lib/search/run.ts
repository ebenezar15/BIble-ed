import "server-only";
import { BOOK_BY_ID, formatRef } from "@/lib/books";
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
      const [lemmas, verses] = await Promise.all([searchLemmas(query, 12), searchText(query.raw, 20)]);
      const groups: SearchGroup[] = [];
      if (lemmas.length) groups.push({ module: "Words", items: lemmas.map(lemmaItem) });
      if (verses.length) {
        groups.push({
          module: "Verses",
          items: verses.map((v) => ({ href: `/verse/${v.osis}`, title: formatRef(v.osis), subtitle: v.snippet })),
        });
      }
      return { query, groups };
    }
  }
}
