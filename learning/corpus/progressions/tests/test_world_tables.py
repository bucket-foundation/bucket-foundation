import json
import os
import re
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.dirname(HERE)
TABLES = os.path.join(PARENT, "tables")
REPO = os.path.dirname(os.path.dirname(os.path.dirname(PARENT)))
WORLD = ["world_systems", "world_stages", "world_exams", "world_nqf", "world_occupations", "world_professions", "world_elements", "world_languages", "world_tvet_bodies", "world_indicators"]
TECH = ["tech_occupation", "tech_training_response", "tech_lags"]
NEW = WORLD + TECH + ["countries", "source_licences", "attributions"]
NEEDS_CREDIT = re.compile(r"CC BY|Open Government|Open Licence|Licence Ouverte|Standard Terms of Use|EU reuse", re.I)
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")
OPEN_LICENCE = re.compile(r"CC BY|CC0|Open Government|Open Licence|Licence Ouverte|Standard Terms of Use|public domain", re.I)
NAME_KEYS = {"name_national", "name_english", "qualification_national", "qualification_english", "title", "title_english", "main_programmes", "main_programmes_national", "qualifications", "qualification_types", "languages_of_instruction", "framework"}
LICENCES = {"CC-BY-4.0", "CC-BY-SA-4.0", "CC-BY-NC-SA-4.0", "CC-BY-NC-4.0", "CC-BY-NC-ND-4.0", "CC-BY-3.0", "CC0-1.0", "MIT", "OGL-UK-3.0", "US federal work, public domain", "restricted", "unknown"}
MATCH_KEYS = {"licence", "source_licence", "system", "slice", "host", "framework_id", "scheme", "table"}


def rows(name):
    with open(os.path.join(TABLES, name + ".jsonl"), encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                yield json.loads(line)


def strings(value, key=None):
    if isinstance(value, dict):
        for k, v in value.items():
            yield from strings(v, k)
    elif isinstance(value, list):
        for v in value:
            yield from strings(v, key)
    elif isinstance(value, str):
        yield key, value


class WorldTables(unittest.TestCase):
    def test_ids_unique_across_new_tables(self):
        seen = set()
        for name in NEW:
            for r in rows(name):
                self.assertNotIn(r["id"], seen, r["id"])
                seen.add(r["id"])

    def test_regions_are_country_codes_in_the_country_table(self):
        codes = {r["iso2"] for r in rows("countries")}
        self.assertGreater(len(codes), 200)
        for name in WORLD:
            for r in rows(name):
                self.assertIn(r["region"], codes, r["id"])
                self.assertEqual(r["region_method"], "stated")
                self.assertTrue(r["licence"], r["id"])

    def test_countries_carry_what_the_place_rule_needs(self):
        for r in rows("countries"):
            self.assertIsNotNone(re.fullmatch(r"[A-Z]{2}", r["iso2"]), r["id"])
            self.assertTrue(-90 <= r["lat"] <= 90 and -180 <= r["lng"] <= 180, r["id"])
            self.assertTrue(r["name"] and r["licence"] == "public domain" and r["terms_url"], r["id"])
        indicators = os.path.join(REPO, "src", "data", "world-indicators.json")
        if os.path.exists(indicators):
            with open(indicators, encoding="utf-8") as fh:
                wanted = {c.get("iso3") for c in json.load(fh).get("countries", [])} - {None}
            have = {r["iso3"] for r in rows("countries")}
            self.assertGreaterEqual(len(wanted & have) / max(len(wanted), 1), 0.9)

    def test_professions_are_recall_and_unverified(self):
        n = 0
        for r in rows("world_professions"):
            n += 1
            self.assertFalse(r["verified"], r["id"])
            self.assertIn("recall", r["basis"])
        self.assertEqual(n, 264)

    def test_verified_rows_carry_a_url(self):
        for name in WORLD + ["tech_occupation", "tech_training_response", "countries"]:
            for r in rows(name):
                if r["verified"]:
                    self.assertTrue(str(r.get("source_url") or "").startswith("http"), r["id"])

    def test_no_restricted_host_email_or_long_text(self):
        for name in NEW:
            for r in rows(name):
                for key, value in strings(r):
                    self.assertIsNone(re.search(r"ipums", value, re.I), r["id"])
                    self.assertIsNone(EMAIL.search(value), r["id"])
                    if not str(key).endswith("url"):
                        self.assertLessEqual(len(value), 600 if key == "credit_line" else 300, (r["id"], key))
                    if key in NAME_KEYS and name != "world_tvet_bodies":
                        self.assertLessEqual(len(value.split()), 8, (r["id"], key))
                    self.assertIsNone(re.search(r"\bHRAF\b|Outline of Cultural Materials|Prop(?:a|ae)dia", value), r["id"])

    def test_titles_withheld_where_licence_is_unknown(self):
        kept = 0
        for r in rows("world_occupations"):
            if OPEN_LICENCE.search(r["licence"]):
                kept += r["title"] is not None
            else:
                self.assertIsNone(r["title"], r["id"])
                self.assertIsNone(r["title_english"], r["id"])
        self.assertTrue(kept)

    def test_lag_rows_carry_n_and_measure(self):
        cases = summaries = 0
        for r in rows("tech_lags"):
            self.assertTrue(isinstance(r["n"], int) and r["n"] >= 1 and r["measure"], r["id"])
            self.assertIsNone(re.search(r"census", r["measure"], re.I), r["id"])
            if r["row_type"] == "summary":
                summaries += 1
                self.assertFalse(r["verified"])
            else:
                cases += 1
                self.assertEqual(r["n"], 1)
                self.assertTrue(isinstance(r["from_year"], int) and isinstance(r["to_year"], int), r["id"])
        self.assertTrue(cases and summaries)

    def test_source_licences_match_the_registry_shape(self):
        n = 0
        for r in rows("source_licences"):
            n += 1
            self.assertIn(r["licence"], LICENCES, r["id"])
            self.assertIn(r["public"], ("rows", "codes", "none"), r["id"])
            self.assertTrue(set(r["match"]) <= MATCH_KEYS, r["id"])
            if not r["match"]:
                self.assertEqual(r["public"], "none", r["id"])
            for values in r["match"].values():
                self.assertTrue(values and all(isinstance(v, str) and v == v.strip() for v in values), r["id"])
            self.assertEqual(r["publishable"], r["public"] == "rows", r["id"])
            if not r["fetched"]:
                self.assertTrue(r["public"] == "none" or r["licence"] in ("US federal work, public domain", "CC0-1.0", "CC-BY-SA-4.0"), r["id"])
                self.assertIsNone(r["date_read"], r["id"])
            else:
                self.assertTrue(str(r["terms_url"]).startswith("http") and r["date_read"], r["id"])
            if "NC" in r["licence"] or r["licence"] in ("restricted", "unknown"):
                self.assertNotEqual(r["public"], "rows", r["id"])
        self.assertTrue(n)

    def test_every_licence_that_asks_for_credit_has_a_line(self):
        credits = list(rows("attributions"))
        for c in credits:
            self.assertTrue(c["credit_line"] and c["source"] and c["dataset"] and c["licence"], c["id"])
            self.assertTrue(str(c["licence_url"]).startswith("https://"), c["id"])
            self.assertIn(c["licence_url"].split("//")[1].split("/")[0], c["credit_line"] + c["licence_url"], c["id"])
        seen = set()
        for name in WORLD:
            for r in rows(name):
                key = (name, r["licence"], r.get("scheme") if name == "world_occupations" else None)
                if key in seen or not NEEDS_CREDIT.search(r["licence"]):
                    continue
                seen.add(key)
                hit = [c for c in credits if name in c["match"].get("table", []) and r["licence"] in c["match"].get("licence", []) and (key[2] is None or key[2] in c["match"].get("scheme", []))]
                self.assertTrue(hit, key)
        self.assertGreaterEqual(len(seen), 8)
        ids = {c["id"] for c in credits}
        for wanted in ("credit-onet-31", "credit-ccss", "credit-wikimedia", "credit-openstax", "credit-england-nc", "credit-australia-v9", "credit-statcan-noc-2021", "credit-world-bank-wdi"):
            self.assertIn(wanted, ids)
        statcan = next(c for c in credits if c["id"] == "credit-statcan-noc-2021")
        self.assertIn("Adapted from Statistics Canada", statcan["credit_line"])
        self.assertIn("does not constitute an endorsement", statcan["credit_line"])
        ons = next(c for c in credits if c["id"] == "credit-ons-soc-2020")
        self.assertIn("Contains public sector information licensed under the Open Government Licence v3.0", ons["credit_line"])

    def test_every_cleared_source_has_a_credit_line(self):
        credited = {i for c in rows("attributions") for i in c["source_ids"]}
        cleared = [r["id"] for r in rows("source_licences") if r["public"] == "rows"]
        self.assertTrue(cleared)
        self.assertEqual([i for i in cleared if i not in credited], [])
        read = {c["id"] for c in rows("attributions") if c["terms_read"]}
        self.assertEqual(read, {"credit-" + k for k in ("ons-soc-2020", "gov-uk", "england-nc", "statcan-noc-2021", "wordbank", "tech-interview-handbook-site", "cdc", "japan-jsco-2009", "world-bank-wdi")})
        lines = {c["id"]: c["credit_line"] for c in rows("attributions")}
        self.assertIn("CDC has not endorsed this product", lines["credit-cdc"])
        self.assertIn("MIT License", lines["credit-tech-interview-handbook-site"])
        self.assertTrue(lines["credit-world-bank-wdi"].endswith("Data source: UNESCO Institute for Statistics"))
        self.assertIn("Government Standard Terms of Use 2.0", lines["credit-japan-jsco-2009"])

    def test_cleared_sources_say_how_and_share_alike_stays_codes(self):
        for r in rows("source_licences"):
            self.assertIn(r["clearance"], ("terms read", "rule, terms unread", "none"), r["id"])
            if r["public"] == "rows" and not r["fetched"]:
                self.assertEqual(r["clearance"], "rule, terms unread", r["id"])
                self.assertIn("Third-party", r["exception"], r["id"])
            if r["licence"] == "CC-BY-SA-4.0":
                self.assertNotEqual(r["public"], "rows", r["id"])

    def test_stats_match_tables(self):
        with open(os.path.join(TABLES, "world_stats.json"), encoding="utf-8") as fh:
            stats = json.load(fh)["tables"]
        for name in NEW:
            self.assertEqual(stats[name]["rows"], sum(1 for _ in rows(name)), name)


if __name__ == "__main__":
    unittest.main()
