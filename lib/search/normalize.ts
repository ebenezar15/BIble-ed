// Mirrors etl/logos_etl/text.py exactly; shared cases live in db/seed/translit-cases.json.

const HEB_POINTS = /[֑-ׇ׳״/\\‍‌]/g;
const LETTERS: Record<string, string> = { "ə": "e", "š": "s", y: "u", w: "v", "ß": "s" };
const DROP = /[\s'ʼʿ’`.\-]/g;
const DIGRAPHS: [string, string][] = [
  ["kh", "h"], ["ch", "h"], ["sh", "s"], ["ph", "f"], ["th", "t"], ["ts", "s"], ["tz", "s"],
];

const mapLetters = (s: string) => [...s].map((c) => LETTERS[c] ?? c).join("");
const stripMarks = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "");

export function stripHebrew(s: string): string {
  return s.replace(HEB_POINTS, "").trim();
}

export function stripGreek(s: string): string {
  return stripMarks(s).toLowerCase().replace(/ς/g, "σ").trim();
}

export function translitKey(s: string): string {
  let t = mapLetters(stripMarks(mapLetters(s.toLowerCase())));
  t = t.replace(DROP, "");
  for (const [a, b] of DIGRAPHS) t = t.split(a).join(b);
  return t.replace(/ah$/, "a").replace(/(.)\1+/g, "$1");
}

export const HEBREW_RE = /[֐-׿]/;
export const GREEK_RE = /[Ͱ-Ͽἀ-῿]/;
