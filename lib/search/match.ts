// In-browser text matching that stands in for the database's full-text search and trigram similarity.

const STOP = new Set(
  ("a an and are as at be but by for from had has have he her hers him his i if in into is it its me my no nor not " +
    "of on or our she so such than that the their them then there these they this those to was we were what when " +
    "which who whom will with would you your").split(" "),
);

/** Lower-case and strip accents (the database's fold()). */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** A light English stemmer, so love, loved, loveth and loving meet. */
export function stem(word: string): string {
  let w = fold(word).replace(/['’]s$/, "").replace(/['’]/g, "");
  if (w.length >= 7 && w.endsWith("ness")) w = w.slice(0, -4);
  for (const suffix of ["eth", "est", "ing", "ed", "es", "ly", "s"]) {
    if (w.length - suffix.length >= 3 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  return w.length > 3 ? w.replace(/e$/, "") : w;
}

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’]*/gu;

export function words(text: string): string[] {
  return text.match(WORD) ?? [];
}

type Clause = { all: string[][]; none: string[] };
/** A parsed query: any one clause must match; a clause needs all its terms or phrases and none of its exclusions. */
export type TextQuery = { clauses: Clause[]; stems: Set<string> };

/** Parse search-engine style input: words, "quoted phrases", -excluded, OR. */
export function parseTextQuery(raw: string): TextQuery | null {
  const clauses: Clause[] = [];
  const stems = new Set<string>();
  for (const part of raw.split(/\s+or\s+/i)) {
    const clause: Clause = { all: [], none: [] };
    const re = /(-?)"([^"]+)"|(-?)(\S+)/g;
    for (let m = re.exec(part); m; m = re.exec(part)) {
      const negate = Boolean(m[1] || m[3]);
      const body = m[2] ?? m[4];
      const terms = words(body)
        .filter((w) => m![2] !== undefined || !STOP.has(fold(w)))
        .map(stem)
        .filter(Boolean);
      if (!terms.length) continue;
      if (negate) clause.none.push(...terms);
      else {
        clause.all.push(terms);
        terms.forEach((t) => stems.add(t));
      }
    }
    if (clause.all.length) clauses.push(clause);
  }
  return clauses.length ? { clauses, stems } : null;
}

function hasPhrase(stems: string[], phrase: string[]): boolean {
  outer: for (let i = 0; i + phrase.length <= stems.length; i++) {
    for (let j = 0; j < phrase.length; j++) if (stems[i + j] !== phrase[j]) continue outer;
    return true;
  }
  return false;
}

/** Index terms for a text: stems of its words, without stop words (mirrors export_static.index_terms). */
export function indexTerms(text: string): string[] {
  return words(text)
    .filter((w) => !STOP.has(fold(w)))
    .map(stem);
}

/** 0 when the text does not match; otherwise a rank (more hits, shorter text: higher). */
export function rankText(q: TextQuery, text: string): number {
  const stems = words(text).map(stem);
  const set = new Set(stems);
  for (const c of q.clauses) {
    if (c.none.some((t) => set.has(t))) continue;
    if (!c.all.every((p) => (p.length === 1 ? set.has(p[0]) : hasPhrase(stems, p)))) continue;
    const hits = stems.filter((s) => q.stems.has(s)).length;
    return hits / Math.log2(stems.length + 2);
  }
  return 0;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** HTML-escaped excerpt with matched words in <mark>, at most maxWords words, starting near the first hit. */
export function highlight(text: string, q: TextQuery, maxWords = 30): string {
  const parts = text.split(/([\p{L}\p{N}][\p{L}\p{N}'’]*)/u);
  const wordIdx = parts.map((_, i) => i).filter((i) => i % 2 === 1);
  const first = wordIdx.findIndex((i) => q.stems.has(stem(parts[i])));
  let from = 0;
  let to = parts.length;
  if (wordIdx.length > maxWords) {
    const startWord = Math.max(0, Math.min(first - 8, wordIdx.length - maxWords));
    from = startWord === 0 ? 0 : wordIdx[startWord];
    to = startWord + maxWords >= wordIdx.length ? parts.length : wordIdx[startWord + maxWords - 1] + 1;
  }
  const out = parts
    .slice(from, to)
    .map((p, k) => ((from + k) % 2 === 1 && q.stems.has(stem(p)) ? `<mark>${escapeHtml(p)}</mark>` : escapeHtml(p)))
    .join("");
  return (from > 0 ? "… " : "") + out.trim() + (to < parts.length ? " …" : "");
}

const trigramCache = new Map<string, Set<string>>();

/** pg_trgm-style trigrams: each word padded with two spaces before and one after. */
export function trigrams(s: string): Set<string> {
  const hit = trigramCache.get(s);
  if (hit) return hit;
  const set = new Set<string>();
  for (const w of s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
    const p = `  ${w} `;
    for (let i = 0; i + 3 <= p.length; i++) set.add(p.slice(i, i + 3));
  }
  if (trigramCache.size > 50_000) trigramCache.clear();
  trigramCache.set(s, set);
  return set;
}

/** pg_trgm similarity(): shared trigrams over all distinct trigrams. */
export function similarity(a: string, b: string): number {
  const x = trigrams(a);
  const y = trigrams(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const t of x) if (y.has(t)) shared++;
  return shared / (x.size + y.size - shared);
}

/** pg_trgm's default threshold for the % operator. */
export const SIMILAR = 0.3;
