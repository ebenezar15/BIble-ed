# Logos Relational

A personal Hebrew and Greek Bible study app, read through a relational-gospel lens. Type any English word, Hebrew or
Greek word, transliteration, Strong's number or verse reference and get the original word, its root, its range of
meaning, how it has been translated, how the relational tradition reads it, and where the Church Fathers used it —
all with sources and visible content labels.

**Running it:** see [docs/DEPLOY.md](docs/DEPLOY.md) (your computer, or online for your phone).

## What's inside

| Area | Pages |
|---|---|
| Search | One box for words, Hebrew/Greek, transliterations, Strong's numbers, references, names and library topics |
| Word study | `/word/<id>` — lexicon, root tree, translation counts, concordance by book, Septuagint bridge, culture, translation history, relational reading, the legal reading's history, voices, Fathers, your notes |
| Verse lookup | `/verse/<ref>` — interlinear with grammar pop-ups, six public-domain translations, cross-references, Church Fathers, related parables/structures, your notes |
| Modules | `/books`, `/topics` (NT dating, canon, manuscripts), `/jesus`, `/parables`, `/names`, `/torah` (festival wheel, tabernacle plan, sacrifices, laws, covenants, christophanies, numbers, types, chiasm ladders), `/history` (Fathers, timeline, denominations, doctrines), `/rome` |
| Ask | `/ask` — questions answered only from the library, every claim numbered to a source (needs `ANTHROPIC_API_KEY`) |
| Editing | `/edit?subject=…` — add or change blocks, add citations, mark them checked, mark blocks reviewed; `/notes` with Markdown/JSON export |
| App | Theme studio (six palettes, light/dark, your own colour, text size), installable PWA with offline pages, pronunciation where the device has a Hebrew/Greek voice |

## Editorial rules (enforced in data)

Every block carries a type label: Lexical fact, Historical fact, Scholarly interpretation (with the person named),
Lens commentary, Contested, or How the legal reading arose. A named view without a citation shows **Source needed**;
seeded citations show **Citation to check** (or **Page reference needed** for copyrighted books) until you mark them
checked. Content drafted with AI is labelled **AI-drafted, not yet reviewed** until you review it. Copyrighted books
are referenced by title, never reproduced. `content/AUTHORING.md` and `content/SCHEMA.md` define the rules, and
`python3 -m logos_etl.content_check` enforces them.

## Data and licences

Only open-licensed or public-domain data is imported; the `/sources` page lists each source with its licence.
STEPBible data (Hebrew and Greek text, tagging, lexicons, names) CC BY 4.0; OpenScriptures Hebrew Lexicon CC BY 4.0;
OpenBible.info cross-references CC BY; KJV, BSB, WEB, YLT, ASV and Darby public domain; Church Fathers from
public-domain translations only (ANF/NPNF, Newman's Catena Aurea). The import report is in
`docs/reports/phase2-import.md`.

## Tests

```bash
npm test                       # Vitest: search, theme, content, queries, editor, Ask retrieval
cd etl && python3 -m pytest    # import parsers, validators, content rules
npm run build && npm run e2e   # Playwright, phone-sized
```
