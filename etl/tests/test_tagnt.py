import pytest

from logos_etl.importers import tagnt

MAT = "Mat.1.1#01=NKO\tΒίβλος (Biblos)\t[The] book\tG0976=N-NSF\tβίβλος=book\tNA28+NA27+Tyn+SBL+WH+Treg+TR+Byz\t\t\tLibro\tbook\t#01\tG0976"
TR_ONLY = "Mat.17.21#12=KO\tνηστείᾳ.¶ (nēsteia)\twith fastings.\tG3521=N-DSF\tνηστεία=fasting\tTreg+TR+Byz\t\t\ta ayunos\tfasting\t#12\tG3521"
JHN = "Jhn.3.16#03=NKO\tἠγάπησεν (ēgapēsen)\tloved\tG0025=V-AAI-3S\tἀγαπάω=to love\tNA28+NA27+Tyn+SBL+WH+Treg+TR+Byz"


def test_parse_line_fields():
    w = tagnt.parse_line(MAT)
    assert w.ref == "Mat.1.1" and w.word_no == 1
    assert w.surface == "Βίβλος"
    assert w.translit == "Biblos"
    assert w.lemma_id == "G0976"
    assert w.morph == "N-NSF"
    assert w.gloss == "[The] book"
    assert "SBL" in w.editions
    assert w.in_sblgnt


def test_tr_only_word_is_not_sblgnt_and_pilcrow_is_stripped():
    w = tagnt.parse_line(TR_ONLY)
    assert not w.in_sblgnt
    assert w.surface == "νηστείᾳ."
    assert w.surface_plain == "νηστεια"


def test_verb_lemma():
    w = tagnt.parse_line(JHN)
    assert w.lemma_id == "G0025" and w.surface_plain == "ηγαπησεν"


def test_kjv_bracket_ref_is_used_for_english_versification():
    php = "Php.1.16[1.17]#01=NKO\tοἱ (hoi)\tthe [ones]\tG3588=T-NPM\tὁ=the\tNA28+NA27+Tyn+SBL+WH+Treg+TR+Byz"
    assert tagnt.parse_line(php).ref == "Php.1.17"
    rom = "Rom.16.25{14.24}#01=NKO\tΤῷ (Tō)\t{14.24} To Him\tG3588=T-DSM\tὁ=the\tNA28+NA27+Tyn+WH+Treg+TR+Byz«14.24"
    w = tagnt.parse_line(rom)
    assert w.ref == "Rom.16.25"
    assert "NA28" in w.editions and not w.in_sblgnt
    act = "Act.19.41(19.40)#01=NKO\tκαὶ (kai)\tand\tG2532=CONJ\tκαί=and\tNA28+SBL"
    assert tagnt.parse_line(act).ref == "Act.19.41"


def test_select_words_falls_back_to_na28_for_verses_without_sbl():
    words = [
        tagnt.parse_line("Mrk.16.9#01=KO\t[[Ἀναστὰς (Anastas)\thaving risen\tG0450=V-2AAP-NSM\tἀνίστημι=to arise\tNA28+NA27+Tyn+WH+Treg+TR+Byz"),
        tagnt.parse_line("Mrk.16.9#02=K\tδὲ (de)\tnow\tG1161=CONJ\tδέ=but\tTR+Byz"),
        tagnt.parse_line(MAT),
        tagnt.parse_line(TR_ONLY),
    ]
    kept = tagnt.select_words(words)
    assert [w.surface for w in kept] == ["[[Ἀναστὰς", "Βίβλος"]


def test_select_words_uses_na28_when_sbl_marks_are_sparse():
    line = "Mrk.16.17#{n:02d}=KO\tλόγος{n} (logos)\tword\tG3056=N-NSM\tλόγος=word\t{ed}"
    words = [tagnt.parse_line(line.format(n=n, ed="NA28+NA27+TR")) for n in range(1, 9)]
    words += [tagnt.parse_line(line.format(n=9, ed="NA28+SBL+TR»1"))]
    assert len(tagnt.select_words(words)) == 9
    assert "TR" in words[-1].editions


def test_headers_are_ignored():
    assert tagnt.parse_line("Word & Type\tGreek\tEnglish translation") is None


@pytest.mark.usefixtures("conn")
def test_agape_count_in_sblgnt(conn):
    n = conn.execute("select count(*) from token where lemma_id = 'G0026' and source_id = 'step-tagnt'").fetchone()[0]
    if n == 0:
        pytest.skip("TAGNT not imported yet")
    assert 115 <= n <= 118


def test_surface_is_nfc_normalised():
    import unicodedata

    oxia = "Jhn.3.16#03=NKO\tἠγάπησεν (ēgapēsen)\tloved\tG0025=V-AAI-3S\tἀγαπάω=to love\tNA28+SBL".replace("ά", "ά")
    w = tagnt.parse_line(oxia)
    assert w.surface == unicodedata.normalize("NFC", "ἠγάπησεν")
