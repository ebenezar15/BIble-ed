import pytest

from logos_etl.importers import tahot

GEN = "Gen.1.1#01=L\tבְּ/רֵאשִׁ֖ית\tbe./re.Shit\tin/ beginning\tH9003/{H7225G}\tHR/Ncfsa\t\t\tH7225G\t\t\tH9003=ב=in/{H7225G=רֵאשִׁית=: beginning»first:1_beginning}"
MAL = "Mal.4.1(3.19)#01=L\tכִּֽי\\־\tki-\tfor\t{H3588A}\\H9014\tHTc\t\t\tH3588A"
TITLE = "Psa.3.0(3.1)#01=L\tמִזְמ֥וֹר\tmiz.Mor\ta psalm\t{H4210}\tHNcmsa\t\t\tH4210"
LXX_ADD = "Gen.4.8#0501=X\tנֵלְכָה\tne.le.Khah\tlet us go\t{H1980G}\tHVqi1cp\t\t\tH1980G"
VARIANT = "Psa.44.14(44.15)#06=V\tבָּ/לְאֻמִּים\\׃\tba/.le'u.Mim\tamong the/ peoples\tH9003/{H3816}\\H9016\tHRd/Ncfpa"


def test_parse_line_basic_fields():
    w = tahot.parse_line(GEN)
    assert w.eng_ref == "Gen.1.1" and w.heb_ref == "Gen.1.1"
    assert w.word_no == 1
    assert w.lemma_id == "H7225G"
    assert w.gloss == "in/ beginning"
    assert w.surface_plain == "בראשית"
    assert w.morph == "HR/Ncfsa"
    assert w.kept


def test_parse_line_hebrew_versification():
    w = tahot.parse_line(MAL)
    assert w.eng_ref == "Mal.4.1" and w.heb_ref == "Mal.3.19"
    assert w.lemma_id == "H3588A"


def test_psalm_title_attaches_to_english_verse_one():
    w = tahot.parse_line(TITLE)
    assert w.eng_ref == "Psa.3.1"
    assert w.heb_ref == "Psa.3.1"
    assert w.src_ref == "Psa.3.0(3.1)"


def test_lxx_additions_and_variants_are_skipped():
    assert not tahot.parse_line(LXX_ADD).kept
    assert not tahot.parse_line(VARIANT).kept


def test_non_word_lines_are_ignored():
    assert tahot.parse_line("# Gen.1.1\tbe.re.Shit") is None
    assert tahot.parse_line("Eng (Heb) Ref & Type\tHebrew") is None


@pytest.mark.usefixtures("conn")
def test_imported_hesed_tokens_resolve_to_lemmas(conn):
    rows = conn.execute(
        "select t.lemma_id, count(*), bool_and(l.id is not null) from token t"
        " left join lemma l on l.id = t.lemma_id where t.lemma_id in ('H2617A','H2617B') group by 1"
    ).fetchall()
    if not rows:
        pytest.skip("TAHOT not imported yet")
    counts = {r[0]: r[1] for r in rows}
    assert counts["H2617A"] > 200
    assert all(r[2] for r in rows)
