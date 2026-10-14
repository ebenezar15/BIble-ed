-- Content framework: people, works, module entries, typed blocks, citations, notes; plus extra open datasets.

create table person (
  id text primary key,
  name text not null,
  born int,
  died int,
  era text,
  tradition text,
  roles text[] not null default '{}',
  summary text,
  author text not null default 'claude'
);

create table work (
  id text primary key,
  person_id text references person(id),
  title text not null,
  year int,
  copyright text not null check (copyright in ('public_domain', 'copyrighted')),
  edition text,
  publisher text,
  isbn text,
  url text,
  author text not null default 'claude'
);

create table entry (
  kind text not null,
  slug text not null,
  title text not null,
  subtitle text,
  summary text,
  refs text[] not null default '{}',
  lemmas text[] not null default '{}',
  data jsonb not null default '{}',
  ord int not null default 0,
  author text not null default 'claude',
  primary key (kind, slug)
);

create table content_block (
  id serial primary key,
  subject_kind text not null check (subject_kind in ('lemma', 'verse', 'entry', 'person')),
  subject_id text not null,
  section text not null,
  title text,
  type text not null check (type in ('lexical_fact', 'historical_fact', 'scholarly_interpretation',
    'lens_commentary', 'contested', 'legal_reading_history')),
  by_person text references person(id),
  consensus text not null default 'n/a' check (consensus in ('consensus', 'majority', 'minority', 'n/a')),
  body_md text not null,
  status text not null default 'draft' check (status in ('draft', 'reviewed')),
  author text not null default 'claude' check (author in ('claude', 'owner')),
  ord int not null default 0,
  updated_at timestamptz not null default now()
);
create index on content_block (subject_kind, subject_id);
create index content_block_fts on content_block
  using gin (to_tsvector('english', coalesce(title, '') || ' ' || body_md));

create table citation (
  id serial primary key,
  block_id int not null references content_block(id) on delete cascade,
  work_id text references work(id),
  ref text not null,
  url text,
  quote text,
  verified boolean not null default false,
  verified_at timestamptz
);
create index on citation (block_id);

create table user_note (
  id serial primary key,
  subject_kind text not null,
  subject_id text not null,
  work_id text references work(id),
  page text,
  body_md text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on user_note (subject_kind, subject_id);

create table cross_reference (
  from_verse int not null references verse(id),
  to_start int not null references verse(id),
  to_end int not null references verse(id),
  votes int not null,
  primary key (from_verse, to_start, to_end)
);

create table father_comment (
  id serial primary key,
  father text not null,
  verse_start int not null references verse(id),
  verse_end int not null references verse(id),
  quote text not null,
  source_title text,
  source_url text,
  year int,
  source_id text not null references source(id)
);
create index on father_comment (verse_start, verse_end);
create index father_comment_fts on father_comment using gin (to_tsvector('english', quote));

create table name_entry (
  id text primary key,              -- TIPNR unique name, e.g. 'Aaron@Exo.4.14'
  name text not null,
  kind text not null,               -- person | place | other
  gender text,
  description text,
  lemma_ids text[] not null default '{}',
  refs text[] not null default '{}',
  ref_count int not null default 0,
  source_id text not null references source(id)
);
create index name_entry_name_trgm on name_entry using gin (fold(name) gin_trgm_ops);

create table lxx_bridge (
  hebrew_lemma text not null references lemma(id),
  greek_lemma text not null references lemma(id),
  source_id text not null references source(id),
  primary key (hebrew_lemma, greek_lemma)
);
create index on lxx_bridge (greek_lemma);

create index entry_fts on entry using gin (to_tsvector('english', title || ' ' || coalesce(subtitle, '') || ' ' || coalesce(summary, '')));
