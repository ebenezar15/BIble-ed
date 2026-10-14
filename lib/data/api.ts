// The library's read API over the static data files in public/data. The same functions run at build time
// (reading files from disk, for pre-rendered pages) and in the browser (fetching them).
import { renderMarkdown } from "@/lib/content/markdown";
import { entryHref, KIND_LABEL } from "@/lib/content/routes";
import { groupGlosses } from "@/lib/db/gloss";
import { sanitizeLexicon } from "@/lib/db/lexhtml";
import { morphParts } from "@/lib/db/morph";
import { fold, highlight, parseTextQuery, rankText, similarity, SIMILAR } from "@/lib/search/match";
import type { Query } from "@/lib/search/parse";
import type {
  BlockText, BlockView, EntrySummary, EntryView, FatherComment, LemmaRef, LemmaView, Meta, NameSummary, NameView,
  PersonSummary, PersonView, Source, TokenView, VerseView, Work,
} from "./types";

/** Reads one data file (path relative to public/data); null when it does not exist. */
export type Loader = <T>(path: string) => Promise<T | null>;

type RawBlock = Omit<BlockView, "bodyHtml" | "needsSource">;
type RawToken = [string, string, string, string | null, string | null, string | null, string, string, string | null];
type RawVerse = {
  id: number; v: number; osis: string; heb: string | null; tr: Record<string, string>; tok: RawToken[];
  x: [string, string, number, string | null][]; rel: string[]; blocks: RawBlock[];
};
type RawChapter = {
  book: string; chapter: number; verses: RawVerse[];
  entries: Record<string, { kind: string; slug: string; title: string; summary: string | null }>;
};
type RawLemmaRow = [string, string, string, string, string, number, string, string, string];
type RawFather = [number, string, string, string | null, string | null, number | null, number, number];
/** fx/docs.json row: comment id, father, year, first verse, source title, number of index terms. */
type FxDoc = [number, string, number | null, string, string | null, number];

export type FatherHit = { id: number; father: string; year: number | null; osis: string; sourceTitle: string | null; snippet: string; quote: string };

const shardOf = (term: string) => (/^[a-z0-9]{1,2}$/.test(term.slice(0, 2)) ? term.slice(0, 2) : "_");

export function toBlockView(b: RawBlock): BlockView {
  return {
    ...b,
    bodyHtml: renderMarkdown(b.bodyMd),
    needsSource: b.type === "scholarly_interpretation" && b.citations.length === 0,
  };
}

const lemmaRef = (r: RawLemmaRow): LemmaRef => ({ id: r[0], lemma: r[1], translit: r[2], gloss: r[3], language: r[4], count: r[5] });

/** "Jhn.3.16" → ["Jhn", 3, 16]; null when malformed. */
export function splitOsis(osis: string): [string, number, number] | null {
  const m = osis.match(/^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/);
  return m ? [m[1], Number(m[2]), Number(m[3])] : null;
}

export function makeApi(load: Loader) {
  const must = async <T,>(path: string): Promise<T> => {
    const v = await load<T>(path);
    if (v === null) throw new Error(`Missing data file ${path}`);
    return v;
  };
  const meta = () => must<Meta>("meta.json");
  const morph = () => must<Record<string, string>>("morph.json");
  const lemmaRows = () => must<RawLemmaRow[]>("lemmas.json");
  const entries = () => must<EntrySummary[]>("entries.json");
  const chapter = (book: string, ch: number) => load<RawChapter>(`ch/${book}.${ch}.json`);

  let kjvMap: Promise<Map<string, string>> | null = null;
  const kjv = () =>
    (kjvMap ??= must<[string, string][]>("text/kjv.json").then((rows) => new Map(rows)));

  async function bookMeta(book: string) {
    return (await meta()).books.find((b) => b.id === book) ?? null;
  }

  /** Neighbouring verse in canonical order, crossing chapter and book boundaries. */
  async function neighbour(osis: string, step: 1 | -1): Promise<string | undefined> {
    const parts = splitOsis(osis);
    if (!parts) return undefined;
    const { books } = await meta();
    let bi = books.findIndex((b) => b.id === parts[0]);
    let [, c, v] = parts;
    v += step;
    for (;;) {
      const b = books[bi];
      if (!b) return undefined;
      if (v >= 1 && v <= (b.verses[c - 1] ?? 0)) return `${b.id}.${c}.${v}`;
      if (step > 0) {
        c += 1;
        v = 1;
        if (c > b.chapters) (bi += 1, (c = 1));
      } else {
        c -= 1;
        if (c < 1) {
          bi -= 1;
          if (!books[bi]) return undefined;
          c = books[bi].chapters;
        }
        v = books[bi].verses[c - 1];
      }
    }
  }

  async function getVerse(osis: string): Promise<VerseView | null> {
    const parts = splitOsis(osis);
    if (!parts) return null;
    const [book, ch, vn] = parts;
    const [bm, data, m, labels] = await Promise.all([bookMeta(book), chapter(book, ch), meta(), morph()]);
    const raw = data?.verses.find((x) => x.v === vn);
    if (!bm || !data || !raw) return null;
    const isNT = bm.testament === "NT";
    const tokens: TokenView[] = raw.tok.map((t, i) => ({
      pos: i + 1, surface: t[0], translit: t[1], gloss: t[2], lemmaId: t[3], lemma: t[4], lemmaGloss: t[5],
      morph: t[6], srcRef: t[7], editions: t[8],
      morphLabel: morphParts(t[6]).map((p) => labels[p]).filter(Boolean).join(" + "),
    }));
    let textNote: VerseView["textNote"] = null;
    if (isNT && tokens.length === 0) textNote = "not-in-sblgnt";
    else if (isNT && tokens.some((t) => t.editions && !t.editions.split("+").includes("SBL"))) textNote = "na28-fallback";
    const [prev, next] = await Promise.all([neighbour(raw.osis, -1), neighbour(raw.osis, 1)]);
    return {
      id: raw.id,
      osis: raw.osis,
      book,
      bookName: bm.name,
      chapter: ch,
      verse: vn,
      bookChapters: bm.chapters,
      chapterVerses: bm.verses[ch - 1],
      language: isNT ? "grc" : "heb",
      translations: m.translations.filter((t) => raw.tr[t.id]).map((t) => ({ ...t, text: raw.tr[t.id] })),
      tokens,
      hebRef: raw.heb ?? undefined,
      prev,
      next,
      textNote,
      xrefs: raw.x.map(([start, end, votes, text]) => ({ start, end, votes, text })),
      related: raw.rel
        .map((k) => data.entries[k])
        .filter(Boolean)
        .map((e) => ({ ...e, href: entryHref(e.kind, e.slug), label: KIND_LABEL[e.kind] ?? e.kind })),
      blocks: raw.blocks.map(toBlockView),
    };
  }

  async function getFatherComments(osis: string, limit = 40): Promise<FatherComment[]> {
    const parts = splitOsis(osis);
    if (!parts) return [];
    const [data, rows] = await Promise.all([chapter(parts[0], parts[1]), load<RawFather[]>(`fa/${parts[0]}.${parts[1]}.json`)]);
    const id = data?.verses.find((v) => v.v === parts[2])?.id;
    if (!id || !rows) return [];
    return rows
      .filter((r) => r[6] <= id && id <= r[7])
      .slice(0, limit)
      .map(([cid, father, quote, sourceTitle, sourceUrl, year]) => ({ id: cid, father, quote, sourceTitle, sourceUrl, year }));
  }

  async function getLemma(id: string): Promise<LemmaView | null> {
    const raw = await load<Omit<LemmaView, "blocks"> & { blocks: RawBlock[] }>(`lemma/${id}.json`);
    if (!raw) return null;
    return {
      ...raw,
      lexicon: raw.lexicon.map((e) => ({ ...e, html: sanitizeLexicon(e.html) })),
      glosses: groupGlosses(raw.glosses),
      blocks: raw.blocks.map(toBlockView),
    };
  }

  async function getOccurrences(lemmaId: string, page: number, pageSize = 50, book?: string) {
    const all = (await load<[string, string, string][]>(`occ/${lemmaId}.json`)) ?? [];
    const rows = book ? all.filter((r) => r[0].startsWith(`${book}.`)) : all;
    const slice = rows.slice(page * pageSize, (page + 1) * pageSize);
    const text = slice.length ? await kjv() : new Map<string, string>();
    return {
      total: rows.length,
      rows: slice.map(([osis, surface, gloss]) => ({ osis, surface, gloss, kjv: text.get(osis) ?? "" })),
    };
  }

  async function searchLemmas(q: Query, limit = 24): Promise<LemmaRef[]> {
    const rows = await lemmaRows();
    if (q.kind === "strongs") {
      return rows
        .filter((r) => q.candidates.includes(r[0]) || q.candidates.includes(r[6]))
        .sort((a, b) => b[5] - a[5] || a[0].localeCompare(b[0]))
        .slice(0, limit)
        .map(lemmaRef);
    }
    if (q.kind === "hebrew" || q.kind === "greek") {
      const langs = q.kind === "hebrew" ? ["heb", "arc"] : ["grc"];
      return rows
        .filter((r) => langs.includes(r[4]))
        .map((r) => ({ r, exact: r[7] === q.plain, sim: similarity(r[7], q.plain) }))
        .filter((x) => x.exact || x.sim >= SIMILAR)
        .sort((a, b) => Number(b.exact) - Number(a.exact) || b.sim - a.sim || b.r[5] - a.r[5])
        .slice(0, limit)
        .map((x) => lemmaRef(x.r));
    }
    if (q.kind === "text") {
      const key = q.translitKey;
      const word = fold(q.raw);
      if (!word) return [];
      return rows
        .map((r) => {
          const gloss = fold(r[3]);
          const keyExact = r[8] === key;
          const sim = key ? similarity(r[8], key) : 0;
          const glossExact = gloss === word;
          const hit =
            keyExact || (key.length >= 4 && sim >= SIMILAR) || glossExact || gloss.startsWith(word) || gloss.includes(` ${word}`);
          return { r, keyExact, sim, glossExact, hit };
        })
        .filter((x) => x.hit)
        .sort(
          (a, b) =>
            Number(b.keyExact) - Number(a.keyExact) ||
            (a.keyExact && b.keyExact ? b.r[5] - a.r[5] : 0) ||
            Number(b.glossExact) - Number(a.glossExact) ||
            b.sim - a.sim ||
            b.r[5] - a.r[5],
        )
        .slice(0, limit)
        .map((x) => lemmaRef(x.r));
    }
    return [];
  }

  async function lemmaRefs(ids: string[]): Promise<LemmaRef[]> {
    const want = new Set(ids);
    return (await lemmaRows()).filter((r) => want.has(r[0])).map(lemmaRef);
  }

  const textCache = new Map<string, Promise<[string, string][]>>();
  const translationText = (id: string) => {
    if (!textCache.has(id)) textCache.set(id, must<[string, string][]>(`text/${id}.json`));
    return textCache.get(id)!;
  };

  /** Verses matching the words, in KJV, BSB or WEB; the snippet is escaped HTML with <mark> around hits. */
  async function searchText(raw: string, limit = 20): Promise<{ osis: string; translation: string; snippet: string }[]> {
    const q = parseTextQuery(raw);
    if (!q) return [];
    const order = ["kjv", "bsb", "web"];
    const [m, ...texts] = await Promise.all([meta(), ...order.map(translationText)]);
    const best = new Map<string, { osis: string; translation: string; text: string; rank: number; ord: number }>();
    texts.forEach((rows, ord) => {
      for (const [osis, text] of rows) {
        if (best.has(osis)) continue;
        const rank = rankText(q, text);
        if (rank > 0) best.set(osis, { osis, translation: order[ord], text, rank, ord });
      }
    });
    const name = (id: string) => m.translations.find((t) => t.id === id)?.name ?? id;
    const verseOrder = new Map<string, number>();
    let i = 0;
    for (const [osis] of texts[0]) verseOrder.set(osis, i++);
    return [...best.values()]
      .sort((a, b) => b.rank - a.rank || (verseOrder.get(a.osis) ?? 0) - (verseOrder.get(b.osis) ?? 0))
      .slice(0, limit)
      .map((h) => ({ osis: h.osis, translation: name(h.translation), snippet: highlight(h.text, q) }));
  }

  const blockTexts = () => must<BlockText[]>("search/blocks.json");

  async function searchContent(raw: string, limit = 20) {
    const q = parseTextQuery(raw);
    if (!q) return [];
    const [list, blocks] = await Promise.all([entries(), blockTexts()]);
    const score = new Map<string, number>();
    const add = (key: string, r: number) => r > 0 && score.set(key, Math.max(score.get(key) ?? 0, r));
    for (const e of list) add(`${e.kind}/${e.slug}`, rankText(q, `${e.title} ${e.subtitle ?? ""} ${e.summary ?? ""}`) * 2);
    for (const b of blocks) if (b.kind === "entry") add(b.id, rankText(q, `${b.title ?? ""} ${b.body}`));
    const byKey = new Map(list.map((e) => [`${e.kind}/${e.slug}`, e]));
    return [...score]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key]) => byKey.get(key))
      .filter((e): e is EntrySummary => Boolean(e))
      .map((e) => ({ href: entryHref(e.kind, e.slug), title: e.title, subtitle: e.summary ?? "", label: KIND_LABEL[e.kind] ?? e.kind }));
  }

  const fatherDocs = () => must<FxDoc[]>("fx/docs.json");

  /** Full-text search of the Church Fathers through the term index; snippets come from the chapter files. */
  async function searchFathers(raw: string, limit = 40): Promise<FatherHit[]> {
    const q = parseTextQuery(raw);
    if (!q) return [];
    const terms = new Set<string>();
    for (const c of q.clauses) [...c.all.flat(), ...c.none].forEach((t) => terms.add(t));
    const shards = new Map<string, Record<string, number[]>>();
    await Promise.all(
      [...new Set([...terms].map(shardOf))].map(async (k) => shards.set(k, (await load<Record<string, number[]>>(`fx/${k}.json`)) ?? {})),
    );
    const postings = (t: string) => {
      const flat = shards.get(shardOf(t))?.[t] ?? [];
      const m = new Map<number, number>();
      for (let i = 0; i < flat.length; i += 2) m.set(flat[i], flat[i + 1]);
      return m;
    };
    const docs = await fatherDocs();
    const scores = new Map<number, number>();
    for (const c of q.clauses) {
      const need = [...new Set(c.all.flat())].map(postings);
      const not = c.none.map(postings);
      const [first, ...rest] = need.sort((a, b) => a.size - b.size);
      for (const [doc, tf] of first ?? []) {
        if (!rest.every((m) => m.has(doc)) || not.some((m) => m.has(doc))) continue;
        const hits = rest.reduce((sum, m) => sum + (m.get(doc) ?? 0), tf);
        const score = hits / Math.log2((docs[doc]?.[5] ?? 0) + 2);
        scores.set(doc, Math.max(scores.get(doc) ?? 0, score));
      }
    }
    const top = [...scores].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([doc]) => docs[doc]);
    const files = new Map<string, Promise<RawFather[] | null>>();
    const chapterOf = (osis: string) => osis.split(".").slice(0, 2).join(".");
    for (const d of top) if (!files.has(chapterOf(d[3]))) files.set(chapterOf(d[3]), load<RawFather[]>(`fa/${chapterOf(d[3])}.json`));
    return Promise.all(
      top.map(async ([id, father, year, osis, sourceTitle]) => {
        const quote = (await files.get(chapterOf(osis)))?.find((r) => r[0] === id)?.[2] ?? "";
        return { id, father, year, osis, sourceTitle, quote, snippet: highlight(quote, q, 40) };
      }),
    );
  }

  const nameIndex = () =>
    must<[string, string, string, string | null, number][]>("names/index.json").then((rows) =>
      rows.map(([id, name, kind, brief, refCount]): NameSummary => ({ id, name, kind, brief, refCount })),
    );

  async function searchNames(q: string, limit = 40): Promise<NameSummary[]> {
    const want = fold(q.trim());
    if (!want) return (await nameIndex()).slice(0, limit);
    return (await nameIndex())
      .map((n) => {
        const f = fold(n.name);
        return { n, exact: f === want, hit: f.startsWith(want) || similarity(f, want) >= SIMILAR };
      })
      .filter((x) => x.hit)
      .sort((a, b) => Number(b.exact) - Number(a.exact) || b.n.refCount - a.n.refCount)
      .slice(0, limit)
      .map((x) => x.n);
  }

  async function getName(id: string): Promise<NameView | null> {
    const c = id[0]?.toUpperCase() ?? "_";
    const bucket = await load<Record<string, NameView>>(`names/${c >= "A" && c <= "Z" ? c : "_"}.json`);
    const n = bucket?.[id];
    return n ? { ...n, lemmas: n.lemmas.map((l) => ({ ...l, meaning: l.meaning ? sanitizeLexicon(l.meaning) : null })) } : null;
  }

  async function getEntry(kind: string, slug: string): Promise<EntryView | null> {
    if (!/^[a-z_]+$/.test(kind) || !/^[a-z0-9-]+$/.test(slug)) return null;
    const raw = await load<Omit<EntryView, "blocks"> & { blocks: RawBlock[] }>(`entry/${kind}/${slug}.json`);
    return raw ? { ...raw, blocks: raw.blocks.map(toBlockView) } : null;
  }

  async function listEntries(kind: string): Promise<EntrySummary[]> {
    return (await entries())
      .filter((e) => e.kind === kind)
      .sort((a, b) => a.ord - b.ord || a.title.localeCompare(b.title));
  }

  async function getPerson(id: string): Promise<PersonView | null> {
    if (!/^[a-z0-9-]+$/.test(id)) return null;
    const raw = await load<Omit<PersonView, "blocks"> & { blocks: RawBlock[] }>(`person/${id}.json`);
    return raw ? { ...raw, blocks: raw.blocks.map(toBlockView) } : null;
  }

  const listPeople = () => must<(PersonSummary & { blockCount: number })[]>("people.json");
  const listWorks = () => must<Work[]>("works.json");
  const listSources = () => must<Source[]>("sources.json");

  /** The library's blocks about one subject (lemma:H2617A, verse:Jhn.3.16, person:irenaeus, entry:parable/slug). */
  async function getBlocks(subject: string): Promise<BlockView[]> {
    const i = subject.indexOf(":");
    const [kind, id] = [subject.slice(0, i), subject.slice(i + 1)];
    if (kind === "lemma") return (await getLemma(id))?.blocks ?? [];
    if (kind === "verse") {
      const parts = splitOsis(id);
      const raw = parts && (await chapter(parts[0], parts[1]))?.verses.find((v) => v.v === parts[2]);
      return raw ? raw.blocks.map(toBlockView) : [];
    }
    if (kind === "person") return (await getPerson(id))?.blocks ?? [];
    if (kind === "entry") {
      const [k, slug] = id.split("/");
      return (slug && (await getEntry(k, slug))?.blocks) || [];
    }
    return [];
  }

  async function englishForHebrew(hebRef: string): Promise<string | null> {
    return (await meta()).hebMap[hebRef] ?? null;
  }

  async function getBookChapters(book: string): Promise<number> {
    return (await bookMeta(book))?.chapters ?? 0;
  }

  async function getChapterVerseCount(book: string, ch: number): Promise<number> {
    return (await bookMeta(book))?.verses[ch - 1] ?? 0;
  }

  return {
    meta, getVerse, getFatherComments, getLemma, getOccurrences, searchLemmas, lemmaRefs, searchText, searchContent,
    searchNames, getName, searchFathers, fatherDocs, getEntry, listEntries, getPerson, listPeople, listWorks, listSources, getBlocks,
    englishForHebrew, getBookChapters, getChapterVerseCount, blockTexts, translationText, lemmaRows,
  };
}

export type Api = ReturnType<typeof makeApi>;

