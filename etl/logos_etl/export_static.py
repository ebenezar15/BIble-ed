"""Export the library database to static JSON files the browser app reads (public/data).

Run after the import:  python -m logos_etl.export_static [out_dir]
The site needs no database or server: every page reads these files.
"""
import json
import re
import shutil
import sys
import time
import unicodedata
from collections import defaultdict
from pathlib import Path

from .db import REPO_ROOT, connect

SEARCH_TRANSLATIONS = ("kjv", "bsb", "web")
XREFS_PER_VERSE = 24
GLOSS_ROWS = 300
FAMILY_SIZE = 40
BRIDGE_SIZE = 16


# Mirrors lib/search/match.ts (fold, STOP, stem) so the browser can query the Fathers index.
STOP = set(
    ("a an and are as at be but by for from had has have he her hers him his i if in into is it its me my no nor not "
     "of on or our she so such than that the their them then there these they this those to was we were what when "
     "which who whom will with would you your").split()
)
WORD_RE = re.compile(r"[^\W_][\w'’]*")
SUFFIXES = ("eth", "est", "ing", "ed", "es", "ly", "s")


def fold(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if not unicodedata.category(c).startswith("M")).lower()


def stem(word: str) -> str:
    w = re.sub(r"['’]", "", re.sub(r"['’]s$", "", fold(word)))
    if len(w) >= 7 and w.endswith("ness"):
        w = w[:-4]
    for suffix in SUFFIXES:
        if len(w) - len(suffix) >= 3 and w.endswith(suffix):
            w = w[: -len(suffix)]
            break
    return re.sub(r"e$", "", w) if len(w) > 3 else w


def index_terms(text: str) -> list[str]:
    return [stem(w) for w in WORD_RE.findall(text) if fold(w) not in STOP]


def shard(term: str) -> str:
    return term[:2] if re.fullmatch(r"[a-z0-9]{1,2}", term[:2]) else "_"


def write(out: Path, rel: str, obj) -> int:
    path = out / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    path.write_text(data, encoding="utf-8")
    return len(data.encode())


def name_bucket(name_id: str) -> str:
    c = name_id[:1].upper()
    return c if "A" <= c <= "Z" else "_"


def export_blocks(cur):
    """All content blocks grouped by (subject_kind, subject_id), in display order, with citations."""
    cur.execute("""
        select c.block_id, c.id, c.ref, c.url, c.work_id, w.title, w.copyright, c.verified
        from citation c left join work w on w.id = c.work_id order by c.id""")
    cites = defaultdict(list)
    for block_id, cid, ref, url, work_id, work_title, copyright, verified in cur.fetchall():
        cites[block_id].append({
            "id": cid, "ref": ref, "url": url, "workId": work_id, "workTitle": work_title,
            "copyright": copyright, "verified": bool(verified),
        })
    cur.execute("""
        select b.id, b.seed_key, b.subject_kind, b.subject_id, b.section, b.title, b.type, b.consensus, b.status,
               b.author, b.body_md, p.id, p.name
        from content_block b left join person p on p.id = b.by_person
        order by b.subject_kind, b.subject_id, b.section, b.ord, b.id""")
    blocks = defaultdict(list)
    for bid, key, kind, subject, section, title, typ, consensus, status, author, body, pid, pname in cur.fetchall():
        blocks[(kind, subject)].append({
            "id": bid, "key": key or f"db-{bid}", "section": section, "title": title, "type": typ,
            "consensus": consensus, "status": status, "author": author, "bodyMd": body,
            "by": {"id": pid, "name": pname} if pid else None, "citations": cites.get(bid, []),
        })
    return blocks


def export(out: Path) -> dict:
    started = time.time()
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    sizes = defaultdict(int)
    counts = defaultdict(int)

    def put(group: str, rel: str, obj) -> None:
        sizes[group] += write(out, rel, obj)
        counts[group] += 1

    with connect() as conn, conn.cursor() as cur:
        blocks = export_blocks(cur)

        # --- meta: books, chapters, verse counts, translations, Hebrew-numbering map
        cur.execute("select id, name, testament, chapters, ord from book order by ord")
        books = [{"id": i, "name": n, "testament": t, "chapters": c} for i, n, t, c, _ in cur.fetchall()]
        cur.execute("select book_id, chapter, count(*) from verse group by 1, 2 order by 1, 2")
        verse_counts = defaultdict(dict)
        for b, c, n in cur.fetchall():
            verse_counts[b][c] = n
        for b in books:
            b["verses"] = [verse_counts[b["id"]].get(c, 0) for c in range(1, b["chapters"] + 1)]
        cur.execute("select id, name from translation order by ord")
        translations = [{"id": i, "name": n} for i, n in cur.fetchall()]
        cur.execute("""select m.source_ref, v.osis from versification_map m join verse v on v.id = m.verse_id
                       where m.scheme = 'heb'""")
        heb_map = dict(cur.fetchall())
        put("meta", "meta.json", {
            "builtAt": time.strftime("%Y-%m-%d"), "books": books, "translations": translations, "hebMap": heb_map,
        })

        cur.execute("select code, label from morphology_code")
        put("meta", "morph.json", dict(cur.fetchall()))

        cur.execute("select id, name, license, attribution, url, version from source order by license, name")
        put("meta", "sources.json", [
            {"id": i, "name": n, "license": l, "attribution": a, "url": u, "version": v}
            for i, n, l, a, u, v in cur.fetchall()
        ])

        # --- lemma index (search, Ask, references)
        cur.execute("""select id, lemma, coalesce(translit, ''), coalesce(gloss, ''), language, occurrences, strongs,
                              coalesce(lemma_plain, ''), coalesce(translit_key, '')
                       from lemma order by id""")
        lemma_rows = cur.fetchall()
        put("lemmas", "lemmas.json", [list(r) for r in lemma_rows])
        lemma_ref = {r[0]: {"id": r[0], "lemma": r[1], "translit": r[2], "gloss": r[3], "language": r[4], "count": r[5]}
                     for r in lemma_rows}

        # --- content entries, people, works
        cur.execute("""select kind, slug, title, subtitle, summary, refs, data, ord, lemmas from entry
                       order by kind, ord, title""")
        entries = []
        for kind, slug, title, subtitle, summary, refs, data, ord_, lemmas in cur.fetchall():
            summary_obj = {"kind": kind, "slug": slug, "title": title, "subtitle": subtitle, "summary": summary,
                           "refs": refs or [], "data": data or {}, "ord": ord_}
            entries.append(summary_obj)
            put("entries", f"entry/{kind}/{slug}.json", {
                **summary_obj,
                "lemmas": [lemma_ref[i] for i in (lemmas or []) if i in lemma_ref],
                "blocks": blocks.get(("entry", f"{kind}/{slug}"), []),
            })
        put("entries", "entries.json", entries)
        entry_by_key = {f"{e['kind']}/{e['slug']}": e for e in entries}

        cur.execute("""select id, person_id, title, year, copyright, edition, publisher, isbn from work
                       order by year nulls last, title""")
        works_by_person = defaultdict(list)
        for wid, pid, title, year, copyright, edition, publisher, isbn in cur.fetchall():
            works_by_person[pid].append({"id": wid, "title": title, "year": year, "copyright": copyright,
                                         "edition": edition, "publisher": publisher, "isbn": isbn})
        cur.execute("""select w.id, w.title, p.name, w.copyright from work w left join person p on p.id = w.person_id
                       order by p.name nulls last, w.title""")
        put("meta", "works.json", [{"id": i, "title": t, "author": a, "copyright": c} for i, t, a, c in cur.fetchall()])

        cur.execute("""select by_person, subject_kind, subject_id, section from content_block
                       where by_person is not null order by id""")
        cited = defaultdict(list)
        for pid, kind, subject, section in cur.fetchall():
            if len(cited[pid]) < 60:
                cited[pid].append({"kind": kind, "id": subject, "section": section})
        cur.execute("""select id, name, born, died, era, tradition, roles, summary from person
                       order by coalesce(born, died, 3000), name""")
        people = []
        for pid, name, born, died, era, tradition, roles, summary in cur.fetchall():
            p = {"id": pid, "name": name, "born": born, "died": died, "era": era, "tradition": tradition,
                 "roles": roles or [], "summary": summary}
            person_blocks = blocks.get(("person", pid), [])
            people.append({**p, "blockCount": len(person_blocks)})
            put("people", f"person/{pid}.json", {**p, "works": works_by_person.get(pid, []), "blocks": person_blocks,
                                                  "cited": cited.get(pid, [])})
        put("people", "people.json", people)

        # Every block's text, for library search and Ask.
        put("search", "search/blocks.json", [
            {"kind": kind, "id": subject, "section": b["section"], "type": b["type"], "title": b["title"],
             "body": b["bodyMd"], "by": b["by"]["name"] if b["by"] else None}
            for (kind, subject), items in blocks.items() for b in items
        ])

        # --- chapters: text, tokens, cross-references, related entries, verse blocks
        cur.execute("select id, osis, book_id, chapter, verse from verse order by id")
        verses = cur.fetchall()
        verse_osis = {vid: osis for vid, osis, *_ in verses}
        cur.execute("select translation_id, verse_id, text from translation_verse")
        texts = defaultdict(dict)
        for tid, vid, text in cur.fetchall():
            texts[vid][tid] = text
        for tid in SEARCH_TRANSLATIONS:
            put("text", f"text/{tid}.json", [[osis, texts[vid][tid]] for vid, osis, *_ in verses if tid in texts[vid]])

        heb_of = {}
        cur.execute("""select verse_id, source_ref from versification_map where scheme = 'heb'
                       order by verse_id, split_part(source_ref, '.', 2)::int, split_part(source_ref, '.', 3)::int""")
        for vid, ref in cur.fetchall():
            heb_of.setdefault(vid, ref)

        cur.execute("""select t.verse_id, t.surface, coalesce(t.translit, ''), coalesce(t.gloss, ''), t.lemma_id,
                              coalesce(t.morph, ''), coalesce(t.src_ref, ''), t.editions
                       from token t order by t.verse_id, t.pos""")
        tokens = defaultdict(list)
        for vid, surface, translit, gloss, lemma_id, morph, src_ref, editions in cur.fetchall():
            ref = lemma_ref.get(lemma_id)
            tokens[vid].append([surface, translit, gloss, lemma_id, ref["lemma"] if ref else None,
                                ref["gloss"] if ref else None, morph, src_ref, editions])

        cur.execute("""select x.from_verse, x.to_start, x.to_end, x.votes, tv.text
                       from cross_reference x
                       left join translation_verse tv on tv.verse_id = x.to_start and tv.translation_id = 'kjv'
                       order by x.from_verse, x.votes desc""")
        xrefs = defaultdict(list)
        for frm, start, end, votes, text in cur.fetchall():
            if len(xrefs[frm]) < XREFS_PER_VERSE:
                xrefs[frm].append([verse_osis[start], verse_osis[end], votes, text])

        cur.execute("select kind, slug, verse_start, verse_end from entry_range where kind <> 'book'")
        ranges = cur.fetchall()

        cur.execute("""select id, father, quote, source_title, source_url, year, verse_start, verse_end
                       from father_comment order by year nulls last, father, id""")
        fathers = cur.fetchall()

        # Fathers full-text index: fx/docs.json lists the comments; fx/<shard>.json maps term -> [doc, tf, doc, tf, ...].
        docs = []
        postings = defaultdict(list)
        for n, (cid, father, quote, source_title, _url, year, vstart, _vend) in enumerate(fathers):
            terms = index_terms(quote)
            docs.append([cid, father, year, verse_osis[vstart], source_title, len(terms)])
            tf = defaultdict(int)
            for t in terms:
                tf[t] += 1
            for t, c in tf.items():
                postings[t].extend((n, c))
        put("fathers", "fx/docs.json", docs)
        shards = defaultdict(dict)
        for t, plist in postings.items():
            shards[shard(t)][t] = plist
        for key, terms in shards.items():
            put("fathers", f"fx/{key}.json", terms)

        by_chapter = defaultdict(list)
        for vid, osis, book, chapter, verse in verses:
            by_chapter[(book, chapter)].append((vid, osis, verse))
        for (book, chapter), vs in by_chapter.items():
            first, last = vs[0][0], vs[-1][0]
            related_keys = set()
            out_verses = []
            for vid, osis, verse in vs:
                rel = sorted({f"{k}/{s}" for k, s, a, b in ranges if a <= vid <= b},
                             key=lambda key: (key.split("/")[0], entry_by_key[key]["ord"] if key in entry_by_key else 0))
                rel = [k for k in rel if k in entry_by_key]
                related_keys.update(rel)
                out_verses.append({
                    "id": vid, "v": verse, "osis": osis, "heb": heb_of.get(vid), "tr": texts.get(vid, {}),
                    "tok": tokens.get(vid, []), "x": xrefs.get(vid, []), "rel": rel,
                    "blocks": blocks.get(("verse", osis), []),
                })
            put("chapters", f"ch/{book}.{chapter}.json", {
                "book": book, "chapter": chapter, "verses": out_verses,
                "entries": {k: {"kind": entry_by_key[k]["kind"], "slug": entry_by_key[k]["slug"],
                                "title": entry_by_key[k]["title"], "summary": entry_by_key[k]["summary"]}
                            for k in sorted(related_keys)},
            })
            chapter_fathers = [[i, f, q, st, su, y, a, b] for i, f, q, st, su, y, a, b in fathers if a <= last and b >= first]
            if chapter_fathers:
                put("fathers", f"fa/{book}.{chapter}.json", chapter_fathers)

        # --- lemmas: lexicon, root family, senses, distribution, glosses, LXX bridge, blocks; occurrences
        cur.execute("""select e.lemma_id, s.name, s.id, s.attribution, e.body_html
                       from lexicon_entry e join source s on s.id = e.source_id order by e.id""")
        lexicon = defaultdict(list)
        for lid, sname, sid, attribution, html in cur.fetchall():
            lexicon[lid].append({"source": sname, "sourceId": sid, "attribution": attribution, "html": html})
        cur.execute("select id, letters, gloss from root")
        roots = {i: {"id": i, "letters": l, "gloss": g} for i, l, g in cur.fetchall()}
        cur.execute("""select l.id, l.strongs, coalesce(l.pos, ''), l.root_id, s.attribution
                       from lemma l join source s on s.id = l.source_id""")
        lemma_extra = {i: (st, pos, root, attr) for i, st, pos, root, attr in cur.fetchall()}
        family = defaultdict(list)
        strongs_group = defaultdict(list)
        for lid, (st, _pos, root, _a) in lemma_extra.items():
            if root:
                family[root].append(lid)
            strongs_group[st].append(lid)
        cur.execute("""select t.lemma_id, b.id, b.name, count(*)::int from token t join verse v on v.id = t.verse_id
                       join book b on b.id = v.book_id where t.lemma_id is not null
                       group by t.lemma_id, b.id, b.name, b.ord order by t.lemma_id, b.ord""")
        distribution = defaultdict(list)
        for lid, bid, bname, n in cur.fetchall():
            distribution[lid].append({"book": bid, "name": bname, "count": n})
        cur.execute("""select lemma_id, lower(trim(gloss)), count(*)::int from token
                       where lemma_id is not null and coalesce(gloss, '') <> '' group by 1, 2 order by 1, 3 desc""")
        glosses = defaultdict(list)
        for lid, gloss, n in cur.fetchall():
            if len(glosses[lid]) < GLOSS_ROWS:
                glosses[lid].append({"gloss": gloss, "count": n})
        cur.execute("select hebrew_lemma, greek_lemma from lxx_bridge")
        bridge = defaultdict(set)
        for h, g in cur.fetchall():
            bridge[h].add(g)
            bridge[g].add(h)

        by_count = lambda ids: sorted(ids, key=lambda i: (-lemma_ref[i]["count"], i))  # noqa: E731
        for lid, ref in lemma_ref.items():
            st, pos, root_id, attribution = lemma_extra[lid]
            root = roots.get(root_id) if root_id else None
            put("words", f"lemma/{lid}.json", {
                **ref, "strongs": st, "pos": pos,
                "lexicon": lexicon.get(lid, []),
                "root": {**root, "family": [lemma_ref[i] for i in by_count(family[root_id]) if i != lid][:FAMILY_SIZE]}
                if root else None,
                "senses": [lemma_ref[i] for i in sorted(strongs_group[st]) if i != lid],
                "distribution": distribution.get(lid, []),
                "glosses": glosses.get(lid, []),
                "bridge": [lemma_ref[i] for i in by_count(bridge.get(lid, ())) if i in lemma_ref][:BRIDGE_SIZE],
                "sourceAttribution": attribution,
                "blocks": blocks.get(("lemma", lid), []),
            })

        cur.execute("""select t.lemma_id, v.osis, t.surface, coalesce(t.gloss, '') from token t
                       join verse v on v.id = t.verse_id where t.lemma_id is not null order by t.lemma_id, v.id, t.pos""")
        occ = defaultdict(list)
        for lid, osis, surface, gloss in cur.fetchall():
            occ[lid].append([osis, surface, gloss])
        for lid, rows in occ.items():
            put("occurrences", f"occ/{lid}.json", rows)

        # --- names
        cur.execute("""select id, name, kind, gender, brief, description, article, lemma_ids, refs, ref_count
                       from name_entry order by ref_count desc, name""")
        names = cur.fetchall()
        put("names", "names/index.json", [[i, n, k, b, rc] for i, n, k, _g, b, _d, _a, _l, _r, rc in names])
        first_lexicon = {lid: items[0]["html"] for lid, items in lexicon.items()}
        buckets = defaultdict(dict)
        for i, n, k, g, b, d, a, lemma_ids, refs, rc in names:
            buckets[name_bucket(i)][i] = {
                "id": i, "name": n, "kind": k, "gender": g, "brief": b, "description": d, "article": a,
                "refs": refs or [], "refCount": rc,
                "lemmas": [{**lemma_ref[x], "meaning": first_lexicon.get(x)} for x in (lemma_ids or []) if x in lemma_ref],
            }
        for bucket, items in buckets.items():
            put("names", f"names/{bucket}.json", items)

    report = {
        "seconds": round(time.time() - started, 1),
        "groups": {g: {"files": counts[g], "mb": round(sizes[g] / 1e6, 1)} for g in sorted(sizes)},
        "totalMb": round(sum(sizes.values()) / 1e6, 1),
        "files": sum(counts.values()),
    }
    write(out, "build.json", report)
    return report


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO_ROOT / "public" / "data"
    report = export(out)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
