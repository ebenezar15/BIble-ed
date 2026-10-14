-- Verse ranges covered by each entry, so verse pages can list the parables, structures etc. that include them.
create table entry_range (
  kind text not null,
  slug text not null,
  verse_start int not null references verse(id),
  verse_end int not null references verse(id),
  foreign key (kind, slug) references entry(kind, slug) on delete cascade
);
create index on entry_range (verse_start, verse_end);
