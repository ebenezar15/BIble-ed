"""Validate content/*.json against content/SCHEMA.md and the editorial rules.

Usage: python3 -m logos_etl.content_check [files…]   (defaults to every content/*.json, checked together)
"""
import json
import re
import sys
from pathlib import Path

from .db import REPO_ROOT

CONTENT = REPO_ROOT / "content"
TYPES = {"lexical_fact", "historical_fact", "scholarly_interpretation", "lens_commentary", "contested",
         "legal_reading_history"}
SECTIONS = {"overview", "meaning", "culture", "translation_history", "lens", "legal_history", "voices", "fathers",
            "structure", "background", "fulfillment", "misunderstanding", "hearers", "dating", "authorship",
            "outline", "themes", "christ", "history", "practice", "caution", "notes"}
CONSENSUS = {"consensus", "majority", "minority", "n/a"}
KINDS = {"book", "essay", "jesus_word", "parable", "festival", "sacrifice", "law", "covenant", "christophany",
         "number", "typology", "structure", "tabernacle", "timeline", "denomination", "doctrine", "roman_term"}
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
OSIS = re.compile(r"^([1-3]?[A-Z][a-z]{1,2})\.(\d+)\.(\d+)$")
PAGE = re.compile(r"\b(p|pp|page|pages)\.?\s*\d", re.I)


def _ref_errors(ref: str, known_books: set[str], where: str) -> list[str]:
    errs = []
    for part in ref.split("-"):
        m = OSIS.match(part)
        if not m:
            errs.append(f"{where}: bad ref {ref!r} (use Book.C.V or Book.C.V-Book.C.V)")
            break
        if m.group(1) not in known_books:
            errs.append(f"{where}: unknown book in ref {ref!r}")
    return errs


def check(doc: dict, known_books: set[str], known_lemmas: set[str] | None = None) -> list[str]:
    errs: list[str] = []
    people = {p.get("id") for p in doc.get("people", [])}
    works = {w.get("id"): w for w in doc.get("works", [])}
    entries = {f"{e.get('kind')}/{e.get('slug')}" for e in doc.get("entries", [])}

    for p in doc.get("people", []):
        if not SLUG.match(p.get("id", "")):
            errs.append(f"person {p.get('id')!r}: id must be a kebab-case slug")
        if not p.get("name"):
            errs.append(f"person {p.get('id')!r}: name missing")
    for wid, w in works.items():
        if not SLUG.match(wid or ""):
            errs.append(f"work {wid!r}: id must be a kebab-case slug")
        if w.get("copyright") not in ("public_domain", "copyrighted"):
            errs.append(f"work {wid}: copyright must be public_domain or copyrighted")
        if w.get("person") and w["person"] not in people:
            errs.append(f"work {wid}: unknown person {w['person']!r}")
    for e in doc.get("entries", []):
        where = f"entry {e.get('kind')}/{e.get('slug')}"
        if e.get("kind") not in KINDS:
            errs.append(f"{where}: unknown kind {e.get('kind')!r}")
        if not SLUG.match(e.get("slug", "")):
            errs.append(f"{where}: slug must be kebab-case")
        if not e.get("title"):
            errs.append(f"{where}: title missing")
        for r in e.get("refs", []):
            errs += _ref_errors(r, known_books, where)
        if known_lemmas is not None:
            errs += [f"{where}: unknown lemma {l}" for l in e.get("lemmas", []) if l not in known_lemmas]

    for i, b in enumerate(doc.get("blocks", [])):
        where = f"block #{i} ({b.get('subject')}, {b.get('section')})"
        kind, _, ident = (b.get("subject") or "").partition(":")
        if kind == "entry" and ident not in entries:
            errs.append(f"{where}: unknown subject entry:{ident}")
        elif kind == "person" and ident not in people:
            errs.append(f"{where}: unknown subject person:{ident}")
        elif kind == "lemma" and known_lemmas is not None and ident not in known_lemmas:
            errs.append(f"{where}: unknown lemma {ident}")
        elif kind == "verse":
            errs += _ref_errors(ident, known_books, where)
        elif kind not in ("entry", "person", "lemma", "verse"):
            errs.append(f"{where}: subject must start lemma:/verse:/entry:/person:")
        if b.get("type") not in TYPES:
            errs.append(f"{where}: unknown type {b.get('type')!r}")
        if b.get("section") not in SECTIONS:
            errs.append(f"{where}: unknown section {b.get('section')!r}")
        if b.get("consensus", "n/a") not in CONSENSUS:
            errs.append(f"{where}: unknown consensus {b.get('consensus')!r}")
        if not (b.get("body") or "").strip():
            errs.append(f"{where}: body is empty")
        cites = b.get("citations") or []
        if b.get("type") == "scholarly_interpretation":
            if not b.get("by"):
                errs.append(f"{where}: scholarly_interpretation needs 'by' (the person whose view it is)")
            elif b["by"] not in people:
                errs.append(f"{where}: unknown person in 'by': {b['by']!r}")
            if not cites:
                errs.append(f"{where}: scholarly_interpretation needs at least one citation")
        for c in cites:
            if c.get("verified") is not False:
                errs.append(f"{where}: seeded citations must have \"verified\": false")
            if c.get("work") and c["work"] not in works:
                errs.append(f"{where}: unknown work {c['work']!r}")
            work = works.get(c.get("work"))
            if work and work.get("copyright") == "copyrighted":
                if c.get("quote"):
                    errs.append(f"{where}: no quote allowed from copyrighted work {c['work']}")
                if PAGE.search(c.get("ref") or ""):
                    errs.append(f"{where}: no page numbers for copyrighted work {c['work']} (owner adds them)")
            if not (c.get("ref") or "").strip():
                errs.append(f"{where}: citation needs a 'ref' (work section, chapter, or Scripture reference)")
    return errs


def load_all(paths: list[Path]) -> dict:
    merged: dict = {"people": [], "works": [], "entries": [], "blocks": []}
    for p in paths:
        doc = json.loads(p.read_text(encoding="utf-8"))
        for k in merged:
            merged[k].extend(doc.get(k, []))
    return merged


def duplicate_ids(doc: dict) -> list[str]:
    errs = []
    for key, idf in (("people", lambda x: x.get("id")), ("works", lambda x: x.get("id")),
                     ("entries", lambda x: f"{x.get('kind')}/{x.get('slug')}")):
        seen: set = set()
        for item in doc[key]:
            i = idf(item)
            if i in seen:
                errs.append(f"duplicate {key[:-1]} id {i!r}")
            seen.add(i)
    return errs


def main(argv: list[str]) -> int:
    paths = [Path(a) for a in argv] or sorted(CONTENT.glob("*.json"))
    books = {b["id"] for b in json.loads((REPO_ROOT / "db" / "seed" / "books.json").read_text())}
    lemmas = None
    try:
        from .db import connect

        lemmas = {r[0] for r in connect().execute("select id from lemma")}
    except Exception:
        print("(database unavailable: lemma ids not checked)")
    # Always validate against everything so cross-file references resolve.
    doc = load_all(sorted(CONTENT.glob("*.json")) if argv else paths)
    errs = duplicate_ids(doc) + check(doc, books, lemmas)
    for e in errs:
        print("ERROR", e)
    print(f"{len(doc['people'])} people, {len(doc['works'])} works, {len(doc['entries'])} entries, "
          f"{len(doc['blocks'])} blocks; {len(errs)} problems")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
