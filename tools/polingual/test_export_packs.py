import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import export_packs as ep

ROWS = {
    "es": [
        ("agua", "/ˈaɡwa/", "noun", "water · body of water · rain", "functional", "word", []),
        ("aguas", "", "noun", "plural of agua", "functional", "word", []),
        ("raro", "/ˈraɾo/", "adj", "strange, odd", "functional", "word", [{"predicate": "translates", "to": "photon:word:en:strange"}, {"predicate": "derives_from", "to": "photon:word:la:rarus"}]),
        ("Azores", "", "name", "the Azores", "functional", "word", []),
        ("agua de coco", "", "noun", "coconut water", "functional", "word", []),
        ("", "", "noun", "nothing", "functional", "word", []),
        ("vacío", "", "adj", "  ", "functional", "word", None),
        ("gato", "/ˈɡato/", "noun", "cat", "core", "word", "[]"),
        ("fin", "", "noun", "end", "functional", "word", {"translates": ["photon:word:en:end"]}),
    ],
    "ar": [("ماء", "/maːʔ/", "noun", "water", "functional", "word", []), ("كِتَاب", "", "noun", "book", "functional", "word", [])],
    "zh": [("水", "/ʂweɪ/", "noun", "water · river", "functional", "word", []), ("fin", "", "noun", "fin", "functional", "word", [])],
    "en": [("Water", "", "noun", "a clear liquid", "functional", "word", [])],
}


class FakeSource:
    def languages(self):
        return sorted(ROWS)

    def sample_relations(self, lang, n=ep.SAMPLE_ROWS):
        return [r[6] for r in ROWS[lang][:n]]

    def forms(self):
        return iter([(lang, r[0]) for lang in sorted(ROWS) for r in ROWS[lang]])

    def rows(self, lang):
        return iter(ROWS[lang])


class FakeCursor:
    def __init__(self, log, name):
        self.log = log
        self.name = name
        self.itersize = None

    def execute(self, sql, params=()):
        self.log.append((self.name, self.itersize, sql, params))

    def __iter__(self):
        return iter([("x",)])

    def close(self):
        self.log.append(("closed", self.name))


class FakeConn:
    def __init__(self):
        self.log = []
        self.session = None

    def set_session(self, **kw):
        self.session = kw

    def cursor(self, name=None):
        return FakeCursor(self.log, name)

    def rollback(self):
        self.log.append(("rollback",))


def open_pack(out, lang):
    folder = Path(out) / lang
    manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    db_path = folder / "deck.sqlite"
    subprocess.run(["zstd", "-q", "-d", "-f", str(folder / manifest["file"]), "-o", str(db_path)], check=True)
    return manifest, sqlite3.connect(db_path)


class TextRules(unittest.TestCase):
    def test_fold_and_headword_follow_the_app_rules(self):
        self.assertEqual(ep.fold("  Vacío "), "vacio")
        self.assertEqual(ep.fold("كِتَاب"), "كتاب")
        self.assertEqual(ep.headword("To eat (food); to dine."), "eat")
        self.assertEqual(ep.headword("the Azores"), "azores")
        self.assertEqual(ep.head_of("en", "Water", "a clear liquid"), "water")
        self.assertEqual(ep.head_of("de", "Kind", "kid; child (young person) · offspring", frozenset({"child"})), "child")
        self.assertEqual(ep.head_of("de", "Kind", "kid; child (young person) · offspring"), "kid")
        self.assertEqual(ep.head_choices("to go, to walk / to go"), ["go", "walk"])

    def test_relation_links_read_lists_maps_and_text(self):
        self.assertEqual(ep.relation_links([{"predicate": "translates", "to": "photon:word:de:wasser"}, {"predicate": "derives_from", "to": "photon:word:la:aqua"}]), (["de:wasser"], ["la:aqua"]))
        self.assertEqual(ep.relation_links({"translates": ["photon:word:en:end"]}), (["en:end"], []))
        self.assertEqual(ep.relation_links("[]"), ([], []))
        self.assertEqual(ep.relation_links(None), ([], []))
        self.assertEqual(ep.relation_links("not json"), ([], []))

    def test_inflected_forms_names_and_phrases_rank_after_plain_words(self):
        key = lambda *r: ep.rank_key("es", *r, frozenset({"water"}))
        plain = key("agua", "/a/", "noun", "water · rain", "functional")
        self.assertLess(plain, key("aguas", "", "noun", "plural of agua", "functional"))
        self.assertLess(plain, key("Azores", "", "name", "the Azores", "functional"))
        self.assertLess(plain, key("agua de coco", "", "noun", "coconut water", "functional"))
        self.assertLess(plain, key("raro", "/r/", "adj", "strange", "functional"))
        self.assertLess(key("zzz", "", "noun", "thing", "core"), plain)


class PgReads(unittest.TestCase):
    def test_reads_are_read_only_and_use_server_side_cursors(self):
        conn = FakeConn()
        src = ep.PgSource(conn)
        self.assertEqual(conn.session, {"readonly": True, "autocommit": False})
        list(src.rows("es"))
        src.languages()
        src.sample_relations("es", 7)
        list(src.forms())
        runs = [e for e in conn.log if len(e) == 4]
        self.assertEqual(len(runs), 4)
        for name, itersize, sql, _ in runs:
            self.assertTrue(name and name.startswith("bkt_words_"))
            self.assertEqual(itersize, ep.FETCH_ROWS)
            self.assertTrue(sql.lower().startswith("select "))
            self.assertNotIn("embedding", sql)
            self.assertNotIn("phonetic", sql)
        self.assertEqual(len({r[0] for r in runs}), 4)
        self.assertEqual(runs[0][3], ("es",))
        self.assertEqual(runs[2][3], ("es", 7))


class Export(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls.tmp.name) / "out"
        cls.lines = []
        cls.report = ep.export_all(FakeSource(), cls.out, concepts=frozenset({"water", "cat"}), built="2026-10-11", commit="abc123", log=cls.lines.append, level=3)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_report_counts_rows_drops_and_relation_links(self):
        self.assertEqual([p["language"] for p in self.report["packs"]], ["ar", "en", "es", "zh"])
        es = next(p for p in self.report["packs"] if p["language"] == "es")
        self.assertEqual(es["rows"], 7)
        self.assertEqual(es["dropped"], {"empty_surface": 1, "empty_meaning": 1})
        self.assertEqual(es["with_translations"], 2)
        self.assertEqual(es["with_etymology"], 1)
        self.assertEqual(self.report["total_rows"], 12)
        self.assertEqual(self.report["dropped"], {"empty_surface": 1, "empty_meaning": 1})
        found = next(r for r in self.report["relations"] if r["language"] == "es")
        self.assertEqual((found["sampled"], found["with_translations"], found["with_etymology"]), (9, 2, 1))
        self.assertIsNone(self.report["stopped"])
        self.assertTrue((self.out / "report.json").exists())
        self.assertFalse(any(p.name.startswith("tmp") for p in self.out.iterdir()))

    def test_manifest_names_the_deck_its_source_licence_and_checksums(self):
        m, db = open_pack(self.out, "es")
        db.close()
        self.assertEqual((m["format"], m["format_version"], m["id"], m["title"], m["kind"], m["language"], m["curator"]), ("bkt-deck", 1, "polingual-es", "Spanish words", "words", "es", "Bucket Foundation"))
        self.assertEqual(m["fields"], ep.CARD_FIELDS)
        self.assertEqual(m["counts"]["cards"], 7)
        self.assertEqual((m["licence"], m["source"], m["built"], m["exporter_commit"]), ("CC-BY-SA 4.0", "Wiktionary via Kaikki (kaikki.org)", "2026-10-11", "abc123"))
        self.assertIn("Adapted by Bucket Foundation", m["adaptation"])
        folder = self.out / "es"
        self.assertEqual(m["sha256"], ep.sha256_file(folder / m["file"]))
        self.assertEqual(m["bytes"], (folder / m["file"]).stat().st_size)
        self.assertEqual(m["db_sha256"], ep.sha256_file(folder / "deck.sqlite"))
        self.assertEqual(m["version"], m["db_sha256"][:12])

    def test_pack_carries_its_licence_inside_and_holds_no_vectors(self):
        _, db = open_pack(self.out, "es")
        meta = dict(db.execute("select k, v from meta"))
        self.assertEqual((meta["licence"], meta["source"], meta["kind"], meta["rows"]), ("CC-BY-SA 4.0", "Wiktionary via Kaikki (kaikki.org)", "words", "7"))
        self.assertIn("same licence", meta["adaptation"])
        cols = [r[1] for r in db.execute("pragma table_info(words)")]
        self.assertEqual(cols, ["id", "surface", "folded", "ipa", "pos", "meaning", "head", "tier", "kind", "shared", "translations", "etymology"])
        db.close()

    def test_common_words_come_first(self):
        _, db = open_pack(self.out, "es")
        order = [r[0] for r in db.execute("select surface from words order by id")]
        db.close()
        self.assertEqual(order[0], "gato")
        self.assertEqual(order[1], "agua")
        self.assertLess(order.index("raro"), order.index("agua de coco"))
        self.assertLess(order.index("agua de coco"), order.index("Azores"))
        self.assertEqual(order[-1], "aguas")

    def test_links_shared_forms_and_search(self):
        _, db = open_pack(self.out, "es")
        row = db.execute("select translations, etymology, head, shared from words where surface = 'raro'").fetchone()
        self.assertEqual(row, ('["en:strange"]', '["la:rarus"]', "strange", 0))
        self.assertEqual(db.execute("select shared from words where surface = 'fin'").fetchone()[0], 1)
        self.assertEqual(db.execute("select shared from words where surface = 'agua'").fetchone()[0], 0)
        hits = [r[0] for r in db.execute("select w.surface from words_fts f join words w on w.id = f.rowid where words_fts match 'water' order by w.id")]
        self.assertEqual(hits, ["agua", "agua de coco"])
        self.assertEqual([r[0] for r in db.execute("select w.surface from words_fts f join words w on w.id = f.rowid where words_fts match 'folded:raro'")], ["raro"])
        db.close()

    def test_right_to_left_and_cjk_words_survive_and_match(self):
        _, ar = open_pack(self.out, "ar")
        self.assertEqual([r[0] for r in ar.execute("select surface from words order by id")], ["ماء", "كِتَاب"])
        self.assertEqual(ar.execute("select w.surface from words_fts f join words w on w.id = f.rowid where words_fts match ?", ('"كتاب"',)).fetchone()[0], "كِتَاب")
        ar.close()
        _, zh = open_pack(self.out, "zh")
        self.assertEqual(zh.execute("select w.meaning from words_fts f join words w on w.id = f.rowid where words_fts match ?", ('"水"',)).fetchone()[0], "water · river")
        zh.close()

    def test_export_stops_when_the_total_passes_the_limit(self):
        with tempfile.TemporaryDirectory() as tmp:
            report = ep.export_all(FakeSource(), tmp, max_bytes=1, built="2026-10-11", log=lambda _l: None, level=3)
            self.assertEqual(len(report["packs"]), 1)
            self.assertIn("total passed 1 bytes after ar", report["stopped"])


if __name__ == "__main__":
    unittest.main()
