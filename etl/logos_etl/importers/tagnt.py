"""TAGNT: Greek NT words tagged with the editions containing them. We keep the SBLGNT text."""
import re
import unicodedata
from dataclasses import dataclass

from .. import fetch, sources
from ..text import strip_greek

# Base refs follow NRSV versification; [x.y] gives the KJV ref, (x.y) the NA ref, {x.y} an alternative placement.
_LINE = re.compile(
    r"^(?P<book>[0-9A-Za-z]{3})\.(?P<ch>\d+)\.(?P<vs>\d+)"
    r"(?:\[(?P<kch>\d+)\.(?P<kvs>\d+)\]|\(\d+\.\d+\)|\{\d+\.\d+\})?#(?P<no>\d+)=(?P<type>\S+)$"
)
_SURFACE = re.compile(r"^(?P<greek>.*?)\s*\((?P<translit>[^)]*)\)\s*$")
_LEMMA = re.compile(r"^(G\d{4,5}[A-Za-z]?)=(.*)$")
_PUNCT = re.compile(r"[^\w\s]", re.UNICODE)


@dataclass
class TagntWord:
    ref: str
    native_ref: str
    word_no: int
    surface: str
    surface_plain: str
    translit: str
    gloss: str
    lemma_id: str | None
    morph: str
    editions: frozenset[str]

    @property
    def in_sblgnt(self) -> bool:
        return "SBL" in self.editions


def parse_line(line: str) -> TagntWord | None:
    cols = line.rstrip("\n").split("\t")
    m = _LINE.match(cols[0])
    if not m or len(cols) < 6:
        return None
    sm = _SURFACE.match(cols[1])
    greek, translit = (sm["greek"], sm["translit"]) if sm else (cols[1], "")
    greek = unicodedata.normalize("NFC", greek.replace("¶", "").strip())
    lm = _LEMMA.match(cols[3].strip())
    return TagntWord(
        ref=(f"{m['book']}.{int(m['kch'])}.{int(m['kvs'])}" if m["kch"]
             else f"{m['book']}.{int(m['ch'])}.{int(m['vs'])}"),
        native_ref=cols[0].split("#")[0],
        word_no=int(m["no"]),
        surface=greek,
        surface_plain=_PUNCT.sub("", strip_greek(greek)),
        translit=translit.strip(),
        gloss=cols[2].strip(),
        lemma_id=lm.group(1) if lm else None,
        morph=lm.group(2) if lm else cols[3].strip(),
        editions=frozenset(re.split(r"[«»]", e)[0].strip() for e in cols[5].split("+") if e.strip()),
    )


def select_words(words: list[TagntWord]) -> list[TagntWord]:
    """SBLGNT words per verse. STEP leaves some passages SBLGNT prints (e.g. Mark 16:9-20) mostly
    unmarked, so a verse with fewer than half as many SBL words as NA28 words uses NA28 instead."""
    sbl: dict[str, int] = {}
    na28: dict[str, int] = {}
    for w in words:
        sbl[w.ref] = sbl.get(w.ref, 0) + w.in_sblgnt
        na28[w.ref] = na28.get(w.ref, 0) + ("NA28" in w.editions)
    use_na28 = {ref for ref in na28 if sbl.get(ref, 0) * 2 < na28[ref]}
    return [w for w in words if ("NA28" in w.editions if w.ref in use_na28 else w.in_sblgnt)]


def import_tagnt(conn) -> dict:
    paths, sha = fetch.ensure("step-tagnt")
    sources.register(conn, "step-tagnt", sha)
    verse_ids = dict(conn.execute("select osis, id from verse").fetchall())
    conn.execute("delete from token where source_id = 'step-tagnt'")
    pos_counter: dict[int, int] = {}
    unmatched: set[str] = set()
    words: list[TagntWord] = []
    for path in paths:
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            w = parse_line(line)
            if w is not None:
                words.append(w)
    selected = select_words(words)
    excluded = len(words) - len(selected)
    na28_fallback = sorted({w.ref for w in selected if not w.in_sblgnt}, key=lambda r: verse_ids.get(r, 0))
    with conn.cursor() as cur:
        with cur.copy(
            "copy token (verse_id, pos, surface, surface_plain, translit, gloss, lemma_id, morph, source_id,"
            " src_ref, editions) from stdin"
        ) as cp:
            for w in selected:
                vid = verse_ids.get(w.ref)
                if vid is None:
                    unmatched.add(w.ref)
                    continue
                pos_counter[vid] = pos_counter.get(vid, 0) + 1
                cp.write_row((vid, pos_counter[vid], w.surface, w.surface_plain, w.translit, w.gloss,
                              w.lemma_id, w.morph, "step-tagnt", w.native_ref, "+".join(sorted(w.editions))))
    nt_without = [r[0] for r in conn.execute(
        """select v.osis from verse v join book b on b.id = v.book_id
           where b.testament = 'NT' and not exists (select 1 from token t where t.verse_id = v.id)
           order by v.id""")]
    return {"tokens": sum(pos_counter.values()), "verses": len(pos_counter), "excluded": excluded, "na28_fallback_verses": na28_fallback,
            "unmatched": sorted(unmatched), "nt_verses_without_sblgnt": nt_without}
