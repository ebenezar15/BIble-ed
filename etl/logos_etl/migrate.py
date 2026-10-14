"""Apply db/migrations/*.sql in order, once each."""
from .db import REPO_ROOT, connect

MIGRATIONS = REPO_ROOT / "db" / "migrations"


def run() -> list[str]:
    applied: list[str] = []
    with connect(autocommit=False) as conn:
        conn.execute(
            "create table if not exists schema_migrations"
            " (name text primary key, applied_at timestamptz default now())"
        )
        done = {r[0] for r in conn.execute("select name from schema_migrations")}
        for path in sorted(MIGRATIONS.glob("*.sql")):
            if path.name in done:
                continue
            conn.execute(path.read_text())
            conn.execute("insert into schema_migrations (name) values (%s)", (path.name,))
            applied.append(path.name)
        conn.commit()
    return applied


if __name__ == "__main__":
    names = run()
    print("applied:", ", ".join(names) if names else "nothing (up to date)")
