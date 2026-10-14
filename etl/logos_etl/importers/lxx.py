"""Hebrew→Greek bridge from Abbott-Smith's "[in LXX for …]" notes in STEPBible TBESG (CC BY)."""
import re

from ..text import strip_hebrew

_NOTE = re.compile(r"\[in LXX([^\]]*)\]")
_HEB_WORD = re.compile(r"[א-ת][֑-ׇא-ת]*")


def hebrew_in_lxx_note(body: str) -> list[str]:
    m = _NOTE.search(body)
    if not m:
        return []
    out: list[str] = []
    for w in _HEB_WORD.findall(m.group(1)):
        plain = strip_hebrew(w)
        if len(plain) >= 2 and plain not in out:
            out.append(plain)
    return out


def mentions_cognates(body: str) -> bool:
    m = _NOTE.search(body)
    return bool(m and "cognate" in m.group(1))


def import_bridge(conn) -> dict:
    heb: dict[str, str] = {}
    root_of: dict[str, str] = {}
    by_root: dict[str, list[str]] = {}
    for lid, plain, occ, root in conn.execute(
        "select id, lemma_plain, occurrences, root_id from lemma where language = 'heb' order by occurrences desc"
    ):
        heb.setdefault(plain, lid)  # most frequent sense wins
        if root:
            root_of[lid] = root
            if occ >= 20:
                by_root.setdefault(root, []).append(lid)
    rows = conn.execute(
        "select e.lemma_id, e.body_html from lexicon_entry e where e.source_id = 'step-tbesg'"
    ).fetchall()
    conn.execute("delete from lxx_bridge")
    pairs: set[tuple[str, str]] = set()
    for gid, body in rows:
        cognates = mentions_cognates(body)
        for w in hebrew_in_lxx_note(body):
            if w in heb:
                pairs.add((heb[w], gid))
                if cognates and heb[w] in root_of:
                    pairs.update((h, gid) for h in by_root.get(root_of[heb[w]], []))
    with conn.cursor() as cur:
        with cur.copy("copy lxx_bridge (hebrew_lemma, greek_lemma, source_id) from stdin") as cp:
            for h, g in pairs:
                cp.write_row((h, g, "step-tbesg"))
    return {"pairs": len(pairs)}
