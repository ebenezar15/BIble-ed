import { BOOK_BY_ID, bookByName, SINGLE_CHAPTER } from "@/lib/books";

const ALLOWED = new Set(["b", "i", "br", "sup", "sub"]);

function filterTags(html: string): string {
  return html.replace(/<\/?([a-z0-9]+)[^>]*>/gi, (tag, name: string) => {
    const n = name.toLowerCase();
    if (!ALLOWED.has(n)) return "";
    if (n === "br") return "<br>";
    return tag.startsWith("</") ? `</${n}>` : `<${n}>`;
  });
}

/** 'Gen.4.2-10' -> 'Gen.4.2'; 'Jhn.8:7' -> 'Jhn.8.7'; '3Jn.11' -> '3Jn.1.11'; non-canonical books -> null. */
export function canonicalRef(ref: string): string | null {
  const first = ref.split(/[;,\s]/)[0].replace(/\.$/, "").replace(/:/g, ".").replace(/-.*$/, "");
  const parts = first.split(".");
  const book = BOOK_BY_ID.get(parts[0]) ?? bookByName(parts[0]);
  if (!book || parts.slice(1).some((p) => !/^\d+$/.test(p))) return null;
  if (parts.length === 2 && SINGLE_CHAPTER.has(book.id)) return `${book.id}.1.${parts[1]}`;
  if (parts.length === 3) return `${book.id}.${parts[1]}.${parts[2]}`;
  if (parts.length === 2) return `${book.id}.${parts[1]}.1`;
  return null;
}

/** Reduce STEP lexicon markup to a safe subset: b/i/br/sup/sub plus verse links. */
export function sanitizeLexicon(html: string): string {
  const refs: string[] = [];
  let out = html.replace(/<ref='([^']+)'>([\s\S]*?)<\/ref>/gi, (_m, ref: string, text: string) => {
    const target = canonicalRef(ref);
    const inner = filterTags(text);
    refs.push(target ? `<a href="/verse/${encodeURI(target)}">${inner}</a>` : inner);
    return `\u0000${refs.length - 1}\u0000`;
  });
  out = filterTags(out);
  out = out.replace(/__/g, "").replace(/<br>\s+/g, "<br>");
  return out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => refs[Number(i)]);
}
