"""Tests for parse.py event emission."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent
PARSE = REPO / "tools" / "feed" / "parse.py"

sys.path.insert(0, str(HERE))
from helpers import make_tmp_repo, write, commit, remove, move  # noqa: E402


def run_parse(cwd: Path, sha_from: str, sha_to: str) -> list[dict]:
    res = subprocess.run(
        [sys.executable, str(PARSE), "--from", sha_from, "--to", sha_to],
        cwd=cwd, capture_output=True, text=True,
    )
    if res.returncode != 0:
        raise AssertionError(res.stderr)
    events = []
    for line in res.stdout.splitlines():
        if line.strip():
            events.append(json.loads(line))
    return events


BIB_SAMPLE = """@article{foo2020bar,
  title = {A Paper About Foo},
  author = {Doe, J.},
  year = {2020},
  journal = {Science},
  doi = {10.1234/foo.bar},
}

@article{baz2021qux,
  title = {Another Paper},
  author = {Roe, K.},
  year = {2021},
  doi = {10.5678/baz.qux},
}
"""

BIB_ADDED = BIB_SAMPLE + """
@article{new2022z,
  title = {The Third Paper},
  author = {Who, W.},
  year = {2022},
  doi = {10.9999/new.z},
}
"""


class ParseTests(unittest.TestCase):
    def setUp(self):
        self.repo = make_tmp_repo()
        write(self.repo, "README.md", "# seed\n")
        self.sha0 = commit(self.repo, "seed")

    def tearDown(self):
        shutil.rmtree(self.repo, ignore_errors=True)

    def test_add_paper_and_add_branch(self):
        write(self.repo, "bucket-canon/05-biophysics/melanin/primary-papers.bib", BIB_SAMPLE)
        sha1 = commit(self.repo, "add melanin")
        events = run_parse(self.repo, self.sha0, sha1)
        types = [e["type"] for e in events]
        self.assertIn("add_branch", types)
        self.assertEqual(types.count("add_paper"), 2)
        papers = [e for e in events if e["type"] == "add_paper"]
        titles = {p["title"] for p in papers}
        self.assertIn("A Paper About Foo", titles)
        for p in papers:
            self.assertEqual(p["branch"], "05-biophysics")
            self.assertEqual(p["topic"], "melanin")
        # DOI captured
        dois = {p["doi"] for p in papers}
        self.assertIn("10.1234/foo.bar", dois)

    def test_add_paper_on_bib_modification(self):
        write(self.repo, "bucket-canon/05-biophysics/melanin/primary-papers.bib", BIB_SAMPLE)
        sha1 = commit(self.repo, "add melanin")
        write(self.repo, "bucket-canon/05-biophysics/melanin/primary-papers.bib", BIB_ADDED)
        sha2 = commit(self.repo, "extend melanin")
        events = run_parse(self.repo, sha1, sha2)
        self.assertEqual([e["type"] for e in events], ["add_paper"])
        self.assertEqual(events[0]["title"], "The Third Paper")

    def test_add_figure(self):
        fig0 = {"schema_version": "0.1", "figures": [{"id": "euclid", "name": "Euclid", "branches": ["01-mathematics"]}]}
        write(self.repo, "canon-figures/figures.json", json.dumps(fig0))
        sha1 = commit(self.repo, "seed figures")
        fig1 = {
            "schema_version": "0.1",
            "figures": [
                {"id": "euclid", "name": "Euclid", "branches": ["01-mathematics"]},
                {"id": "archimedes", "name": "Archimedes of Syracuse", "branches": ["01-mathematics"]},
            ],
        }
        write(self.repo, "canon-figures/figures.json", json.dumps(fig1))
        sha2 = commit(self.repo, "add archimedes")
        events = run_parse(self.repo, sha1, sha2)
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["type"], "add_figure")
        self.assertEqual(events[0]["title"], "Archimedes of Syracuse")
        self.assertEqual(events[0]["topic"], "archimedes")

    def test_add_canon_entry_and_update_dossier(self):
        write(self.repo, "bucket-canon/05-biophysics/melanin/primary-papers.md", "# melanin dossier\n")
        write(self.repo, "bucket-canon/05-biophysics/melanin/notes.md", "# notes\n")
        sha1 = commit(self.repo, "dossier + note")
        events = run_parse(self.repo, self.sha0, sha1)
        types = sorted(e["type"] for e in events)
        # new branch + dossier + entry
        self.assertIn("add_canon_entry", types)
        self.assertIn("update_dossier", types)
        self.assertIn("add_branch", types)

    def test_add_landscape(self):
        write(self.repo, "research-landscape/cosmology.md", "# landscape\n")
        sha1 = commit(self.repo, "landscape")
        events = run_parse(self.repo, self.sha0, sha1)
        self.assertEqual([e["type"] for e in events], ["add_landscape"])
        self.assertEqual(events[0]["path"], "research-landscape/cosmology.md")

    def test_promote_rename(self):
        write(self.repo, "research-landscape/melanin.md", "# draft\n" * 20)
        sha1 = commit(self.repo, "landscape draft")
        # rename into canon
        os.makedirs(self.repo / "bucket-canon/05-biophysics/melanin", exist_ok=True)
        move(self.repo, "research-landscape/melanin.md",
             "bucket-canon/05-biophysics/melanin/DOSSIER.md")
        sha2 = commit(self.repo, "promote melanin")
        events = run_parse(self.repo, sha1, sha2)
        types = [e["type"] for e in events]
        self.assertIn("promote", types)

    def test_retract(self):
        write(self.repo, "bucket-canon/05-biophysics/melanin/primary-papers.bib", BIB_SAMPLE)
        sha1 = commit(self.repo, "add")
        remove(self.repo, "bucket-canon/05-biophysics/melanin/primary-papers.bib")
        sha2 = commit(self.repo, "retract")
        events = run_parse(self.repo, sha1, sha2)
        types = [e["type"] for e in events]
        self.assertIn("retract", types)

    def test_event_id_deterministic(self):
        write(self.repo, "bucket-canon/05-biophysics/melanin/primary-papers.bib", BIB_SAMPLE)
        sha1 = commit(self.repo, "add")
        e1 = run_parse(self.repo, self.sha0, sha1)
        e2 = run_parse(self.repo, self.sha0, sha1)
        self.assertEqual([e["id"] for e in e1], [e["id"] for e in e2])


if __name__ == "__main__":
    unittest.main()
