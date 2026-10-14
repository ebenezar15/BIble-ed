from logos_etl import content_check


def make(**over):
    doc = {
        "people": [{"id": "irenaeus", "name": "Irenaeus", "roles": ["father"]}],
        "works": [
            {"id": "irenaeus-ah", "person": "irenaeus", "title": "Against Heresies", "copyright": "public_domain"},
            {"id": "kruger-undoing", "person": "irenaeus", "title": "Jesus and the Undoing of Adam", "copyright": "copyrighted"},
        ],
        "entries": [{"kind": "parable", "slug": "lost-son", "title": "The Lost Son", "refs": ["Luk.15.11-Luk.15.32"]}],
        "blocks": [
            {"subject": "entry:parable/lost-son", "section": "lens", "type": "lens_commentary", "body": "x",
             "consensus": "n/a", "citations": []},
        ],
    }
    doc.update(over)
    return doc


def test_valid_document_has_no_errors():
    assert content_check.check(make(), known_books={"Luk"}) == []


def test_scholarly_interpretation_needs_by_and_citation():
    blocks = [{"subject": "entry:parable/lost-son", "section": "voices", "type": "scholarly_interpretation",
               "body": "x", "consensus": "n/a", "citations": []}]
    errs = content_check.check(make(blocks=blocks), known_books={"Luk"})
    assert any("by" in e for e in errs) and any("citation" in e for e in errs)


def test_seeded_citations_must_be_unverified_and_copyrighted_works_unquoted():
    blocks = [{"subject": "entry:parable/lost-son", "section": "voices", "type": "scholarly_interpretation",
               "by": "irenaeus", "body": "x", "consensus": "n/a",
               "citations": [{"work": "kruger-undoing", "ref": "p. 45", "verified": True, "quote": "words"}]}]
    errs = content_check.check(make(blocks=blocks), known_books={"Luk"})
    assert any("verified" in e for e in errs)
    assert any("quote" in e for e in errs)
    assert any("page" in e for e in errs)


def test_unknown_subjects_books_and_types_are_reported():
    blocks = [{"subject": "entry:parable/nope", "section": "lens", "type": "opinion", "body": "x",
               "consensus": "n/a", "citations": []}]
    entries = [{"kind": "parable", "slug": "lost-son", "title": "T", "refs": ["Xyz.1.1"]}]
    errs = content_check.check(make(blocks=blocks, entries=entries), known_books={"Luk"})
    assert any("entry:parable/nope" in e for e in errs)
    assert any("opinion" in e for e in errs)
    assert any("Xyz.1.1" in e for e in errs)
