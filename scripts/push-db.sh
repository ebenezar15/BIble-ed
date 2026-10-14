#!/usr/bin/env bash
# Copy the fully imported local database to a hosted Postgres (e.g. Neon), keeping what you did online:
# notes, your own blocks and citation checks, and seeded blocks you deleted.
# Usage: TARGET_DATABASE_URL='postgres://user:pass@host/db?sslmode=require' scripts/push-db.sh
set -euo pipefail
: "${TARGET_DATABASE_URL:?Set TARGET_DATABASE_URL to the hosted database connection string}"
SOURCE="${DATABASE_URL:-postgres://logos:logos@localhost:5432/logos}"
WORK="$(mktemp -d)"
DUMP="$WORK/logos.dump"
SAVED="$WORK/saved.sql"

has_table() { psql "$TARGET_DATABASE_URL" -tAc "select to_regclass('public.$1') is not null" | grep -q t; }

echo "1/4 Saving notes and edits already on the target…"
: > "$SAVED"
if has_table user_note && has_table seed_suppressed; then
  psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -q <<SQL
\copy (select subject_kind, subject_id, work_id, page, body_md, created_at, updated_at from user_note) to '$WORK/notes.csv' csv
\copy (select seed_key from seed_suppressed) to '$WORK/suppressed.csv' csv
\copy (select id, subject_kind, subject_id, section, title, type, by_person, consensus, body_md, status, ord, seed_key from content_block where author = 'owner') to '$WORK/blocks.csv' csv
\copy (select c.block_id, c.work_id, c.ref, c.url, c.quote, c.verified, c.verified_at from citation c join content_block b on b.id = c.block_id where b.author = 'owner') to '$WORK/citations.csv' csv
SQL
  echo "   saved $(wc -l < "$WORK/notes.csv") notes, $(wc -l < "$WORK/blocks.csv") of your blocks"
else
  echo "   target is empty; nothing to keep"
fi

echo "2/4 Dumping local database…"
pg_dump --format=custom --no-owner --no-privileges "$SOURCE" -f "$DUMP"

echo "3/4 Restoring to the target (replaces the library tables)…"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -qc "create extension if not exists pg_trgm; create extension if not exists unaccent;"
pg_restore --no-owner --no-privileges --clean --if-exists --exit-on-error --dbname="$TARGET_DATABASE_URL" "$DUMP"

if [ -f "$WORK/notes.csv" ]; then
  echo "4/4 Merging your online notes and edits back in…"
  psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -q <<SQL
begin;
create temp table t_notes (subject_kind text, subject_id text, work_id text, page text, body_md text, created_at timestamptz, updated_at timestamptz);
\copy t_notes from '$WORK/notes.csv' csv
insert into user_note (subject_kind, subject_id, work_id, page, body_md, created_at, updated_at)
  select t.* from t_notes t where not exists (
    select 1 from user_note n where n.subject_kind = t.subject_kind and n.subject_id = t.subject_id and n.body_md = t.body_md);

create temp table t_supp (seed_key text);
\copy t_supp from '$WORK/suppressed.csv' csv
insert into seed_suppressed (seed_key) select seed_key from t_supp on conflict do nothing;
delete from content_block where author = 'claude' and seed_key in (select seed_key from t_supp);

create temp table t_blocks (old_id int, subject_kind text, subject_id text, section text, title text, type text,
  by_person text, consensus text, body_md text, status text, ord int, seed_key text);
\copy t_blocks from '$WORK/blocks.csv' csv
create temp table t_cites (block_id int, work_id text, ref text, url text, quote text, verified boolean, verified_at timestamptz);
\copy t_cites from '$WORK/citations.csv' csv
-- An online edit of a seeded block replaces the seeded copy.
delete from content_block where author = 'claude' and seed_key in (select seed_key from t_blocks where seed_key is not null);
create temp table t_map (old_id int, new_id int);
with fresh as (
  select * from t_blocks t where not exists (
    select 1 from content_block b where b.author = 'owner' and b.subject_kind = t.subject_kind
      and b.subject_id = t.subject_id and b.section = t.section and b.body_md = t.body_md)
), ins as (
  insert into content_block (subject_kind, subject_id, section, title, type, by_person, consensus, body_md, status, author, ord, seed_key)
  select subject_kind, subject_id, section, title, type,
    case when exists (select 1 from person p where p.id = fresh.by_person) then by_person end,
    consensus, body_md, status, 'owner', ord, seed_key from fresh
  returning id, subject_kind, subject_id, section, body_md
)
insert into t_map select f.old_id, i.id from fresh f join ins i
  on i.subject_kind = f.subject_kind and i.subject_id = f.subject_id and i.section = f.section and i.body_md = f.body_md;
insert into citation (block_id, work_id, ref, url, quote, verified, verified_at)
  select m.new_id, case when exists (select 1 from work w where w.id = c.work_id) then c.work_id end,
    c.ref, c.url, c.quote, c.verified, c.verified_at
  from t_cites c join t_map m on m.old_id = c.block_id;
commit;
SQL
else
  echo "4/4 Nothing to merge."
fi
psql "$TARGET_DATABASE_URL" -tAc "select count(*) || ' verses, ' || (select count(*) from user_note) || ' notes' from verse"
rm -rf "$WORK"
echo "Done."
