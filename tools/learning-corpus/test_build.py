import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import build


class CorpusChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.summary = build.run_checks(build.CORPUS)
        cls.works = build.read_jsonl(build.CORPUS / "works.jsonl")
        cls.claims = build.read_jsonl(build.CORPUS / "claims.jsonl")
        cls.links = json.loads(build.LINKS.read_text(encoding="utf-8"))

    def test_built_output_passes_every_check(self):
        self.assertEqual(self.summary["failures"], [])

    def test_every_supports_id_exists_in_works(self):
        known = {w["id"] for w in self.works}
        for claim in self.claims:
            for work_id in claim["supports"] + claim["contradicted_by"]:
                self.assertIn(work_id, known, claim["id"])

    def test_no_work_appears_twice(self):
        ids = [w["id"] for w in self.works]
        self.assertEqual(len(ids), len(set(ids)))
        dois = [build.doi_key(w["doi_or_url"]) for w in self.works]
        dois = [d for d in dois if d]
        self.assertEqual(len(dois), len(set(dois)))

    def test_status_counts_cover_every_claim(self):
        self.assertEqual(sum(self.summary["status_counts"].values()), len(self.claims))

    def test_no_status_upgrade_without_a_work(self):
        by_id = {w["id"]: w for w in self.works}
        for claim in self.claims:
            if claim["status"] == "backed":
                self.assertTrue(any(build.is_confirmed(by_id[w]) for w in claim["supports"]), claim["id"])
            if claim["status"] == "contradicted-by-evidence":
                self.assertTrue(claim["contradicted_by"], claim["id"])

    def test_every_tag_and_founder_topic_is_counted(self):
        tags = {t for w in self.works for t in w["topics"]}
        self.assertEqual(tags, set(self.summary["tag_counts"]))
        self.assertEqual(set(self.summary["founder_topics"]), set(self.links["founder_topics"]))
        for count in self.summary["founder_topics"].values():
            self.assertLessEqual(count["confirmed"], count["works"])

    def test_methods_and_mechanisms_are_complete(self):
        self.assertEqual(self.summary["methods"], 32)
        self.assertEqual(self.summary["mechanisms"], 39)

    def test_private_rows_and_abstracts_stay_out_of_tracked_files(self):
        for name, ids in self.links["excluded_personal"].items():
            held = {r["id"] for r in build.read_jsonl(build.SOURCES / f"{name}.jsonl")}
            self.assertFalse(held & set(ids))
        for row in build.read_jsonl(build.SOURCES / "literature-enriched.jsonl"):
            self.assertNotIn("abstract", row.get("openalex") or {})
        for work in self.works:
            self.assertFalse(isinstance(work["abstract"], str))

    def test_readme_is_under_500_words(self):
        text = (build.CORPUS / "README.md").read_text(encoding="utf-8")
        self.assertLess(len(text.split()), 500)


if __name__ == "__main__":
    unittest.main()
