export const TORAH_KINDS = [
  "festival", "sacrifice", "law", "covenant", "tabernacle", "christophany", "number", "typology", "structure",
] as const;

export const KIND_LABEL: Record<string, string> = {
  book: "Book", essay: "Study", jesus_word: "Words of Jesus", parable: "Parable", festival: "Festival",
  sacrifice: "Sacrifice", law: "Law", covenant: "Covenant", tabernacle: "Tabernacle", christophany: "Christophany",
  number: "Number", typology: "Type and pattern", structure: "Literary structure", timeline: "Church history",
  denomination: "Denomination", doctrine: "History of a doctrine", roman_term: "Roman world",
};

export function entryHref(kind: string, slug: string): string {
  if (kind === "book") return `/books/${slug}`;
  if (kind === "essay") return `/topics/${slug}`;
  if (kind === "jesus_word") return `/jesus/${slug}`;
  if (kind === "parable") return `/parables/${slug}`;
  if ((TORAH_KINDS as readonly string[]).includes(kind)) return `/torah/${kind}/${slug}`;
  if (kind === "timeline") return `/history/timeline#${slug}`;
  if (kind === "denomination") return `/history/denominations/${slug}`;
  if (kind === "doctrine") return `/history/doctrines/${slug}`;
  if (kind === "roman_term") return `/rome/${slug}`;
  return `/search?q=${encodeURIComponent(slug)}`;
}
