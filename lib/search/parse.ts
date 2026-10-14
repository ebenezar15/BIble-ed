import { bookByName, SINGLE_CHAPTER } from "@/lib/books";
import { GREEK_RE, HEBREW_RE, stripGreek, stripHebrew, translitKey } from "./normalize";

export type Query =
  | { kind: "reference"; book: string; chapter: number; verse?: number; endChapter?: number; endVerse?: number }
  | { kind: "strongs"; candidates: string[] }
  | { kind: "hebrew"; plain: string }
  | { kind: "greek"; plain: string }
  | { kind: "text"; raw: string; translitKey: string }
  | { kind: "empty" };

const STRONGS = /^(?:strong'?s?\s*)?([hg])?\s*0*(\d{1,5})([a-z])?$/i;
const REFERENCE =
  /^((?:[123]|i{1,3}|first|second|third)?\s*[a-z][a-z\s]*?)[\s.]*(\d+)(?:\s*[:.\s]\s*(\d+))?(?:\s*[-–—]\s*(\d+)(?:\s*[:.]\s*(\d+))?)?$/i;

function pad(n: string): string {
  return n.padStart(4, "0");
}

function parseStrongs(s: string): Query | null {
  const m = s.match(STRONGS);
  if (!m) return null;
  const [, lang, num, letter] = m;
  const hasPrefix = /^strong/i.test(s);
  if (!lang && !hasPrefix && !/^\d+$/.test(s)) return null;
  const suffix = letter ? letter.toUpperCase() : "";
  const id = pad(num) + suffix;
  const candidates = lang ? [`${lang.toUpperCase()}${id}`] : [`H${id}`, `G${id}`];
  return { kind: "strongs", candidates };
}

function parseReference(s: string): Query | null {
  const m = s.match(REFERENCE);
  if (!m) return null;
  const book = bookByName(m[1].trim());
  if (!book) return null;
  const [a, b, c, d] = [m[2], m[3], m[4], m[5]].map((x) => (x === undefined ? undefined : Number(x)));
  if (SINGLE_CHAPTER.has(book.id) && b === undefined && c === undefined) {
    return { kind: "reference", book: book.id, chapter: 1, verse: a };
  }
  const q: Extract<Query, { kind: "reference" }> = { kind: "reference", book: book.id, chapter: a! };
  if (b !== undefined) q.verse = b;
  if (c !== undefined) {
    if (d !== undefined) {
      q.endChapter = c;
      q.endVerse = d;
    } else if (b !== undefined) {
      q.endVerse = c;
    } else {
      q.endChapter = c;
    }
  }
  return q;
}

export function parseQuery(input: string): Query {
  const s = input.trim().replace(/\s+/g, " ");
  if (!s) return { kind: "empty" };
  if (HEBREW_RE.test(s)) return { kind: "hebrew", plain: stripHebrew(s) };
  if (GREEK_RE.test(s)) return { kind: "greek", plain: stripGreek(s) };
  return parseStrongs(s) ?? parseReference(s) ?? { kind: "text", raw: s, translitKey: translitKey(s) };
}
