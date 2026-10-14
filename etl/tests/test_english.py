from logos_etl.importers import english


def test_parse_scrollmapper_row_maps_book_names():
    assert english.parse_scrollmapper_row(["Genesis", "1", "1", "In the beginning"]) == ("Gen", 1, 1, "In the beginning")
    assert english.parse_scrollmapper_row(["Revelation of John", "22", "21", "Amen."])[0] == "Rev"
    assert english.parse_scrollmapper_row(["Book", "Chapter", "Verse", "Text"]) is None


def test_merge_web_segments_joins_split_verses_and_marks_paragraphs():
    segs = [
        {"type": "paragraph start"},
        {"type": "paragraph text", "chapterNumber": 1, "verseNumber": 1, "value": "Blessed is the man "},
        {"type": "line break"},
        {"type": "paragraph text", "chapterNumber": 1, "verseNumber": 1, "value": "who doesn’t walk.  "},
        {"type": "paragraph text", "chapterNumber": 1, "verseNumber": 2, "value": "But his delight "},
        {"type": "paragraph end"},
        {"type": "stanza start"},
        {"type": "line text", "chapterNumber": 1, "verseNumber": 3, "value": "He will be like a tree"},
    ]
    merged = english.merge_web_segments(segs)
    assert merged == [
        (1, 1, "Blessed is the man who doesn’t walk.", True),
        (1, 2, "But his delight", False),
        (1, 3, "He will be like a tree", True),
    ]
