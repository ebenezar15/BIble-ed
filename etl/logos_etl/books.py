"""The 66-book Protestant canon, shared with the web app via db/seed/books.json."""
import json
import re
from dataclasses import dataclass
from functools import cache

from .db import REPO_ROOT

BOOKS_JSON = REPO_ROOT / "db" / "seed" / "books.json"
_ROMAN = {"iii": "3", "ii": "2", "i": "1", "first": "1", "second": "2", "third": "3"}


@dataclass(frozen=True)
class Book:
    id: str
    ord: int
    testament: str
    name: str
    abbrevs: tuple[str, ...]


def _key(name: str) -> str:
    """'II Samuel' -> '2samuel'; 'Song of Solomon' -> 'songofsolomon'."""
    words = name.lower().replace(".", " ").split()
    if words and words[0] in _ROMAN:
        words[0] = _ROMAN[words[0]]
    return re.sub(r"[^0-9a-z]", "", "".join(words))


@cache
def load() -> list[Book]:
    raw = json.loads(BOOKS_JSON.read_text())
    return [Book(b["id"], b["ord"], b["testament"], b["name"], tuple(b["abbrevs"])) for b in raw]


@cache
def _index() -> dict[str, Book]:
    idx: dict[str, Book] = {}
    for b in load():
        for alias in (b.id, b.name, *b.abbrevs):
            idx.setdefault(_key(alias), b)
    return idx


def by_name(name: str) -> Book | None:
    return _index().get(_key(name))
