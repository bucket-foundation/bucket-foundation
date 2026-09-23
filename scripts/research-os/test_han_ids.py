import os
import sqlite3
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "photon"))

import han_ids  # noqa: E402
import node_words as nw  # noqa: E402
import roots_extract  # noqa: E402

IDS = "﻿# BabelStone fixture\r\nU+5B87\t宇\t^⿱宀于$(GHTJKPV)\r\nU+7B49\t等\t^⿱𥫗寺$(GHTJKPV)\r\nU+8A3C\t証\t^⿰訁正$(J)\t^⿰言登$(T)\r\nU+4E00\t一\t^一$(GHTJKPV)\r\nU+5176\t其\t^⿱{94}八$(G)\r\n"
UNIHAN = "U+5B80\tkDefinition\troof; KangXi radical 40\nU+4E8E\tkDefinition\tin, on, at\n"

class HanIds(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.mkdtemp()
        cls.ids = os.path.join(cls.dir, "IDS.TXT")
        with open(cls.ids, "w", encoding="utf-8", newline="") as f:
            f.write(IDS)
        cls.unihan_path = os.path.join(cls.dir, "Unihan_Readings.txt")
        with open(cls.unihan_path, "w", encoding="utf-8") as f:
            f.write(UNIHAN)
        cls.db_path = os.path.join(cls.dir, "roots.sqlite")
        db = sqlite3.connect(cls.db_path)
        db.executescript(roots_extract.SCHEMA)
        db.executemany("insert into word (lang, word, pos, ety, gloss, roman) values (?,?,?,0,?, '')", [
            ("zh", "于", "character", "at, in"), ("ja", "寺", "noun", "temple"), ("zh", "竹", "character", "bamboo"),
        ])
        db.executemany("insert into word_root (lang, word, root_lang, root_form, kind, ety) values ('zh', ?, 'zh', ?, 'component', 0)", [
            ("等", "竹"), ("等", "寺"), ("証", "言"), ("証", "登"),
        ])
        db.commit()
        db.close()
        cls.db = nw.Roots(cls.db_path)
        cls.bs = han_ids.load_babelstone(cls.ids)
        cls.unihan = han_ids.load_unihan(cls.unihan_path)

    @classmethod
    def tearDownClass(cls):
        cls.db.db.close()
        for f in os.listdir(cls.dir):
            os.unlink(os.path.join(cls.dir, f))
        os.rmdir(cls.dir)

    def test_the_first_sequence_is_kept_without_its_region_tag(self):
        self.assertEqual(self.bs["宇"], "⿱宀于")
        self.assertEqual(self.bs["証"], "⿰訁正")
        self.assertEqual(han_ids.components("其", self.bs["其"]), ["八"])
        self.assertEqual(han_ids.components("一", self.bs["一"]), [])

    def test_confidence_follows_agreement_with_wiktionary(self):
        rows = han_ids.rows_for({"宇", "等", "証", "一"}, self.bs, self.db, self.unihan, "r1")
        by = {(r["char"], r["ord"]): r for r in rows}
        self.assertEqual((by[("等", 1)]["confidence"], by[("等", 1)]["agrees_with_wiktionary"]), (han_ids.AGREE, True))
        self.assertEqual((by[("証", 1)]["confidence"], by[("証", 1)]["agrees_with_wiktionary"]), (han_ids.UNCHECKED, False))
        self.assertEqual((by[("宇", 1)]["confidence"], by[("宇", 1)]["agrees_with_wiktionary"]), (han_ids.UNCHECKED, None))
        self.assertNotIn("一", {r["char"] for r in rows})
        self.assertLess(han_ids.UNCHECKED, nw.UNCERTAIN_BELOW)
        self.assertGreaterEqual(han_ids.UNCHECKED, nw.HIDE_BELOW)
        self.assertGreaterEqual(han_ids.AGREE, nw.UNCERTAIN_BELOW)

    def test_meanings_come_from_wiktionary_zh_then_ja_then_unihan(self):
        rows = han_ids.rows_for({"宇", "等"}, self.bs, self.db, self.unihan, "r1")
        by = {(r["char"], r["component"]): r for r in rows}
        self.assertEqual((by[("宇", "于")]["meaning_source"], by[("宇", "于")]["meaning_license"]), ("wiktionary-zh", "CC BY-SA 4.0"))
        self.assertEqual((by[("宇", "宀")]["meaning"], by[("宇", "宀")]["meaning_license"]), ("roof; KangXi radical 40", "Unicode-3.0"))
        self.assertEqual(by[("等", "寺")]["meaning_source"], "wiktionary-ja")
        self.assertIn("waives", by[("宇", "宀")]["decomposition_license"])

    def test_the_go_count_counts_rows_that_gain_a_decomposed_character(self):
        words = [{"tbl": "nw", "word": "宇", "confidence": 0.9}, {"tbl": "nw", "word": "等", "confidence": 0.9},
                 {"tbl": "nsm", "word": "宇証", "confidence": 0.9}, {"tbl": "nsm", "word": "宇", "confidence": 0.4}, {"tbl": "nw", "word": "abc", "confidence": 0.9}]
        shown, gain = han_ids.go_count(words, self.bs, self.db)
        self.assertEqual((shown, gain), (4, {"nw": 1, "nsm": 1}))

    def test_the_sql_replaces_the_table_and_quotes(self):
        rows = han_ids.rows_for({"宇"}, self.bs, self.db, self.unihan, "r'1")
        sql = han_ids.build_sql(rows)
        self.assertIn("delete from graph.han_components;", sql)
        self.assertIn("'r''1'", sql)
        self.assertEqual(sql.count("insert into graph.han_components"), 2)

if __name__ == "__main__":
    unittest.main()
