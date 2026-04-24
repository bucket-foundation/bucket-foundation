"""Tests for feed.py merge, idempotency, archives, atom."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from xml.etree import ElementTree as ET

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent
FEED = REPO / "tools" / "feed" / "feed.py"


def run_feed(cwd: Path, args: list[str], stdin: str = "") -> subprocess.CompletedProcess:
    env = os.environ.copy()
    env["BUCKET_FEED_ROOT"] = str(cwd)
    return subprocess.run(
        [sys.executable, str(FEED), *args],
        cwd=cwd, input=stdin, capture_output=True, text=True, env=env,
    )


def ev(eid: str, ts: str, type_: str = "add_paper", **extra) -> dict:
    base = {
        "id": eid, "type": type_, "branch": "05-biophysics", "topic": "melanin",
        "title": f"paper {eid}", "path": "bucket-canon/05-biophysics/melanin/primary-papers.bib",
        "doi": None, "author_github": "tester", "author_name": "Tester",
        "commit_sha": "abc1234", "pr_number": None, "timestamp": ts,
    }
    base.update(extra)
    return base


class FeedTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="feedt-"))

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_update_creates_feed(self):
        events = [
            ev("a", "2026-04-23T10:00:00+00:00"),
            ev("b", "2026-04-23T11:00:00+00:00"),
        ]
        stdin = "\n".join(json.dumps(e) for e in events)
        res = run_feed(self.root, ["update"], stdin=stdin)
        self.assertEqual(res.returncode, 0, res.stderr)
        data = json.loads((self.root / "feed.json").read_text())
        self.assertEqual(data["total_events"], 2)
        # newest first
        self.assertEqual(data["events"][0]["id"], "b")

    def test_idempotent(self):
        events = [ev("a", "2026-04-23T10:00:00+00:00")]
        stdin = json.dumps(events[0])
        run_feed(self.root, ["update"], stdin=stdin)
        run_feed(self.root, ["update"], stdin=stdin)
        data = json.loads((self.root / "feed.json").read_text())
        self.assertEqual(data["total_events"], 1)

    def test_monthly_archive(self):
        events = [
            ev("a", "2026-04-23T10:00:00+00:00"),
            ev("b", "2026-03-10T10:00:00+00:00"),
        ]
        stdin = "\n".join(json.dumps(e) for e in events)
        run_feed(self.root, ["update"], stdin=stdin)
        april = json.loads((self.root / "feed" / "2026-04.json").read_text())
        march = json.loads((self.root / "feed" / "2026-03.json").read_text())
        self.assertEqual([e["id"] for e in april["events"]], ["a"])
        self.assertEqual([e["id"] for e in march["events"]], ["b"])

    def test_atom_xml_valid(self):
        events = [ev("a", "2026-04-23T10:00:00+00:00")]
        run_feed(self.root, ["update"], stdin=json.dumps(events[0]))
        xml_text = (self.root / "feed.xml").read_text()
        tree = ET.fromstring(xml_text)
        ns = "{http://www.w3.org/2005/Atom}"
        self.assertEqual(tree.tag, f"{ns}feed")
        entries = tree.findall(f"{ns}entry")
        self.assertEqual(len(entries), 1)

    def test_validate(self):
        events = [ev("a", "2026-04-23T10:00:00+00:00")]
        run_feed(self.root, ["update"], stdin=json.dumps(events[0]))
        res = run_feed(self.root, ["validate"])
        self.assertEqual(res.returncode, 0, res.stderr)

    def test_ordering_newest_first(self):
        events = [
            ev("old", "2020-01-01T00:00:00+00:00"),
            ev("new", "2026-04-23T10:00:00+00:00"),
            ev("mid", "2023-06-15T12:00:00+00:00"),
        ]
        stdin = "\n".join(json.dumps(e) for e in events)
        run_feed(self.root, ["update"], stdin=stdin)
        data = json.loads((self.root / "feed.json").read_text())
        self.assertEqual([e["id"] for e in data["events"]], ["new", "mid", "old"])


if __name__ == "__main__":
    unittest.main()
