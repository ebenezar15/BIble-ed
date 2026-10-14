# Content seed format

Every file in `content/*.json` is imported by `npm run etl` (step "content"). Each file is one JSON object:

```json
{
  "people":  [Person],
  "works":   [Work],
  "entries": [Entry],
  "blocks":  [Block]
}
```

All keys are optional. Ids are lowercase-kebab slugs and must be unique across all files.

## Person
`{ "id": "irenaeus", "name": "Irenaeus of Lyons", "born": 130, "died": 202, "era": "Ante-Nicene", "tradition": "Early Church", "roles": ["father"], "summary": "One or two plain sentences." }`
- `born`/`died`: integer years (negative = BC) or null. Roles: father, scholar, teacher, reformer, theologian, historian, pastor, author.

## Work
`{ "id": "irenaeus-against-heresies", "person": "irenaeus", "title": "Against Heresies", "year": 180, "copyright": "public_domain", "edition": "ANF vol. 1", "publisher": null, "isbn": null, "url": null }`
- `copyright`: `public_domain` or `copyrighted`. Copyrighted works: bibliographic data only — never text or quotes.
- Unknown fields are `null`. Never guess an ISBN, publisher or year.

## Entry (a page in a module)
`{ "kind": "parable", "slug": "prodigal-son", "title": "The Lost Son", "subtitle": "…", "summary": "1–3 sentences", "refs": ["Luk.15.11-Luk.15.32"], "lemmas": ["G0025"], "order": 10, "data": { … } }`
- `refs`: OSIS refs `Book.C.V` or ranges `Book.C.V-Book.C.V`, book ids from `db/seed/books.json`.
- `lemmas`: STEP lemma ids that exist in the `lemma` table.
- `kind` and its `data` fields are listed below.

## Block (one typed, sourced piece of prose)
```json
{
  "subject": "lemma:H2617A",
  "section": "lens",
  "title": "Optional heading",
  "type": "lens_commentary",
  "by": null,
  "consensus": "n/a",
  "body": "Markdown. Scripture refs written like Exod 34:6 are linked automatically.",
  "citations": [{ "work": "irenaeus-against-heresies", "ref": "Against Heresies 5.16.3", "verified": false, "url": null }]
}
```
- `subject`: `lemma:<id>`, `verse:<osis>`, `entry:<kind>/<slug>`, or `person:<id>`.
- `type`: `lexical_fact | historical_fact | scholarly_interpretation | lens_commentary | contested | legal_reading_history`.
- `section` (where it shows): `overview, meaning, culture, translation_history, lens, legal_history, voices, fathers, structure, background, fulfillment, misunderstanding, hearers, dating, authorship, outline, themes, christ, history, practice, caution, notes`.
- `by`: person id; **required** for `scholarly_interpretation`.
- `consensus`: `consensus | majority | minority | n/a`.

## Editorial rules (enforced by `python3 -m logos_etl.content_check`)
1. `scholarly_interpretation` needs `by` and at least one citation. Claims about what a person taught always carry a citation.
2. Every seeded citation has `"verified": false`. The owner verifies in the editor. Unverified citations display "Citation to check"; blocks with no citation that need one display "Source needed".
3. A citation to a `copyrighted` work may name chapter/section only if known; **never a page number you have not seen**, and never a `quote`.
4. `legal_reading_history` blocks explain how a forensic reading arose; they are never the app's view.
5. Lens commentary leads with the relational reading (Father, union, sonship, Jesus as perfect theology, Christus Victor/restorative justice).
6. Mark minority positions `minority` (e.g. early NT dating) and disputed matters `contested`.

## Entry kinds and `data`
- `book`: `{ "testament", "genre", "author_traditional", "author_views": [{"view","support","consensus"}], "date_views": [{"view","range","arguments","consensus"}], "audience", "setting", "outline": [{"ref","title"}], "themes": [] }`
- `essay`: `{}` (content lives in blocks, sections in order).
- `jesus_word`: `{ "phrase", "greek", "aramaic", "hebrew" }`
- `parable`: `{ "gospels": ["Luk"], "setting" }`
- `festival`: `{ "hebrew", "transliteration", "month": 1-12 (1 = Nisan), "day_start", "day_end", "season", "pilgrim": bool }`
- `sacrifice`: `{ "hebrew", "transliteration", "animals": [], "portion" }`
- `law`: `{ "category", "jesus_refs": [] }`
- `covenant`: `{ "parties", "sign", "promise" }`
- `christophany`: `{ "form" }`
- `number`: `{ "value", "caution": "Why not to over-read it" }`
- `typology`: `{ "type", "antitype", "type_refs": [], "antitype_refs": [] }`
- `structure`: `{ "form": "chiasm|inclusio|parallelism", "levels": [{"label":"A","ref":"Gen.6.10","text":"…"}, … , {"label":"X",…}, … {"label":"A′",…}] }`
- `tabernacle`: `{ "zone": "courtyard|holy|most_holy", "x": 0-100, "y": 0-100, "material" }`
- `timeline`: `{ "year", "end_year", "category": "apostolic|father|council|schism|reformation|revival|mission|modern|persecution|text" }`
- `denomination`: `{ "founded", "founders": [], "family", "distinctives": [] }`
- `doctrine`: `{ "steps": [{"year","who","what"}] }`
- `roman_term`: `{ "greek", "latin", "category": "political|legal|religious|social|military" }`
