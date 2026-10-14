import { formatRef } from "@/lib/books";
import { SECTION_TITLES } from "@/lib/content/sections";
import { subjectHref, subjectLabel } from "@/lib/content/subject";
import type { Api } from "@/lib/data/api";
import { verseHref, wordHref } from "@/lib/href";
import { parseTextQuery, rankText } from "@/lib/search/match";
import { translitKey } from "@/lib/search/normalize";
import type { Source } from "./prompt";

const STOP = new Set(
  "what does mean the and for with how why who was were are is in of to a an on about did jesus god bible word words what's this that from".split(" "),
);
const clip = (s: string, n = 1400) => (s.length > n ? `${s.slice(0, n)}…` : s);
const stripHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Gather the library material most relevant to a question: word studies, articles, verses, Fathers. */
export async function retrieve(api: Api, question: string): Promise<Source[]> {
  const terms = question.toLowerCase().match(/[\p{L}']+/gu)?.filter((t) => t.length > 2 && !STOP.has(t)) ?? [];
  if (!terms.length) return [];
  const orQuery = parseTextQuery(terms.join(" or "));
  if (!orQuery) return [];
  const keys = new Set(terms.map(translitKey));
  const top = <T,>(items: T[], score: (x: T) => number, n: number) =>
    items.map((x) => ({ x, s: score(x) })).filter((r) => r.s > 0).sort((p, q) => q.s - p.s).slice(0, n).map((r) => r.x);

  const [rows, blockTexts, bsb, fatherHits] = await Promise.all([
    api.lemmaRows(),
    api.blockTexts(),
    api.translationText("bsb"),
    api.searchFathers(terms.join(" or "), 3),
  ]);
  const lemmaIds = rows.filter((r) => keys.has(r[8])).sort((p, q) => q[5] - p[5]).slice(0, 3).map((r) => r[0]);
  const lemmas = (await Promise.all(lemmaIds.map((id) => api.getLemma(id)))).filter((l) => l !== null);
  const blocks = top(blockTexts, (b) => rankText(orQuery, `${b.title ?? ""} ${b.body}`), 10);
  const verses = top(bsb, ([, text]) => rankText(orQuery, text), 4).map(([osis, text]) => ({ osis, text }));
  const fathers = fatherHits.map((f) => ({ father: f.father, osis: f.osis, quote: f.quote }));

  // Blocks attached to the matched words come first: they are the word studies themselves.
  const ORDER = ["meaning", "lens", "culture", "translation_history", "legal_history"];
  const lemmaBlocks = lemmas
    .flatMap((l) => l.blocks.filter((b) => ORDER.includes(b.section)).map((b) => ({ id: l.id, section: b.section, type: b.type, body: b.bodyMd, by: b.by?.name ?? null })))
    .sort((p, q) => ORDER.indexOf(p.section) - ORDER.indexOf(q.section))
    .slice(0, 6);

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
    push({ kind: "Lexicon (lexical fact)", title: `${l.lemma} ${l.translit}: ${l.gloss}`, href: wordHref(l.id), text: clip(stripHtml(l.lexicon[0]?.html ?? l.gloss), 1000) });
  }
  for (const b of lemmaBlocks) {
    push({ kind: typeLabel(b.type, b.by), title: `${b.id}: ${SECTION_TITLES[b.section] ?? b.section}`, href: wordHref(b.id), text: clip(b.body) });
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
  for (const v of verses) push({ kind: "Scripture (BSB)", title: formatRef(v.osis), href: verseHref(v.osis), text: v.text });
  for (const f of fathers) {
    push({ kind: "Church Father (public-domain translation)", title: `${f.father} on ${formatRef(f.osis)}`, href: verseHref(f.osis), text: clip(f.quote, 1000) });
  }
  return out.slice(0, 16).map((s, i) => ({ ...s, n: i + 1 }));
}
