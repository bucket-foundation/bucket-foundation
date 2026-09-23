from __future__ import annotations

import json
import os
import subprocess
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent
FEED = REPO / "tools" / "feed" / "feed.py"

sys.path.insert(0, str(HERE))
sys.path.insert(0, str(FEED.parent))
from helpers import make_tmp_repo, write, commit  # noqa: E402
from feed import load_full_ledger, feed_paths  # noqa: E402

MELANIN_INDEX_CANDIDATE = """# melanin: Canon Index

| Title | DOI | canon_score | tier |
|---|---|---|---|
| A paper. | `10.1/aaa` | 70 | CANDIDATE |
"""

MELANIN_INDEX_PROMOTED = """# melanin: Canon Index

| Title | DOI | canon_score | tier |
|---|---|---|---|
| A paper. | `10.1/aaa` | 70 | CANON |
| Second paper. | `10.1/bbb` | 80 | CANON |
"""

MELANIN_YAML_ONE = """records:
- id: bkt-aaa111
  title: A paper.
  doi: 10.1/aaa
  canon_score: 70
"""

MELANIN_YAML_TWO = """records:
- id: bkt-aaa111
  title: A paper.
  doi: 10.1/aaa
  canon_score: 70
- id: bkt-bbb222
  title: Second paper.
  doi: 10.1/bbb
  canon_score: 80
"""

DOSSIER = "bucket-canon/05-biophysics/melanin"

def run_feed(cwd: Path, args: list[str]) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    env["BUCKET_FEED_ROOT"] = str(cwd)
    return subprocess.run(
        [sys.executable, str(FEED), *args],
        cwd=cwd, capture_output=True, text=True, env=env,
    )

def seed_and_promote(repo: Path) -> tuple[str, str]:
    write(repo, f"{DOSSIER}/CANON_INDEX.md", MELANIN_INDEX_CANDIDATE)
    write(repo, f"{DOSSIER}/primary-papers.yaml", MELANIN_YAML_ONE)
    base_sha = commit(repo, "seed melanin dossier")

    write(repo, f"{DOSSIER}/CANON_INDEX.md", MELANIN_INDEX_PROMOTED)
    write(repo, f"{DOSSIER}/primary-papers.yaml", MELANIN_YAML_TWO)
    commit(repo, "promote second paper, tier-bump first")
    return base_sha, "HEAD"

class CheckCardsTests(unittest.TestCase):
    def setUp(self):
        self.repo = make_tmp_repo()

    def tearDown(self):
        import shutil
        shutil.rmtree(self.repo, ignore_errors=True)

    def test_missing_cards_fail_check(self):
        base_sha, _head = seed_and_promote(self.repo)
        res = run_feed(self.repo, ["check-cards", "--base", base_sha])
        self.assertEqual(res.returncode, 1, res.stderr)
        self.assertIn("bkt-bbb222", res.stderr)
        self.assertIn("bkt-aaa111", res.stderr)
        self.assertIn("no feed event", res.stderr)
        self.assertIn(f"emit-for-cards --base {base_sha}", res.stderr)

    def test_emit_for_cards_then_check_passes(self):
        base_sha, _head = seed_and_promote(self.repo)

        emit = run_feed(self.repo, ["emit-for-cards", "--base", base_sha])
        self.assertEqual(emit.returncode, 0, emit.stderr)
        self.assertIn("+2 events", emit.stderr)

        check = run_feed(self.repo, ["check-cards", "--base", base_sha])
        self.assertEqual(check.returncode, 0, check.stderr)
        self.assertIn("all have feed events", check.stderr)

        paths = feed_paths(self.repo)
        ledger = load_full_ledger(paths["archive_dir"])
        self.assertEqual(len(ledger), 2)
        types = sorted(e["type"] for e in ledger)
        self.assertEqual(types, ["add_paper", "promote"])

    def test_emit_for_cards_is_idempotent(self):
        base_sha, _head = seed_and_promote(self.repo)
        run_feed(self.repo, ["emit-for-cards", "--base", base_sha])
        second = run_feed(self.repo, ["emit-for-cards", "--base", base_sha])
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertIn("nothing to do", second.stderr)

        paths = feed_paths(self.repo)
        ledger = load_full_ledger(paths["archive_dir"])
        self.assertEqual(len(ledger), 2)

    def test_canon_tier_change_detected(self):
        base_sha, _head = seed_and_promote(self.repo)
        res = run_feed(self.repo, ["check-cards", "--base", base_sha])
        self.assertIn("canon_tier CANDIDATE -> CANON", res.stderr)
        self.assertIn("promote", res.stderr)

    def test_no_cards_between_identical_refs(self):
        write(self.repo, f"{DOSSIER}/CANON_INDEX.md", MELANIN_INDEX_CANDIDATE)
        write(self.repo, f"{DOSSIER}/primary-papers.yaml", MELANIN_YAML_ONE)
        sha = commit(self.repo, "seed only")
        res = run_feed(self.repo, ["check-cards", "--base", sha, "--head", sha])
        self.assertEqual(res.returncode, 0, res.stderr)
        self.assertIn("no canon cards", res.stderr)

    def test_bad_base_ref_errors_cleanly(self):
        write(self.repo, f"{DOSSIER}/CANON_INDEX.md", MELANIN_INDEX_CANDIDATE)
        write(self.repo, f"{DOSSIER}/primary-papers.yaml", MELANIN_YAML_ONE)
        commit(self.repo, "seed only")
        res = run_feed(self.repo, ["check-cards", "--base", "not-a-real-ref"])
        self.assertEqual(res.returncode, 2)
        self.assertIn("does not resolve", res.stderr)

if __name__ == "__main__":
    unittest.main()
