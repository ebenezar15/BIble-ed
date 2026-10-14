import raw from "@/db/seed/books.json";

export type Book = { id: string; ord: number; testament: "OT" | "NT"; name: string; abbrevs: string[] };

export const BOOKS = raw as Book[];
export const BOOK_BY_ID = new Map(BOOKS.map((b) => [b.id, b]));
/** Books with a single chapter: "Jude 5" means Jude 1:5. */
export const SINGLE_CHAPTER = new Set(["Oba", "Phm", "2Jn", "3Jn", "Jud"]);

const ROMAN: Record<string, string> = { iii: "3", ii: "2", i: "1", first: "1", second: "2", third: "3" };

/** Mirrors etl/logos_etl/books.py `_key`. */
export function bookKey(name: string): string {
  const words = name.toLowerCase().replace(/\./g, " ").split(/\s+/).filter(Boolean);
  if (words.length && ROMAN[words[0]]) words[0] = ROMAN[words[0]];
  return words.join("").replace(/[^0-9a-z]/g, "");
}

const INDEX = new Map<string, Book>();
for (const b of BOOKS) {
  for (const alias of [b.id, b.name, ...b.abbrevs]) {
    const k = bookKey(alias);
    if (!INDEX.has(k)) INDEX.set(k, b);
  }
}

export function bookByName(name: string): Book | undefined {
  return INDEX.get(bookKey(name));
}

export function formatRef(osis: string): string {
  const [b, c, v] = osis.split(".");
  const name = BOOK_BY_ID.get(b)?.name ?? b;
  return v ? `${name} ${c}:${v}` : `${name} ${c}`;
}
