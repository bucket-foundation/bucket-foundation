import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import frequency_ranks as fr


class LemmaOf(unittest.TestCase):
    def test_form_of_meanings(self):
        self.assertEqual(fr.lemma_of("masculine plural of perro"), "perro")
        self.assertEqual(fr.lemma_of("first-person singular preterite indicative of hablar"), "hablar")
        self.assertEqual(fr.lemma_of("plural of casa."), "casa")

    def test_multiword_targets(self):
        self.assertEqual(fr.lemma_of("plural of año luz"), "año luz")
        self.assertEqual(fr.lemma_of("plural of año luz (light year)"), "año luz")
        self.assertEqual(fr.lemma_of("past participle of give up"), "give up")

    def test_plain_meanings(self):
        self.assertIsNone(fr.lemma_of("dog"))
        self.assertIsNone(fr.lemma_of("a piece of cake"))


class Ranks(unittest.TestCase):
    def test_order_and_ties(self):
        r = fr.ranks_from_counts([("b", 2.0), ("a", 2.0), ("C", 5.0), ("c", 1.0)])
        self.assertEqual(r, {"c": 1, "a": 2, "b": 3})

    def test_inflection_folds_to_best_form(self):
        rank = {"perros": 5, "perro": 20, "hablé": 9}
        t = fr.lemma_ranks([("perro", None), ("Perros", "perro"), ("hablar", None), ("hablé", "hablar")], rank)
        self.assertEqual(t["perro"], (20, "perro", 5, False))
        self.assertEqual(t["perros"], (5, "perro", 5, False))
        self.assertEqual(t["hablar"], (None, "hablar", 9, False))
        self.assertEqual(t["hablé"], (9, "hablar", 9, False))

    def test_unranked_lemma(self):
        self.assertEqual(fr.lemma_ranks([("xyz", None)], {})["xyz"], (None, "xyz", None, False))

    def test_hyphen_compound_takes_rarest_part(self):
        rank = {"well": 50, "known": 300}
        t = fr.lemma_ranks([("well-known", None)], rank)
        self.assertEqual(t["well-known"], (300, "well-known", 300, True))

    def test_listed_compound_keeps_own_rank(self):
        t = fr.lemma_ranks([("well-known", None)], {"well-known": 900, "well": 50, "known": 300})
        self.assertEqual(t["well-known"], (900, "well-known", 900, False))

    def test_compound_with_unranked_part_stays_unranked(self):
        t = fr.lemma_ranks([("well-zzq", None)], {"well": 50})
        self.assertEqual(t["well-zzq"], (None, "well-zzq", None, False))

    def test_multiword_lemma_group(self):
        t = fr.lemma_ranks([("año luz", None), ("años luz", "año luz")], {"año": 40, "luz": 200})
        self.assertEqual(t["años luz"], (None, "año luz", 200, True))

    def test_inflection_of_derived_lemma_inherits_flag(self):
        t = fr.lemma_ranks([("well-known", None), ("well-knowns", "well-known")], {"well": 50, "known": 300})
        self.assertTrue(t["well-knowns"][3])
        self.assertEqual(t["well-knowns"][2], 300)

    def test_direct_rank_beats_derived_tie(self):
        t = fr.lemma_ranks([("a-b", None), ("ab", "a-b")], {"a": 1, "b": 7, "ab": 7})
        self.assertEqual(t["ab"], (7, "a-b", 7, False))


class Determinism(unittest.TestCase):
    def test_shipped_blob_is_stable(self):
        rows = [["photon:word:es:perro", "es", "perro", "dog", "noun", None, "functional", 5]]
        self.assertEqual(fr.dump_shipped(rows), fr.dump_shipped([list(r) for r in rows]))

    def test_table_is_stable_under_input_order(self):
        t = {"b": (2, "b", 2, False), "a": (None, "b", 2, True)}
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "x.tsv.gz")
            h1 = fr.write_table(p, t)
            b1 = open(p, "rb").read()
            h2 = fr.write_table(p, dict(reversed(list(t.items()))))
            b2 = open(p, "rb").read()
        self.assertEqual((h1, b1), (h2, b2))


if __name__ == "__main__":
    unittest.main()
