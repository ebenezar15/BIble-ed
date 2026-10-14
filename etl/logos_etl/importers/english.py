"""Public-domain English translations. KJV defines the canonical verse list."""
import csv
import json
import re
from pathlib import Path

from .. import books, fetch, sources

ORDER = ["kjv", "bsb", "web", "ylt", "asv", "darby"]


def parse_scrollmapper_row(row: list[str]) -> tuple[str, int, int, str] | None:
    if len(row) < 4 or not row[1].isdigit():
        return None
    book = books.by_name(row[0])
    if book is None:
        raise ValueError(f"unknown book name {row[0]!r}")
    return book.id, int(row[1]), int(row[2]), row[3].strip()


def merge_web_segments(segments: list[dict]) -> list[tuple[int, int, str, bool]]:
    """Join WEB text segments into whole verses; flag verses that open a paragraph/stanza."""
    out: list[tuple[int, int, str, bool]] = []
    pending_break = False
    for seg in segments:
        kind = seg["type"]
        if kind in ("paragraph start", "stanza start"):
            pending_break = True
            continue
        if "verseNumber" not in seg:
            continue
        key = (seg["chapterNumber"], seg["verseNumber"])
        text = seg.get("value", "")
        if out and (out[-1][0], out[-1][1]) == key:
            ch, vs, prev, para = out[-1]
            out[-1] = (ch, vs, prev + text, para)
        else:
            out.append((*key, text, pending_break))
        pending_break = False
    return [(c, v, re.sub(r"\s+", " ", t).strip(), p) for c, v, t, p in out]


def _seed_books(conn) -> None:
    with conn.cursor() as cur:
        for b in books.load():
            cur.execute(
                """insert into book (id, ord, testament, name, abbrevs) values (%s, %s, %s, %s, %s)
                   on conflict (id) do update set ord = excluded.ord, name = excluded.name,
                     abbrevs = excluded.abbrevs""",
                (b.id, b.ord, b.testament, b.name, list(b.abbrevs)),
            )


def _read_scrollmapper(path: Path) -> list[tuple[str, int, int, str, bool]]:
    with path.open(newline="", encoding="utf-8") as f:
        rows = [parse_scrollmapper_row(r) for r in csv.reader(f)]
    return [(*r, False) for r in rows if r]


def _read_web(paths: list[Path]) -> list[tuple[str, int, int, str, bool]]:
    out = []
    for book, path in zip(books.load(), paths):
        for ch, vs, text, para in merge_web_segments(json.loads(path.read_text())):
            out.append((book.id, ch, vs, text, para))
    return out


def import_all(conn) -> dict[str, dict]:
    """Import every English translation. Returns per-translation stats incl. unmatched refs."""
    _seed_books(conn)
    stats: dict[str, dict] = {}
    for ord_, key in enumerate(ORDER, 1):
        paths, sha = fetch.ensure(key)
        sources.register(conn, key, sha)
        rows = _read_web(paths) if key == "web" else _read_scrollmapper(paths[0])
        src = sources.SOURCES[key]
        year = int(src.notes.removeprefix("year="))
        conn.execute(
            """insert into translation (id, name, year, ord, source_id) values (%s, %s, %s, %s, %s)
               on conflict (id) do update set name = excluded.name, year = excluded.year, ord = excluded.ord""",
            (key, src.name, year, ord_, key),
        )
        if key == "kjv":
            existing = {r[0] for r in conn.execute("select osis from verse")}
            with conn.cursor() as cur:
                with cur.copy("copy verse (book_id, chapter, verse, osis) from stdin") as cp:
                    for b, c, v, _, _ in rows:
                        osis = f"{b}.{c}.{v}"
                        if osis not in existing:
                            cp.write_row((b, c, v, osis))
            conn.execute(
                "update book set chapters = m.c from (select book_id, max(chapter) c from verse group by 1) m"
                " where book.id = m.book_id"
            )
        verse_ids = dict(conn.execute("select osis, id from verse").fetchall())
        conn.execute("delete from translation_verse where translation_id = %s", (key,))
        unmatched: list[str] = []
        with conn.cursor() as cur:
            with cur.copy("copy translation_verse (translation_id, verse_id, text, para_start) from stdin") as cp:
                for b, c, v, text, para in rows:
                    vid = verse_ids.get(f"{b}.{c}.{v}")
                    if vid is None:
                        unmatched.append(f"{b}.{c}.{v}")
                    elif text:
                        cp.write_row((key, vid, text, para))
        stats[key] = {"rows": len(rows), "unmatched": unmatched}
    return stats
