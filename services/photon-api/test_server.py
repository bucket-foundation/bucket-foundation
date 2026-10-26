import importlib
import os
import sqlite3
import sys
import tempfile
import unittest

try:
    import fastapi  # noqa: F401
    import numpy as np
except ImportError as exc:
    raise unittest.SkipTest(f"photon-api deps missing: {exc}")

ROWS = [
    ("en:water", "en", "water", "water, clear liquid", "noun", "/ˈwɔːtər/", [1, 0, 0]),
    ("es:agua", "es", "agua", "water, clear liquid", "noun", "/ˈaɣwa/", [1, 0, 0]),
    ("fr:eau", "fr", "eau", "water", "noun", "/o/", [0.9, 0.1, 0]),
    ("de:wasser", "de", "Wasser", "water", "noun", "/ˈvasɐ/", [0.95, 0.05, 0]),
    ("es:fuego", "es", "fuego", "fire", "noun", "/ˈfweɣo/", [0, 1, 0]),
    ("la:aqua", "la", "aqua", "water", "noun", "/ˈa.kʷa/", [0.97, 0, 0.03]),
    ("en:fire", "en", "fire", "fire, combustion", "noun", "/ˈfaɪər/", [0, 1, 0]),
]

def build(dirpath):
    db = sqlite3.connect(os.path.join(dirpath, "index.sqlite"))
    db.execute(
        "CREATE TABLE photons (id TEXT, lang TEXT, surface TEXT, meaning_en TEXT, "
        "pos TEXT, ipa TEXT, semantic_row INT, phonetic_row INT, "
        "provenance_source TEXT, provenance_uri TEXT)"
    )
    vecs = []
    for n, (pid, lang, surface, meaning, pos, ipa, v) in enumerate(ROWS):
        db.execute("INSERT INTO photons VALUES (?,?,?,?,?,?,?,?,?,?)",
                   (pid, lang, surface, meaning, pos, ipa, n, n, None, None))
        a = np.array(v, dtype="float32")
        vecs.append(a / np.linalg.norm(a))
    db.commit()
    db.close()
    m = np.stack(vecs).astype("float32")
    m.tofile(os.path.join(dirpath, "semantic-vectors.f32.bin"))
    m.tofile(os.path.join(dirpath, "phonetic-vectors.f32.bin"))

class PhotonServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        build(cls.tmp.name)
        os.environ["PHOTONS_DIR"] = cls.tmp.name
        os.environ["POLINGUAL_FAVORITES"] = "es,fr,xx,es"
        os.environ["POLINGUAL_RATE"] = "0"
        sys.path.insert(0, os.path.dirname(__file__))
        cls.s = importlib.reload(importlib.import_module("server"))
        cls.ix = cls.s.get_index()

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_favorites_default_drops_unknown_and_duplicate_langs(self):
        out = self.s.translate_many(self.ix, "water", "en")
        self.assertEqual(out["scope"], "favorites")
        self.assertEqual([r["lang"] for r in out["translations"]], ["es", "fr"])
        es = out["translations"][0]
        self.assertEqual(es["match"], "exact")
        self.assertEqual(es["results"][0]["surface"], "agua")
        self.assertEqual(out["translations"][1]["match"], "semantic")
        self.assertEqual(out["translations"][1]["results"][0]["surface"], "eau")

    def test_all_covers_every_language_but_the_source(self):
        out = self.s.translate_many(self.ix, "water", "en", "all")
        self.assertEqual(out["scope"], "all")
        self.assertEqual([r["lang"] for r in out["translations"]], ["de", "es", "fr", "la"])
        self.assertEqual(out["available_langs"], ["de", "en", "es", "fr", "la"])

    def test_custom_list_and_missing_word(self):
        out = self.s.translate_many(self.ix, "water", "en", "la,de")
        self.assertEqual([r["lang"] for r in out["translations"]], ["la", "de"])
        miss = self.s.translate_many(self.ix, "nope", "en")
        self.assertFalse(miss["found"])
        self.assertEqual(miss["translations"], [])

    def test_meaning_search_requires_every_term(self):
        out = self.s.meaning_search(self.ix, "water", None, 10)
        self.assertEqual({r["surface"] for r in out["results"]},
                         {"water", "agua", "eau", "Wasser", "aqua"})
        two = self.s.meaning_search(self.ix, "clear water", "es", 10)
        self.assertEqual([r["surface"] for r in two["results"]], ["agua"])
        self.assertEqual(self.s.meaning_search(self.ix, "  ", None, 5)["results"], [])

    def test_meaning_search_ranks_short_glosses_first(self):
        out = self.s.meaning_search(self.ix, "fire", None, 10)
        self.assertEqual(out["results"][0]["surface"], "fuego")

    def test_phonetic_search_matches_ipa_ignoring_stress_marks(self):
        out = self.s.phonetic_search(self.ix, "akwa", None, 5)
        self.assertEqual(out["results"][0]["surface"], "agua")
        self.assertIn("aqua", [r["surface"] for r in out["results"]])
        self.assertEqual(self.s.phonetic_search(self.ix, "//", None, 5)["results"], [])

    def test_http_endpoints(self):
        from fastapi.testclient import TestClient
        c = TestClient(self.s.app)
        r = c.get("/translate/many", params={"surface": "water", "from": "en", "to": "all", "k": 1})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()["translations"]), 4)
        self.assertTrue(all(len(t["results"]) <= 1 for t in r.json()["translations"]))
        r = c.get("/search/meaning", params={"q": "fire", "lang": "en"})
        self.assertEqual([x["surface"] for x in r.json()["results"]], ["fire"])
        r = c.get("/search/phonetic", params={"ipa": "/ˈfweɣo/"})
        self.assertEqual(r.json()["results"][0]["surface"], "fuego")
        r = c.get("/healthz")
        self.assertIn("translate_many", r.json()["axes"])
        self.assertEqual(c.get("/translate", params={"surface": "water", "to": "es"}).status_code, 200)

if __name__ == "__main__":
    unittest.main()
