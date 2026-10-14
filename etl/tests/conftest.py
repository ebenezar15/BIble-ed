import os

import pytest

os.environ.setdefault("DATABASE_URL", "postgres://logos:logos@localhost:5432/logos")


@pytest.fixture
def conn():
    from logos_etl.db import connect

    try:
        c = connect()
    except Exception as e:  # pragma: no cover - environment without a DB
        pytest.skip(f"database unavailable: {e}")
    yield c
    c.close()
