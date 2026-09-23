import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "research-os"))

import roots_extract as rx
import node_words as nw

TREE = (
    'Etymology tree\nProto-Indo-European *lewk-der.\nEnglish light\n[Appendix:Glossary#derived_terms|Derived]] from", '
    '"terms" : [ { "id" : "bright", "children" : [ ], "status" : "ok", "lang_name" : "Proto-Indo-European", "term" : "*lewk-", "lang" : "ine-pro" } ], '
    '"keyword" : "derived" } ], "status" : "ok", "lang_name" : "Proto-Germanic", "term" : "*leuhtaz", "lang" : "gem-pro" } ], '
    '"keyword_label" : "Inherited from", "keyword" : "inherited" } ], "status" : "ok", "lang_name" : "Old English", "term" : "lēoht", "lang" : "ang" } ], '
    '"keyword" : "inherited" } ], "status" : "ok", "lang_name" : "English", "term" : "light", "lang" : "en" }" data-id="illumination">'
)

ENTRIES = [
    {
        "word": "light", "lang": "English", "lang_code": "en", "pos": "noun",
        "etymology_text": "From Old English lēoht, from the root *lewk- (“to shine”).",
        "etymology_templates": [
            {"name": "root", "args": {"1": "en", "2": "ine-pro", "3": "*lewk-"}},
            {"name": "etymon", "args": {"1": "en", "2": ":inh", "3": "enm:light", "tree": "1"}, "expansion": TREE},
        ],
        "senses": [
            {"glosses": ["Electromagnetic radiation visible to the eye."], "topics": ["physics"], "translations": [
                {"lang_code": "he", "word": "אוֹר", "roman": "'or", "sense": "electromagnetic radiation"},
                {"lang_code": "ar", "word": "نُور", "roman": "nūr", "sense": "electromagnetic radiation"},
                {"lang_code": "cmn", "word": "光", "roman": "guāng", "sense": "electromagnetic radiation"},
                {"lang_code": "la", "word": "lūx", "sense": "electromagnetic radiation"},
            ]},
            {"glosses": ["A lamp."], "translations": [
                {"lang_code": "he", "word": "מנורה", "sense": "a lamp"},
                {"lang_code": "la", "word": "lucerna", "sense": "a lamp"},
            ]},
        ],
    },
    {
        "word": "אור", "lang": "Hebrew", "lang_code": "he", "pos": "noun",
        "etymology_templates": [{"name": "he-rootbox", "args": {"1": "א־ו־ר"}}],
        "forms": [{"form": "'ór", "tags": ["romanization"]}],
        "senses": [{"glosses": ["light"]}],
    },
    {"word": "א־ו־ר", "lang": "Hebrew", "lang_code": "he", "pos": "root", "senses": [{"glosses": ["related to light, illumination"]}]},
    {
        "word": "نور", "lang": "Arabic", "lang_code": "ar", "pos": "noun",
        "etymology_templates": [
            {"name": "ar-rootbox", "args": {"1": "ن و ر"}},
            {"name": "inh", "args": {"1": "ar", "2": "sem-pro", "3": "*nūr-", "t": "light, fire"}},
        ],
        "senses": [{"glosses": ["light"]}],
    },
    {
        "word": "نار", "lang": "Arabic", "lang_code": "ar", "pos": "verb",
        "etymology_templates": [{"name": "ar-rootbox", "args": {"1": "ن و ر"}}],
        "senses": [{"glosses": ["to shine"]}],
    },
    {
        "word": "光", "lang": "Chinese", "lang_code": "zh", "pos": "character",
        "etymology_templates": [
            {"name": "Han compound", "args": {"1": "火", "t1": "fire", "2": "卩", "t2": "kneeling person", "ls": "ic"}},
            {"name": "inh", "args": {"1": "zh", "2": "sit-pro", "3": "*hwaŋ", "4": "", "5": "shine; bright; yellow"}},
        ],
        "senses": [{"glosses": ["light; ray"]}],
    },
    {
        "word": "lux", "lang": "Latin", "lang_code": "la", "pos": "noun",
        "etymology_templates": [{"name": "inh", "args": {"1": "la", "2": "itc-pro", "3": "*louks", "t": "light"}}],
        "senses": [{"glosses": ["light"]}],
    },
    {
        "word": "velocitas", "lang": "Latin", "lang_code": "la", "pos": "noun",
        "etymology_templates": [{"name": "suf", "args": {"1": "la", "2": "vēlōx", "3": "tās", "gloss1": "swift, quick"}}],
        "senses": [{"glosses": ["speed"]}],
    },
    {
        "word": "mass", "lang": "English", "lang_code": "en", "pos": "noun",
        "senses": [{"glosses": ["Quantity of matter."], "topics": ["physics"], "translations": [
            {"lang_code": "he", "word": "מַסָּה", "sense": "quantity of matter"},
            {"lang_code": "la", "word": "mōlēs", "sense": "quantity of matter"},
            {"lang_code": "ar", "word": "كُتْلَة", "sense": "quantity of matter"},
        ]}],
    },
    {
        "word": "inflation", "lang": "English", "lang_code": "en", "pos": "noun",
        "senses": [
            {"glosses": ["Rise in prices."], "topics": ["economics", "sciences"], "translations": [
                {"lang_code": l, "word": w, "sense": "increase in the quantity of money"} for l, w in
                [("he", "אינפלציה"), ("la", "inflatio"), ("ar", "تَضَخُّم"), ("zh", "通貨膨脹"), ("es", "inflación")]
            ]},
            {"glosses": ["Early expansion of the universe."], "topics": ["cosmology"], "translations": [
                {"lang_code": l, "word": w, "sense": "inflation of the universe"} for l, w in
                [("he", "התפשטות"), ("la", "inflatio"), ("zh", "暴脹")]
            ]},
        ],
    },
    {"word": "מסה", "lang": "Hebrew", "lang_code": "he", "pos": "noun", "etymology_number": 1, "senses": [{"glosses": ["mass, bulk"]}]},
    {"word": "מסה", "lang": "Hebrew", "lang_code": "he", "pos": "name", "etymology_number": 2, "etymology_templates": [{"name": "he-rootbox", "args": {"1": "נ־ס־ה"}}], "senses": [{"glosses": ["Massah, a biblical place"]}]},
    {"word": "מסה", "lang": "Hebrew", "lang_code": "he", "pos": "verb", "etymology_number": 3, "etymology_templates": [{"name": "he-rootbox", "args": {"1": "מ־ס־ה"}}], "senses": [{"glosses": ["to melt, dissolve"]}]},
    {
        "word": "سرعة", "lang": "Arabic", "lang_code": "ar", "pos": "noun",
        "senses": [{"glosses": ["verbal noun of سَرُعَ"], "form_of": [{"word": "سَرُعَ"}]}],
    },
]

class ExtractTests(unittest.TestCase):
    def rows(self, word, lang="en"):
        e = next(x for x in ENTRIES if x["word"] == word and x["lang_code"] == lang)
        return rx.extract_entry(e, lang == "en")

    def test_tree_chain_reaches_proto_root_with_text_gloss(self):
        r = self.rows("light")
        forms = [(e[3], e[4]) for e in r["etym"]]
        self.assertEqual(forms[-1], ("ine-pro", "*lewk-"))
        self.assertIn(("ang", "lēoht"), forms)
        self.assertEqual(r["etym"][-1][5], "to shine")
        self.assertIn(("en", "light", "ine-pro", "*lewk-", "proto", 0), r["word_root"])

    def test_translations_include_sense_level_and_split_han(self):
        r = self.rows("light")
        langs = {(t[5], t[6]) for t in r["translation"]}
        self.assertIn(("cmn", "光"), langs)
        self.assertIn(("he", "אוֹר"), langs)
        self.assertEqual(rx.split_zh("輪到 /轮到"), "輪到")

    def test_semitic_and_han_roots(self):
        he = self.rows("אור", "he")
        self.assertIn(("he", "אור", "he", "א־ו־ר", "root", 0), he["word_root"])
        root = self.rows("א־ו־ר", "he")
        self.assertIn(("he", "א־ו־ר", "related to light, illumination"), root["root"])
        zh = self.rows("光", "zh")
        self.assertIn(("zh", "火", "fire"), zh["root"])
        self.assertIn(("sit-pro", "*hwaŋ", "shine; bright; yellow"), zh["root"])

    def test_affix_and_form_of_fallbacks(self):
        la = self.rows("velocitas", "la")
        self.assertEqual(la["etym"][0][3:6], ("la", "vēlōx", "swift, quick"))
        ar = self.rows("سرعة", "ar")
        self.assertEqual(ar["etym"][0][2:5], ("form", "ar", "سَرُعَ"))

    def test_etymon_spec_nested(self):
        nodes = rx.parse_etymon_spec("iir-pro:*HáH<ety:inh<ine-pro:*h₂éd>>")
        chain = rx.spec_main_chain(nodes)
        self.assertEqual([(c["lang"], c["term"]) for c in chain], [("iir-pro", "*HáH"), ("ine-pro", "*h₂éd")])

    def test_affix_detection(self):
        self.assertTrue(rx.is_affix("-om", "ine-pro"))
        self.assertFalse(rx.is_affix("*werǵ-", "ine-pro"))
        self.assertTrue(rx.is_affix("ἐν-", "grc"))

class NodeWordTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cache = os.path.join(cls.tmp.name, "cache")
        os.makedirs(cache)
        by_file = {}
        for e in ENTRIES:
            by_file.setdefault(e["lang"], []).append(e)
        for lang, es in by_file.items():
            with open(os.path.join(cache, lang + ".jsonl"), "w", encoding="utf-8") as f:
                for e in es:
                    f.write(json.dumps(e, ensure_ascii=False) + "\n")
        cls.db_path = os.path.join(cls.tmp.name, "roots.sqlite")
        rx.main(["--cache", cache, "--out", cls.db_path, "--workers", "1"])
        cls.roots = nw.Roots(cls.db_path)
        cls.ayahs = [("24:35", "اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ", [nw.arabic_skeleton(t) for t in "اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ".split()])]

    @classmethod
    def tearDownClass(cls):
        cls.roots.db.close()
        cls.tmp.cleanup()

    def test_resume_skips_done_files(self):
        rx.main(["--cache", os.path.dirname(self.db_path) + "/cache", "--out", self.db_path, "--workers", "1"])
        n = self.roots.db.execute("select count(*) from translation").fetchone()[0]
        self.assertEqual(n, 17)

    def test_head_terms(self):
        self.assertEqual(nw.head_terms("Speed Of Light")[0], "speed of light")
        self.assertIn("motion", nw.head_terms("Newton's three laws of motion"))
        self.assertIn("mitochondrion", nw.head_terms("Mitochondria"))
        self.assertEqual(nw.head_terms("The Schrödinger equation")[-1], "equation")

    def test_node_rows_pick_science_sense_and_roots(self):
        term, rows = nw.node_rows({"id": "n1", "title": "Light", "summary": "electromagnetic radiation"}, self.roots, self.ayahs, self.roots.langs)
        self.assertEqual(term, "light")
        by = {r["lang"]: r for r in rows}
        self.assertEqual(by["he"]["word"], "אוֹר")
        self.assertEqual((by["he"]["root_form"], by["he"]["root_gloss"]), ("א־ו־ר", "related to light, illumination"))
        self.assertEqual((by["ar"]["root_lang"], by["ar"]["root_form"], by["ar"]["root_gloss"]), ("sem-pro", "*nūr-", "light, fire"))
        self.assertEqual((by["ar"]["chain"][0]["rel"], by["ar"]["chain"][0]["form"]), ("root", "ن و ر"))
        self.assertEqual(by["ar"]["root_texts"][0]["samples"][0]["ref"], "24:35")
        self.assertEqual((by["zh"]["root_form"], by["zh"]["root_gloss"]), ("*hwaŋ", "shine; bright; yellow"))
        self.assertEqual((by["la"]["word"], by["la"]["root_form"]), ("lūx", "*louks"))
        self.assertEqual((by["en"]["root_lang"], by["en"]["root_form"], by["en"]["root_gloss"]), ("ine-pro", "*lewk-", "to shine"))
        self.assertTrue(all(r["source"] == nw.SOURCE for r in rows))

    def test_a_homograph_takes_the_root_of_the_entry_that_means_the_word(self):
        _t, rows = nw.node_rows({"id": "n3", "title": "Mass", "branch": "02-physics", "summary": ""}, self.roots, [], self.roots.langs)
        he = {r["lang"]: r for r in rows}["he"]
        self.assertIsNone(he["root_form"])
        self.assertEqual(he["gloss"], "mass, bulk")
        self.assertGreaterEqual(he["confidence"], nw.UNCERTAIN_BELOW)

    def test_the_node_branch_picks_the_sense(self):
        _t, rows = nw.node_rows({"id": "n4", "title": "Inflation", "branch": "06-cosmology", "summary": ""}, self.roots, [], self.roots.langs)
        by = {r["lang"]: r for r in rows}
        self.assertEqual(by["he"]["word"], "התפשטות")
        self.assertEqual(by["zh"]["word"], "暴脹")
        self.assertGreaterEqual(by["he"]["confidence"], nw.UNCERTAIN_BELOW)
        _t, rows = nw.node_rows({"id": "n5", "title": "Inflation", "branch": "07-mind", "summary": ""}, self.roots, [], self.roots.langs)
        self.assertEqual({r["lang"]: r for r in rows}["he"]["word"], "התפשטות")

    def test_sense_confidence_bands(self):
        one = [{"score": 3, "branch": False}]
        self.assertEqual(nw.sense_confidence(one), 1.0)
        self.assertEqual(nw.sense_confidence([{"score": 5, "branch": True}, {"score": 6, "branch": False}]), 0.95)
        self.assertEqual(nw.sense_confidence([{"score": 5, "branch": False}, {"score": 4.5, "branch": False}]), 0.5)
        self.assertEqual(nw.sense_confidence([{"score": 5, "branch": False}, {"score": 4, "branch": True}]), 0.3)

    def test_arabic_skeleton_matching(self):
        self.assertEqual(nw.arabic_skeleton("نُورُ"), "نور")
        self.assertTrue(nw.token_matches(nw.arabic_skeleton("وَالنُّورِ"), "نور"))
        self.assertFalse(nw.token_matches(nw.arabic_skeleton("نَار"), "نور"))
        self.assertFalse(nw.token_matches(nw.arabic_skeleton("فِيهِ"), nw.arabic_skeleton("فِئَة")))
        self.assertFalse(nw.token_matches(nw.arabic_skeleton("إِلَيْهِ"), nw.arabic_skeleton("آلِيَّة")))
        self.assertFalse(nw.token_matches(nw.arabic_skeleton("نُورُهُمْ"), "نور"))
        self.assertTrue(nw.token_matches(nw.arabic_skeleton("نُورًا"), "نور"))

    def test_unmatched_title_yields_nothing(self):
        term, rows = nw.node_rows({"id": "n2", "title": "Zzyzx", "summary": ""}, self.roots, [], self.roots.langs)
        self.assertIsNone(term)
        self.assertEqual(rows, [])

if __name__ == "__main__":
    unittest.main()
