export type LemmaRef = { id: string; lemma: string; translit: string; gloss: string; language: string; count: number };

export type TokenView = {
  pos: number;
  surface: string;
  translit: string;
  gloss: string;
  lemmaId: string | null;
  lemma: string | null;
  lemmaGloss: string | null;
  morph: string;
  morphLabel: string;
  srcRef: string;
  editions: string | null;
};

export type CitationView = {
  id: number | string;
  ref: string;
  url: string | null;
  workId: string | null;
  workTitle: string | null;
  copyright: string | null;
  verified: boolean;
};

export type BlockView = {
  id: number | string;
  /** Stable across rebuilds: the content seed key, or local-… for a block written in this browser. */
  key: string;
  section: string;
  title: string | null;
  type: string;
  consensus: string;
  status: "draft" | "reviewed";
  author: "claude" | "owner";
  bodyMd: string;
  bodyHtml: string;
  by: { id: string; name: string } | null;
  citations: CitationView[];
  needsSource: boolean;
};

export type CrossRef = { start: string; end: string; votes: number; text: string | null };

export type EntrySummary = {
  kind: string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  refs: string[];
  data: Record<string, unknown>;
  ord: number;
};

export type EntryView = EntrySummary & { lemmas: LemmaRef[]; blocks: BlockView[] };

export type RelatedEntry = { kind: string; slug: string; title: string; summary: string | null; href: string; label: string };

export type VerseView = {
  id: number;
  osis: string;
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  bookChapters: number;
  chapterVerses: number;
  language: "heb" | "grc";
  translations: { id: string; name: string; text: string }[];
  tokens: TokenView[];
  hebRef?: string;
  prev?: string;
  next?: string;
  textNote: "not-in-sblgnt" | "na28-fallback" | null;
  xrefs: CrossRef[];
  related: RelatedEntry[];
  blocks: BlockView[];
};

export type FatherComment = {
  id: number;
  father: string;
  quote: string;
  sourceTitle: string | null;
  sourceUrl: string | null;
  year: number | null;
};

export type LemmaView = {
  id: string;
  strongs: string;
  language: string;
  lemma: string;
  translit: string;
  pos: string;
  gloss: string;
  count: number;
  lexicon: { source: string; sourceId: string; attribution: string; html: string }[];
  root: { id: string; letters: string; gloss: string | null; family: LemmaRef[] } | null;
  senses: LemmaRef[];
  distribution: { book: string; name: string; count: number }[];
  glosses: { gloss: string; count: number }[];
  bridge: LemmaRef[];
  sourceAttribution: string;
  blocks: BlockView[];
};

export type PersonSummary = {
  id: string;
  name: string;
  born: number | null;
  died: number | null;
  era: string | null;
  tradition: string | null;
  roles: string[];
  summary: string | null;
};

export type PersonView = PersonSummary & {
  works: { id: string; title: string; year: number | null; copyright: string; edition: string | null; publisher: string | null; isbn: string | null }[];
  blocks: BlockView[];
  /** Where blocks give this person's view. */
  cited: { kind: string; id: string; section: string }[];
};

export type NameSummary = { id: string; name: string; kind: string; brief: string | null; refCount: number };

export type NameView = NameSummary & {
  gender: string | null;
  description: string | null;
  article: string | null;
  refs: string[];
  lemmas: (LemmaRef & { meaning: string | null })[];
};

export type Work = { id: string; title: string; author: string | null; copyright: string };

export type Source = { id: string; name: string; license: string; attribution: string; url: string; version: string | null };

export type BookMeta = { id: string; name: string; testament: "OT" | "NT"; chapters: number; verses: number[] };

export type Meta = {
  builtAt: string;
  books: BookMeta[];
  translations: { id: string; name: string }[];
  hebMap: Record<string, string>;
};

/** One content block's text, for library search and Ask. */
export type BlockText = {
  kind: string;
  id: string;
  section: string;
  type: string;
  title: string | null;
  body: string;
  by: string | null;
};
