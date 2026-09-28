import json
import os
import shutil
import sqlite3
import sys
import tempfile
import textwrap
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import node_words as nw  # noqa: E402
import nsm_exponents as ne  # noqa: E402
import oshb  # noqa: E402
import oshb_verses as ov  # noqa: E402

INDEX = textwrap.dedent("""\
    <?xml version="1.0" encoding="UTF-8"?>
    <index xmlns="http://openscriptures.github.com/morphhb/namespace">
      <part>
        <entry id="a1"><w>אוֹר</w><pos>V</pos><def>be light</def><xref strong="215"/><etym type="main" root="אור">a2</etym></entry>
        <entry id="a2"><w>אוֹר</w><pos>N</pos><def>light</def><xref strong="216"/><etym type="sub">a1</etym></entry>
        <entry id="a3"><w>מָאוֹר</w><pos>N</pos><def>luminary</def><xref strong="3974"/><etym type="sub">a1</etym></entry>
        <entry id="b1"><w>בָּרָא</w><pos>V</pos><def>create</def><xref strong="1254"/><etym type="main" root="ברא"/></entry>
        <entry id="c1"><w>שׁמשׁ</w><pos>N</pos><def>sun</def></entry>
      </part>
    </index>
""")

def book(name, verses):
    body = "".join(f'<verse osisID="{name}.{ref}">{words}</verse>' for ref, words in verses)
    return (
        '<?xml version="1.0" encoding="utf-8"?><osis xmlns="http://www.bibletechnologies.net/2003/OSIS/namespace">'
        f'<osisText><div type="book" osisID="{name}"><chapter osisID="{name}.1">{body}</chapter></div></osisText></osis>'
    )

GEN = book("Gen", [
    ("1.1", '<w lemma="b/7225">בְּ/רֵאשִׁ֖ית</w> <w lemma="1254 a">בָּרָ֣א</w> <w lemma="430">אֱלֹהִ֑ים</w><seg type="x-sof-pasuq">׃</seg>'),
    ("1.3", '<w lemma="c/559">וַ/יֹּ֥אמֶר</w> <w lemma="430">אֱלֹהִ֖ים</w> <w lemma="1961">יְהִ֣י</w> <w lemma="216">א֑וֹר</w> <w lemma="c/1961">וַֽ/יְהִי</w><seg type="x-maqqef">־</seg><w lemma="216">אֽוֹר</w><seg type="x-sof-pasuq">׃</seg><note><rdg><w lemma="9999">קרי</w></rdg></note>'),
    ("1.14", '<w lemma="3974">מְאֹרֹת֙</w> <w lemma="1254">בָּרָא</w> <w lemma="1">אב</w> <w lemma="2">אב</w> <w lemma="3">אב</w><seg type="x-sof-pasuq">׃</seg>'),
])
PS = book("Ps", [
    ("1.1", '<w lemma="215">הֵאִיר</w><seg type="x-sof-pasuq">׃</seg>'),
    ("1.2", '<w lemma="216">אוֹר</w> <w lemma="1">אב</w><seg type="x-sof-pasuq">׃</seg>'),
])

class Verses(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.mkdtemp()
        cls.index = os.path.join(cls.dir, "LexicalIndex.xml")
        with open(cls.index, "w", encoding="utf-8") as f:
            f.write(INDEX)
        cls.wlc = os.path.join(cls.dir, "wlc")
        os.makedirs(cls.wlc)
        for name, text in (("Gen", GEN), ("Ps", PS), ("VerseMap", "<map/>")):
            with open(os.path.join(cls.wlc, name + ".xml"), "w", encoding="utf-8") as f:
                f.write(text)
        cls.v = ov.Verses.load(cls.wlc, cls.index)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.dir)

    def test_lemma_numbers_drop_prefixes_and_letters(self):
        self.assertEqual(ov.strongs("b/7225"), ["7225"])
        self.assertEqual(ov.strongs("1254 a"), ["1254"])
        self.assertEqual(ov.strongs("c/d/0776"), ["776"])
        self.assertEqual(ov.strongs(""), [])

    def test_verse_text_drops_cantillation_slashes_and_notes(self):
        gen13 = next(v for v in self.v.verses if v["osis"] == "Gen.1.3")
        self.assertEqual(gen13["text"], "וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר וַֽיְהִי־אֽוֹר׃")
        self.assertNotIn("9999", gen13["strongs"])
        self.assertEqual(ov.ref_name("Gen.1.3"), "Genesis 1:3")
        self.assertEqual(ov.ref_name("Ps.1.2"), "Psalms 1:2")

    def test_verses_run_in_canonical_order(self):
        self.assertEqual([v["osis"] for v in self.v.verses], ["Gen.1.1", "Gen.1.3", "Gen.1.14", "Ps.1.1", "Ps.1.2"])

    def test_a_root_gathers_every_entry_under_it(self):
        self.assertEqual(self.v.root_strongs["אור"], {"215", "216", "3974"})
        h = self.v.hits("אור", "אור")
        self.assertEqual(h["count"], 4)
        self.assertEqual(h["corpus"], "Hebrew Bible")
        self.assertEqual(h["source"], "Original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb")
        self.assertEqual(h["root"], "א־ו־ר")

    def test_own_entry_first_then_shortest_then_canonical(self):
        h = self.v.hits("מאור", "אור", limit=2)
        self.assertEqual([s["ref"] for s in h["samples"]], ["Genesis 1:14", "Psalms 1:1"])
        h = self.v.hits("אור", "אור", limit=3)
        self.assertEqual([s["ref"] for s in h["samples"]], ["Genesis 1:3", "Psalms 1:1", "Psalms 1:2"])

    def test_the_cap_holds(self):
        self.assertEqual(len(self.v.hits("אור", "אור", limit=1)["samples"]), 1)

    def test_no_entry_or_no_verse_gives_nothing(self):
        self.assertIsNone(self.v.hits("שמש", "שמש"))
        self.assertIsNone(self.v.hits("xyz", "קדש"))

    def test_missing_text_loads_nothing(self):
        self.assertIsNone(ov.Verses.load(os.path.join(self.dir, "none"), self.index))

    def test_silver_tables(self):
        path = os.path.join(self.dir, "silver.sqlite")
        ov.write_silver(self.v.verses, path)
        db = sqlite3.connect(path)
        self.assertEqual(db.execute("select count(*) from verse").fetchone()[0], 5)
        self.assertEqual(db.execute("select book, chapter, verse from verse where ref = 'Gen.1.14'").fetchone(), ("Gen", 1, 14))
        self.assertEqual(sorted(r[0] for r in db.execute("select ref from lemma_verse where strong = '216'")), ["Gen.1.3", "Ps.1.2"])
        db.close()

    def test_rows_gain_verses_only_with_a_shown_hebrew_root(self):
        self.assertEqual(nw.hebrew_hits(self.v, "he", "אור", "he", "אור", 0.8, 0.7)["count"], 4)
        self.assertIsNone(nw.hebrew_hits(self.v, "he", "אור", "he", "אור", 0.8, 0.4))
        self.assertIsNone(nw.hebrew_hits(self.v, "he", "אור", "he", "אור", 0.4, 0.8))
        self.assertIsNone(nw.hebrew_hits(self.v, "ar", "نور", "ar", "نور", 0.9, 0.9))
        self.assertIsNone(nw.hebrew_hits(self.v, "he", "אור", "sem-pro", "*ʔwr", 0.9, 0.9))
        self.assertIsNone(nw.hebrew_hits(None, "he", "אור", "he", "אור", 0.9, 0.9))

    def test_bands_split_at_uncertain_below(self):
        entry = [{"corpus": "Hebrew Bible", "samples": []}]
        rows = [
            {"lang": "he", "confidence": 0.9, "root_confidence": 0.8, "root_texts": entry},
            {"lang": "he", "confidence": 0.9, "root_confidence": 0.7, "root_texts": entry},
            {"lang": "he", "confidence": 0.6, "root_confidence": 0.6, "root_texts": []},
            {"lang": "he", "confidence": 0.3, "root_confidence": 0.3, "root_texts": entry},
            {"lang": "ar", "confidence": 0.9, "root_confidence": 0.9, "root_texts": [{"corpus": "Quran", "samples": []}]},
        ]
        self.assertEqual(nw.verse_bands(rows, "confidence"), {"shown": 3, "verses_at_075": 1, "verses_050_075": 1})

    def test_nsm_rows_write_root_texts_as_jsonb(self):
        row = {c: None for c in ne.ROW_COLUMNS}
        row.update({"prime_id": "LIGHT", "lang": "he", "word": "אור", "rank": 1, "confidence": 0.9, "root_confidence": 0.8, "sense_match": True, "source": "s", "run_id": "r", "root_texts": [{"corpus": "Hebrew Bible", "samples": [{"ref": "Genesis 1:3", "text": "אוֹר"}]}]})
        empty = dict(row, root_texts=[])
        sql = ne.build_sql([{"id": "LIGHT", "label": "LIGHT", "category": "c", "english": ["light"]}], {"LIGHT": ({"sense": None, "sense_match": None}, [row, empty])})
        self.assertIn(json.dumps(row["root_texts"], ensure_ascii=False) + "'::jsonb", sql)
        self.assertIn("'[]'::jsonb", sql)

if __name__ == "__main__":
    unittest.main()
