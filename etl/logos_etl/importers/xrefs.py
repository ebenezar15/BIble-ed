"""OpenBible.info cross references (CC BY)."""
from .. import books, fetch, sources


def _osis(ref: str) -> str | None:
    parts = ref.split(".")
    if len(parts) != 3:
        return None
    b = books.by_name(parts[0])
    return f"{b.id}.{int(parts[1])}.{int(parts[2])}" if b else None


def parse_line(line: str) -> tuple[str, str, str, int] | None:
    cols = line.rstrip("\n").split("\t")
    if len(cols) < 3 or not cols[2].strip().lstrip("-").isdigit():
        return None
    start, _, end = cols[1].partition("-")
    a, b, c = _osis(cols[0]), _osis(start), _osis(end or start)
    if not (a and b and c):
        return None
    return a, b, c, int(cols[2])


def import_xrefs(conn) -> dict:
    paths, sha = fetch.ensure("openbible-xref")
    sources.register(conn, "openbible-xref", sha)
    ids = dict(conn.execute("select osis, id from verse").fetchall())
    conn.execute("delete from cross_reference")
    seen: set = set()
    skipped = 0
    with conn.cursor() as cur:
        with cur.copy("copy cross_reference (from_verse, to_start, to_end, votes) from stdin") as cp:
            for line in paths[0].read_text(encoding="utf-8").splitlines():
                r = parse_line(line)
                if not r:
                    continue
                f, s, e = ids.get(r[0]), ids.get(r[1]), ids.get(r[2])
                if not (f and s and e) or (f, s, e) in seen:
                    skipped += 1
                    continue
                seen.add((f, s, e))
                cp.write_row((f, s, e, r[3]))
    return {"cross_references": len(seen), "skipped": skipped}
