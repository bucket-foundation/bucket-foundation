import os
import sqlite3
import sys
import tempfile
import textwrap
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "photon"))

import node_words as nw  # noqa: E402
import oshb  # noqa: E402
import roots_eval  # noqa: E402
import roots_extract  # noqa: E402
import roots_label  # noqa: E402
import roots_sample  # noqa: E402

WORDS = [
    ("ang", "ne", "adv", 0, "not"), ("ang", "ne", "noun", 0, "alternative form of nēo"),
    ("fr", "mien", "adj", 0, "(of) mine, my own"), ("la", "meum", "noun", 0, "an umbelliferous plant, Meum athamanticum"),
    ("pl", "się", "pron", 0, "reflexive pronoun; oneself, self"), ("zlw-opl", "się", "verb", 0, "to get married"),
    ("de", "Kerze", "noun", 0, "candle"), ("la", "cēra", "noun", 0, "wax"),
]
ETYM = [
    ("ang", "ne", "inh", "gem-pro", "*ne", "not", 0, 0), ("ang", "ne", "inh", "gmw-pro", "*nawi", "", 1, 0),
    ("ang", "ne", "der", "ine-pro", "*neh₂w-", "the deceased, corpse", 2, 0),
    ("fr", "mien", "inh", "la", "meum", "", 0, 0),
    ("pl", "się", "inh", "zlw-opl", "się", "", 0, 0),
    ("de", "Kerze", "bor", "la", "cēra", "", 0, 0),
]
WORD_ROOT = [("ang", "ne", "ine-pro", "*neh₂w-", "root", 0)]

class Resolver(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        fd, cls.path = tempfile.mkstemp(suffix=".sqlite")
        os.close(fd)
        db = sqlite3.connect(cls.path)
        db.executescript(roots_extract.SCHEMA)
        db.executemany("insert into word (lang, word, pos, ety, gloss, roman) values (?,?,?,?,?, '')", WORDS)
        db.executemany("insert into etym (lang, word, rel, anc_lang, anc_form, anc_gloss, ord, ety) values (?,?,?,?,?,?,?,?)", ETYM)
        db.executemany("insert into word_root (lang, word, root_lang, root_form, kind, ety) values (?,?,?,?,?,?)", WORD_ROOT)
        db.commit()
        db.close()
        cls.db = nw.Roots(cls.path)

    @classmethod
    def tearDownClass(cls):
        cls.db.db.close()
        os.unlink(cls.path)

    def check(self, lang, word, hint, pos):
        h = frozenset(nw.tokens(hint))
        resolved, chain, root, _conf, ety = nw.analyze(lang, word, self.db, h, pos)
        return root, nw.root_check(lang, resolved, ety, chain, root, self.db, h, pos)

    def test_a_chain_cut_at_the_first_unrelated_step_keeps_the_linked_root(self):
        root, (cap, flags) = self.check("ang", "ne", "not negates the meaning", "adv")
        self.assertEqual(root, ("gem-pro", "*ne", "not"))
        self.assertEqual((cap, flags), (1.0, []))

    def test_a_function_word_rooted_in_a_content_entry_is_capped(self):
        root, (cap, flags) = self.check("fr", "mien", "that which belongs to me mine", "pron")
        self.assertEqual(root[1], "meum")
        self.assertIn("pos", flags)
        self.assertLess(cap, nw.HIDE_BELOW)

    def test_a_function_word_whose_root_gloss_meets_nothing_is_capped(self):
        _root, (cap, flags) = self.check("pl", "się", "oneself self reflexive", "pron")
        self.assertIn("gloss", flags)
        self.assertLess(cap, nw.HIDE_BELOW)

    def test_nsm_exponents_skip_the_gloss_cap(self):
        h = frozenset(nw.tokens("oneself self reflexive"))
        resolved, chain, root, _conf, ety = nw.analyze("pl", "się", self.db, h, "pron")
        _cap, flags = nw.root_check("pl", resolved, ety, chain, root, self.db, h, "pron", gloss_check=False)
        self.assertNotIn("gloss", flags)
        self.assertIn("pos", flags)

    def test_a_content_word_keeps_a_root_whose_gloss_differs(self):
        root, (cap, flags) = self.check("de", "Kerze", "candle", "noun")
        self.assertEqual((root[1], cap, flags), ("cēra", 1.0, []))

    def test_a_single_sense_word_with_a_linked_root_passes(self):
        root, (cap, flags) = self.check("de", "Kerze", "candle made of wax", "noun")
        self.assertEqual(root[1], "cēra")
        self.assertEqual((cap, flags), (1.0, []))

    def test_pos_sides_and_stems(self):
        self.assertTrue(nw.pos_clash("pron", "noun"))
        self.assertFalse(nw.pos_clash("noun", "verb"))
        self.assertFalse(nw.pos_clash("pron", None))
        self.assertEqual(nw.stem("shining"), nw.stem("shin"))
        self.assertEqual(nw.stems("the deceased, corpse"), {"deceas", "corpse"})

    def test_trim_needs_a_linked_step_before_it_cuts(self):
        chain = [{"lang": "enm", "form": "matere", "rel": "inh", "gloss": "womb"}, {"lang": "grc", "form": "ὕλη", "rel": "calque", "gloss": "wood, matter"}]
        kept, cut = nw.trim_chain(chain, frozenset({"matter"}))
        self.assertEqual((len(kept), cut), (2, False))
        kept, cut = nw.trim_chain([{"gloss": "not"}, {"gloss": "corpse"}], frozenset({"not"}))
        self.assertEqual((len(kept), cut), (1, True))

INDEX = textwrap.dedent("""\
    <?xml version="1.0" encoding="UTF-8"?>
    <index xmlns="http://openscriptures.github.com/morphhb/namespace"><part xml:lang="heb">
      <entry id="aaf"><w>אָבַד</w> <pos>V</pos> <def>perish</def><etym root="אבד" type="main">aag</etym></entry>
      <entry id="aag"><w>אֹבֵד</w> <pos>N</pos> <def>destruction</def><etym type="sub">aaf</etym></entry>
      <entry id="bbb"><w>אור</w> <pos>V</pos> <def>be light</def><etym root="אור" type="main">bbc</etym></entry>
      <entry id="bbc"><w>אֹור</w> <pos>N</pos> <def>light</def><etym type="sub">bbb</etym></entry>
      <entry id="ccc"><w>ספר</w> <pos>V</pos> <def>count</def><etym root="ספר" type="main"/></entry>
      <entry id="ccd"><w>סֵפֶר</w> <pos>N</pos> <def>book</def><etym type="sub">ccc</etym></entry>
      <entry id="cce"><w>סְפָר</w> <pos>N</pos> <def>border</def><etym root="ספר ב" type="main"/></entry>
      <entry id="ddd"><w>אֲבַגְתָא</w> <pos>Np</pos> <def>Abagtha</def></entry>
    </part></index>
    """)

class Oshb(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        fd, cls.path = tempfile.mkstemp(suffix=".xml")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(INDEX)
        cls.o = oshb.Oshb.load(cls.path)

    @classmethod
    def tearDownClass(cls):
        os.unlink(cls.path)

    def test_a_sub_entry_reaches_its_main_root(self):
        hit = self.o.lookup("אובד")
        self.assertEqual((hit["root"], hit["form"], hit["gloss"]), ("אבד", "א־ב־ד", "perish"))

    def test_an_ambiguous_or_rootless_skeleton_answers_nothing(self):
        self.assertIsNone(self.o.lookup("ספר"))
        self.assertIsNone(self.o.lookup("אבגתא"))

    def test_agree_differ_and_only(self):
        agree = oshb.apply(self.o, "he", "אוֹר", ("he", "א־ו־ר", "light"), 0.9, [])
        self.assertEqual((agree[1], agree[2], agree[4]), (0.9, "both", "agree"))
        differ = oshb.apply(self.o, "he", "אוֹר", ("he", "י־ר־ה", "x"), 0.9, [])
        self.assertEqual((differ[0][1], differ[1], differ[2], differ[4]), ("א־ו־ר", 0.7, "oshb", "differ"))
        self.assertEqual([c["rel"] for c in differ[3]], ["oshb_root", "wiktionary_root"])
        only = oshb.apply(self.o, "he", "אובד", (None, None, None), 0.0, [])
        self.assertEqual((only[0][1], only[1], only[4]), ("א־ב־ד", oshb.ONLY_ROOT, "only"))
        other = oshb.apply(self.o, "ar", "אובד", (None, None, None), 0.0, [])
        self.assertEqual(other[4], None)
        self.assertLess(oshb.DIFFER_ROOT, nw.UNCERTAIN_BELOW)

class Evaluation(unittest.TestCase):
    def test_hidden_rows_keep_their_frozen_label_and_changed_rows_take_the_new_one(self):
        sample = [
            {"key": "a", "row": "nw|1|de|x", "root_lang": "la", "root_form": "r1"},
            {"key": "b", "row": "nw|1|de|y", "root_lang": "la", "root_form": "r2"},
            {"key": "c", "row": "nw|1|de|z", "root_lang": "la", "root_form": "r3"},
            {"key": "d", "row": "nw|1|de|w", "root_lang": "la", "root_form": "r4"},
        ]
        after = {
            "nw|1|de|x": {"confidence": 0.9, "root_confidence": 0.4, "root_lang": "la", "root_form": "r1"},
            "nw|1|de|y": {"confidence": 0.9, "root_confidence": 0.9, "root_lang": "la", "root_form": "r2"},
            "nw|1|de|z": {"confidence": 0.9, "root_confidence": 0.9, "root_lang": "grc", "root_form": "q"},
            "nw|1|de|w": {"confidence": 0.4, "root_confidence": 0.9, "root_lang": "la", "root_form": "r4"},
        }
        frozen = {"a": "wrong_homograph", "b": "correct", "c": "wrong_gloss", "d": "correct"}
        split, labs = roots_eval.score(sample, frozen, after, {"c": "correct"})
        self.assertEqual(split, {"hidden": {"wrong_homograph": 1, "correct": 1}, "same": {"correct": 1}, "changed": {"correct": 1}})
        self.assertEqual(sorted(labs), ["correct", "correct"])

    def test_bands_follow_the_thresholds(self):
        self.assertEqual([roots_eval.band(c) for c in (0.49, 0.5, 0.74, 0.75)], ["below 0.5", "0.5 to 0.75", "0.5 to 0.75", "0.75 and above"])

    def test_kappa_and_precision(self):
        a = {"1": "correct", "2": "correct", "3": "wrong_gloss", "4": "correct"}
        b = {"1": "correct", "2": "wrong_homograph", "3": "wrong_gloss", "4": "correct"}
        self.assertAlmostEqual(roots_label.kappa(a, a), 1.0)
        self.assertGreater(roots_label.kappa(a, b), 0)
        self.assertIsNone(roots_label.consensus(a, b, "2"))
        self.assertEqual(roots_label.consensus(a, b, "1"), "correct")
        k, n, (p, lo, hi) = roots_label.precision(["correct", "correct", "wrong_gloss", "cannot_tell"])
        self.assertEqual((k, n), (2, 3))
        self.assertTrue(lo < p < hi)

    def test_the_sample_is_stratified_distinct_and_seeded(self):
        rows = [{"lang": l, "word": f"{l}{i}", "root_lang": "x", "root_form": f"r{i}"} for l in ("en", "fr", "he", "zh") for i in range(30)]
        a = roots_sample.draw(rows, rows, "s", 20, 8)
        self.assertEqual(a, roots_sample.draw(rows, rows, "s", 20, 8))
        self.assertEqual(len(a), 28)
        self.assertEqual(len({(r["lang"], r["word"]) for r in a}), 28)
        self.assertEqual({r["lang"] for r in a[:20]}, {"en", "fr", "he", "zh"})

if __name__ == "__main__":
    unittest.main()
