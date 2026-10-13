import json
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

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

    def test_every_inventory_and_dataset_has_a_licence_on_record(self):
        self.assertEqual(build.licence_gaps(self.links, build.SOURCES), [])
        page = (build.SOURCES / build.LICENCES_NAME).read_text(encoding="utf-8")
        for name in build.INVENTORY_FILES:
            self.assertIn(f"| `{name}.jsonl` | {self.links['source_licences']['inventories'][name]} |", page)
        datasets = build.dataset_ids(build.SOURCES)
        self.assertEqual(len(datasets), 9)
        for name in datasets:
            self.assertIn(f"| `{name}` | {self.links['source_licences']['datasets'][name]} |", page)

    def test_a_missing_or_stray_licence_is_reported(self):
        held = json.loads(json.dumps(self.links))
        del held["source_licences"]["inventories"]["core"]
        del held["source_licences"]["datasets"]["research-atlas-graph"]
        held["source_licences"]["datasets"]["no-such-dataset"] = "CC0"
        self.assertEqual(
            build.licence_gaps(held, build.SOURCES),
            ["inventory core has no licence", "dataset research-atlas-graph has no licence", "licence names unknown dataset no-such-dataset"],
        )
        self.assertEqual(len(build.licence_gaps({}, build.SOURCES)), len(build.INVENTORY_FILES) + 9)

    def test_import_drops_private_rows_and_keeps_abstracts_out_of_tracked_sources(self):
        with tempfile.TemporaryDirectory() as tmp:
            incoming, kept = Path(tmp) / "in", Path(tmp) / "sources"
            incoming.mkdir()
            for name in build.SUMMARY_FILES:
                (incoming / f"{name}.md").write_text("# Title (draft 2)\n\nBody\n", encoding="utf-8")
            for name in build.INVENTORY_FILES:
                build.write_jsonl(incoming / f"{name}.jsonl", [{"id": f"{name}-row"}])
            build.write_jsonl(incoming / "career-work.jsonl", [{"id": "kept"}, {"id": "bucket-profiles-local"}, {"id": "phd-cockpit-advisors-ranked"}])
            build.write_jsonl(incoming / "literature-enriched.jsonl", [{"id": "w1", "openalex": {"title": "T", "abstract": "Held text"}}, {"id": "w2", "openalex": {"title": "U"}}])
            with mock.patch.object(build, "SOURCES", kept):
                report = build.import_inventories(incoming, self.links)
            self.assertEqual(report["career-work"], {"kept": 1, "dropped": ["bucket-profiles-local", "phd-cockpit-advisors-ranked"]})
            self.assertEqual([r["id"] for r in build.read_jsonl(kept / "career-work.jsonl")], ["kept"])
            self.assertEqual([r["openalex"] for r in build.read_jsonl(kept / "literature-enriched.jsonl")], [{"title": "T", "abstract_held": True}, {"title": "U", "abstract_held": False}])
            self.assertEqual(build.read_jsonl(kept / build.ABSTRACTS_NAME), [{"id": "w1", "abstract": "Held text"}])
            self.assertEqual((kept / "core.md").read_text(encoding="utf-8"), "# Title\n\nBody\n")
            self.assertIn(f"sources/{build.ABSTRACTS_NAME}", (build.CORPUS / ".gitignore").read_text(encoding="utf-8").split())

    def test_tracked_files_hold_no_contact_data(self):
        contact = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+|orcid\.org/\d{4}-|linkedin\.com/in/|\b\d{4}-\d{4}-\d{4}-\d{3}[\dX]\b", re.I)
        tracked = [p for folder in (build.CORPUS, build.SOURCES, build.CORPUS / "market") for p in folder.glob("*") if p.is_file()]
        self.assertGreaterEqual(len(tracked), 28)
        for path in tracked:
            if path.name in (build.ABSTRACTS_NAME, build.SQLITE_NAME):
                continue
            self.assertIsNone(contact.search(path.read_text(encoding="utf-8")), path.name)

    def test_one_doi_has_one_key_however_it_is_written(self):
        for written in ["10.3102/0034654314551063", "https://doi.org/10.3102/0034654314551063", "DOI: 10.3102/0034654314551063.", "https://journals.sagepub.com/doi/10.3102/0034654314551063/full?x=1"]:
            self.assertEqual(build.doi_key(written), "10.3102/0034654314551063", written)
        for written in ["arXiv:2303.14334", "https://arxiv.org/abs/2303.14334v2", "10.48550/arXiv.2303.14334"]:
            self.assertEqual(build.doi_key(written), "arxiv:2303.14334", written)
        self.assertIsNone(build.doi_key("https://eric.ed.gov/?id=EJ473811"))

    def test_the_build_writes_nothing_into_the_sibling_corpora(self):
        text = (Path(build.__file__)).read_text(encoding="utf-8")
        for sibling in ("progressions", "alignment"):
            self.assertEqual(len(re.findall(sibling, text)), 1, sibling)
        readme = (build.CORPUS / "README.md").read_text(encoding="utf-8")
        self.assertIn("`progressions/` and `alignment/` are separate corpora", readme)

    def test_readme_is_under_500_words(self):
        text = (build.CORPUS / "README.md").read_text(encoding="utf-8")
        self.assertLess(len(text.split()), 500)


if __name__ == "__main__":
    unittest.main()
