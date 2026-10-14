# Running Logos Relational

You can run it on your own computer, host it online for your phone, or both. The data import runs once on your
computer; the hosted copy receives a ready-made database.

## 1. On your computer

Needs Node 20+, Python 3.12+ and Docker (or any PostgreSQL 16 with the `pg_trgm` and `unaccent` extensions).

```bash
git clone <this repo> && cd BIble-ed
docker compose up -d                 # starts PostgreSQL
cp .env.example .env                 # local settings
npm install
pip install "psycopg[binary]" pytest
npm run etl                          # downloads the open datasets and builds the library (a few minutes, ~230 MB)
npm run build && npm start           # http://localhost:3000
```

With `SITE_PASSWORD` empty, the local copy is open to whoever uses your computer, and you can edit and keep notes.

## 2. Online (for your phone), with Vercel + Neon

1. **Database.** Create a project at neon.tech and copy its connection string (it ends in `?sslmode=require`).
   The library needs about 230 MB; check that your Neon plan's storage limit allows that.
2. **Copy your local database up:**
   ```bash
   TARGET_DATABASE_URL='postgres://…neon.tech/neondb?sslmode=require' scripts/push-db.sh
   ```
3. **App.** At vercel.com, import this GitHub repository (branch `main`, or this feature branch), then add environment variables:
   - `DATABASE_URL`: the Neon connection string
   - `SITE_PASSWORD`: a long password (every page then asks for it once per device)
   - `SITE_SECRET`: a long random string (run `openssl rand -hex 32`); it signs the sign-in cookie
   - `ANTHROPIC_API_KEY`: optional, turns on "Ask the library"
4. **Deploy.** Open the site on your phone, sign in, and use the browser's "Add to Home Screen" to install it as an app.
   Pages you've opened keep working offline.

Notes and edits you make online live in the hosted database. `push-db.sh` keeps them when it refreshes the library:
your notes, the blocks you wrote or edited (with their checked citations) and the seeded blocks you deleted are carried
over. You can also export notes from the My notes page (Markdown or JSON) at any time.

## 3. Updating the library

When content files in `content/` change, run `npm run etl` locally, then `scripts/push-db.sh` again. Your own edits
(marked as yours in the editor), deletions and notes are kept, both by the importer and by `push-db.sh`.

## Environment variables

| Variable | Needed for | Default |
|---|---|---|
| `DATABASE_URL` | everything | `postgres://logos:logos@localhost:5432/logos` (see `.env.example`) |
| `SITE_PASSWORD` | protecting a hosted copy | empty = no login (local use) |
| `SITE_SECRET` | signing the sign-in cookie (set it whenever `SITE_PASSWORD` is set) | empty |
| `ANTHROPIC_API_KEY` | Ask the library | empty = Ask shows sources but no answer |
