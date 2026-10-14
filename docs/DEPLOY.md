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

1. **Neon connection string.** In the Neon console open your project → **Connect**, and copy the connection string
   (`postgresql://…neon.tech/neondb?sslmode=require`). Either the pooled (`-pooler`) or direct string works.
2. **Give it to GitHub.** In this repository on GitHub: **Settings → Secrets and variables → Actions → New repository
   secret**, name `DATABASE_URL`, paste the string.
3. **Load the library.** **Actions → "Load library into Neon" → Run workflow.** It downloads the open datasets, builds
   the library in Neon (about 230 MB) and checks it, in roughly 5–10 minutes. The report is attached to the run.
4. **Vercel settings.** In the Vercel project: **Settings → Environment Variables**, add for Production (and Preview if
   you like):
   - `DATABASE_URL`: the same Neon string (skip if you connected Neon through Vercel's Storage tab, which adds it for you)
   - `SITE_PASSWORD`: a long password (every page then asks for it once per device)
   - `SITE_SECRET`: a long random string (run `openssl rand -hex 32`); it signs the sign-in cookie
   - `ANTHROPIC_API_KEY`: optional, turns on "Ask the library"
5. **Deploy.** Vercel deploys the `main` branch. After adding the variables, open **Deployments**, choose the latest one
   and **Redeploy** so they take effect.
6. **Install on your phone.** Open the site, sign in, then use the browser's "Add to Home Screen". Pages you've opened
   keep working offline.

Alternative to steps 2–3: from your own computer, after `npm run etl`, run
`TARGET_DATABASE_URL='postgres://…' scripts/push-db.sh` to copy your local library up.

Notes and edits you make online live in the hosted database. Re-running the GitHub Action or `push-db.sh` keeps them:
your notes, the blocks you wrote or edited (with their checked citations) and the seeded blocks you deleted. You can
also export notes from the My notes page (Markdown or JSON) at any time.

## 3. Updating the library

When content files in `content/` change, run the "Load library into Neon" action again (or `npm run etl` locally,
then `scripts/push-db.sh`). Your own edits
(marked as yours in the editor), deletions and notes are kept, both by the importer and by `push-db.sh`.

## Environment variables

| Variable | Needed for | Default |
|---|---|---|
| `DATABASE_URL` | everything | `postgres://logos:logos@localhost:5432/logos` (see `.env.example`) |
| `SITE_PASSWORD` | protecting a hosted copy | empty = no login (local use) |
| `SITE_SECRET` | signing the sign-in cookie (set it whenever `SITE_PASSWORD` is set) | empty |
| `ANTHROPIC_API_KEY` | Ask the library | empty = Ask shows sources but no answer |
