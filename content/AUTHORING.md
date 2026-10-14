# Authoring brief for content/*.json

Read `content/SCHEMA.md` (format) and `content/people.json` (existing people and works: reuse these ids).

## The lens (editorial stance of the app)
- Relational gospel: God as Father; salvation as restored union and communion, not mainly a legal transaction.
- Sonship and adoption (huiothesia), the Trinity's shared life, union with Christ.
- "Jesus is perfect theology": Jesus is the clearest picture of the Father (Heb 1:3, John 14:9); read Scripture through Him.
- Kingdom of God now and growing; postmillennial eschatology; partial-preterist readings where relevant.
- Atonement through restorative justice, Christus Victor, recapitulation and ransom rather than penal substitution as the main frame.
- Cultural background: Ancient Near East, Second Temple Judaism, Greco-Roman world, Roman legal/political terms, honour/shame, patronage.

## Rules
1. Lead with the relational reading (`lens_commentary`). Where a word or text has a forensic tradition, add a `legal_reading_history` block ("How the legal reading arose": Augustine, Anselm, the Reformation, Calvin, Hodge, Latin *iustitia*, etc.) and say how the relational authors read it differently. Never present the legal reading as the app's view.
2. Every claim about what a named person taught is a `scholarly_interpretation` with `by` and a citation. Cite primary public-domain works by book/chapter/section (e.g. "Against Heresies 5.16.3", "On the Incarnation 8–9"). For copyrighted books cite the title and, only if you are sure, the chapter — **never a page number, never a quote**. All seeded citations are `"verified": false`.
3. If you are not confident a person said something, do not attribute it. Write it as lens commentary or leave it out. Never fabricate quotes, titles or sections.
4. Label honestly: `lexical_fact` (what the lexicon/usage shows), `historical_fact` (dates, events, practices with a primary source or Scripture ref), `scholarly_interpretation` (a named view), `lens_commentary` (the app's own relational reading), `contested` (disputed facts; give the sides). Mark minority views `minority`.
5. Write plainly for an intelligent non-specialist: short paragraphs, concrete, no filler, no hype. Markdown allowed (paragraphs, lists, *italics*, **bold**). Write Scripture refs like "Exod 34:6" or "John 14:9".
6. Use OSIS ids in `refs` (Gen, Exo, Lev, Num, Deu, Jos, Jdg, Rut, 1Sa, 2Sa, 1Ki, 2Ki, 1Ch, 2Ch, Ezr, Neh, Est, Job, Psa, Pro, Ecc, Sng, Isa, Jer, Lam, Ezk, Dan, Hos, Jol, Amo, Oba, Jon, Mic, Nam, Hab, Zep, Hag, Zec, Mal, Mat, Mrk, Luk, Jhn, Act, Rom, 1Co, 2Co, Gal, Eph, Php, Col, 1Th, 2Th, 1Ti, 2Ti, Tit, Phm, Heb, Jas, 1Pe, 2Pe, 1Jn, 2Jn, 3Jn, Jud, Rev). Ranges: "Luk.15.11-Luk.15.32". Verses must exist in KJV versification.
7. Lemma ids: look them up, never guess. `PGPASSWORD=logos psql -h localhost -U logos -d logos -c "select id, lemma, translit, gloss, occurrences from lemma where strongs='G0026' or translit_key like 'agap%'"`. Prefer the sense with most occurrences.
8. Validate before finishing: `cd /home/user/BIble-ed/etl && python3 -m logos_etl.content_check ../content/<yourfile>.json` must report 0 problems.
