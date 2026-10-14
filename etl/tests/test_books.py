from logos_etl import books


def test_load_has_66_books_in_order():
    loaded = books.load()
    assert len(loaded) == 66
    assert loaded[0].id == "Gen" and loaded[-1].id == "Rev"


def test_by_name_handles_numbered_books():
    assert books.by_name("1 Cor").id == "1Co"
    assert books.by_name("I Corinthians").id == "1Co"
    assert books.by_name("II Samuel").id == "2Sa"
    assert books.by_name("III John").id == "3Jn"


def test_by_name_handles_aliases_and_case():
    assert books.by_name("Song of Solomon").id == "Sng"
    assert books.by_name("Jn").id == "Jhn"
    assert books.by_name("revelation of john").id == "Rev"
    assert books.by_name("PSALMS").id == "Psa"
    assert books.by_name("Jhn").id == "Jhn"


def test_by_name_unknown_is_none():
    assert books.by_name("Hezekiah") is None
