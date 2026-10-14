import { verseHref, wordHref, nameHref } from "@/lib/href";
import { BOOK_BY_ID, BOOKS, bookKey, formatRef } from "@/lib/books";
import type { Api } from "@/lib/data/api";
import type { LemmaRef } from "@/lib/data/types";
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
export type SearchGroup = { module: "Words" | "Verses" | "Topics" | "Names"; items: SearchItem[] };
export type SearchResult = { query: Query; redirect?: string; groups: SearchGroup[]; notice?: string };

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function lemmaItem(l: LemmaRef): SearchItem {
  return {
    href: wordHref(l.id),
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

async function resolveReference(api: Api, q: Extract<Query, { kind: "reference" }>): Promise<SearchResult> {
  const book = BOOK_BY_ID.get(q.book)!;
  const chapters = await api.getBookChapters(q.book);
  const verses0 = q.chapter >= 1 && q.chapter <= chapters ? await api.getChapterVerseCount(q.book, q.chapter) : 0;
  if (!verses0 || (q.verse ?? 1) > verses0) {
    // Perhaps it was written in Hebrew numbering (Mal 3:19, Joel 4:1).
    const english = await api.englishForHebrew(`${q.book}.${q.chapter}.${q.verse ?? 1}`);
    if (english) return { query: q, redirect: verseHref(english), groups: [] };
  }
  if (q.chapter < 1 || q.chapter > chapters) {
    const last = `${q.book}.${chapters}.1`;
    return {
      query: q,
      notice: `No such verse: ${book.name} has ${chapters} chapter${chapters === 1 ? "" : "s"}.`,
      groups: [{ module: "Verses", items: [{ href: verseHref(last), title: formatRef(last), subtitle: "Last chapter" }] }],
    };
  }
  const verses = await api.getChapterVerseCount(q.book, q.chapter);
  const verse = q.verse ?? 1;
  if (verse < 1 || verse > verses) {
    const last = `${q.book}.${q.chapter}.${verses}`;
    return {
      query: q,
      notice: `No such verse: ${book.name} ${q.chapter} has ${verses} verses.`,
      groups: [{ module: "Verses", items: [{ href: verseHref(last), title: formatRef(last), subtitle: "Last verse" }] }],
    };
  }
  return { query: q, redirect: verseHref(`${q.book}.${q.chapter}.${verse}`), groups: [] };
}

/** verses: false skips the Bible-text search (it downloads the full text), for as-you-type suggestions. */
export async function runSearch(api: Api, input: string, opts: { verses?: boolean } = {}): Promise<SearchResult> {
  const query = parseQuery(input);
  switch (query.kind) {
    case "empty":
      return { query, groups: [] };
    case "reference":
      return resolveReference(api, query);
    case "strongs": {
      const lemmas = await api.searchLemmas(query);
      if (lemmas.length === 1) return { query, redirect: wordHref(lemmas[0].id), groups: [] };
      return {
        query,
        groups: lemmas.length ? [{ module: "Words", items: lemmas.map(lemmaItem) }] : [],
        notice: lemmas.length ? undefined : `No Strong's entry ${query.candidates.join(" or ")}.`,
      };
    }
    case "hebrew":
    case "greek": {
      const lemmas = await api.searchLemmas(query);
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
      const [lemmas, verses, topics, names] = await Promise.all([
        api.searchLemmas(shape ? { ...query, raw: textQuery } : query, 12),
        opts.verses === false ? Promise.resolve([]) : api.searchText(textQuery, 20),
        api.searchContent(textQuery, 12),
        api.searchNames(textQuery, 6),
      ]);
      const groups: SearchGroup[] = [];
      if (topics.length) {
        groups.push({ module: "Topics", items: topics.map((t) => ({ href: t.href, title: t.title, subtitle: escapeHtml(t.subtitle), tag: t.label })) });
      }
      if (lemmas.length) groups.push({ module: "Words", items: lemmas.map(lemmaItem) });
      const exactNames = names.filter((n) => n.name.toLowerCase() === textQuery.toLowerCase() || names.length <= 3);
      if (exactNames.length) {
        groups.push({
          module: "Names",
          items: exactNames.map((n) => ({
            href: nameHref(n.id),
            title: n.name,
            subtitle: escapeHtml(n.brief ?? ""),
            tag: `${n.kind}, ${n.refCount} refs`,
          })),
        });
      }
      if (verses.length) {
        groups.push({
          module: "Verses",
          items: verses.map((v) => ({ href: verseHref(v.osis), title: formatRef(v.osis), subtitle: v.snippet })),
        });
      }
      return { query, groups, notice };
    }
  }
}
