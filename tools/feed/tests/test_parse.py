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
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["type"], "promote")

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


YAML_ONE_RECORD = """records:
- id: bkt-aaa111
  title: A paper.
  doi: 10.1/aaa
  canon_score: 70
"""

YAML_TWO_RECORDS = YAML_ONE_RECORD + """- id: bkt-bbb222
  title: Second paper.
  doi: 10.1/bbb
  canon_score: 80
"""

FEED = REPO / "tools" / "feed" / "feed.py"


def run_feed_update(cwd: Path, events: list[dict]) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    env["BUCKET_FEED_ROOT"] = str(cwd)
    stdin = "\n".join(json.dumps(e) for e in events)
    return subprocess.run(
        [sys.executable, str(FEED), "update"],
        cwd=cwd, input=stdin, capture_output=True, text=True, env=env,
    )


class YamlPromotionTests(unittest.TestCase):
    """A promotion out of _intake/ lands as a new or extended
    primary-papers.yaml, never a rename, the real shape PRs #9, #45, and
    #129 shipped with no feed event. These cover the fix: a brand-new
    dossier file and an appended record each resolve to exactly one
    add_paper event, keyed by the record's own id (card_event_id), so a
    second run over the same range adds nothing to the ledger.
    """

    def setUp(self):
        self.repo = make_tmp_repo()
        write(self.repo, "README.md", "# seed\n")
        self.sha0 = commit(self.repo, "seed")

    def tearDown(self):
        shutil.rmtree(self.repo, ignore_errors=True)

    def test_new_file_promotion_yields_one_event(self):
        # seed the branch first so add_branch doesn't also fire in the
        # range under test, isolating the yaml-promotion behavior.
        write(self.repo, "bucket-canon/07-mind/existing-topic/README.md", "# existing\n")
        sha1 = commit(self.repo, "seed 07-mind branch")
        write(
            self.repo, "bucket-canon/07-mind/new-topic/primary-papers.yaml",
            YAML_ONE_RECORD,
        )
        sha2 = commit(self.repo, "promote bkt-aaa111 into new-topic")

        events = run_parse(self.repo, sha1, sha2)
        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertEqual(ev["type"], "add_paper")
        self.assertEqual(ev["branch"], "07-mind")
        self.assertEqual(ev["topic"], "new-topic")
        self.assertEqual(ev["title"], "A paper.")
        self.assertEqual(ev["doi"], "10.1/aaa")

    def test_extended_yaml_promotion_yields_one_event(self):
        write(
            self.repo, "bucket-canon/07-mind/existing-topic/primary-papers.yaml",
            YAML_ONE_RECORD,
        )
        sha1 = commit(self.repo, "seed one record")
        write(
            self.repo, "bucket-canon/07-mind/existing-topic/primary-papers.yaml",
            YAML_TWO_RECORDS,
        )
        sha2 = commit(self.repo, "promote bkt-bbb222 into existing-topic")

        events = run_parse(self.repo, sha1, sha2)
        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertEqual(ev["type"], "add_paper")
        self.assertEqual(ev["title"], "Second paper.")
        self.assertEqual(ev["doi"], "10.1/bbb")

    def test_yaml_promotion_id_matches_feed_card_event_id(self):
        """The id parse.py derives for a new-file promotion must equal
        the id feed.py's check-cards/emit-for-cards would derive for the
        same card, or the two paths would double-emit the same event."""
        sys.path.insert(0, str(FEED.parent))
        from feed import card_event_id as feed_card_event_id  # noqa: E402

        write(self.repo, "bucket-canon/07-mind/existing-topic/README.md", "# existing\n")
        sha1 = commit(self.repo, "seed 07-mind branch")
        path = "bucket-canon/07-mind/new-topic/primary-papers.yaml"
        write(self.repo, path, YAML_ONE_RECORD)
        sha2 = commit(self.repo, "promote bkt-aaa111 into new-topic")

        events = run_parse(self.repo, sha1, sha2)
        self.assertEqual(len(events), 1)
        expected = feed_card_event_id("add_paper", path, "bkt-aaa111")
        self.assertEqual(events[0]["id"], expected)

    def test_rerunning_yields_no_new_ledger_events(self):
        write(self.repo, "bucket-canon/07-mind/existing-topic/README.md", "# existing\n")
        sha1 = commit(self.repo, "seed 07-mind branch")
        write(
            self.repo, "bucket-canon/07-mind/new-topic/primary-papers.yaml",
            YAML_ONE_RECORD,
        )
        sha2 = commit(self.repo, "promote bkt-aaa111 into new-topic")

        events = run_parse(self.repo, sha1, sha2)
        first = run_feed_update(self.repo, events)
        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertIn("+1 events", first.stderr)

        # same commit range parsed and fed again: the ledger already has
        # this card's event id, so nothing new is added.
        second = run_feed_update(self.repo, run_parse(self.repo, sha1, sha2))
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertIn("+0 events", second.stderr)

        feed = json.loads((self.repo / "feed.json").read_text())
        self.assertEqual(feed["total_events"], 1)


if __name__ == "__main__":
    unittest.main()
