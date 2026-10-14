"""STEPBible brief lexicons (TBESH/TBESG), morphology code expansions, and OSHB roots."""
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass

from .. import fetch, sources
from ..text import strip_greek, strip_hebrew, translit_key

_ID_LINE = re.compile(r"^[HG]\d{4}")
_NS = {"o": "http://openscriptures.github.com/morphhb/namespace"}


@dataclass
class Lemma:
    id: str
    strongs: str
    language: str
    lemma: str
    lemma_plain: str
    translit: str
    translit_key: str
    pos: str
    gloss: str
    body_html: str


def parse_lexicon_line(line: str, lang: str) -> Lemma | None:
    if not _ID_LINE.match(line):
        return None
    cols = line.rstrip("\n").split("\t")
    if len(cols) < 8:
        return None
    lemma_id = cols[1].split()[0]
    morph = cols[5]
    language = lang
    if lang == "heb" and morph.startswith("A:"):
        language = "arc"
    word = cols[3].strip()
    plain = strip_hebrew(word) if lang == "heb" else strip_greek(word)
    return Lemma(
        id=lemma_id,
        strongs=lemma_id[:5],
        language=language,
        lemma=word,
        lemma_plain=plain,
        translit=cols[4].strip(),
        translit_key=translit_key(cols[4]),
        pos=morph.split(":", 1)[-1],
        gloss=cols[6].strip(),
        body_html=cols[7].strip(),
    )


def morph_label(detail: str) -> str:
    """'Function=Verb ; Stem=Qal (hence …); …' -> 'Verb, Qal, …'."""
    without_notes = re.sub(r"\([^)]*\)", "", detail)
    values = [part.split("=", 1)[1].strip() for part in without_notes.split(";") if "=" in part]
    return ", ".join(v for v in values if v)


def roots_from_index(xml_text: str) -> dict[str, dict]:
    """Return {'heb:חסד': {'letters', 'language', 'gloss', 'members': {(strong, aug), …}}}."""
    tree = ET.fromstring(xml_text)
    entries: dict[str, ET.Element] = {}
    lang_of: dict[str, str] = {}
    for part in tree.findall("o:part", _NS):
        lang = part.get("{http://www.w3.org/XML/1998/namespace}lang", "heb")
        for e in part.findall("o:entry", _NS):
            entries[e.get("id")] = e
            lang_of[e.get("id")] = lang

    def key_of(e: ET.Element) -> tuple[str, str] | None:
        x = e.find("o:xref", _NS)
        if x is None or not x.get("strong"):
            return None
        return x.get("strong"), x.get("aug") or ""

    roots: dict[str, dict] = {}
    for eid, e in entries.items():
        etym = e.find("o:etym", _NS)
        if etym is None or etym.get("type") != "main" or not etym.get("root"):
            continue
        rid = f"{lang_of[eid]}:{etym.get('root')}"
        root = roots.setdefault(
            rid, {"letters": etym.get("root"), "language": lang_of[eid], "gloss": None, "members": set()}
        )
        own = key_of(e)
        definition = (e.findtext("o:def", default="", namespaces=_NS) or "").strip()
        if own:
            root["members"].add(own)
            if definition and (root["gloss"] is None or own[1] in ("", "a")):
                root["gloss"] = definition
        # Walk derived entries (children may have their own sub-children).
        stack = [c.strip() for c in (etym.text or "").split(",") if c.strip()]
        seen: set[str] = set()
        while stack:
            cid = stack.pop()
            if cid in seen or cid not in entries:
                continue
            seen.add(cid)
            child = entries[cid]
            ck = key_of(child)
            if ck:
                root["members"].add(ck)
            cet = child.find("o:etym", _NS)
            if cet is not None and cet.get("type") == "main" and not cet.get("root"):
                stack.extend(c.strip() for c in (cet.text or "").split(",") if c.strip())
    return roots


def _read(paths) -> list[str]:
    return paths[0].read_text(encoding="utf-8-sig").splitlines()


def _import_lexicon(conn, key: str, lang: str) -> int:
    paths, sha = fetch.ensure(key)
    sources.register(conn, key, sha)
    lemmas = [l for l in (parse_lexicon_line(x, lang) for x in _read(paths)) if l]
    conn.execute("delete from lexicon_entry where source_id = %s", (key,))
    with conn.cursor() as cur:
        with cur.copy(
            "copy lemma (id, strongs, language, lemma, lemma_plain, translit, translit_key, pos, gloss, source_id)"
            " from stdin"
        ) as cp:
            existing = set()
            for l in lemmas:
                if l.id in existing:
                    continue
                existing.add(l.id)
                cp.write_row((l.id, l.strongs, l.language, l.lemma, l.lemma_plain, l.translit,
                              l.translit_key, l.pos, l.gloss, key))
        with cur.copy("copy lexicon_entry (lemma_id, source_id, body_html) from stdin") as cp:
            for l in lemmas:
                if l.body_html:
                    cp.write_row((l.id, key, l.body_html))
    return len(lemmas)


def import_lexicons(conn) -> dict[str, int]:
    conn.execute("update lemma set root_id = null")
    conn.execute("delete from lexicon_entry")
    conn.execute("delete from lemma")
    return {
        "step-tbesh": _import_lexicon(conn, "step-tbesh", "heb"),
        "step-tbesg": _import_lexicon(conn, "step-tbesg", "grc"),
    }


def import_morph_codes(conn) -> int:
    n = 0
    conn.execute("delete from morphology_code")
    for key, lang in (("step-tehmc", "heb"), ("step-tegmc", "grc")):
        paths, sha = fetch.ensure(key)
        sources.register(conn, key, sha)
        seen: set[str] = set()
        with conn.cursor() as cur:
            with cur.copy("copy morphology_code (code, language, label, detail) from stdin") as cp:
                for line in _read(paths):
                    cols = line.split("\t")
                    if len(cols) < 2 or "Function=" not in cols[1] or not cols[0].strip():
                        continue
                    code = cols[0].strip()
                    if code in seen:
                        continue
                    seen.add(code)
                    cp.write_row((code, lang, morph_label(cols[1]), cols[1].strip()))
                    n += 1
    return n


def import_roots(conn) -> dict[str, int]:
    paths, sha = fetch.ensure("oshb-lexindex")
    sources.register(conn, "oshb-lexindex", sha)
    roots = roots_from_index(paths[0].read_text(encoding="utf-8"))
    conn.execute("update lemma set root_id = null")
    conn.execute("delete from root")
    hebrew = conn.execute("select id, strongs from lemma where language in ('heb','arc')").fetchall()
    by_strongs: dict[str, list[str]] = {}
    for lid, strongs in hebrew:
        by_strongs.setdefault(strongs, []).append(lid)
    linked = 0
    with conn.cursor() as cur:
        for rid, r in roots.items():
            cur.execute("insert into root (id, language, letters, gloss) values (%s, %s, %s, %s)",
                        (rid, r["language"], r["letters"], r["gloss"]))
            for strong, aug in r["members"]:
                candidates = by_strongs.get(f"H{int(strong):04d}", [])
                if aug:
                    exact = [c for c in candidates if c.upper().endswith(aug.upper()) and len(c) == 6]
                    candidates = exact or [c for c in candidates if len(c) == 5] or candidates
                for lid in candidates:
                    cur.execute("update lemma set root_id = %s where id = %s and root_id is null", (rid, lid))
                    linked += cur.rowcount
    return {"roots": len(roots), "lemmas_linked": linked}
