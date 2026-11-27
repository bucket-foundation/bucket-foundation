import gzip
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

import build_cognates as bc
import upload_input_bands as up

NODES = [
    (1, "es", "agua", 0), (2, "pt", "água", 0), (3, "la", "aqua", 0), (4, "ine-pro", "*h₂ékʷeh₂", 1),
    (5, "en", "water", 0), (6, "gem-pro", "*watōr", 1),
    (7, "es", "nación", 0), (8, "en", "nation", 0), (9, "la", "natio", 0), (10, "enm", "nacioun", 0),
    (11, "es", "hacer", 0), (12, "en", "do", 0), (13, "la", "parentheses", 0),
    (14, "pt", "nação", 0),
]
FOREST = [(1, 3), (2, 3), (3, 4), (5, 6), (6, 4), (7, 9), (8, 10), (14, 9), (11, 4), (12, 4)]
EDGES = [(10, 9, "bor"), (11, 13, "bor"), (12, 13, "cal")]
SENSES = [(100, "water"), (101, "nation"), (102, "do")]
TRANSLATIONS = [(100, 1), (100, 2), (101, 7), (101, 14), (102, 11)]
RANKS = {"es": ["agua", "nación", "hacer"], "pt": ["água", "nação"], "en": ["water", "nation", "do"]}


def fixture(tmp):
    db = Path(tmp) / "g.sqlite"
    c = sqlite3.connect(db)
    c.executescript("""
        create table node(id integer primary key, lang text, form text, proto integer);
        create table forest(node integer primary key, parent integer, depth integer, root integer, via integer);
        create table edge(src integer, dst integer, rel text, tmpl text, page integer, ord integer);
        create table sense(id integer primary key, en_word text, en_pos text, gloss text);
        create table translation(sense integer, node integer);
    """)
    c.executemany("insert into node values (?,?,?,?)", NODES)
    c.executemany("insert into forest(node, parent) values (?,?)", FOREST)
    c.executemany("insert into edge(src, dst, rel) values (?,?,?)", EDGES)
    c.executemany("insert into sense(id, en_word) values (?,?)", SENSES)
    c.executemany("insert into translation values (?,?)", TRANSLATIONS)
    c.commit()
    ranks = Path(tmp) / "ranks"
    ranks.mkdir()
    for lang, words in RANKS.items():
        with gzip.open(ranks / f"{lang}.tsv.gz", "wt", encoding="utf-8") as f:
            f.write("folded\tsurface_rank\tlemma\tlemma_rank\tderived\n")
            for i, w in enumerate(words, 1):
                f.write(f"{w}\t{i}\t{w}\t{i}\t0\n")
    return db, ranks


class BuildCognates(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        db, ranks = fixture(self.tmp.name)
        out = Path(self.tmp.name) / "out"
        self.summary = bc.build(db, ranks, ["es", "pt", "en"], out, 100, "sha")
        self.out = out
        self.files = {l: json.loads((out / self.summary[l]["file"]).read_text()) for l in ("es", "pt", "en")}

    def tearDown(self):
        self.tmp.cleanup()

    def test_a_shared_latin_source_links_inherited_words(self):
        self.assertEqual(self.files["es"]["cognates"]["agua"], {"pt": ["água"]})

    def test_a_proto_indo_european_meeting_point_is_not_enough(self):
        self.assertNotIn("water", self.files["en"]["cognates"])
        self.assertNotIn("en", self.files["es"]["cognates"].get("agua", {}))

    def test_one_borrowing_hop_reaches_the_other_chain(self):
        self.assertEqual(self.files["en"]["cognates"]["nation"], {"es": ["nación"], "pt": ["nação"]})
        self.assertEqual(self.files["es"]["cognates"]["nación"], {"en": ["nation"], "pt": ["nação"]})

    def test_two_hops_meeting_at_a_stray_node_do_not_link(self):
        self.assertNotIn("hacer", self.files["es"]["cognates"])

    def test_file_header_names_the_rule_and_the_graph(self):
        f = self.files["es"]
        self.assertEqual((f["format"], f["lang"], f["graphSha256"]), ("polingual-cognates", "es", "sha"))
        self.assertIn("Proto-Indo-European", f["rule"])
        self.assertIn("CC BY-SA", f["credit"])


class Hosting(unittest.TestCase):
    def test_files_are_content_hashed_and_recorded_in_the_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            db, ranks = fixture(tmp)
            out = Path(tmp) / "out"
            summary = bc.build(db, ranks, ["es", "pt", "en"], out, 100, "sha")
            f = summary["es"]["file"]
            self.assertRegex(f, r"^cognates\.es\.[0-9a-f]{12}\.json$")
            self.assertEqual(summary["es"]["bytes"], (out / f).stat().st_size)
            again = bc.build(db, ranks, ["es", "pt", "en"], Path(tmp) / "again", 100, "sha")
            self.assertEqual(again["es"]["file"], f)
            manifest = Path(tmp) / "manifest.json"
            manifest.write_text(json.dumps({"format": "polingual-input", "langs": {}, "cognates": {"fr": {"file": "x"}}}))
            bc.record(manifest, summary)
            m = json.loads(manifest.read_text())
            self.assertEqual(sorted(m["cognates"]), ["en", "es", "fr", "pt"])
            self.assertEqual(m["langs"], {})
            self.assertIn(("bands", f), list(up.band_files(m)))


if __name__ == "__main__":
    unittest.main()
