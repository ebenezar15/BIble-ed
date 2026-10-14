# Logos Relational

A personal Hebrew/Greek Bible study app, read through a relational-gospel lens.
The design is in `docs/superpowers/specs/2026-10-14-logos-relational-design.md`, and the current build plan is in `docs/superpowers/plans/`.

## Setup

```bash
docker compose up -d           # Postgres 16 (or use any Postgres with pg_trgm + unaccent)
cp .env.example .env
npm install
pip install "psycopg[binary]" pytest
npm run db:migrate             # apply db/migrations/*.sql
npm run etl                    # download open datasets, import, write docs/reports/phase2-import.md
npm run dev                    # http://localhost:3000
```

## Tests

```bash
npm test                       # Vitest: search parser, theme contrast, query layer
cd etl && python3 -m pytest    # ETL parsers + migrations
npm run e2e                    # Playwright (needs an imported DB and `npm run build`)
```

## Data and licenses

Only open-licensed or public-domain data is imported. Each source is recorded in the `source` table with its license, attribution and checksum, and the in-app `/sources` page lists them all.
