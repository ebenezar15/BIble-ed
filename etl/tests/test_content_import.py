import pytest

from logos_etl.importers import content

DOC = {
    "people": [{"id": "zz-test-person", "name": "Test Person", "roles": ["scholar"]}],
    "works": [{"id": "zz-test-work", "person": "zz-test-person", "title": "A Book", "copyright": "copyrighted"}],
    "entries": [{"kind": "parable", "slug": "zz-test", "title": "Test parable", "refs": ["Luk.15.11-Luk.15.32"],
                 "data": {"gospels": ["Luk"]}}],
    "blocks": [
        {"subject": "entry:parable/zz-test", "section": "lens", "type": "lens_commentary", "body": "Relational.",
         "consensus": "n/a", "citations": []},
        {"subject": "entry:parable/zz-test", "section": "voices", "type": "scholarly_interpretation",
         "by": "zz-test-person", "body": "A view.", "consensus": "n/a",
         "citations": [{"work": "zz-test-work", "ref": "ch. 2", "verified": False}]},
    ],
}


@pytest.fixture
def clean(conn):
    def wipe():
        conn.execute("delete from content_block where subject_id like '%zz-test%' or by_person like 'zz-test%'")
        conn.execute("delete from entry where slug like 'zz-test%'")
        conn.execute("delete from work where id like 'zz-test%'")
        conn.execute("delete from person where id like 'zz-test%'")
    wipe()
    yield conn
    wipe()


def test_import_is_idempotent_and_keeps_owner_blocks(clean):
    conn = clean
    content.import_docs(conn, [DOC], only_prefix="zz-test")
    conn.execute(
        "insert into content_block (subject_kind, subject_id, section, type, body_md, author, status)"
        " values ('entry', 'parable/zz-test', 'notes', 'lens_commentary', 'Mine', 'owner', 'reviewed')"
    )
    content.import_docs(conn, [DOC], only_prefix="zz-test")
    rows = conn.execute(
        "select author, section, status from content_block where subject_id = 'parable/zz-test' order by section"
    ).fetchall()
    assert rows == [("claude", "lens", "draft"), ("owner", "notes", "reviewed"), ("claude", "voices", "draft")]
    cites = conn.execute(
        "select c.ref, c.verified from citation c join content_block b on b.id = c.block_id"
        " where b.subject_id = 'parable/zz-test'"
    ).fetchall()
    assert cites == [("ch. 2", False)]
    assert conn.execute("select refs, data->'gospels' from entry where slug = 'zz-test'").fetchone() == (
        ["Luk.15.11-Luk.15.32"], ["Luk"])
