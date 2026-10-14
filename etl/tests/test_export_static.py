import json

from logos_etl.db import REPO_ROOT
from logos_etl.export_static import index_terms, shard, stem


def test_stem_matches_the_browser():
    for word, expected in json.loads((REPO_ROOT / "db" / "seed" / "stem-cases.json").read_text()):
        assert stem(word) == expected, word


def test_index_terms_drop_stop_words():
    assert index_terms("The Father loved the Son") == ["father", "lov", "son"]


def test_shards_are_safe_file_names():
    assert shard("lov") == "lo"
    assert shard("a") == "a"
    assert shard("αγαπη") == "_"
