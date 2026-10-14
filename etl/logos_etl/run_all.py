"""Full Phase 2 pipeline: migrate, import every source, resolve orphans, validate, write the report."""
import sys
import time

from . import migrate, validate
from .db import REPO_ROOT, connect
from .importers import english, lexicons, tagnt, tahot

REPORT = REPO_ROOT / "docs" / "reports" / "phase2-import.md"


def main() -> int:
    t0 = time.time()
    print("migrate:", migrate.run() or "up to date")
    conn = connect()
    steps = [
        ("english", english.import_all),
        ("lexicons", lexicons.import_lexicons),
        ("morphology codes", lexicons.import_morph_codes),
        ("hebrew roots", lexicons.import_roots),
        ("hebrew OT (TAHOT)", tahot.import_tahot),
        ("greek NT (TAGNT)", tagnt.import_tagnt),
    ]
    stats: dict = {}
    for name, fn in steps:
        t = time.time()
        stats[name] = fn(conn)
        print(f"{name}: done in {time.time() - t:.1f}s")
    resolved = validate.resolve_orphans(conn)
    conn.execute("analyze")

    eng = stats["english"]
    notes = {
        "Tokens re-pointed to a sibling sense (sense code absent from brief lexicon)": resolved,
        "Hebrew words skipped by type (X = LXX-only additions, V = duplicate variants)": stats["hebrew OT (TAHOT)"]["skipped"],
        "NT verses without SBLGNT text (later manuscripts)": stats["greek NT (TAGNT)"]["nt_verses_without_sblgnt"],
        "NT verses shown from NA28 (STEP data lacks SBL marks)": stats["greek NT (TAGNT)"]["na28_fallback_verses"],
        "English source verses outside KJV versification (not imported)":
            [f"{k}:{r}" for k, v in eng.items() for r in v["unmatched"]],
    }
    rep = validate.report(conn, notes)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(validate.render_markdown(rep))
    for c in rep.checks:
        print(("ok  " if c.ok else "FAIL"), c.name, "->", c.actual)
    print(f"report: {REPORT.relative_to(REPO_ROOT)} ({time.time() - t0:.0f}s total)")
    return 0 if rep.ok else 1


if __name__ == "__main__":
    sys.exit(main())
