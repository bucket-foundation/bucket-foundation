import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import graded_input as gi


def tok(surface, lemma=None, unmapped=False):
    return {"surface": surface, "lemma": lemma or surface, **({"unmapped": True} if unmapped else {})}


RANKS = {"el": 1, "gato": 300, "come": 200, "comer": 200, "pescado": 1200, "casa": 100, "mar": 700}


def grader(names=("Ana",)):
    return gi.Grader(lex=None, ranks=RANKS, names=names)


def profile(sid, lemmas, n=None):
    lem = [(l, RANKS[l]) for l in lemmas]
    return {"sid": sid, "text": " ".join(lemmas), "auth": None, "en_id": None, "en": None, "n": n or len(lemmas), "lem": lem}


class Check(unittest.TestCase):
    def test_out_of_band_word_is_offending(self):
        res = grader().check([tok("el"), tok("gato"), tok("pescado")], 500, [])
        self.assertEqual(res["offending"], ["pescado"])

    def test_target_counts_as_new(self):
        toks = [tok("el")] * 38 + [tok("pescado")] * 2
        res = grader().check(toks, 500, ["pescado"])
        self.assertEqual(res["offending"], [])
        self.assertEqual(res["targetsUsed"], ["pescado"])
        self.assertEqual(res["coverage"], 0.95)

    def test_listed_name_is_known(self):
        res = grader().check([tok("Ana", unmapped=True), tok("el")], 500, [])
        self.assertEqual(res["offending"], [])

    def test_unlisted_capitalised_unmapped_is_offending(self):
        res = grader().check([tok("Lisboa", unmapped=True), tok("Haus", unmapped=True)], 8000, [])
        self.assertEqual(res["offending"], ["Haus", "Lisboa"])

    def test_lowercase_unmapped_is_offending(self):
        res = grader().check([tok("xyzzy", unmapped=True)], 8000, [])
        self.assertEqual(res["offending"], ["xyzzy"])

    def test_token_window(self):
        self.assertEqual(gi.token_window(1), (40, 50))
        self.assertEqual(gi.token_window(3), (60, 150))


class Split(unittest.TestCase):
    def item(self):
        return {"id": "i1", "lang": "fr", "kind": "sentence", "text": "L'homme mange, vite.",
                "tokens": [{"surface": "L'", "lemma": "le"}, {"surface": "homme", "lemma": "homme"},
                           {"surface": "mange", "lemma": "manger"}, {"surface": "vite", "lemma": "vite"}],
                "lemmas": ["homme", "le", "manger", "vite"], "source": {"name": "tatoeba", "url": "x"}, "license": "CC-BY 2.0 FR"}

    def test_compact_round_trip(self):
        it = self.item()
        c = gi.compact_item(it)
        self.assertNotIn("tokens", c)
        self.assertEqual(c["tok"][1], [2, 5])
        self.assertEqual(gi.expand_item(c), it)

    def test_split_moves_band_units(self):
        it = self.item()
        b = {"lang": "fr", "attribution": [], "items": [it, {**it, "id": "i2"}],
             "units": [{"id": "u1", "itemIds": ["i1"], "band": 500}, {"id": "u2", "itemIds": ["i2"]}]}
        base, parts = gi.split_bands(b)
        self.assertEqual([u["id"] for u in base["units"]], ["u2"])
        self.assertEqual([i["id"] for i in base["items"]], ["i2"])
        self.assertEqual(list(parts), [500])
        self.assertEqual(parts[500][0]["items"][0]["id"], "i1")

    def test_split_caps_part_size(self):
        it = self.item()
        items = [{**it, "id": f"i{n}"} for n in range(40)]
        units = [{"id": f"u{n}", "itemIds": [f"i{n}"], "band": 8000} for n in range(40)]
        _, parts = gi.split_bands({"lang": "fr", "attribution": [], "items": items, "units": units}, max_bytes=1500)
        self.assertGreater(len(parts[8000]), 1)
        for c in parts[8000]:
            self.assertLessEqual(gi.size_of(c), 1500)
        self.assertEqual(sum(len(c["units"]) for c in parts[8000]), 40)

    def test_shipped_sample_round_trips(self):
        sample = json.loads((HERE / "fixtures/es.band-sample.json").read_text())
        self.assertEqual(sample["format"], "polingual-input-band")
        ids = {i["id"] for i in sample["items"]}
        for u in sample["units"]:
            self.assertTrue(set(u["itemIds"]) <= ids)
            self.assertTrue(gi.MIN_COVERAGE <= u["coverage"] <= gi.MAX_COVERAGE)
        for i in sample["items"]:
            full = gi.expand_item(i)
            self.assertEqual(gi.compact_item(full)["tok"], i["tok"])


class BandSets(unittest.TestCase):
    def test_set_has_one_target_and_coverage_in_window(self):
        profiles = [profile("1", ["el", "gato", "come", "pescado"], 10)]
        profiles += [profile(str(i), ["el", "gato", "come", "casa"], 9) for i in range(2, 9)]
        sets = gi.band_sets(profiles, 1000)
        self.assertEqual(len(sets), 1)
        s = sets[0]
        self.assertEqual(s["target"], "pescado")
        self.assertTrue(gi.MIN_COVERAGE <= s["coverage"] <= gi.MAX_COVERAGE)
        self.assertTrue(4 <= len(s["sentences"]) <= 6)

    def test_target_outside_next_band_skipped(self):
        profiles = [profile("1", ["el", "pescado"], 10)] + [profile(str(i), ["el", "gato"], 10) for i in range(2, 9)]
        self.assertEqual(gi.band_sets(profiles, 500), [])

    def test_sentence_used_once_per_band(self):
        profiles = [profile("1", ["el", "gato", "mar"], 10), profile("2", ["el", "gato", "pescado"], 10)]
        profiles += [profile(str(i), ["el", "gato", "come"], 10) for i in range(3, 7)]
        sets = gi.band_sets(profiles, 600)
        ids = [p["sid"] for s in sets for p in s["sentences"]]
        self.assertEqual(len(ids), len(set(ids)))


if __name__ == "__main__":
    unittest.main()
