import json
import sys
import tempfile
import unittest
from pathlib import Path

try:
    import jsonschema
except ImportError:
    jsonschema = None

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import open_stories as os_

SCHEMA = json.loads((HERE.parent / "src/lib/input/input-bundle.schema.json").read_text())
SHIPPED = HERE.parent / "public/input/stories"
BUNDLES = os_.BUNDLES

MD = """# A very tall man

##
His hoe was too short.

##
His doorway was too low.

##
* License: [CC-BY]
* Text: Cornelius Gulere
* Illustration: Catherine Groenewald
* Translation: Karina Vásquez, Ana Ruiz
* Language: es
"""

ASB_HTML = """<div class="page"><div class="page-wrapper" style="x"><div class="levelFont1 page-borders"><image src="https://www.africanstorybook.org/illustrations/pages/309.png"><br><p class="single-text ">His hoe was &amp; short.</p></div><div class="page-number">1</div></div></div>
<div class="bookcover_author"><span class="backcover_bold">Author - </span> Cornelius Wambi Gulere<br><span class="backcover_bold">Translation - </span> Ana Ruiz<br><span class="backcover_bold">Illustration - </span> Catherine Groenewald<br><span class="backcover_bold">Language - </span> Spanish</div><div class="backcover_copyright">© ASb 2014<br>Creative Commons: Attribution 4.0</div>"""


class Lex:
    def __init__(self, words=()):
        self.words = set(words)

    def known(self, s):
        return s in self.words

    def lemma(self, s, initial=False):
        return (s.lower(), True) if s.lower() in self.words else (s, False)


def book(pages, lang="es", tps=None, level="A1"):
    b = {"source": "global-storybooks", "id": f"global-storybooks-{lang}-0001", "lang": lang, "title": "T", "url": "u",
         "authors": ["A"], "illustrators": ["I"], "translators": ["Tr"], "licence": os_.licence("CC BY", "4.0"), "rightsHolder": "",
         "level": {"scale": "s", "value": 1, "cefr": level}, "pages": pages, "images": [None] * len(pages)}
    if tps:
        b["translationPages"] = tps
    return b


class Parse(unittest.TestCase):
    def test_md_story_pages_and_credits(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "0001_un-hombre.md"
            p.write_text(MD)
            s = os_.md_story(p)
        self.assertEqual(s["pages"], ["His hoe was too short.", "His doorway was too low."])
        self.assertEqual(os_.names(s["meta"]["translation"]), ["Karina Vásquez", "Ana Ruiz"])
        self.assertEqual(s["num"], "0001")

    def test_asb_viewer_pages_roles_licence(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "918.html"
            p.write_text(ASB_HTML)
            pages, roles, copy = os_.asb_page_html(p)
        self.assertEqual(pages[0]["text"], "His hoe was & short.")
        self.assertTrue(pages[0]["image"].endswith("309.png"))
        self.assertEqual(roles["translation"], ["Ana Ruiz"])
        self.assertEqual(copy, ["© ASb 2014", "Creative Commons: Attribution 4.0"])
        self.assertEqual(os_.asb_licence(copy)["label"], "CC BY 4.0")

    def test_asb_licence_rejects_restricted(self):
        self.assertIsNone(os_.asb_licence(["© ASb", "Creative Commons: Attribution-Non Commercial 3.0"]))
        self.assertIsNone(os_.asb_licence(["© ASb", "Creative Commons: Attribution-ShareAlike 4.0"]))
        self.assertIsNone(os_.asb_licence(["© X All rights reserved", "Creative Commons: Attribution 4.0"]))
        self.assertEqual(os_.asb_licence(["Attribution CC BY"])["label"], "CC BY")

    def test_md_licence_exact(self):
        self.assertEqual(os_.md_licence("[CC-BY]", "global-asp")["label"], "CC BY 4.0")
        self.assertIsNone(os_.md_licence("[CC-BY]", "asp-source")["version"])
        for bad in ("[CC-BY-NC]", "CC BY-NC-SA", "[CC-BY-SA]", "[CC-BY-ND]", "[Public Domain]", ""):
            self.assertIsNone(os_.md_licence(bad, "global-asp"), bad)

    def test_bundles_dir_outside_repo(self):
        with self.assertRaises(SystemExit):
            os_.check_bundles_dir(os_.ROOT / "polingual/public/input/stories")
        os_.check_bundles_dir(Path(tempfile.gettempdir()) / "stories")

    def test_machine_translation_filter(self):
        self.assertTrue(os_.MACHINE.search("Google Translate"))
        self.assertTrue(os_.MACHINE.search("machine translation, edited"))
        self.assertFalse(os_.MACHINE.search("Karina Vásquez"))


class Tokens(unittest.TestCase):
    def test_devanagari_keeps_marks(self):
        toks = os_.Tokenizer(os_.NullLex(), "hi").tokens("माँ हँस दीं।")
        self.assertEqual([t["surface"] for t in toks], ["माँ", "हँस", "दीं"])

    def test_cjk_longest_match(self):
        toks = os_.Tokenizer(Lex({"我们", "走"}), "zh").tokens("我们走吧")
        self.assertEqual([t["surface"] for t in toks], ["我们", "走", "吧"])


class Units(unittest.TestCase):
    def test_short_story_dropped(self):
        items, units = os_.book_units(book(["uno dos tres"]), os_.Tokenizer(os_.NullLex(), "es"), set())
        self.assertEqual(units, [])

    def test_units_reach_min_tokens_with_credit(self):
        pages = [" ".join(["palabra"] * 25)] * 3
        items, units = os_.book_units(book(pages), os_.Tokenizer(os_.NullLex(), "es"), set())
        self.assertTrue(units)
        self.assertTrue(all(u["tokenCount"] >= 40 for u in units))
        self.assertIn("translated by Tr", units[0]["credit"])
        self.assertIn("CC BY 4.0", units[0]["credit"])

    def test_translation_only_when_paired(self):
        pages = [" ".join(["casa"] * 45)]
        _, unpaired = os_.book_units(book(pages), os_.Tokenizer(os_.NullLex(), "es"), set())
        items, paired = os_.book_units(book(pages, tps=["house"]), os_.Tokenizer(os_.NullLex(), "es"), set())
        self.assertFalse(unpaired[0]["paired"])
        self.assertTrue(paired[0]["paired"])
        self.assertEqual(items[0]["translation"], "house")

    def test_duplicate_text_skipped(self):
        pages = [" ".join(["casa"] * 45)]
        seen = set()
        os_.book_units(book(pages), os_.Tokenizer(os_.NullLex(), "es"), seen)
        self.assertEqual(os_.book_units(book(pages), os_.Tokenizer(os_.NullLex(), "es"), seen), ([], []))

    def test_low_coverage_raises_level(self):
        pages = [" ".join(["zzz"] * 45)]
        _, units = os_.book_units(book(pages), os_.Tokenizer(os_.NullLex(), "es"), set())
        self.assertEqual(units[0]["cefr"], "A2")

    def test_pair_pages_requires_length_and_content_match(self):
        self.assertIsNone(os_.pair_pages(book(["a", "b"]), ["x"]))
        self.assertEqual(os_.pair_pages(book(["el hombre"]), ["the man"]), ["the man"])
        self.assertIsNone(os_.pair_pages(book(["sí"]), ["a long page of English text that cannot be this"]))
        self.assertIsNone(os_.pair_pages(book(["tengo 3 años"]), ["I am 4 years"]))

    def test_paired_credit_names_english_author_and_translator(self):
        b = book([" ".join(["casa"] * 45)])
        os_.attach_pair(b, {"id": "storyweaver-pb-source-en-0001", "title": "House", "url": "eu", "authors": ["EA"],
                            "translators": ["ET"], "pages": ["house"], "licence": os_.licence("CC BY", "4.0")})
        _, units = os_.book_units(b, os_.Tokenizer(os_.NullLex(), "es"), set())
        self.assertIn("English text \"House\" by EA, translated by ET", units[0]["credit"])
        self.assertIn({"url": "eu", "author": "EA", "lang": "en"}, units[0]["credits"])
        self.assertEqual(b["pairedWith"], "storyweaver-pb-source-en-0001")

    def test_md_pair_id_matches_english_book_id(self):
        self.assertEqual(os_.md_id("pb-source", "en", "0001"), "storyweaver-pb-source-en-0001")

    def test_translation_without_translator_flagged(self):
        b = book(["x"])
        b.update(translators=[], isTranslation=True)
        os_.flag_review([b])
        self.assertEqual(b["review"], ["no translator credited"])

    def test_asb_pairs_by_image_sequence(self):
        en = book(["one"], lang="en")
        en.update(id="asb-1", images=["i1"])
        fr = book(["une"], lang="fr")
        fr.update(id="asb-2", images=["i1"])
        other = book(["deux"], lang="fr")
        other.update(id="asb-3", images=["i9"])
        os_.asb_pairs([en, fr, other])
        self.assertEqual(fr["translationPages"], ["one"])
        self.assertNotIn("translationPages", other)


@unittest.skipIf(jsonschema is None or not (SHIPPED / "manifest.json").exists(), "no shipped story bundles")
class Shipped(unittest.TestCase):
    def test_bundles_validate_and_credit(self):
        manifest = json.loads((SHIPPED / "manifest.json").read_text())
        for lang, m in manifest["langs"].items():
            self.assertNotIn("pa", manifest["langs"])
            path = BUNDLES / m["file"]
            self.assertTrue(path.exists(), f"missing bundle {path}; run open_stories.py build")
            b = json.loads(path.read_text())
            jsonschema.validate(b, SCHEMA)
            books = {x["id"] for x in b["books"]}
            for u in b["units"]:
                self.assertIn(u["bookId"], books)
                self.assertIn("CC BY 4.0", u["credit"])
            for it in b["items"]:
                if "translation" in it:
                    self.assertTrue(any(x.get("pairedWith") for x in b["books"]))


if __name__ == "__main__":
    unittest.main()
