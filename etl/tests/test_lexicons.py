from logos_etl.importers import lexicons

TBESH_HESED = "H2617a\tH2617A =\tH2617A\tחֶ֫סֶד\tche.sed\tH:N-M\tkindness\tgoodness, kindness, faithfulness"
TBESH_ARAMAIC = "H1768\tH1768 =\tH1768\tדִּי\tdi\tA:Part\twho\twho, which, that"
TBESG_AGAPE = "G0026\tG0026 =\tG0026\tἀγάπη\tagapē\tG:N-F\tlove\t <b>ἀγάπη</b>, -ης, ἡ"


def test_parse_tbesh_line():
    lem = lexicons.parse_lexicon_line(TBESH_HESED, "heb")
    assert lem.id == "H2617A"
    assert lem.strongs == "H2617"
    assert lem.gloss == "kindness"
    assert lem.lemma_plain == "חסד"
    assert lem.language == "heb"


def test_parse_tbesh_line_detects_aramaic():
    assert lexicons.parse_lexicon_line(TBESH_ARAMAIC, "heb").language == "arc"


def test_parse_tbesg_line():
    lem = lexicons.parse_lexicon_line(TBESG_AGAPE, "grc")
    assert lem.id == "G0026"
    assert lem.lemma == "ἀγάπη"
    assert lem.lemma_plain == "αγαπη"
    assert lem.translit_key == "agape"


def test_parse_lexicon_line_skips_headers():
    assert lexicons.parse_lexicon_line("eStrong#\tdStrong\tuStrong", "heb") is None


def test_morph_label_condenses_detail():
    detail = "Function=Verb ; Stem=Qal (hence Action=Simple; Voice=Active); Form=Perfect (hence Tense=Past/present; Mood=Indicative); Person=Third; Gender=Masculine; Number=Singular"
    assert lexicons.morph_label(detail) == "Verb, Qal, Perfect, Third, Masculine, Singular"


def test_roots_from_index_maps_members_to_strongs():
    xml = """<index xmlns="http://openscriptures.github.com/morphhb/namespace"><part xml:lang="heb">
      <entry id="eco"><w>חֶ֫סֶד</w><def>shame</def><xref strong="2617" aug="b"/><etym type="sub">ecr</etym></entry>
      <entry id="ecp"><w>חֶ֫סֶד</w><def>goodness</def><xref strong="2617" aug="a"/><etym type="sub">ecs</etym></entry>
      <entry id="ecr"><w>חָסַד</w><def>be reproachful</def><xref strong="2616" aug="b"/><etym root="חסד" type="main">eco</etym></entry>
      <entry id="ecs"><w>חָסַד</w><def>be good</def><xref strong="2616" aug="a"/><etym root="חסד" type="main">ecp</etym></entry>
    </part></index>"""
    roots = lexicons.roots_from_index(xml)
    assert roots["heb:חסד"]["members"] == {("2616", "a"), ("2616", "b"), ("2617", "a"), ("2617", "b")}
    assert roots["heb:חסד"]["gloss"] == "be good"


def test_lexicon_reimport_succeeds_when_lxx_bridge_has_rows(conn):
    from logos_etl.importers import lxx

    if not conn.execute("select count(*) from lemma").fetchone()[0]:
        import pytest

        pytest.skip("lexicons not imported")
    lexicons.import_lexicons(conn)
    lexicons.import_roots(conn)
    lexicons.update_occurrences(conn)
    lxx.import_bridge(conn)
    assert conn.execute("select count(*) from lxx_bridge").fetchone()[0] > 0
    lexicons.import_lexicons(conn)  # must not violate lxx_bridge foreign keys
    assert conn.execute("select count(*) from lexicon_entry").fetchone()[0] > 20000
    lexicons.import_roots(conn)
    lexicons.update_occurrences(conn)
    lxx.import_bridge(conn)
    assert conn.execute("select occurrences from lemma where id = 'H2617A'").fetchone()[0] == 245
