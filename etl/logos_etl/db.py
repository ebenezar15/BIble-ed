"""Database connection helper shared by every importer."""
import os
from pathlib import Path

import psycopg

REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_dotenv() -> None:
    env = REPO_ROOT / ".env"
    if not env.exists():
        return
    for line in env.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())


def connect(autocommit: bool = True) -> psycopg.Connection:
    _load_dotenv()
    url = os.environ["DATABASE_URL"]
    conn = psycopg.connect(url, autocommit=autocommit)
    if "-pooler." in url:  # Neon pooled endpoint (PgBouncer, transaction mode): avoid server-side prepares
        conn.prepare_threshold = None
    return conn
