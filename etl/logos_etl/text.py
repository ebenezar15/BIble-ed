"""Script normalisation. Mirrored exactly by lib/search/normalize.ts (shared cases: db/seed/translit-cases.json)."""
import re
import unicodedata

_HEB_LETTER = re.compile(r"[א-ת]")
_HEB_POINTS = re.compile(r"[֑-ׇ׳״/\\‍‌־׃׀]")


def strip_hebrew(s: str) -> str:
    """Remove vowel points, cantillation, maqaf/sof pasuq and STEP morpheme separators."""
    return _HEB_POINTS.sub("", s).strip()


def strip_greek(s: str) -> str:
    decomposed = unicodedata.normalize("NFD", s)
    bare = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return bare.lower().replace("ς", "σ").strip()


_TRANSLIT_DROP = re.compile(r"[\s'ʼʿ’`.\-]")
_DIGRAPHS = [("kh", "h"), ("ch", "h"), ("sh", "s"), ("ph", "f"), ("th", "t"), ("ts", "s"), ("tz", "s")]
_LETTERS = str.maketrans({"ə": "e", "š": "s", "y": "u", "w": "v", "ß": "s"})


def translit_key(s: str) -> str:
    """Fold transliteration variants: hesed/chesed/ḥeseḏ -> 'hesed'; agapē -> 'agape'."""
    t = s.lower().translate(_LETTERS)
    t = unicodedata.normalize("NFD", t)
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    t = t.translate(_LETTERS)
    t = _TRANSLIT_DROP.sub("", t)
    for a, b in _DIGRAPHS:
        t = t.replace(a, b)
    t = re.sub(r"ah$", "a", t)
    t = re.sub(r"(.)\1+", r"\1", t)
    return t
