-- Stable identity for seeded blocks, so the owner's edits and deletions survive re-imports.
alter table content_block add column seed_key text;
create index on content_block (seed_key);
create table seed_suppressed (seed_key text primary key, suppressed_at timestamptz not null default now());
