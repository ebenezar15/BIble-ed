"""Registry of every dataset we import, with license and attribution.

Each importer calls register() so the `source` table always carries the
license for the rows that reference it.
"""
from dataclasses import dataclass

STEP_SHA = "93ec3621485afd10fd45fcf43630d42de28d8eb8"
STEP_RAW = f"https://raw.githubusercontent.com/STEPBible/STEPBible-Data/{STEP_SHA}"
SCROLL_SHA = "e1b254cef86d0e65b1a5d1a94b8b112d0f296a2c"
SCROLL_RAW = f"https://raw.githubusercontent.com/scrollmapper/bible_databases/{SCROLL_SHA}/formats/csv"
WEB_SHA = "68669ba3be9719ae4d1135b19d9e0b6587b7c356"
WEB_RAW = f"https://raw.githubusercontent.com/TehShrike/world-english-bible/{WEB_SHA}/json"
OSHB_LEX_SHA = "21c9add13bc727d3a951361778e97e3ff7afd1ce"
OSHB_LEX_RAW = f"https://raw.githubusercontent.com/openscriptures/HebrewLexicon/{OSHB_LEX_SHA}"

STEP_ATTR = 'STEP Bible (www.STEPBible.org), Tyndale House Cambridge — "STEPBible-Data", CC BY 4.0'
_TAO = "Translators Amalgamated OT+NT"


@dataclass(frozen=True)
class SourceDef:
    key: str
    name: str
    license: str
    attribution: str
    url: str
    version: str
    files: tuple[str, ...]  # absolute download URLs
    redistributable: bool = True
    notes: str = ""


def _step(path: str) -> str:
    return f"{STEP_RAW}/{path}"


SOURCES: dict[str, SourceDef] = {
    "step-tahot": SourceDef(
        "step-tahot", "TAHOT — Translators Amalgamated Hebrew OT", "CC BY 4.0", STEP_ATTR,
        "https://github.com/STEPBible/STEPBible-Data", STEP_SHA,
        tuple(_step(f"{_TAO}/TAHOT {part} - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt")
              for part in ("Gen-Deu", "Jos-Est", "Job-Sng", "Isa-Mal")),
        notes="Leningrad Codex (WLC via OpenScriptures) with ETCBC-derived morphology.",
    ),
    "step-tagnt": SourceDef(
        "step-tagnt", "TAGNT — Translators Amalgamated Greek NT (SBLGNT words)", "CC BY 4.0",
        STEP_ATTR + "; Greek text: SBLGNT, Society of Biblical Literature & Logos Bible Software, CC BY 4.0",
        "https://github.com/STEPBible/STEPBible-Data", STEP_SHA,
        tuple(_step(f"{_TAO}/TAGNT {part} - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt")
              for part in ("Mat-Jhn", "Act-Rev")),
        notes="Only words marked as present in the SBL edition are imported.",
    ),
    "step-tbesh": SourceDef(
        "step-tbesh", "TBESH — Brief lexicon of Extended Strongs for Hebrew (abridged BDB)", "CC BY 4.0",
        STEP_ATTR, "https://github.com/STEPBible/STEPBible-Data", STEP_SHA,
        (_step("Lexicons/TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt"),),
    ),
    "step-tbesg": SourceDef(
        "step-tbesg", "TBESG — Brief lexicon of Extended Strongs for Greek (Abbott-Smith based)", "CC BY 4.0",
        STEP_ATTR, "https://github.com/STEPBible/STEPBible-Data", STEP_SHA,
        (_step("Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt"),),
    ),
    "step-tehmc": SourceDef(
        "step-tehmc", "TEHMC — Hebrew morphology code expansions", "CC BY 4.0", STEP_ATTR,
        "https://github.com/STEPBible/STEPBible-Data", STEP_SHA,
        (_step("Morphology codes/TEHMC - Translators Expansion of Hebrew Morphology Codes - STEPBible.org CC BY.txt"),),
    ),
    "step-tegmc": SourceDef(
        "step-tegmc", "TEGMC — Greek morphology code expansions", "CC BY 4.0", STEP_ATTR,
        "https://github.com/STEPBible/STEPBible-Data", STEP_SHA,
        (_step("Morphology codes/TEGMC - Translators Expansion of Greek Morphhology Codes - STEPBible.org CC BY.txt"),),
    ),
    "oshb-lexindex": SourceDef(
        "oshb-lexindex", "OpenScriptures HebrewLexicon — Lexical Index (roots)", "CC BY 4.0",
        "Open Scriptures Hebrew Bible Project (openscriptures.org), CC BY 4.0; BDB text public domain",
        "https://github.com/openscriptures/HebrewLexicon", OSHB_LEX_SHA,
        (f"{OSHB_LEX_RAW}/LexicalIndex.xml",),
    ),
}

SOURCES["openbible-xref"] = SourceDef(
    "openbible-xref", "OpenBible.info cross references", "CC BY",
    "Cross references from OpenBible.info (CC BY), via scrollmapper/bible_databases",
    "https://www.openbible.info/labs/cross-references/", SCROLL_SHA,
    (f"https://raw.githubusercontent.com/scrollmapper/bible_databases/{SCROLL_SHA}/sources/extras/cross_references.txt",),
)
SOURCES["step-tipnr"] = SourceDef(
    "step-tipnr", "TIPNR — Translators Individualised Proper Names with all References", "CC BY 4.0",
    STEP_ATTR + "; name descriptions were generated with AI by STEPBible (per its README)",
    "https://github.com/STEPBible/STEPBible-Data", STEP_SHA,
    (_step("Proper Nouns/TIPNR - Translators Individualised Proper Names with all References - STEPBible.org CC BY.txt"),),
)
HCF_SHA = "8ca02d784ff976bbee2069d7e435959d4a8195e9"
SOURCES["hcf-commentaries"] = SourceDef(
    "hcf-commentaries", "Church Fathers on Scripture (public-domain translations only)", "Public domain",
    "Excerpts compiled by HistoricalChristianFaith/Commentaries-Database; only public-domain translations"
    " (ANF/NPNF, Newman's Catena Aurea, Library of the Fathers) are imported",
    "https://github.com/HistoricalChristianFaith/Commentaries-Database", HCF_SHA, (),
    notes="git:https://github.com/HistoricalChristianFaith/Commentaries-Database.git",
)

_ENGLISH = {
    "kjv": ("King James Version (1769)", "KJV", 1769),
    "bsb": ("Berean Standard Bible", "BSB", 2022),
    "ylt": ("Young's Literal Translation", "YLT", 1898),
    "asv": ("American Standard Version", "ASV", 1901),
    "darby": ("Darby Translation", "Darby", 1890),
}
for _key, (_name, _file, _year) in _ENGLISH.items():
    SOURCES[_key] = SourceDef(
        _key, _name, "Public domain",
        f"{_name} — public domain; digitised by scrollmapper/bible_databases (MIT)",
        "https://github.com/scrollmapper/bible_databases", SCROLL_SHA,
        (f"{SCROLL_RAW}/{_file}.csv",),
        notes=f"year={_year}",
    )

WEB_BOOK_FILES = (
    "genesis exodus leviticus numbers deuteronomy joshua judges ruth 1samuel 2samuel 1kings 2kings "
    "1chronicles 2chronicles ezra nehemiah esther job psalms proverbs ecclesiastes songofsolomon isaiah "
    "jeremiah lamentations ezekiel daniel hosea joel amos obadiah jonah micah nahum habakkuk zephaniah "
    "haggai zechariah malachi matthew mark luke john acts romans 1corinthians 2corinthians galatians "
    "ephesians philippians colossians 1thessalonians 2thessalonians 1timothy 2timothy titus philemon "
    "hebrews james 1peter 2peter 1john 2john 3john jude revelation"
).split()
SOURCES["web"] = SourceDef(
    "web", "World English Bible", "Public domain",
    "World English Bible — public domain (eBible.org); JSON by TehShrike/world-english-bible",
    "https://github.com/TehShrike/world-english-bible", WEB_SHA,
    tuple(f"{WEB_RAW}/{name}.json" for name in WEB_BOOK_FILES),
    notes="year=2000",
)


def register(conn, key: str, sha256: str) -> None:
    s = SOURCES[key]
    conn.execute(
        """insert into source (id, name, license, attribution, url, version, sha256, redistributable, notes)
           values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
           on conflict (id) do update set name = excluded.name, license = excluded.license,
             attribution = excluded.attribution, url = excluded.url, version = excluded.version,
             sha256 = excluded.sha256, redistributable = excluded.redistributable, notes = excluded.notes""",
        (s.key, s.name, s.license, s.attribution, s.url, s.version, sha256, s.redistributable, s.notes),
    )
