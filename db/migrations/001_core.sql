-- Core text + lexical schema. See docs/superpowers/specs/2026-10-14-logos-relational-design.md §5.
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- Immutable wrapper so fold() can back an index.
create or replace function fold(t text) returns text
  language sql immutable parallel safe
  as $$ select lower(public.unaccent('public.unaccent'::regdictionary, t)) $$;

create table source (
  id text primary key,
  name text not null,
  license text not null check (license <> ''),
  attribution text not null check (attribution <> ''),
  url text not null,
  version text,
  sha256 text,
  redistributable boolean not null default true,
  notes text
);

create table book (
  id text primary key,            -- OSIS-style id as used by STEPBible: Gen, Jhn, 1Co
  ord int not null unique,
  testament char(2) not null check (testament in ('OT', 'NT')),
  name text not null,
  abbrevs text[] not null default '{}',
  chapters int not null default 0
);

create table verse (
  id serial primary key,
  book_id text not null references book(id),
  chapter int not null,
  verse int not null,
  osis text not null unique,      -- 'Gen.1.1' (KJV/English versification)
  unique (book_id, chapter, verse)
);

create table versification_map (
  scheme text not null,           -- 'heb'
  source_ref text not null,       -- 'Mal.3.19'
  verse_id int not null references verse(id),
  primary key (scheme, source_ref)
);
create index on versification_map (verse_id);

create table translation (
  id text primary key,
  name text not null,
  year int,
  ord int not null default 0,
  source_id text not null references source(id)
);

create table translation_verse (
  translation_id text not null references translation(id),
  verse_id int not null references verse(id),
  text text not null,
  para_start boolean not null default false,
  primary key (translation_id, verse_id)
);
create index translation_verse_fts on translation_verse
  using gin (to_tsvector('english', text));

create table root (
  id text primary key,            -- 'heb:חסד'
  language text not null,
  letters text not null,
  gloss text
);

create table lemma (
  id text primary key,            -- disambiguated Strong's: H2617A, G0026
  strongs text not null,          -- H2617, G0026
  language text not null check (language in ('heb', 'arc', 'grc')),
  lemma text not null,
  lemma_plain text not null,      -- consonants only / unaccented lowercase
  translit text,
  translit_key text,
  pos text,
  gloss text,
  root_id text references root(id),
  source_id text not null references source(id)
);
create index on lemma (strongs);
create index on lemma (root_id);
create index lemma_plain_trgm on lemma using gin (lemma_plain gin_trgm_ops);
create index lemma_translit_trgm on lemma using gin (translit_key gin_trgm_ops);
create index lemma_gloss_trgm on lemma using gin (fold(gloss) gin_trgm_ops);

create table lexicon_entry (
  id serial primary key,
  lemma_id text not null references lemma(id),
  source_id text not null references source(id),
  body_html text not null
);
create index on lexicon_entry (lemma_id);

create table lemma_family (
  lemma_id text not null references lemma(id),
  related_id text not null references lemma(id),
  relation text not null,
  primary key (lemma_id, related_id)
);

create table token (
  id bigserial primary key,
  verse_id int not null references verse(id),
  pos int not null,
  surface text not null,
  surface_plain text not null,
  translit text,
  gloss text,
  lemma_id text,                  -- soft reference: validation reports orphans
  morph text,
  source_id text not null references source(id),
  src_ref text not null           -- native (Hebrew/Greek) reference
);
create index on token (lemma_id);
create index on token (verse_id, pos);

create table morphology_code (
  code text primary key,
  language text not null,
  label text not null,
  detail text
);
