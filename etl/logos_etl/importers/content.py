"""Import editorial seed content (content/*.json). Seeded rows are author='claude', status='draft'.

Re-running replaces seeded blocks and upserts seeded people/works/entries, but never touches rows
the owner created or edited (author='owner').
"""
import hashlib
import json
from pathlib import Path

from psycopg.types.json import Jsonb

from ..content_check import CONTENT, load_all


def _like(prefix: str | None) -> str:
    return f"%{prefix}%" if prefix else "%"


def seed_key(subject: str, section: str, title: str | None, ordinal: int) -> str:
    return hashlib.sha1(f"{subject}|{section}|{title or ''}|{ordinal}".encode()).hexdigest()


def suppress_and_delete(conn, block_id: int) -> None:
    """Delete a block; if it came from the seed, remember that so re-imports don't revive it."""
    conn.execute(
        "insert into seed_suppressed (seed_key) select seed_key from content_block"
        " where id = %s and seed_key is not null on conflict do nothing",
        (block_id,),
    )
    conn.execute("delete from content_block where id = %s", (block_id,))


def import_docs(conn, docs: list[dict], only_prefix: str | None = None) -> dict[str, int]:
    merged: dict = {"people": [], "works": [], "entries": [], "blocks": []}
    for d in docs:
        for k in merged:
            merged[k].extend(d.get(k, []))
    like = _like(only_prefix)
    with conn.transaction():
        for p in merged["people"]:
            conn.execute(
                """insert into person (id, name, born, died, era, tradition, roles, summary)
                   values (%s, %s, %s, %s, %s, %s, %s, %s)
                   on conflict (id) do update set name = excluded.name, born = excluded.born, died = excluded.died,
                     era = excluded.era, tradition = excluded.tradition, roles = excluded.roles,
                     summary = excluded.summary
                   where person.author = 'claude'""",
                (p["id"], p["name"], p.get("born"), p.get("died"), p.get("era"), p.get("tradition"),
                 p.get("roles") or [], p.get("summary")),
            )
        for w in merged["works"]:
            conn.execute(
                """insert into work (id, person_id, title, year, copyright, edition, publisher, isbn, url)
                   values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                   on conflict (id) do update set person_id = excluded.person_id, title = excluded.title,
                     year = excluded.year, copyright = excluded.copyright, edition = excluded.edition,
                     publisher = excluded.publisher, isbn = excluded.isbn, url = excluded.url
                   where work.author = 'claude'""",
                (w["id"], w.get("person"), w["title"], w.get("year"), w["copyright"], w.get("edition"),
                 w.get("publisher"), w.get("isbn"), w.get("url")),
            )
        keep = {(e["kind"], e["slug"]) for e in merged["entries"]}
        for i, e in enumerate(merged["entries"]):
            conn.execute(
                """insert into entry (kind, slug, title, subtitle, summary, refs, lemmas, data, ord)
                   values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                   on conflict (kind, slug) do update set title = excluded.title, subtitle = excluded.subtitle,
                     summary = excluded.summary, refs = excluded.refs, lemmas = excluded.lemmas,
                     data = excluded.data, ord = excluded.ord
                   where entry.author = 'claude'""",
                (e["kind"], e["slug"], e["title"], e.get("subtitle"), e.get("summary"), e.get("refs") or [],
                 e.get("lemmas") or [], Jsonb(e.get("data") or {}), e.get("order", i)),
            )
        verse_ids = dict(conn.execute("select osis, id from verse").fetchall())
        conn.execute("delete from entry_range where slug like %s", (like,))
        for e in merged["entries"]:
            for ref in e.get("refs") or []:
                start, _, end = ref.partition("-")
                a, b = verse_ids.get(start), verse_ids.get(end or start)
                if a and b:
                    conn.execute(
                        "insert into entry_range (kind, slug, verse_start, verse_end) values (%s, %s, %s, %s)",
                        (e["kind"], e["slug"], min(a, b), max(a, b)),
                    )
        for kind, slug in conn.execute(
            "select kind, slug from entry where author = 'claude' and slug like %s", (like,)
        ).fetchall():
            if (kind, slug) not in keep:
                conn.execute("delete from entry where kind = %s and slug = %s", (kind, slug))

        conn.execute(
            "delete from content_block where author = 'claude' and (subject_id like %s or coalesce(by_person, '') like %s)",
            (like, like),
        )
        order: dict[tuple, int] = {}
        blocks = 0
        taken = {r[0] for r in conn.execute(
            "select seed_key from content_block where author = 'owner' and seed_key is not null"
            " union select seed_key from seed_suppressed")}
        for b in merged["blocks"]:
            kind, _, ident = b["subject"].partition(":")
            key = (kind, ident, b["section"])
            order[key] = order.get(key, 0) + 1
            skey = seed_key(b["subject"], b["section"], b.get("title"), order[key])
            if skey in taken:  # the owner edited or deleted this seeded block: keep their decision
                continue
            block_id = conn.execute(
                """insert into content_block (subject_kind, subject_id, section, title, type, by_person, consensus,
                     body_md, ord, seed_key) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) returning id""",
                (kind, ident, b["section"], b.get("title"), b["type"], b.get("by"), b.get("consensus", "n/a"),
                 b["body"], order[key], skey),
            ).fetchone()[0]
            for c in b.get("citations") or []:
                conn.execute(
                    "insert into citation (block_id, work_id, ref, url, quote, verified) values (%s, %s, %s, %s, %s, false)",
                    (block_id, c.get("work"), c["ref"], c.get("url"), c.get("quote")),
                )
            blocks += 1
    return {"people": len(merged["people"]), "works": len(merged["works"]), "entries": len(merged["entries"]),
            "blocks": blocks}


def import_all(conn) -> dict[str, int]:
    paths = sorted(Path(CONTENT).glob("*.json"))
    return import_docs(conn, [load_all([p]) for p in paths])
