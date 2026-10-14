from logos_etl import validate


def test_render_markdown_marks_failures():
    report = validate.Report(
        checks=[
            validate.Check("Verses (KJV versification)", 31102, 31102, True),
            validate.Check("Translations have license", "all", "1 missing", False),
        ],
        notes={"NT verses without SBLGNT": ["Mat.17.21", "Act.8.37"]},
    )
    md = validate.render_markdown(report)
    assert "✅" in md and "❌" in md
    assert "Translations have license" in md
    assert "Mat.17.21" in md
    assert not report.ok


def test_report_ok_when_all_checks_pass():
    assert validate.Report(checks=[validate.Check("x", 1, 1, True)], notes={}).ok


def test_resolve_orphans_maps_to_same_strongs(conn):
    conn.execute("create temp table t_lemma (id text, strongs text)")
    conn.execute("insert into t_lemma values ('G2453G','G2453'), ('H0430G','H0430'), ('H0430H','H0430')")
    conn.execute("create temp table t_token (lemma_id text)")
    conn.execute("insert into t_token values ('G2453'), ('H0430J'), ('H0430H'), ('H9999Z')")
    n = validate.resolve_orphans(conn, token_table="t_token", lemma_table="t_lemma")
    assert n == 2
    rows = [r[0] for r in conn.execute("select lemma_id from t_token order by 1")]
    assert rows == ["G2453G", "H0430G", "H0430H", "H9999Z"]
