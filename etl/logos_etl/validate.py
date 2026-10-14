"""Post-import validation. Hard checks fail the pipeline; notes are informational."""
from dataclasses import dataclass, field
from datetime import date
from typing import Any

EXPECTED_VERSES = {"all": 31102, "OT": 23145, "NT": 7957}
MAX_ORPHAN_RATE = 0.001


@dataclass
class Check:
    name: str
    expected: Any
    actual: Any
    ok: bool


@dataclass
class Report:
    checks: list[Check]
    notes: dict[str, Any] = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return all(c.ok for c in self.checks)


def resolve_orphans(conn, token_table: str = "token", lemma_table: str = "lemma") -> int:
    """Point tokens whose sense code is absent from the lexicon at the first lemma with the same Strong's."""
    cur = conn.execute(
        f"""update {token_table} t set lemma_id = sub.id
            from (select strongs, min(id) id from {lemma_table} group by strongs) sub
            where sub.strongs = left(t.lemma_id, 5)
              and not exists (select 1 from {lemma_table} l where l.id = t.lemma_id)"""
    )
    return cur.rowcount


def report(conn, import_stats: dict | None = None) -> Report:
    one = lambda sql: conn.execute(sql).fetchone()[0]  # noqa: E731
    checks: list[Check] = []

    total = one("select count(*) from verse")
    checks.append(Check("Verses (KJV versification)", EXPECTED_VERSES["all"], total, total == EXPECTED_VERSES["all"]))
    for t in ("OT", "NT"):
        n = one(f"select count(*) from verse v join book b on b.id = v.book_id where b.testament = '{t}'")
        checks.append(Check(f"{t} verses", EXPECTED_VERSES[t], n, n == EXPECTED_VERSES[t]))
    books = one("select count(*) from book")
    checks.append(Check("Books", 66, books, books == 66))

    for tid, n in conn.execute(
        "select t.id, count(tv.verse_id) from translation t left join translation_verse tv on tv.translation_id = t.id"
        " group by 1 order by min(t.ord)"
    ):
        checks.append(Check(f"{tid.upper()} verses with text", f"≥ 31,000 of {total}", n, n >= 31000))

    unlicensed = one("select count(*) from source where coalesce(license, '') = '' or coalesce(attribution, '') = ''")
    checks.append(Check("Every source has license + attribution", 0, unlicensed, unlicensed == 0))
    nosrc = one("select count(*) from token t left join source s on s.id = t.source_id where s.id is null")
    checks.append(Check("Every token references a source", 0, nosrc, nosrc == 0))

    ot_cov = one("select count(distinct verse_id) from token where source_id = 'step-tahot'")
    checks.append(Check("OT verses with Hebrew text", EXPECTED_VERSES["OT"], ot_cov, ot_cov == EXPECTED_VERSES["OT"]))
    nt_cov = one("select count(distinct verse_id) from token where source_id = 'step-tagnt'")
    checks.append(Check("NT verses with Greek text", "≥ 7,940", nt_cov, nt_cov >= 7940))

    tokens = one("select count(*) from token")
    orphans = one(
        "select count(*) from token t where t.lemma_id is not null"
        " and not exists (select 1 from lemma l where l.id = t.lemma_id)"
    )
    rate = orphans / tokens if tokens else 1
    checks.append(Check("Tokens whose lemma is missing", f"≤ {MAX_ORPHAN_RATE:.1%}", f"{orphans} ({rate:.3%})",
                        rate <= MAX_ORPHAN_RATE))

    for lid, lo, hi in (("H2617A", 240, 250), ("G0026", 115, 118)):
        n = one(f"select count(*) from token where lemma_id = '{lid}'")
        checks.append(Check(f"Occurrences of {lid}", f"{lo}–{hi}", n, lo <= n <= hi))
    mal = one("select v.osis from versification_map m join verse v on v.id = m.verse_id"
              " where m.scheme = 'heb' and m.source_ref = 'Mal.3.19'")
    checks.append(Check("Hebrew Mal 3:19 maps to English", "Mal.4.1", mal, mal == "Mal.4.1"))

    heb = one("select count(*) from token where source_id = 'step-tahot'")
    grc = one("select count(*) from token where source_id = 'step-tagnt'")
    notes: dict[str, Any] = {
        "Tokens": f"{tokens:,} (Hebrew {heb:,}, Greek {grc:,})",
        "Lemmas": f"{one('select count(*) from lemma'):,}; Hebrew roots {one('select count(*) from root'):,}; "
                  f"lemmas linked to a root {one('select count(*) from lemma where root_id is not null'):,}",
        "Morphology codes": one("select count(*) from morphology_code"),
        "Hebrew/English versification differences": one("select count(*) from versification_map"),
    }
    for k, v in (import_stats or {}).items():
        notes[k] = v
    return Report(checks, notes)


def render_markdown(r: Report) -> str:
    lines = [
        "# Phase 2 import validation",
        "",
        f"Generated {date.today().isoformat()} by `npm run etl`. Overall: {'✅ all hard checks pass' if r.ok else '❌ failures'}",
        "",
        "| Check | Expected | Actual | |",
        "|---|---|---|---|",
    ]
    for c in r.checks:
        lines.append(f"| {c.name} | {c.expected} | {c.actual} | {'✅' if c.ok else '❌'} |")
    lines += ["", "## Notes", ""]
    for k, v in r.notes.items():
        if isinstance(v, (list, tuple)):
            shown = ", ".join(map(str, v)) if v else "none"
            lines.append(f"- **{k}** ({len(v)}): {shown}")
        else:
            lines.append(f"- **{k}:** {v}")
    return "\n".join(lines) + "\n"
