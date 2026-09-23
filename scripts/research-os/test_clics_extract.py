import csv
import json
import os
import shutil
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import clics_extract as cx  # noqa: E402

LANGUAGES = [
    {"ID": "1", "Glottocode": "nucl1643", "ISO639P3code": "jpn"},
    {"ID": "2", "Glottocode": "nucl1643", "ISO639P3code": "jpn"},
    {"ID": "3", "Glottocode": "port1283", "ISO639P3code": "por"},
    {"ID": "4", "Glottocode": "xxxx1234", "ISO639P3code": "xxx"},
]
CONCEPTS = [
    {"ID": "feel", "Concepticon_ID": "1079", "Concepticon_Gloss": "FEEL"},
    {"ID": "touch", "Concepticon_ID": "1892", "Concepticon_Gloss": "TOUCH"},
    {"ID": "when", "Concepticon_ID": "1238", "Concepticon_Gloss": "WHEN"},
    {"ID": "time", "Concepticon_ID": "892", "Concepticon_Gloss": "TIME"},
    {"ID": "knowsomething", "Concepticon_ID": "1410", "Concepticon_Gloss": "KNOW (SOMETHING)"},
    {"ID": "beable", "Concepticon_ID": "972", "Concepticon_Gloss": "BE ABLE"},
    {"ID": "hear", "Concepticon_ID": "1408", "Concepticon_Gloss": "HEAR"},
    {"ID": "here", "Concepticon_ID": "136", "Concepticon_Gloss": "HERE"},
    {"ID": "water", "Concepticon_ID": "948", "Concepticon_Gloss": "WATER"},
]
FORMS = [
    {"ID": "1", "Language_ID": "1", "Parameter_ID": "feel", "Form": "sawaru", "Value": "sawaru"},
    {"ID": "2", "Language_ID": "1", "Parameter_ID": "touch", "Form": "sawaru", "Value": "sawaru"},
    {"ID": "3", "Language_ID": "3", "Parameter_ID": "knowsomething", "Form": "saˈbeɾ", "Value": "saber"},
    {"ID": "4", "Language_ID": "3", "Parameter_ID": "beable", "Form": "saˈbeɾ", "Value": "saber; poder"},
    {"ID": "5", "Language_ID": "1", "Parameter_ID": "when", "Form": "itsu", "Value": "itsu"},
    {"ID": "6", "Language_ID": "1", "Parameter_ID": "time", "Form": "itsu", "Value": "itsu"},
    {"ID": "7", "Language_ID": "3", "Parameter_ID": "hear", "Form": "oˈvir", "Value": "ouvir"},
    {"ID": "8", "Language_ID": "3", "Parameter_ID": "here", "Form": "oˈvir", "Value": "ouvir"},
    {"ID": "9", "Language_ID": "4", "Parameter_ID": "feel", "Form": "zz", "Value": "zz"},
    {"ID": "10", "Language_ID": "4", "Parameter_ID": "touch", "Form": "zz", "Value": "zz"},
]
COLEX = [
    {"Source_Concept": "FEEL", "Target_Concept": "TOUCH", "Family_Count": "13", "Languages": "nucl1643 xxxx1234"},
    {"Source_Concept": "KNOW (SOMETHING)", "Target_Concept": "BE ABLE", "Family_Count": "8", "Languages": "port1283"},
    {"Source_Concept": "WHEN", "Target_Concept": "TIME", "Family_Count": "20", "Languages": "nucl1643"},
    {"Source_Concept": "HEAR", "Target_Concept": "HERE", "Family_Count": "1", "Languages": "port1283"},
    {"Source_Concept": "WATER", "Target_Concept": "FEEL", "Family_Count": "9", "Languages": "nucl1643"},
]
MAPPING = {"primes": {
    "feel": {"concepts": [{"id": "1079"}]}, "touch": {"concepts": [{"id": "1892"}]},
    "when_time": {"concepts": [{"id": "1238"}, {"id": "892"}]}, "know": {"concepts": [{"id": "1410"}]},
    "can": {"concepts": [{"id": "972"}]}, "hear": {"concepts": [{"id": "1408"}]}, "here": {"concepts": [{"id": "136"}]},
}}

def write(path, rows):
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

def exponent(pid, lang, word, conf=0.9, roman=None, before=None):
    return {"prime_id": pid, "lang": lang, "word": word, "roman": roman, "confidence": conf, "confidence_before": before}

class Clics(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.mkdtemp()
        for name, rows in (("languages.csv", LANGUAGES), ("concepts.csv", CONCEPTS), ("forms.csv", FORMS), ("colexifications.csv", COLEX)):
            write(os.path.join(cls.dir, name), rows)
        mapping = os.path.join(cls.dir, "map.json")
        with open(mapping, "w", encoding="utf-8") as f:
            json.dump(MAPPING, f)
        cls.concept_prime, _m = cx.load_mapping(mapping)
        pairs, cls.forms = cx.read_cldf(cls.dir, cls.concept_prime)
        cls.colex = cx.silver(pairs, cls.forms, os.path.join(cls.dir, "silver.sqlite"))

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.dir)

    def test_languages_map_through_iso_and_others_drop(self):
        self.assertEqual({(c["prime_a"], c["prime_b"], c["lang"]) for c in self.colex}, {("feel", "touch", "ja"), ("can", "know", "pt"), ("hear", "here", "pt")})

    def test_a_pair_within_one_prime_and_unmapped_concepts_are_ignored(self):
        self.assertFalse(any(c["prime_a"] == c["prime_b"] for c in self.colex))
        self.assertFalse(any("water" in (c["prime_a"], c["prime_b"]) for c in self.colex))

    def test_the_shared_form_comes_from_the_forms(self):
        ja = next(c for c in self.colex if c["lang"] == "ja")
        self.assertEqual((ja["form"], ja["keys"]), ("sawaru", ["sawaru"]))
        self.assertIn("saber", next(c for c in self.colex if c["lang"] == "pt" and c["prime_a"] == "can")["keys"])

    def test_the_family_filter_and_the_form_match_decide(self):
        exps = [exponent("feel", "ja", "感じる", roman="kanjiru"), exponent("touch", "ja", "触る", roman="sawaru"),
                exponent("can", "pt", "saber"), exponent("know", "pt", "saber"), exponent("hear", "pt", "ouvir"), exponent("here", "pt", "ouvir")]
        rows, lowered = cx.plan(self.colex, exps, 3)
        by = {(r["prime_a"], r["lang"]): r for r in rows}
        self.assertEqual((by[("feel", "ja")]["counted"], by[("feel", "ja")]["matched"]), (True, False))
        self.assertEqual((by[("can", "pt")]["counted"], by[("can", "pt")]["matched"]), (True, True))
        self.assertEqual((by[("hear", "pt")]["counted"], by[("hear", "pt")]["matched"]), (False, True))
        self.assertEqual(sorted(lowered), [("can", "pt", "saber"), ("know", "pt", "saber")])
        self.assertEqual(lowered[("can", "pt", "saber")]["with"], {"know"})
        _rows, low1 = cx.plan(self.colex, exps, 1)
        self.assertEqual(len(low1), 4)

    def test_threshold_report_counts_pairs_and_exponents_made_uncertain(self):
        exps = [exponent("can", "pt", "saber"), exponent("know", "pt", "saber", conf=0.6), exponent("hear", "pt", "ouvir"), exponent("here", "pt", "ouvir")]
        rep = cx.threshold_report(self.colex, exps, 0.75, (1, 3, 9))
        self.assertEqual(rep[1], {"counted_pairs": 3, "counted_cells": 3, "pairs": 2, "cells": 2, "exponents": 4, "made_uncertain": 3})
        self.assertEqual(rep[3]["exponents"], 2)
        self.assertEqual(rep[3]["made_uncertain"], 1)
        self.assertEqual(rep[9]["counted_pairs"], 1)

    def test_a_rerun_after_lowering_changes_nothing(self):
        exps = [exponent("can", "pt", "saber"), exponent("know", "pt", "saber")]

        def apply(rows):
            _r, low = cx.plan(self.colex, rows, 3)
            out = []
            for e in rows:
                base = cx.base_confidence(e)
                hit = (e["prime_id"], e["lang"], e["word"]) in low
                out.append(dict(e, confidence=min(base, cx.COLEX_CAP) if hit else base, confidence_before=base if hit else None))
            return out

        once = apply(exps)
        twice = apply(once)
        self.assertEqual(once, twice)
        self.assertEqual([(e["confidence"], e["confidence_before"]) for e in once], [(0.7, 0.9), (0.7, 0.9)])

    def test_the_sql_resets_before_it_lowers_and_quotes(self):
        rows, lowered = cx.plan(self.colex, [exponent("can", "pt", "saber"), exponent("know", "pt", "saber")], 3)
        sql = cx.build_sql(rows, lowered, "r1")
        self.assertLess(sql.index("set confidence = confidence_before"), sql.index("least(confidence, 0.7)"))
        self.assertIn("delete from graph.nsm_colex;", sql)
        self.assertIn("array['know']::text[]", sql)
        self.assertEqual(cx.lit("o'ligos"), "'o''ligos'")

    def test_the_seed_maps_55_primes_and_names_the_rest(self):
        concept_prime, m = cx.load_mapping()
        with open(os.path.join(cx.REPO_ROOT, "supabase", "seed", "nsm-primes.json"), encoding="utf-8") as f:
            seed_ids = {p["id"] for p in json.load(f)["primes"]}
        self.assertEqual(len(m["primes"]), 55)
        self.assertEqual(set(m["primes"]) | set(m["unmapped"]), seed_ids)
        self.assertEqual(concept_prime["1238"], concept_prime["892"])

if __name__ == "__main__":
    unittest.main()
