# Running Logos Relational

Logos Relational is a static website: plain HTML, JavaScript and JSON files, with no server and no database behind
it. Anyone with the link can open it in a browser, on a phone or a computer.

## The shareable link (GitHub Pages)

The site publishes itself from this repository to **https://ebenezar15.github.io/BIble-ed/**.

1. **One-time setup:** on GitHub open **Settings → Pages**, and under **Build and deployment → Source** choose
   **GitHub Actions**.
2. Every push to the default branch runs **Actions → "Publish site"**. It downloads the open datasets, builds the
   library in a throwaway database, checks it, exports it as static files, runs the tests, and publishes the site.
   This takes about 10 minutes. You can also start it by hand: **Actions → Publish site → Run workflow**.

The repository is public, so the site is public too: anyone with the link can read it. Nothing private is published.
Notes and edits stay in each reader's own browser.

## Notes, edits and Ask

- **My notes** and **content edits** are saved in the browser you write them in (local storage), on that device only.
  Use **My notes → Download backup** to keep a copy, and **Restore a backup** to move them to another browser or device.
  To make an edit part of the library for everyone, add it to the files in `content/` (see `content/AUTHORING.md`).
- **Ask** calls Claude directly from your browser with your own Anthropic API key, which you paste on the Ask page.
  The key is kept only in that browser and sent only to Anthropic. Everything else works without a key.

## On your own computer

Needs Node 20+, Python 3.12+ and Docker (or any PostgreSQL 16 with the `pg_trgm` and `unaccent` extensions). The
database is only used to build the library files.

```bash
git clone https://github.com/ebenezar15/BIble-ed && cd BIble-ed
docker compose up -d                 # starts PostgreSQL
cp .env.example .env
npm install
pip install "psycopg[binary]" pytest
npm run etl                          # downloads the open datasets and builds the library (a few minutes)
npm run export-data                  # writes the library as static files to public/data (~270 MB)
npm run build && npm start           # http://localhost:3000
```

To preview exactly what GitHub Pages serves, build and serve with the same base path:

```bash
NEXT_PUBLIC_BASE_PATH=/BIble-ed npm run build
NEXT_PUBLIC_BASE_PATH=/BIble-ed npm start   # http://localhost:3000/BIble-ed/
```

The finished site is the `out/` folder. Any static host (GitHub Pages, Netlify, Cloudflare Pages, a USB stick with a
local web server) can serve it.
