"""Church Fathers' comments on verses, from HistoricalChristianFaith/Commentaries-Database.

That repository mixes public-domain translations with fair-use excerpts of copyrighted modern
translations. We import ONLY an allow-list of public-domain translations.
"""
import re
import tomllib
from urllib.parse import unquote, urlparse

from .. import books, fetch, sources

_FILE = re.compile(r"^(?P<book>.+?) (?P<c1>\d+)_(?P<v1>\d+)(?:-(?:(?P<c2>\d+)_)?(?P<v2>\d+))?\.toml$")

# Ante-Nicene Fathers series: every work by these authors in the collection is the ANF translation.
_ALL_WORKS = {"Irenaeus", "Tertullian", "Cyprian", "Justin Martyr", "Ignatius of Antioch", "Clement of Rome",
              "Polycarp of Smyrna", "Novatian", "Lactantius", "Methodius", "Clement of Alexandria", "Hippolytus",
              "Cyril of Jerusalem", "Leo the Great", "John Cassian", "Aphrahat"}
# Works known to be in ANF/NPNF or other pre-1929 translations (prefix match, case-insensitive).
_WORKS = {
    "Thomas Aquinas": ["catena aurea"],  # J. H. Newman's Oxford translation, 1841-45
    "Augustine of Hippo": ["tractates on john", "on the psalms", "ten homilies on the first epistle of john",
                           "our lord's sermon on the mount", "on the trinity", "the city of god", "confessions",
                           "letters", "enchiridion", "on christian doctrine", "harmony of the gospels"],
    "Origen of Alexandria": ["de principiis", "against celsus"],
    "Ambrose of Milan": ["letters", "on the holy spirit", "exposition of the christian faith",
                         "on the duties of the clergy", "on the decease of his brother", "on the mysteries",
                         "concerning repentance", "concerning virgins"],
    "Hilary of Poitiers": ["on the trinity", "on the councils"],
    "Gregory of Nyssa": ["against eunomius", "on the making of man", "the great catechism",
                         "on the soul and the resurrection", "on virginity"],
    "Basil of Caesarea": ["the hexaemeron", "on the spirit", "letters"],
    "Cyril of Alexandria": ["commentary on the gospel of john", "commentary on luke"],
    "Gregory the Dialogist": ["morals on the book of job"],
    "Jerome": ["letters", "against jovinianus", "against helvidius", "lives of illustrious men", "against rufinus"],
    "Gregory of Nazianzus": ["oration", "letters"],
    "Eusebius of Caesarea": ["church history", "life of constantine", "oration"],
    "Athanasius of Alexandria": ["on the incarnation", "against the heathen", "against the arians", "discourse",
                                 "festal", "life of antony", "defence", "de decretis", "councils"],
}
_CHRYSOSTOM_NPNF = re.compile(
    r"matthew|john|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|"
    r"titus|philemon|hebrews|statues", re.I)
# Hosts of the Schaff ANF/NPNF series, by path. Other pages on these sites carry modern translations.
_PD_PATHS = (
    ("newadvent.org", "/fathers/"),
    ("ccel.org", "/ccel/schaff/"),
    ("tertullian.org", "/fathers2/"),
)


def parse_filename(name: str) -> tuple[str, int, int, int, int] | None:
    m = _FILE.match(name)
    if not m:
        return None
    b = books.by_name(m["book"])
    if not b:
        return None
    c1, v1 = int(m["c1"]), int(m["v1"])
    c2 = int(m["c2"]) if m["c2"] else c1
    v2 = int(m["v2"]) if m["v2"] else v1
    return b.id, c1, v1, c2, v2


def is_public_domain(url: str) -> bool:
    if not url:
        return False
    parsed = urlparse(url)
    host = parsed.netloc.removeprefix("www.")
    if any(host == h and parsed.path.startswith(p) for h, p in _PD_PATHS):
        return True
    if "historicalchristian.faith" not in parsed.netloc:
        return False
    m = re.search(r"file=(.*)", unquote(unquote(url)))
    if not m:
        return False
    parts = m.group(1).split("/")
    father, work = parts[0], (parts[1] if len(parts) > 1 else "").removesuffix(".html").lower()
    if father in _ALL_WORKS:
        return True
    if father == "John Chrysostom":
        return work == "homilies" and bool(_CHRYSOSTOM_NPNF.search("/".join(parts[2:])))
    return any(work.startswith(w) for w in _WORKS.get(father, []))


def import_fathers(conn) -> dict:
    root, sha = fetch.ensure_git("hcf-commentaries")
    sources.register(conn, "hcf-commentaries", sha)
    ids = dict(conn.execute("select osis, id from verse").fetchall())
    conn.execute("delete from father_comment")
    kept = excluded = unmatched = 0
    with conn.cursor() as cur:
        with cur.copy(
            "copy father_comment (father, verse_start, verse_end, quote, source_title, source_url, year, source_id)"
            " from stdin"
        ) as cp:
            for folder in sorted(p for p in root.iterdir() if p.is_dir() and not p.name.startswith(".")):
                if books.by_name(folder.name):  # NT authors quoting the OT, not Fathers
                    continue
                meta = {}
                if (folder / "metadata.toml").exists():
                    meta = tomllib.loads((folder / "metadata.toml").read_text(encoding="utf-8"))
                for f in folder.glob("*.toml"):
                    ref = parse_filename(f.name)
                    if not ref:
                        continue
                    b, c1, v1, c2, v2 = ref
                    start, end = ids.get(f"{b}.{c1}.{v1}"), ids.get(f"{b}.{c2}.{v2}")
                    try:
                        data = tomllib.loads(f.read_text(encoding="utf-8"))
                    except tomllib.TOMLDecodeError:
                        continue
                    for c in data.get("commentary", []):
                        url = c.get("source_url") or ""
                        if not is_public_domain(url):
                            excluded += 1
                            continue
                        if not (start and end):
                            unmatched += 1
                            continue
                        name = folder.name + (c.get("append_to_author_name") or "")
                        year = c.get("time") or meta.get("default_year")
                        quote = (c.get("quote") or "").strip()
                        if quote:
                            cp.write_row((name, start, end, quote, c.get("source_title"), url,
                                          int(year) if str(year).lstrip("-").isdigit() else None,
                                          "hcf-commentaries"))
                            kept += 1
    return {"kept": kept, "excluded_not_public_domain": excluded, "unmatched_refs": unmatched}
