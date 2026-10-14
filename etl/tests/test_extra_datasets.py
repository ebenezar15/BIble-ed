from logos_etl.importers import fathers, lxx, names, xrefs


def test_xref_line_maps_openbible_books():
    assert xrefs.parse_line("Gen.1.1\tProv.8.22-Prov.8.30\t59") == ("Gen.1.1", "Pro.8.22", "Pro.8.30", 59)
    assert xrefs.parse_line("Gen.1.1\tActs.14.15\t62") == ("Gen.1.1", "Act.14.15", "Act.14.15", 62)
    assert xrefs.parse_line("From Verse\tTo Verse\tVotes") is None


def test_father_filename_parsing():
    assert fathers.parse_filename("John 3_16-17.toml") == ("Jhn", 3, 16, 3, 17)
    assert fathers.parse_filename("1 Corinthians 13_4.toml") == ("1Co", 13, 4, 13, 4)
    assert fathers.parse_filename("Psalms 22_1-23_2.toml") == ("Psa", 22, 1, 23, 2)
    assert fathers.parse_filename("metadata.toml") is None


def test_only_public_domain_translations_are_allowed():
    ok = "https://historicalchristian.faith/by_father.php?file=Thomas%2520Aquinas%2FCatena%2520Aurea%2FCommentary%2520on%2520John%2FChapter%25203.html"
    assert fathers.is_public_domain(ok)
    assert fathers.is_public_domain("https://historicalchristian.faith/by_father.php?file=Irenaeus%2FIrenaeus%20Against%20Heresies%20Book%204.html")
    assert fathers.is_public_domain("https://www.newadvent.org/fathers/1701.htm")
    assert fathers.is_public_domain("https://www.tertullian.org/fathers2/NPNF1-14/npnf1-14-21.htm")
    assert fathers.is_public_domain("https://www.ccel.org/ccel/schaff/npnf114.iv.xxi.html")
    assert not fathers.is_public_domain("https://www.ccel.org/ccel/pearse/morefathers/files/jerome_daniel_02_text.htm")
    assert not fathers.is_public_domain("https://www.tertullian.org/fathers/jerome_preface_job.htm")
    assert not fathers.is_public_domain("https://historicalchristian.faith/by_father.php?file=Origen%20of%20Alexandria%2FCommentary%20on%20Romans%2FBook%201.html")
    assert not fathers.is_public_domain("https://historicalchristian.faith/by_father.php?file=Bonaventure%2FCommentary%20on%20Luke%2FChapter%201.html")
    assert not fathers.is_public_domain("")


def test_tipnr_record_parsing():
    lines = [
        "$========== PERSON(s)",
        "Aaron@Exo.4.14-Heb=H0175\tHigh Priest living at the time of Egypt and Wilderness\tx\ty\tz\tw\tTribe of Levi\t#A high priest\tMale",
        "– Named\tAaron@Exo.4.14-Heb\tH0175«H0175=אַהֲרֹן\tAaron\tExo.4.14; Exo.7.10a; Exo.7.10b",
        "– Greek\tAaron@Exo.4.14-Heb\tG0002«G0002=Ἀαρών\tAaron\tLuk.1.5",
        "– Total\tAaron\tAaron\tH0175, G0002\tExo.4.14; Exo.4.27ff",
        "@Briefest= High Priest",
        "@Brief= Moses' brother, first high priest of Israel",
        "@Short= Aaron was Moses' older brother.",
        "@Article= Aaron was the older brother of Moses and Miriam.",
        "@Ambiguity=",
    ]
    recs = list(names.parse_records(lines))
    assert len(recs) == 1
    r = recs[0]
    assert r["id"] == "Aaron@Exo.4.14-Heb" and r["name"] == "Aaron" and r["kind"] == "person"
    assert r["gender"] == "Male"
    assert r["lemma_ids"] == ["H0175", "G0002"]
    assert r["refs"] == ["Exo.4.14", "Exo.7.10", "Luk.1.5"]
    assert r["brief"] == "Moses' brother, first high priest of Israel"
    assert r["article"].startswith("Aaron was the older brother")


def test_lxx_bridge_extracts_hebrew_words():
    body = " <b>ἀγάπη</b>, -ης, ἡ <BR /> [in LXX for אַהֲבָה, which is also rendered by ἀγάπησις and φιλία ;] <BR /> love"
    assert lxx.hebrew_in_lxx_note(body) == ["אהבה"]
    body2 = "[in LXX chiefly for צֶדֶק, צְדָקָה, also for חֶסֶד (Gen 19:19) ;] righteousness"
    assert lxx.hebrew_in_lxx_note(body2) == ["צדק", "צדקה", "חסד"]
    assert lxx.hebrew_in_lxx_note("no note here") == []


def test_lxx_note_flags_cognates():
    note = "[in LXX chiefly for צֶדֶק, and cognates, Gen.15:6 ;]"
    assert lxx.mentions_cognates(note)
    assert not lxx.mentions_cognates("[in LXX for אַהֲבָה ;]")
