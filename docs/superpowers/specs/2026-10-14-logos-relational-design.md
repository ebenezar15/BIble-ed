# Logos Relational — Design Spec

Date: 2026-10-14 · Status: awaiting owner review · Branch: `claude/clever-faraday-alww9n`

## 1. Purpose and success criteria

A personal, mobile-friendly web app (installable as a PWA later) for deep Hebrew/Greek word and verse study, read through a relational-gospel lens. One search box accepts an English word, Hebrew/Greek (with or without pointing/accents), transliteration, Strong's number, verse reference or topic. It returns a sourced, typed, interactive study page.

**Audience:** a single user (the owner). There are no public accounts. A simple password protects the deployment.

**Success means:**
- Phase 2 imports reconcile to known counts: 31,102 verses in KJV versification (OT 23,145, NT 7,957). Hebrew-versification counts are mapped and reported.
- Every displayed content block shows its type label and sources. Any claim about a person's teaching that lacks a verified citation shows **"Source needed"**.
- Every source's license and attribution appear in the database and in the UI.
- Search parsing has automated tests (references, transliteration, Strong's).
- The app feels interactive and creative, not like a static reference: themeable, with visual exploration tools (see §7).

## 2. Editorial rules (enforced by the data model)

1. The relational reading leads. Legal/forensic traditions appear only in blocks of type **Legal-reading history** ("How the legal reading arose"). These are never presented as the app's view.
2. Claims about what a person taught require a `Citation` with `verified = true`. Otherwise the UI renders "Source needed". Quotes are never fabricated, and page numbers are never written from memory.
3. Every `ContentBlock` has exactly one type: `lexical_fact | historical_fact | scholarly_interpretation | lens_commentary | contested | legal_reading_history`.
4. Every block carries a `consensus` marker: `consensus | majority | minority | n/a` (e.g. early NT dating = minority).
5. **Authorship (owner decision: "a mix"):** Claude may draft lens commentary and summaries. Drafts carry `status = draft` and an "AI-drafted, unreviewed" badge until the owner marks them `reviewed`. Owner-written blocks are `reviewed` on save.
6. Copyrighted books: only bibliographic metadata, page references, links to verses/lemmas, and summaries in the owner's own words are stored. Excerpts live only in private `UserNote`s.

## 3. Architecture

| Layer | Choice |
|---|---|
| App | Next.js (App Router) + TypeScript + Tailwind CSS |
| DB | PostgreSQL 16 with `pg_trgm`, `unaccent`, full-text search; `pgvector` added in Phase 8 |
| ORM / migrations | Drizzle ORM + drizzle-kit |
| ETL | Python 3.12, one module per source in `etl/sources/`, a shared `etl/validate/` |
| Visualisation | D3 (root tree, word-journey flow, timeline); hand-built SVG components (chiasm, tabernacle, calendar wheel) |
| Tests | Vitest (unit, search parser), Playwright (e2e), pytest (ETL + validation) |
| Hosting | Local dev via Docker Compose (Postgres). Deploy target is a personal Vercel + Neon free tier behind a password middleware. This can be swapped for any Postgres host. |
| Offline (Phase 9) | A read-only SQLite export of core text and lexicons, used client-side |

Repository layout:

```
app/                 Next.js routes (search, word/[id], verse/[ref], modules…)
components/          UI (cards, interlinear, theme studio, visualisations)
lib/search/          query parser + normaliser (pure, heavily tested)
lib/db/              Drizzle schema + queries
etl/                 Python importers, validators, reports
data/raw/            downloaded datasets (git-ignored, checksummed)
docs/                specs, plans, licensing register
```

## 4. Data sources and licensing register

Licenses are re-verified at import time. The importer records `license`, `attribution`, `url`, `version` and `sha256` in `source`, and refuses to import without them.

| Data | Source | License (verified 2026-10-14 where noted) |
|---|---|---|
| Hebrew OT + morphology | OpenScriptures `morphhb` (WLC) | WLC public domain; morphology CC BY 4.0 |
| Greek NT | SBLGNT | **CC BY 4.0** (verified: sblgnt.com). Attribution "SBLGNT" with a link is required in the UI |
| Greek morphology | MorphGNT (SBLGNT) | CC BY-SA 3.0. Share-alike applies to derived morphology tables |
| Tagging + lexicons | STEPBible-Data: TAHOT, TAGNT, TBESH, TBESG | Repo states **CC BY 4.0** (verified: GitHub README). A per-file LICENSE check happens at import, because an older STEP wiki page lists CC BY-NC-ND 3.0 |
| Lexicons | Strong's, BDB, Thayer; Abbott-Smith (digitisation CC BY-SA) | Public domain / CC BY-SA |
| English | KJV, WEB, BSB, YLT, ASV, Darby | Public domain |
| Copyrighted English | ESV, NIV, NASB, etc. | Named only, never stored |
| Septuagint | See decision below | — |
| Church Fathers | Schaff ANF/NPNF | Public domain text, taken from public-domain transcriptions |
| Josephus / Philo | Whiston / Yonge | Public domain |
| Mishnah | To be decided at Phase 7 | Licenses vary (Danby, Sefaria); verified before import |

**Septuagint decision (owner accepted the recommendation, "check STEPBible first"):** Phase 2 checks, in this order:
1. Any STEPBible LXX tagging, together with its per-file license.
2. Swete's LXX text (public domain), with a CC-licensed lemmatisation if one exists.
3. Rahlfs text with CATSS-derived morphology. Because the app is personal, this is acceptable if needed. It is stored with `redistributable = false`, and that flag blocks it from any future public export.

The chosen option is recorded in the licensing register before the import is written.

## 5. Data model

All prose lives in `content_block`. Module tables stay thin.

**Text layer**
- `source` (id, name, license, attribution, url, version, sha256, redistributable, notes)
- `book` (osis_id, names, testament, canon_order, genre, …)
- `verse` (id, book, chapter, verse, canonical_ref). **The canonical scheme is KJV/English versification.**
- `versification_map` (scheme, source_ref → canonical_ref). Covers Hebrew vs English differences such as Malachi 3:19–24 / Malachi 4, Psalm superscriptions, and Joel 3/4.
- `token` (verse, position, surface, normalized, transliteration, lemma_id, morph_code, strongs, step_id, gloss, source_id). This is the backbone of the concordance and interlinear.
- `translation` / `translation_verse` (translation_id, verse_id, text)
- `morphology_code` (code, language, parsed fields, human label)

**Lexical layer**
- `lemma` (id, language, script, transliteration, pronunciation, strongs[], step_id, root_id)
- `root` (id, language, letters); `lemma_family` (lemma ↔ related lemma, relation: derived/compound/cognate)
- `lexicon_entry` (lemma_id, source_id, headword, body)
- `semantic_domain` + `lemma_domain`
- `lxx_mapping` (hebrew_lemma, greek_lemma, count, sample_verses[], source_id)
- `translation_rendering` (lemma_id, translation, rendering, count). Feeds the word-journey visual.

**Editorial layer**
- `content_block` (id, type, title, body_md, consensus, status draft/reviewed, author: owner/claude, created/updated)
- `subject_link` (block_id, subject_kind, subject_id, order). Polymorphic attachment to lemma, verse, topic, parable, festival, etc.
- `citation` (id, block_id, work_id, location: chapter/section/page/paragraph, quote_md nullable, verified bool, verified_by, verified_at)
- `person` (id, name, dates, tradition, role: scholar/father/teacher, bio_block_id)
- `work` (id, person_id, title, edition, publisher, year, isbn, copyright_status, public_domain_text_source_id nullable)
- `topic` + `topic_link`
- `user_note` (id, subject_kind, subject_id, work_id nullable, page, excerpt_md, private = true)

**Module tables (thin):** `name_entry`, `parable`, `festival`, `sacrifice`, `law`, `covenant`, `chiasm_structure` (verse_range, levels JSON), `christophany`, `number_symbol` (with a `caution` flag), `timeline_event`, `denomination`, `doctrine`, `roman_term`.

**Constraint:** if a `content_block` has `type = scholarly_interpretation` and has no `citation` with `verified = true`, it renders with a "Source needed" banner. This is tested.

## 6. Search

`lib/search/parse.ts` classifies a query into one of: `reference | strongs | hebrew | greek | transliteration | english | topic`. It is a pure function with a large table-driven test suite.
- **References:** "Jn 3:16", "John 3.16", "1 Cor 13", "I Corinthians 13:4-7", "Ps 23", "Gen 1:1–2:3", OSIS ids.
- **Strong's:** "H2617", "h2617", "G26", "G0026", "Strong's 26" (ambiguous → ask Hebrew or Greek).
- **Hebrew:** strip niqqud and cantillation. **Greek:** strip accents and breathings, and fold final sigma.
- **Transliteration:** normalise to a folded key (e.g. "hesed / chesed / ḥeseḏ" → `hesed`; "agape / agapē" → `agape`), then trigram-match.
- **English:** full-text search over glosses, lexicon definitions and translations.

Results are grouped by module. Fuzzy matching uses `pg_trgm`.

## 7. UI / UX and interactivity

**Typography**
- UI and body font stack (owner chose 1b): `"Avenir Next", "Avenir", "Nunito Sans", system-ui, sans-serif`. Avenir Next is used where the device has it (Apple). Nunito Sans (SIL OFL, self-hosted) is the look-alike fallback. Avenir is never bundled.
- Hebrew: Ezra SIL / Noto Serif Hebrew (OFL), with `dir="rtl"` and larger optical size.
- Greek: Gentium Plus (OFL).

**Theme studio**
- Every color is a CSS custom-property token, and Tailwind reads the tokens.
- Each preset has a light and a dark variant:
  - *Parchment*: warm cream, ink brown, gold accent
  - *Midnight Lapis*: deep navy, lapis, silver
  - *Tekhelet*: tabernacle blue, purple and scarlet accents
  - *Olive & Clay*: olive green, terracotta, linen
  - *Sepia Scroll*: low-glare reading mode
  - *High Contrast*: accessibility-first
- A custom accent picker generates a palette from one hue and checks it against WCAG AA contrast.
- A font-size slider and Hebrew/Greek size controls.
- Choices persist in `localStorage` and a cookie (to avoid a flash of the wrong theme on load).

**Interactive surfaces (introduced across phases)**
- **Word page:** stacked expandable cards (Meaning → Root → Culture → Translation history → Relational lens → Voices → Fathers). Each card shows its type-label chip and citations.
- **Root tree:** a radial D3 graph of a Hebrew triliteral root, or a Greek stem and its compounds. Click a node to open it.
- **Word journey:** an animated flow Hebrew → LXX → NT Greek → Vulgate → Luther/Tyndale → KJV → modern. Hover to see the rendering and its rationale.
- **Interlinear:** hover a word for its gloss and parsing, click for the full study, and toggle rows on or off.
- **Chiasm ladder:** an animated, indented A-B-C-B′-A′ diagram linked to the verses.
- **Calendar wheel** (festivals), **tabernacle floor plan** (clickable SVG), and **zoomable timeline** (church history).
- **Concordance:** a sparkline showing a word's distribution across the canon.

Motion respects `prefers-reduced-motion`. Layouts are mobile-first.

## 8. Seed content: people and works

**Owner-confirmed works**
- C. Baxter Kruger, *Jesus and the Undoing of Adam*
- Phil Bray, *Leviticus on the Butcher's Block*
- Kenneth Tanner, *The Vulnerable God*
- Martin Trench, *The God Who Never Changed*
- Eitan Bar: all books. The bibliography is gathered from the publisher or author listings at seeding time, and each is confirmed with the owner.
- James M. Hamilton Jr., *Typology*
- J. Carl Laney, *Essential Bible Background*
- Darrin W. Snyder Belousek, *Atonement, Justice, and Peace*

Edition, publisher, year and ISBN are filled from verifiable listings, and the owner confirms them. Unknown fields stay empty; they are never guessed.

**Further voices:** Irenaeus, Athanasius, Gregory of Nyssa, T. F. Torrance, J. B. Torrance, Brad Jersak, Bill Johnson, N. T. Wright, Kenneth Bailey, Michael Heiser, J. A. T. Robinson.

**Postmillennial writers (owner: "everyone"):** a broad historical set, for example Jonathan Edwards, B. B. Warfield, J. Marcellus Kik, Loraine Boettner, Iain Murray, Kenneth Gentry, Keith Mathison, Gary DeMar, Douglas Wilson. They are tagged for eschatology. Several hold penal-substitution views, so their `person` record carries a note that their inclusion is for eschatology, not atonement.

**Ten example word studies (Phase 4):** hesed, kipper, shalom, tsedaqah, agapē, dikaiosynē, hilastērion, katallassō, metanoia, huiothesia. Lexical and historical blocks are drawn from imported data. Interpretation blocks start as "Source needed" until the owner verifies them.

## 9. Roadmap (owner check-in at the end of each phase)

1. **Plan** — this spec. ✅ (pending review)
2. **Data import**
   - Scaffold the repo, Docker Postgres and the schema.
   - Import morphhb, SBLGNT + MorphGNT, STEPBible TAHOT/TAGNT/TBESH/TBESG, Strong's/BDB/Thayer, and KJV/WEB/BSB.
   - Build the versification map.
   - Validation report: verse counts, tokens per testament, lemma coverage, and a license row for every source.
   - Carry out the LXX source decision (§4).
3. **MVP + design system**
   - Theme studio and typography.
   - Search parser (TDD).
   - Word Study page (lexical cards, root tree, concordance).
   - Verse Lookup with interlinear and parallel translations.
4. **Content framework**
   - Content blocks, citations, type labels and "Source needed".
   - Authors and works.
   - Editor UI (owner only).
   - Ten worked word studies.
   - Word-journey visual and LXX bridge.
5. **Modules:** Books & dating (incl. early NT dating, manuscripts), Canon, Words of Jesus, Parables, Names.
6. **Modules:** Festivals (calendar wheel), Sacrifices, Laws, Tabernacle, Christophanies, Numbers (caution flags), Literary structures (chiasm ladder), Typology.
7. **Church history:** Fathers library (Schaff import + search), timeline, denominations, "How did we get this doctrine?", Roman context glossary.
8. **AI "Ask":** RAG over the app's own database with pgvector, citations shown, "not in the library" fallback. The API key lives in an environment variable.
9. **PWA/offline**, audio pronunciation, notes export.

## 10. Testing and validation

- `lib/search` has 100% branch coverage from table-driven tests.
- ETL: pytest per importer. `etl/validate` produces a markdown report committed to `docs/reports/` after each import.
- e2e: search → word page → verse page on a phone-size viewport. Theme switching has no contrast regressions (axe).
- Editorial: a test asserts that an unverified interpretation renders "Source needed".

## 11. Out of scope (for now)

Multi-user accounts, public publishing, commercial use, audio recording, and storing any copyrighted translation or book text.
