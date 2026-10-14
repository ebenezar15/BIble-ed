"""TAHOT: Leningrad Hebrew OT with STEPBible lexical + morphological tags.

Refs look like 'Gen.1.1#01=L' or, where Hebrew numbering differs from English,
'Mal.4.1(3.19)#01=L'. Psalm superscriptions are English verse 0 ('Psa.3.0(3.1)');
we attach them to English verse 1 so every token belongs to a real verse.
"""
import re
import unicodedata
from dataclasses import dataclass

from .. import fetch, sources
from ..text import strip_hebrew

_LINE = re.compile(r"^(?P<book>[0-9A-Za-z]{3})\.(?P<ch>\d+)\.(?P<vs>\d+)(?:\((?P<hch>\d+)\.(?P<hvs>\d+)\))?#(?P<no>\d+)=(?P<type>\S+)$")
_BRACED = re.compile(r"\{([HG]\d{4}[A-Za-z]?)\}")
_ANY = re.compile(r"[HG]\d{4}[A-Za-z]?")
# L = Leningrad, Q = Qere (Ketiv in notes), R = restored from other Hebrew mss.
# X = additions known only from the LXX; V = alternative readings duplicated elsewhere.
_KEPT_PREFIXES = ("L", "Q", "R")


@dataclass
class TahotWord:
    eng_ref: str
    heb_ref: str
    src_ref: str
    word_no: int
    type: str
    surface: str
    surface_plain: str
    translit: str
    gloss: str
    lemma_id: str | None
    morph: str

    @property
    def kept(self) -> bool:
        return self.type.startswith(_KEPT_PREFIXES)


def parse_line(line: str) -> TahotWord | None:
    cols = line.rstrip("\n").split("\t")
    m = _LINE.match(cols[0])
    if not m or len(cols) < 6:
        return None
    book, ch, vs = m["book"], int(m["ch"]), int(m["vs"])
    hch, hvs = (int(m["hch"]), int(m["hvs"])) if m["hch"] else (ch, vs)
    src_ref = cols[0].split("#")[0]
    if vs == 0:  # Psalm superscription: English has no verse 0.
        vs = 1
    braced = _BRACED.search(cols[4])
    any_code = [c for c in _ANY.findall(cols[4]) if not c.startswith("H90")]
    lemma_id = braced.group(1) if braced else (any_code[0] if any_code else None)
    return TahotWord(
        eng_ref=f"{book}.{ch}.{vs}",
        heb_ref=f"{book}.{hch}.{hvs}",
        src_ref=src_ref,
        word_no=int(m["no"]),
        type=m["type"],
        surface=unicodedata.normalize("NFC", cols[1].strip()),
        surface_plain=strip_hebrew(cols[1]),
        translit=cols[2].strip(),
        gloss=cols[3].strip(),
        lemma_id=lemma_id,
        morph=cols[5].strip(),
    )


def import_tahot(conn) -> dict:
    paths, sha = fetch.ensure("step-tahot")
    sources.register(conn, "step-tahot", sha)
    verse_ids = dict(conn.execute("select osis, id from verse").fetchall())
    conn.execute("delete from token where source_id = 'step-tahot'")
    conn.execute("delete from versification_map where scheme = 'heb'")
    skipped: dict[str, int] = {}
    unmatched: set[str] = set()
    vmap: dict[str, int] = {}
    pos_counter: dict[int, int] = {}
    kept = 0
    with conn.cursor() as cur:
        with cur.copy(
            "copy token (verse_id, pos, surface, surface_plain, translit, gloss, lemma_id, morph, source_id, src_ref)"
            " from stdin"
        ) as cp:
            for path in paths:
                for line in path.read_text(encoding="utf-8-sig").splitlines():
                    w = parse_line(line)
                    if w is None:
                        continue
                    if not w.kept:
                        skipped[w.type[0]] = skipped.get(w.type[0], 0) + 1
                        continue
                    vid = verse_ids.get(w.eng_ref)
                    if vid is None:
                        unmatched.add(w.eng_ref)
                        continue
                    pos_counter[vid] = pos_counter.get(vid, 0) + 1
                    if w.heb_ref != w.eng_ref:
                        vmap.setdefault(w.heb_ref, vid)
                    cp.write_row((vid, pos_counter[vid], w.surface, w.surface_plain, w.translit, w.gloss,
                                  w.lemma_id, w.morph, "step-tahot", w.src_ref))
                    kept += 1
        with cur.copy("copy versification_map (scheme, source_ref, verse_id) from stdin") as cp:
            for ref, vid in vmap.items():
                cp.write_row(("heb", ref, vid))
    return {"tokens": kept, "verses": len(pos_counter), "skipped": skipped,
            "unmatched": sorted(unmatched), "versification_rows": len(vmap)}
