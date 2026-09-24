import json
import os
import re
import sys
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "hypothesis-engine"))

from hte.timeline import Interval, Resolution, Uncertainty, UncertaintyKind  # noqa: E402

GOLDEN = os.path.join(ROOT, "scripts", "fixtures", "history-span-golden.json")
EDTF_SUBSET = (
    r"^(Y-?[1-9][0-9]{4,8}|-?[0-9]{4}(-[0-9]{2}){0,2}|-?[0-9]{2}([0-9]X|XX))[?~%]?"
    r"(/(Y-?[1-9][0-9]{4,8}|-?[0-9]{4}(-[0-9]{2}){0,2}|-?[0-9]{2}([0-9]X|XX))[?~%]?)?$"
)
PRECISION_TO_RESOLUTION = {
    "day": Resolution.YEAR,
    "month": Resolution.YEAR,
    "year": Resolution.YEAR,
    "decade": Resolution.DECADE,
    "century": Resolution.CENTURY,
    "millennium": Resolution.MILLENNIUM,
    "ka": Resolution.MILLENNIUM,
    "10ka": Resolution.ERA,
    "100ka": Resolution.ERA,
}
CALENDARS = {"gregorian", "julian", "julian-os", "hebrew", "islamic", "chinese", "other"}
QUALIFIERS = {"none", "approximate", "uncertain", "both"}
INT4_MAX = 2**31 - 1

def load():
    if not os.path.exists(GOLDEN):
        raise AssertionError(f"golden file missing: {GOLDEN}")
    with open(GOLDEN, encoding="utf-8") as f:
        return json.load(f)

def spans(case):
    expect = case["expect"]
    if "span" in expect:
        return [expect["span"]]
    return list(expect.get("roles", {}).values())

def uncertainty_from_bounds(s):
    if s["start_min"] == s["start_max"] and s["end_min"] == s["end_max"]:
        return Uncertainty.point()
    u = Uncertainty.uniform(s["start_min"], s["end_max"])
    params = dict(u.params)
    params["endpoints"] = {"start": [s["start_min"], s["start_max"]], "end": [s["end_min"], s["end_max"]]}
    return Uncertainty(UncertaintyKind.UNIFORM, params)

class HistorySpanGolden(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.golden = load()
        cls.accepted = [(c["id"], s) for c in cls.golden["cases"] for s in spans(c)]

    def test_pattern_matches_the_ts_parser(self):
        self.assertEqual(self.golden["edtf_pattern"], EDTF_SUBSET)

    def test_case_count(self):
        self.assertGreaterEqual(len(self.golden["cases"]), 70)
        self.assertGreater(len(self.accepted), 100)

    def test_wikidata_cases_reach_every_precision(self):
        wikidata = [s for c in self.golden["cases"] if c["category"] == "wikidata" for s in spans(c)]
        self.assertEqual({s["precision"] for s in wikidata}, set(PRECISION_TO_RESOLUTION))
        self.assertEqual({s["calendar"] for s in wikidata}, {"gregorian", "julian"})
        for s in wikidata:
            with self.subTest(edtf=s["edtf"]):
                self.assertLessEqual(s["end_max"] - s["start_min"] + 1, {"day": 1, "month": 1, "year": 2, "decade": 10, "century": 100, "millennium": 1000, "ka": 1000, "10ka": 10000, "100ka": 100000}[s["precision"]])

    def test_bounds_satisfy_the_factoid_checks(self):
        pattern = re.compile(EDTF_SUBSET)
        for case_id, s in self.accepted:
            with self.subTest(case=case_id):
                self.assertRegex(s["edtf"], pattern)
                for key in ("start_year", "end_year", "start_min", "start_max", "end_min", "end_max"):
                    self.assertIsInstance(s[key], int)
                    self.assertLessEqual(abs(s[key]), INT4_MAX)
                self.assertLessEqual(s["start_min"], s["start_year"])
                self.assertLessEqual(s["start_year"], s["start_max"])
                self.assertLessEqual(s["end_min"], s["end_year"])
                self.assertLessEqual(s["end_year"], s["end_max"])
                self.assertLessEqual(s["start_year"], s["end_year"])
                self.assertLessEqual(s["start_min"], s["end_min"])
                self.assertLessEqual(s["start_max"], s["end_max"])
                self.assertIn(s["precision"], PRECISION_TO_RESOLUTION)
                self.assertIn(s["calendar"], CALENDARS)
                self.assertIn(s["qualifier"], QUALIFIERS)

    def test_bounds_map_to_an_hte_interval(self):
        for case_id, s in self.accepted:
            with self.subTest(case=case_id):
                expected = uncertainty_from_bounds(s)
                self.assertEqual(s["uncertainty"], expected.to_dict())
                interval = Interval(s["start_year"], s["end_year"], Uncertainty.from_dict(s["uncertainty"]))
                self.assertEqual(Interval.from_dict(interval.to_dict()), interval)
                if interval.uncertainty.kind is UncertaintyKind.UNIFORM:
                    self.assertEqual(interval.uncertainty.params["min"], s["start_min"])
                    self.assertEqual(interval.uncertainty.params["max"], s["end_max"])

    def test_plan_bounds(self):
        by_id = {c["id"]: c for c in self.golden["cases"]}
        euclid = by_id["figure:euclid"]["expect"]["roles"]
        self.assertEqual((euclid["born"]["start_min"], euclid["born"]["end_max"]), (-334, -314))
        self.assertEqual((euclid["died"]["start_min"], euclid["died"]["end_max"]), (-274, -254))
        newton = by_id["figure:newton"]["expect"]["roles"]
        self.assertEqual((newton["born"]["start_min"], newton["born"]["start_max"]), (1642, 1643))
        self.assertEqual((newton["died"]["end_min"], newton["died"]["end_max"]), (1727, 1728))
        self.assertEqual(by_id["integer-year:-570:historical"]["expect"]["span"]["start_year"], -569)
        self.assertEqual(by_id["julian:-5399-01-01:julian"]["expect"]["span"]["start_year"], -5400)
        self.assertEqual(by_id["figure:watson-crick"]["expect"], {"refusal": "composite"})

if __name__ == "__main__":
    unittest.main()
