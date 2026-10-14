import json

from logos_etl import text
from logos_etl.db import REPO_ROOT

CASES = json.loads((REPO_ROOT / "db" / "seed" / "translit-cases.json").read_text())


def test_translit_key_groups_fold_together():
    for group in CASES["equal_groups"]:
        keys = {text.translit_key(s) for s in group}
        assert len(keys) == 1, (group, keys)


def test_translit_key_keeps_distinct_words_apart():
    for a, b in CASES["different"]:
        assert text.translit_key(a) != text.translit_key(b)


def test_strip_hebrew_removes_points_and_separators():
    for raw, plain in CASES["hebrew_plain"]:
        assert text.strip_hebrew(raw) == plain


def test_strip_greek_removes_accents_and_folds_sigma():
    for raw, plain in CASES["greek_plain"]:
        assert text.strip_greek(raw) == plain
