import json
import os
import sqlite3
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "photon"))

import node_words as nw  # noqa: E402
import nsm_exponents as ne  # noqa: E402
import roots_extract as rx  # noqa: E402

def verb(word, form, root_template, glosses):
    return json.dumps({
        "word": word, "pos": "verb",
        "head_templates": [{"name": "ar-verb", "args": {"1": form}}],
        "etymology_templates": [root_template],
        "senses": [{"glosses": [g]} for g in glosses],
    }, ensure_ascii=False)

ROOTBOX = {"name": "ar-rootbox", "args": {"1": "ك ت ب"}}
ETYMON = {"name": "etymon", "args": {"1": "ar", "id": "x", "2": ":root", "3": "ب د أ<id:root>"}}

LINES = [
    verb("كتب", "II", ROOTBOX, ["to cause to write, to make someone write"]),
    verb("كتب", "I/a~u.pass.vn:كِتَابَة", ROOTBOX, ["verbal noun of something", "to mark (symbols, shapes) on a surface, to write, to inscribe"]),
    verb("بدأ", "I/a~a", ETYMON, ["to begin; to start"]),
    verb("برهن", "Iq", {"name": "ar-rootbox", "args": {"1": "ب ر ه ن"}}, ["to prove, to establish evidence"]),
    verb("علم", "II", {"name": "ar-rootbox", "args": {"1": "ع ل م"}}, ["to teach, to instruct, to train someone"]),
    verb("zz", "I", {"name": "cog", "args": {}}, ["no root here"]),
    json.dumps({"word": "كتاب", "pos": "noun", "etymology_templates": [ROOTBOX], "senses": [{"glosses": ["book"]}]}, ensure_ascii=False),
]

class Extract(unittest.TestCase):
    def test_roots_come_from_rootbox_and_etymon_with_hamza_folded(self):
        self.assertEqual(rx.ar_verb_root(json.loads(LINES[0])), "كتب")
        self.assertEqual(rx.ar_verb_root(json.loads(LINES[2])), "بدء")
        self.assertEqual(rx.ar_root_key("ب د أ"), rx.ar_root_key("ب د ء"))
        self.assertEqual(rx.ar_verb_root(json.loads(LINES[5])), "")

    def test_forms_parse_from_the_head_template(self):
        self.assertEqual(rx.ar_verb_form(json.loads(LINES[1])), "I")
        self.assertEqual(rx.ar_verb_form(json.loads(LINES[3])), "Iq")
        self.assertEqual(rx.ar_verb_form({"head_templates": [{"name": "ar-verb", "args": {"1": "XX"}}]}), "")

    def test_glosses_skip_form_openers_and_shorten(self):
        self.assertEqual(rx.ar_first_gloss(json.loads(LINES[1])), "to mark on a surface, to write")
        self.assertEqual(rx.ar_short_gloss("to begin; to start"), "to begin")
        self.assertEqual(len(rx.ar_short_gloss("to " + "x" * 80)), rx.AR_GLOSS_CAP)
        self.assertEqual(rx.ar_first_gloss({"senses": [{"glosses": ["alternative form of كتب"]}]}), "")

    def test_the_base_form_wins_and_derived_forms_fill_in(self):
        g = rx.ar_root_glosses(LINES)
        self.assertEqual(g["كتب"][:2], ("I", "to mark on a surface, to write"))
        self.assertEqual(g["بدء"][:2], ("I", "to begin"))
        self.assertEqual(g["برهن"][0], "Iq")
        self.assertEqual(g["علم"][:2], ("II", "to teach, to instruct"))
        self.assertNotIn("", g)
        self.assertEqual(len(g), 4)

class Fill(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        fd, cls.path = tempfile.mkstemp(suffix=".sqlite")
        os.close(fd)
        db = rx.open_db(cls.path)
        rx.write_ar_root_gloss(db, rx.ar_root_glosses(LINES))
        db.close()
        cls.db = nw.Roots(cls.path)

    @classmethod
    def tearDownClass(cls):
        cls.db.db.close()
        os.unlink(cls.path)

    def test_a_base_form_gloss_keeps_the_root_confidence(self):
        self.assertEqual(nw.ar_gloss(self.db, "ar", "ك ت ب", None, 0.9), ("to mark on a surface, to write", None, 0.9))
        self.assertEqual(nw.ar_gloss(self.db, "ar", "ب ر ه ن", "", 0.8)[1:], (None, 0.8))

    def test_a_derived_form_gloss_caps_at_0_7_and_names_its_form(self):
        self.assertEqual(nw.ar_gloss(self.db, "ar", "ع ل م", None, 0.9), ("to teach, to instruct", "II", 0.7))
        self.assertEqual(nw.ar_gloss(self.db, "ar", "ع ل م", None, 0.6)[2], 0.6)

    def test_a_question_mark_counts_as_no_gloss(self):
        self.assertEqual(nw.ar_gloss(self.db, "ar", "ب د ء", "?", 0.9)[0], "to begin")

    def test_real_glosses_other_roots_and_misses_stay_put(self):
        self.assertEqual(nw.ar_gloss(self.db, "ar", "ك ت ب", "to write", 0.9), ("to write", None, None))
        self.assertEqual(nw.ar_gloss(self.db, "he", "כ־ת־ב", None, 0.9), (None, None, None))
        self.assertEqual(nw.ar_gloss(self.db, "ar", "ق ل ب", None, 0.9), (None, None, None))

    def test_gain_counts_split_base_and_derived(self):
        rows = [
            {"lang": "ar", "confidence": 0.9, "root_confidence": 0.9, "root_gloss_form": None, "root_gloss_confidence": 0.9},
            {"lang": "ar", "confidence": 0.9, "root_confidence": 0.9, "root_gloss_form": "II", "root_gloss_confidence": 0.7},
            {"lang": "ar", "confidence": 0.9, "root_confidence": 0.9, "root_gloss_form": None, "root_gloss_confidence": None},
            {"lang": "ar", "confidence": 0.3, "root_confidence": 0.3, "root_gloss_form": None, "root_gloss_confidence": 0.3},
            {"lang": "fa", "confidence": 0.9, "root_confidence": 0.9, "root_gloss_form": None, "root_gloss_confidence": 0.9},
        ]
        self.assertEqual(nw.gloss_gain(rows, "confidence"), {"shown_arabic": 3, "form_I": 1, "derived": 1})

    def test_both_loaders_write_the_new_columns(self):
        self.assertIn("root_gloss_form", nw.COLUMNS)
        self.assertIn("root_gloss_confidence", nw.COLUMNS)
        self.assertIn("root_gloss_form", ne.ROW_COLUMNS)
        self.assertIn("root_gloss_confidence", ne.ROW_COLUMNS)

if __name__ == "__main__":
    unittest.main()
