# Phase 2–3: Data Import + MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import the open Hebrew/Greek/English datasets into Postgres with validated counts, then ship the first interactive app: themed shell, universal search, Word Study, and Verse Lookup with interlinear.

**Architecture:**
- Plain SQL migrations in `db/migrations/` are the single source of truth for the schema.
- Python ETL (`etl/`) downloads, checksums, parses and bulk-loads each source with `COPY`, then writes a validation report.
- Next.js (App Router, server components) reads the database through `postgres.js` with hand-written typed queries in `lib/db/`.
- Search parsing is a pure TypeScript module.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 4, postgres.js, D3, Vitest, Playwright; Python 3.12+, psycopg 3, pytest; PostgreSQL 16 (`pg_trgm`, `unaccent`).

**Spec:** `docs/superpowers/specs/2026-10-14-logos-relational-design.md`

**Deviation from spec, recorded here:** Drizzle ORM is dropped in favour of SQL migrations plus postgres.js. Python and TypeScript both write and read the same tables, and one SQL schema avoids two schema definitions drifting apart.

## Data sources (verified 2026-10-14)

| Key | Source | License | Location |
|---|---|---|---|
| `step-tahot` | STEPBible TAHOT (Leningrad/WLC via OSHB) | CC BY 4.0 | github.com/STEPBible/STEPBible-Data @ `93ec362` |
| `step-tagnt` | STEPBible TAGNT, words where `editions` ∋ `SBL` = SBLGNT text | CC BY 4.0 (SBLGNT CC BY 4.0) | same |
| `step-tbesh` / `step-tbesg` | Brief lexicons (abridged BDB; Abbott-Smith) | CC BY 4.0 | same |
| `step-tehmc` / `step-tegmc` | Morphology code expansions | CC BY 4.0 | same |
| `oshb-lexindex` | OpenScriptures HebrewLexicon LexicalIndex.xml (roots) | CC BY 4.0 | github.com/openscriptures/HebrewLexicon |
| `kjv`, `bsb`, `ylt`, `asv`, `darby` | scrollmapper/bible_databases CSV | Public domain text | github.com/scrollmapper/bible_databases |
| `web` | TehShrike/world-english-bible JSON | Public domain text | github.com/TehShrike/world-english-bible |

TTESV (CC BY-NC) is excluded. bereanbible.org and ebible.org are blocked by the build network, so the GitHub mirrors above are used instead.

## Global Constraints

- Canonical verse ids use KJV/English versification. The total must equal **31,102** (OT 23,145, NT 7,957).
- Every row of imported text references a `source` row with a non-empty `license` and `attribution`.
- UI font stack: `"Avenir Next", "Avenir", "Nunito Sans", system-ui, sans-serif`. Avenir is never bundled.
- Hebrew is rendered with `dir="rtl"` and `lang="he"`; Greek with `lang="grc"`.
- Six theme presets × light/dark: Parchment, Midnight Lapis, Tekhelet, Olive & Clay, Sepia Scroll, High Contrast. Text/background contrast must be ≥ 4.5:1.
- Motion honours `prefers-reduced-motion`. Layout works at 360px width with no horizontal scroll.
- `data/raw/` is git-ignored. Downloads are recorded with their sha256 in `source`.

## Review Focus

1. **Hebrew/English verse-numbering mismatch.** Malachi 4:1 in KJV is Hebrew 3:19, and Psalm titles are verse 1 in Hebrew. Expected: opening `/verse/Mal.4.1` shows the Hebrew of 3:19 with a "Hebrew 3:19" note. Test in Task 5.
2. **Hebrew typed without vowels or accents.** Searching for `חסד` should still find חֶסֶד. Test in Task 8.
3. **Ambiguous Strong's number** (`2617` or `Strong's 26` with no H/G). Expected: both the Hebrew and Greek candidates are offered, and nothing crashes. Test in Task 8.
4. **An unknown reference** (e.g. "John 30:1", "Hezekiah 1:1"). Expected: a "no such verse" result with suggestions, not a 500 error. Test in Task 11.
5. **A Strong's number with a disambiguation letter** (H2617A vs H2617B; hesed "kindness" vs "shame"). Expected: the word page separates the two senses, and the concordance links each occurrence to the right sense. Test in Task 5.

---

### Task 1: Scaffold the repo, database and migrations

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Create: `.gitignore` (node_modules, .next, data/raw, .env*, `__pycache__`), `.env.example` (`DATABASE_URL=postgres://logos:logos@localhost:5432/logos`)
- Create: `docker-compose.yml` (postgres:16 + volume)
- Create: `db/migrations/001_core.sql`
- Create: `etl/pyproject.toml`, `etl/logos_etl/__init__.py`, `etl/logos_etl/db.py`, `etl/logos_etl/migrate.py`, `etl/tests/test_migrate.py`
- Create: `README.md` (setup and commands)

**Schema (`001_core.sql`):**
- `source(id text pk, name, license, attribution, url, version, sha256, redistributable bool default true, notes)`
- `book(id text pk /*OSIS e.g. 'Gen'*/, ord int unique, testament char(2), name, abbrevs text[])`
- `verse(id serial pk, book_id, chapter int, verse int, osis text unique /*'Gen.1.1'*/)`, index `(book_id, chapter, verse)`
- `versification_map(scheme text, source_ref text, verse_id int)`, pk `(scheme, source_ref)`
- `translation(id text pk, name, year int, source_id)`
- `translation_verse(translation_id, verse_id, text, para_start bool default false)`, pk `(translation_id, verse_id)`
- `lemma(id text pk /*dStrong e.g. 'H2617A'*/, strongs text /*'H2617'*/, language char(3) /*'heb','arc','grc'*/, lemma text, lemma_plain text, translit, translit_key, pos, gloss, root_id text null, source_id)`, plus trigram indexes on `lemma_plain` and `translit_key`
- `lexicon_entry(id serial pk, lemma_id, source_id, body_html)`
- `root(id text pk, language, letters text, gloss)` and `lemma_family(lemma_id, related_id, relation)`
- `token(id bigserial pk, verse_id, pos int, surface, surface_plain, translit, gloss, lemma_id, morph, source_id, src_ref text /*Hebrew/Greek native ref*/)`, index `(lemma_id)` and `(verse_id, pos)`
- `morphology_code(code text pk, language, label, detail)`
- Enable extensions `pg_trgm` and `unaccent`. Add the immutable function `fold(text)` = lower(unaccent(text)).

**Interfaces — Produces:**
- `logos_etl.db.connect() -> psycopg.Connection`, which reads `DATABASE_URL`
- `logos_etl.migrate.run() -> list[str]`, which applies unapplied files in a `schema_migrations` table
- npm scripts: `dev`, `build`, `test` (vitest), `e2e` (playwright), `db:migrate` (`python -m logos_etl.migrate`), `etl` (`python -m logos_etl.run_all`)

- [ ] **Step 1:** Write `test_migrate.py::test_run_is_idempotent`. It runs `run()` twice; the second call returns `[]`, and table `verse` exists.
- [ ] **Step 2:** Run `cd etl && pytest -q`. It should FAIL because the module is missing.
- [ ] **Step 3:** Implement the scaffold, the migration and the runner.
- [ ] **Step 4:** Run `pytest -q`. It should PASS. Then run `npm run build`, which should succeed with the placeholder home page.
- [ ] **Step 5:** Commit `chore: scaffold Next.js app, Postgres schema and ETL package`.

### Task 2: Books and the source registry

**Files:**
- Create: `db/seed/books.json`. It holds 66 entries `{id, ord, testament, name, abbrevs[]}`. `id` is the OSIS id STEPBible uses (`Gen`…`Rev`, `Jdg`, `Rut`, `1Sa`, `Psa`, `Sng`, `Jhn`, `Php`…). `abbrevs` includes common forms (`Jn`, `John`, `Joh`, `Ps`, `Psalms`, `Song of Songs`, `Canticles`, `1 Cor`, `I Corinthians`…).
- Create: `etl/logos_etl/books.py`, `etl/logos_etl/sources.py`, `etl/logos_etl/fetch.py`, `etl/tests/test_books.py`

**Interfaces — Produces:**
- `books.load() -> list[Book]`
- `books.by_name(name: str) -> Book | None`. It matches case- and space-insensitively on id, name or any abbrev.
- `sources.SOURCES: dict[str, SourceDef]`. It contains the keys from the data-source table, each with url, license and attribution.
- `fetch.ensure(key) -> Path`. It downloads or sparse-clones into `data/raw/<key>/` and records the sha256.
- `sources.register(conn, key, sha256)`

- [ ] **Step 1:** Write tests:
  - `len(load()) == 66`
  - `by_name("1 Cor").id == "1Co"`
  - `by_name("Song of Solomon").id == "Sng"`
  - `by_name("Jn").id == "Jhn"`
  - `by_name("Hezekiah") is None`
- [ ] **Step 2:** Run them; they should FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run them; they should PASS.
- [ ] **Step 5:** Commit `feat(etl): book canon and source registry`.

### Task 3: English translations and the verse table

**Files:**
- Create: `etl/logos_etl/importers/english.py`, `etl/tests/test_english.py`

**Interfaces:**
- Consumes: `books.by_name`, `fetch.ensure`, `sources.register`
- Produces: `english.import_all(conn) -> dict[str, int]`, giving verses per translation. It creates `verse` rows from KJV first, so KJV is the canonical versification. `translation_verse` rows are added for kjv, bsb, ylt, asv, darby and web. WEB verse segments are concatenated per verse, and `para_start` is set from the "paragraph start" markers.

- [ ] **Step 1:** Write tests. `parse_scrollmapper_row(["Genesis","1","1","In the beginning…"])` returns `("Gen",1,1,"In the beginning…")`. `merge_web_segments(sample)` joins split verses and sets `para_start`.
- [ ] **Step 2:** Run them; FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run them; PASS. Run the importer: `SELECT count(*) FROM verse` = 31,102, and each translation has 31,102 rows. If WEB is missing verses, list them in the report rather than failing.
- [ ] **Step 5:** Commit `feat(etl): import KJV, BSB, YLT, ASV, Darby, WEB`.

### Task 4: Hebrew roots, lemmas and lexicon (TBESH + LexicalIndex)

**Files:**
- Create: `etl/logos_etl/importers/lexicons.py`, `etl/logos_etl/text.py`, `etl/tests/test_lexicons.py`, `etl/tests/test_text.py`

**Interfaces — Produces:**
- `text.strip_hebrew(s) -> str`, which removes niqqud and cantillation (U+0591–U+05C7 except letters) and the `/` and `\` separators
- `text.strip_greek(s) -> str`: NFD, drop combining marks, lowercase, ς→σ
- `text.translit_key(s) -> str`, defined as:
  - lowercase, NFD, drop marks
  - remove `' ʼ ʿ . - ’`
  - map `ch→h`, `kh→h`, `ḥ→h`, `sh→s`, `ts→ts`, `ph→f`, `th→t`, `y→i` (vowel position only), `ē→e`, `ō→o`
  - collapse doubled letters
  - Tests pin: `translit_key("che.sed") == translit_key("ḥeseḏ") == translit_key("chesed") == translit_key("hesed")`, `translit_key("agapē") == translit_key("agape")`, `translit_key("tsedaqah") == translit_key("ṣədāqâ")`
- `lexicons.import_tbesh(conn)`, `lexicons.import_tbesg(conn)`, `lexicons.import_roots(conn)`, `lexicons.import_morph_codes(conn)`
- Lemma ids are the TBESH/TBESG `dStrong` column with " =" stripped (e.g. `H2617A`, `G0026`). `strongs` is the base number without its letter.
- Roots link a Hebrew lemma to a root through LexicalIndex `<etym type="sub">` chains, matched on `xref@strong` + `aug`.

- [ ] **Step 1:** Write tests:
  - the `strip_*` and `translit_key` cases above
  - `parse_tbesh_line(line_H2617a)` returns `id=="H2617A"`, `gloss=="kindness"`
  - `parse_tbesg_line(line_G0026)` returns `lemma=="ἀγάπη"`
- [ ] **Step 2:** Run them; FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run them; PASS. After import, check that H2617A and H2617B both exist, that `root` for H2617A has letters `חסד`, and that G2643 exists.
- [ ] **Step 5:** Commit `feat(etl): Hebrew/Greek lexicons, roots and morphology codes`.

### Task 5: Hebrew OT tokens + versification (TAHOT)

**Files:**
- Create: `etl/logos_etl/importers/tahot.py`, `etl/tests/test_tahot.py`

**Interfaces — Produces:**
- `tahot.parse_line(line) -> TahotWord | None`. Fields: `eng_ref` (`Mal.4.1`), `heb_ref` (`Mal.3.19`, or equal to eng), `pos`, `type`, `surface`, `translit`, `gloss`, `lemma_id` (the `{…}` braced dStrong, e.g. `H7225G`; fall back to the first non-prefix code), `morph`.
- Import rule: keep word types starting with `L`, `Q` or `K`. Skip `X` (LXX additions) and `R`/`V`, and count the skipped ones in the report.
- `versification_map(scheme='heb', source_ref=heb_ref, verse_id)` gets a row wherever `heb_ref != eng_ref`.

- [ ] **Step 1:** Write tests:
  - `parse_line` on the `Gen.1.1#01` sample gives `lemma_id=="H7225G"` and `gloss=="in/ beginning"`
  - on the `Mal.4.1(3.19)#01` sample it gives `heb_ref=="Mal.3.19"`
  - a type-`X` line is flagged as skipped
  - every `H2617A`/`H2617B` token's `lemma_id` exists in `lemma` (an integration test, skipped when there is no DB)
- [ ] **Step 2:** Run them; FAIL.
- [ ] **Step 3:** Implement with `COPY`.
- [ ] **Step 4:** Run them; PASS. After import:
  - OT verses with at least one token ≥ 23,100
  - `versification_map` contains `heb/Mal.3.19 → Mal.4.1`
  - tokens of H2617A ≈ 240 (report the exact number)
- [ ] **Step 5:** Commit `feat(etl): import Hebrew OT tokens with versification map`.

### Task 6: Greek NT tokens (TAGNT, SBLGNT edition)

**Files:**
- Create: `etl/logos_etl/importers/tagnt.py`, `etl/tests/test_tagnt.py`

**Interfaces — Produces:**
- `tagnt.parse_line(line) -> TagntWord | None`. Fields: `ref`, `pos`, `surface` (the Greek before " ("), `translit` (inside the parentheses), `gloss`, `lemma_id` (the dStrong before `=`), `morph`, `editions: set[str]`.
- Only words whose `editions` contain `SBL` are imported.

- [ ] **Step 1:** Write tests:
  - the `Mat.1.1#01` sample parses to `surface=="Βίβλος"`, `lemma_id=="G0976"`, `morph=="N-NSF"`, `"SBL" in editions`
  - a TR-only word is excluded
- [ ] **Step 2:** Run them; FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run them; PASS. After import:
  - G0026 token count is in the range 115–118
  - every NT token's verse exists
  - list the KJV NT verses that have no SBL tokens (expected to include Mat.17.21 and Act.8.37)
- [ ] **Step 5:** Commit `feat(etl): import SBLGNT tokens from TAGNT`.

### Task 7: Validation report and the `run_all` pipeline

**Files:**
- Create: `etl/logos_etl/run_all.py`, `etl/logos_etl/validate.py`, `etl/tests/test_validate.py`
- Output: `docs/reports/phase2-import.md`

**Interfaces — Produces:**
- `validate.report(conn) -> Report`, with `checks: list[Check(name, expected, actual, ok)]`
- `validate.render_markdown(report) -> str`

**Checks:**
- verses = 31,102 / 23,145 / 7,957
- each translation = 31,102
- every `source.license` is non-empty
- no tokens have a `lemma_id` missing from `lemma` (report the count, threshold 0.1%)
- the Hebrew versification-map row count
- skipped-token counts
- NT verses without SBL text (as a listed note)

The script exits non-zero if a hard check fails.

- [ ] **Step 1:** Write a test: `render_markdown` of a report with one failing check contains `❌` and the check name.
- [ ] **Step 2:** Run it; FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run etl`; the report is all ✅ on hard checks. Commit the report.
- [ ] **Step 5:** Commit `feat(etl): validation report; Phase 2 complete`.

---

### Task 8: Search query parser (TypeScript, TDD)

**Files:**
- Create: `lib/search/parse.ts`, `lib/search/normalize.ts`, `lib/books.ts` (imports `db/seed/books.json`), `lib/search/parse.test.ts`, `lib/search/normalize.test.ts`

**Interfaces — Produces:**
```ts
type Query =
  | { kind: 'reference'; book: string; chapter: number; verse?: number; endChapter?: number; endVerse?: number }
  | { kind: 'strongs'; candidates: string[] }          // e.g. ['H2617'] or ['H0026','G0026']
  | { kind: 'hebrew'; plain: string }
  | { kind: 'greek'; plain: string }
  | { kind: 'text'; raw: string; translitKey: string } // English word, transliteration or topic
  | { kind: 'empty' };
export function parseQuery(input: string): Query;
export function stripHebrew(s: string): string;  // same rules as etl/text.py
export function stripGreek(s: string): string;
export function translitKey(s: string): string;  // same rules as etl/text.py
```

- [ ] **Step 1:** Write table-driven tests covering at least these cases:
  - `"Jn 3:16"`, `"John 3.16"` and `"jhn 3 16"` give `{reference, Jhn, 3, 16}`
  - `"1 Cor 13"` and `"I Corinthians 13"` give `{1Co, 13}`
  - `"1 Cor 13:4-7"` gives verse 4 and endVerse 7
  - `"Gen 1:1–2:3"` (en dash) gives endChapter 2 and endVerse 3
  - `"Ps 23"` and `"Psalm 23"` give `Psa`
  - `"Gen.1.1"` (OSIS) is recognised
  - `"H2617"`, `"h2617"` and `"H2617A"` give `['H2617A']` or the normalised `['H2617']`. Strong's numbers are zero-padded to 4 digits, and the letter is kept if present.
  - `"G26"` gives `['G0026']`
  - `"Strong's 26"` and `"2617"` give both H and G candidates
  - `"חֶסֶד"` and `"חסד"` give `{hebrew, 'חסד'}`
  - `"ἀγάπη"` gives `{greek, 'αγαπη'}`
  - `"hesed"` and `"chesed"` give `text` with an equal `translitKey`
  - `"grace"` gives `text`
  - `""` gives `empty`
  - `"Hezekiah 1:1"` gives `text`, not `reference`
  - the shared translit cases from Task 4 hold
- [ ] **Step 2:** Run `npx vitest run lib/search`; FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it; PASS.
- [ ] **Step 5:** Commit `feat(search): query parser with reference, Strong's and script detection`.

### Task 9: Design system, theme studio and typography

**Files:**
- Create: `lib/theme/presets.ts`, `lib/theme/contrast.ts`, `lib/theme/contrast.test.ts`, `lib/theme/presets.test.ts`
- Create: `components/theme/ThemeProvider.tsx`, `components/theme/ThemeStudio.tsx`, `components/theme/ThemeScript.tsx` (an inline script that sets attributes before paint)
- Modify: `app/globals.css` (tokens), `app/layout.tsx`
- Fonts: `@fontsource/nunito-sans`, `@fontsource/noto-serif-hebrew`, `@fontsource/gentium-plus` (OFL, self-hosted)

**Interfaces — Produces:**
- `PRESETS: Record<PresetId, {name: string; light: Palette; dark: Palette}>`, where `PresetId = 'parchment'|'lapis'|'tekhelet'|'olive'|'sepia'|'contrast'`
- `Palette = {bg, surface, surface2, ink, muted, accent, accent2, border, hebrew, greek}` (hex strings)
- `contrastRatio(a: string, b: string): number`
- `paletteFromAccent(hex: string, mode: 'light'|'dark'): Palette`
- The `<html>` element carries `data-preset`, `data-mode` (`light|dark|system`), `style="--fs-scale"`. Choices are stored in `localStorage['logos.theme']` and the `logos-theme` cookie.
- CSS tokens: `--bg`, `--surface`, `--surface-2`, `--ink`, `--muted`, `--accent`, `--accent-2`, `--border`, `--hebrew`, `--greek`, mapped into the Tailwind theme.

- [ ] **Step 1:** Write tests:
  - `contrastRatio('#000','#fff') ≈ 21`
  - every preset × mode has `ink`-on-`bg` ≥ 4.5 and `muted`-on-`bg` ≥ 4.5
  - `paletteFromAccent('#7c3aed','dark')` has ink/bg ≥ 4.5
- [ ] **Step 2:** Run them; FAIL.
- [ ] **Step 3:** Implement. The Theme Studio is a slide-over panel with:
  - preset swatches
  - a light/dark/system toggle
  - a custom accent `<input type="color">`
  - a font-size slider (0.9–1.3)
  - a live preview of Hebrew and Greek samples
- [ ] **Step 4:** Run them; PASS.
- [ ] **Step 5:** Commit `feat(ui): theme studio with six presets, custom accent and typography`.

### Task 10: Database access layer

**Files:**
- Create: `lib/db/client.ts`, `lib/db/queries.ts`, `lib/db/queries.test.ts` (integration; skipped if `DATABASE_URL` is unset)

**Interfaces — Produces:**
- `getVerse(osis: string): Promise<VerseView | null>`. `VerseView = {osis, book, chapter, verse, translations: {id, name, text}[], tokens: TokenView[], hebRef?: string, prev?: string, next?: string}`
- `getChapter(book: string, chapter: number): Promise<VerseView[]>`
- `getLemma(id: string): Promise<LemmaView | null>`. `LemmaView = {id, strongs, language, lemma, translit, pos, gloss, lexicon: {source, html}[], root?: {letters, gloss, family: LemmaRef[]}, senses: LemmaRef[] /*same strongs, other letter*/, count: number, distribution: {book: string, count: number}[], glosses: {gloss: string, count: number}[]}`
- `getOccurrences(lemmaId: string, page: number, pageSize = 50): Promise<{osis, surface, gloss, kjv: string}[]>`
- `searchLemmas(q: Query): Promise<LemmaRef[]>`, where `LemmaRef = {id, lemma, translit, gloss, language, count}`
- `searchText(raw: string, limit = 20): Promise<{osis, translation, snippet}[]>`
- `listSources(): Promise<Source[]>`

- [ ] **Step 1:** Write tests:
  - `getVerse('Mal.4.1')` has `hebRef === 'Mal.3.19'` and Hebrew tokens
  - `getLemma('H2617A')` has `count > 200` and `root.letters === 'חסד'`
  - `searchLemmas({kind:'hebrew', plain:'חסד'})` includes H2617A
  - `searchLemmas({kind:'strongs', candidates:['H2617']})` includes both H2617A and H2617B
- [ ] **Step 2:** Run them; FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run them; PASS.
- [ ] **Step 5:** Commit `feat(db): typed query layer for verses, lemmas and search`.

### Task 11: Universal search (header bar, results page and API)

**Files:**
- Create: `components/search/SearchBar.tsx`, `app/search/page.tsx`, `app/api/suggest/route.ts`, `lib/search/run.ts`, `lib/search/run.test.ts`

**Interfaces:**
- Consumes: `parseQuery`, the queries from Task 10
- Produces: `runSearch(input: string): Promise<SearchResult>`. `SearchResult = {query: Query; redirect?: string; groups: {module: 'Words'|'Verses'|'Topics'; items: {href, title, subtitle, lang?}[]}[]; notice?: string}`

**Rules:**
- A reference to an existing single verse redirects to `/verse/<osis>`.
- A reference to a chapter redirects to `/verse/<book>.<ch>.1#chapter`.
- A reference to a non-existent verse returns `notice: "No such verse — <Book> has N chapters"` plus the nearest valid chapter.
- An exact single-lemma Strong's match redirects to `/word/<id>`.
- The SearchBar has ⌘K / `/` focus, debounced suggestions (`/api/suggest`), keyboard navigation and an RTL-aware input.

- [ ] **Step 1:** Write tests:
  - `runSearch('John 3:16').redirect === '/verse/Jhn.3.16'`
  - `runSearch('John 30:1').notice` includes `'21 chapters'`
  - `runSearch('hesed').groups[0].items` includes `/word/H2617A`
  - `runSearch('2617')` has items for both H and G
- [ ] **Step 2:** Run them; FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run them; PASS.
- [ ] **Step 5:** Commit `feat(search): universal search bar, suggestions and grouped results`.

### Task 12: Word Study page

**Files:**
- Create: `app/word/[id]/page.tsx`, `components/word/WordHeader.tsx`, `components/word/StudyCard.tsx`, `components/word/RootTree.tsx`, `components/word/Distribution.tsx`, `components/word/Concordance.tsx`, `components/word/GlossBars.tsx`, `components/ui/TypeChip.tsx`, `components/ui/SourceLine.tsx`

**Layout:**
- **Header:** the lemma in large script, transliteration, Strong's/dStrong, POS, a gloss chip, and links to sibling senses (A/B).
- **Stacked expandable `StudyCard`s, in order:**
  1. Meaning (lexicon HTML, sanitised)
  2. Root & family: a D3 radial tree, with the root at the centre and family lemmas as nodes, sized by occurrence count. Clicking a node navigates.
  3. How it's translated: horizontal bars of the gloss counts from tokens.
  4. Where it appears: a distribution sparkline across the 66 books, with clickable bars, plus a paginated concordance with the KJV snippet.
  5. Placeholder cards for Culture, Translation history, Relational lens, Voices and Fathers. They show the "Coming in Phase 4" empty state; nothing is invented.
- Every card shows a `TypeChip` (Meaning = "Lexical fact") and a `SourceLine` with the source attribution.
- Cards are `<details>`-based, so they work without JS, and animate open when motion is allowed.

- [ ] **Step 1:** Write the Playwright test `e2e/word.spec.ts`. At 390×844, `/word/H2617A` shows `חֶ֫סֶד` with `dir="rtl"` and a "Lexical fact" chip, and opening "Where it appears" shows at least 1 concordance row linking to `/verse/`. `/word/G0026` shows `ἀγάπη`.
- [ ] **Step 2:** Run `npm run e2e -- word`; FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it; PASS.
- [ ] **Step 5:** Commit `feat(word): word study page with root tree, gloss bars and concordance`.

### Task 13: Verse Lookup with interlinear

**Files:**
- Create: `app/verse/[osis]/page.tsx`, `components/verse/Interlinear.tsx`, `components/verse/WordPopover.tsx`, `components/verse/ParallelTranslations.tsx`, `components/verse/ChapterNav.tsx`, `components/verse/InterlinearToggles.tsx`

**Behaviour:**
- **Interlinear:** word blocks laid out RTL for Hebrew and LTR for Greek. Each block stacks surface, translit, morph code (expanded label on hover) and gloss. Toggles show or hide the rows, and the choice persists in `localStorage`.
- **Word popover:** hovering or focusing a word shows lemma, gloss and parsing. Clicking opens `/word/<lemma_id>`.
- **Parallel translations:** six English cards. A user-chosen primary translation is shown first.
- **Versification note:** when `hebRef` differs, a banner reads "Hebrew numbering: Mal 3:19".
- **Navigation:** previous/next verse, a chapter grid, and swipe on mobile.
- **NT verses with no SBLGNT text:** a note reading "Not in SBLGNT (later manuscripts)" with a `Contested` type chip.

- [ ] **Step 1:** Write the Playwright test `e2e/verse.spec.ts`:
  - `/verse/Jhn.3.16` shows `ἠγάπησεν`, and hovering it shows a popover with "love"
  - the KJV text contains "only begotten"
  - `/verse/Mal.4.1` shows "Hebrew numbering"
  - `/verse/Mat.17.21` shows "Not in SBLGNT"
- [ ] **Step 2:** Run it; FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it; PASS.
- [ ] **Step 5:** Commit `feat(verse): interlinear verse lookup with popovers and parallel translations`.

### Task 14: Home, sources page and polish

**Files:**
- Create: `app/page.tsx` (hero search, a "Begin with" row of the ten example words, a verse of the day from a fixed list), `app/sources/page.tsx` (license and attribution table from `listSources()`), `components/layout/Header.tsx`, `components/layout/Footer.tsx` (attribution line plus a link to /sources), `e2e/home.spec.ts`

- [ ] **Step 1:** Write the Playwright test. On a phone viewport, the home page has no horizontal scroll (`scrollWidth <= innerWidth`). Searching "hesed" and pressing Enter reaches `/word/H2617`*. `/sources` lists "CC BY 4.0" and "STEP Bible". Switching the preset to "Midnight Lapis" changes the `data-preset` attribute and survives a reload.
- [ ] **Step 2:** Run it; FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test && npm run e2e && npm run build`; everything PASSES.
- [ ] **Step 5:** Commit `feat(ui): home, sources page; Phase 3 MVP complete`. Push and check in with the owner.
