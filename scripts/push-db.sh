#!/usr/bin/env bash
# Copy the fully imported local database to a hosted Postgres (e.g. Neon) in one step.
# Usage: TARGET_DATABASE_URL='postgres://user:pass@host/db?sslmode=require' scripts/push-db.sh
set -euo pipefail
: "${TARGET_DATABASE_URL:?Set TARGET_DATABASE_URL to the hosted database connection string}"
SOURCE="${DATABASE_URL:-postgres://logos:logos@localhost:5432/logos}"
DUMP="$(mktemp -d)/logos.dump"

echo "Dumping local database…"
pg_dump --format=custom --no-owner --no-privileges "$SOURCE" -f "$DUMP"
echo "Preparing extensions on the target…"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c "create extension if not exists pg_trgm; create extension if not exists unaccent;"
echo "Restoring (this replaces existing tables on the target)…"
pg_restore --no-owner --no-privileges --clean --if-exists --dbname="$TARGET_DATABASE_URL" "$DUMP" || true
psql "$TARGET_DATABASE_URL" -tAc "select count(*) || ' verses' from verse"
echo "Done."
