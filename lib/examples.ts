/** The ten worked examples from the brief, in the order they're introduced. */
export const EXAMPLE_WORDS = [
  { id: "H2617A", word: "חֶסֶד", translit: "hesed", gloss: "steadfast, covenant love", lang: "he" },
  { id: "H3722A", word: "כִּפֶּר", translit: "kipper", gloss: "to cover, to atone", lang: "he" },
  { id: "H7965G", word: "שָׁלוֹם", translit: "shalom", gloss: "wholeness, peace", lang: "he" },
  { id: "H6666", word: "צְדָקָה", translit: "tsedaqah", gloss: "righteousness, rightness", lang: "he" },
  { id: "G0026", word: "ἀγάπη", translit: "agapē", gloss: "love", lang: "grc" },
  { id: "G1343", word: "δικαιοσύνη", translit: "dikaiosynē", gloss: "righteousness, justice", lang: "grc" },
  { id: "G2435", word: "ἱλαστήριον", translit: "hilastērion", gloss: "mercy seat, place of atonement", lang: "grc" },
  { id: "G2644", word: "καταλλάσσω", translit: "katallassō", gloss: "to reconcile", lang: "grc" },
  { id: "G3341", word: "μετάνοια", translit: "metanoia", gloss: "a change of mind", lang: "grc" },
  { id: "G5206", word: "υἱοθεσία", translit: "huiothesia", gloss: "adoption as sons", lang: "grc" },
] as const;

/** Verses for the home page, one per day, chosen for the relational lens. */
export const DAILY_VERSES = [
  "Jhn.14.9", "Heb.1.3", "2Co.5.19", "Rom.8.15", "Gal.4.6", "Col.1.19", "Lam.3.22",
  "Hos.6.6", "Jhn.17.21", "Eph.1.5", "Exo.34.6", "Luk.15.20", "1Jn.4.16", "Psa.136.1",
];

export function verseForDay(date: Date): string {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  return DAILY_VERSES[day % DAILY_VERSES.length];
}
