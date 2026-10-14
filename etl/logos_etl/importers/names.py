"""TIPNR: every proper name in the Bible, with its Hebrew/Greek forms and references."""
import re
from typing import Iterator

from .. import fetch, sources

_LEMMA = re.compile(r"([HG]\d{4}[A-Za-z]?)«")
_REF = re.compile(r"^([1-3]?[A-Z][a-z]{1,2})\.(\d+)\.(\d+)[a-z]?$")
_KINDS = {"PERSON": "person", "PLACE": "place", "OTHER": "other"}


def parse_records(lines: list[str]) -> Iterator[dict]:
    kind = None
    rec: dict | None = None
    for raw in lines:
        line = raw.rstrip("\n")
        if line.startswith("$=========="):
            if rec:
                yield rec
            rec = None
            label = line.strip("$= \t").split("(")[0].strip().split()[0] if line.strip("$= \t") else ""
            kind = _KINDS.get(label.upper().split("+")[0], "other")
            continue
        if kind is None or not line.strip():
            continue
        cols = line.split("\t")
        if rec is None and "@" in cols[0] and "=" in cols[0] and not line.startswith(("–", "@")):
            uid = cols[0].split("=")[0].strip()
            gender = next((c.strip() for c in reversed(cols) if c.strip() in ("Male", "Female")), None)
            rec = {"id": uid, "name": uid.split("@")[0], "kind": kind, "gender": gender, "lemma_ids": [],
                   "refs": [], "brief": None, "article": None, "short": None}
            continue
        if rec is None:
            continue
        if line.startswith("–") and len(cols) >= 5 and not cols[0].startswith("– Total"):
            for lid in _LEMMA.findall(cols[2]):
                if lid not in rec["lemma_ids"]:
                    rec["lemma_ids"].append(lid)
            for r in cols[4].split(";"):
                m = _REF.match(r.strip())
                if m:
                    osis = f"{m.group(1)}.{int(m.group(2))}.{int(m.group(3))}"
                    if osis not in rec["refs"]:
                        rec["refs"].append(osis)
        elif line.startswith("@Brief="):
            rec["brief"] = line.split("=", 1)[1].strip() or None
        elif line.startswith("@Short="):
            rec["short"] = line.split("=", 1)[1].strip() or None
        elif line.startswith("@Article="):
            rec["article"] = line.split("=", 1)[1].strip() or None
    if rec:
        yield rec


def import_names(conn) -> dict:
    paths, sha = fetch.ensure("step-tipnr")
    sources.register(conn, "step-tipnr", sha)
    lines = paths[0].read_text(encoding="utf-8-sig").splitlines()
    conn.execute("delete from name_entry")
    n = 0
    seen: set[str] = set()
    with conn.cursor() as cur:
        with cur.copy(
            "copy name_entry (id, name, kind, gender, description, brief, article, lemma_ids, refs, ref_count,"
            " source_id) from stdin"
        ) as cp:
            for r in parse_records(lines):
                if r["id"] in seen:
                    continue
                seen.add(r["id"])
                cp.write_row((r["id"], r["name"], r["kind"], r["gender"], r["short"], r["brief"], r["article"],
                              r["lemma_ids"], r["refs"], len(r["refs"]), "step-tipnr"))
                n += 1
    return {"names": n}
