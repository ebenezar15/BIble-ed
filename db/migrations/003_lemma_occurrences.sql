-- Precomputed occurrence counts so search can rank lemmas without scanning tokens.
alter table lemma add column occurrences int not null default 0;
create index on lemma (occurrences desc);
