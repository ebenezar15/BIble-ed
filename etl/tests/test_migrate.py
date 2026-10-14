from logos_etl import migrate


def test_run_is_idempotent(conn):
    migrate.run()
    assert migrate.run() == []
    row = conn.execute("select to_regclass('public.verse')").fetchone()
    assert row[0] == "verse"
