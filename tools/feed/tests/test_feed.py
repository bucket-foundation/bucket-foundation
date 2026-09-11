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

sys.path.insert(0, str(FEED.parent))
from feed import MAX_EVENTS  # noqa: E402


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


def bulk_events(n: int, start: int = 0) -> list[dict]:
    """n distinct events, one per hour starting 2026-01-01T00:00Z + start hours."""
    out = []
    for i in range(n):
        hour = start + i
        ts = f"2026-01-{1 + hour // 24:02d}T{hour % 24:02d}:00:00+00:00"
        out.append(ev(f"bulk-{start + i}", ts))
    return out


class LedgerTests(unittest.TestCase):
    """total_events, the window field, and retract/re-add semantics.

    These pin down bkt-feed-02's counting rule: total_events counts the
    full monthly ledger under feed/, never feed.json's own rolling
    window, and can only grow as events are added.
    """

    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="feedledger-"))

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def _feed(self) -> dict:
        return json.loads((self.root / "feed.json").read_text())

    def test_total_events_counts_ledger_beyond_window(self):
        events = bulk_events(MAX_EVENTS + 50)
        stdin = "\n".join(json.dumps(e) for e in events)
        res = run_feed(self.root, ["update"], stdin=stdin)
        self.assertEqual(res.returncode, 0, res.stderr)
        data = self._feed()
        self.assertEqual(data["total_events"], MAX_EVENTS + 50)
        self.assertEqual(data["window"], {"size": MAX_EVENTS, "returned": MAX_EVENTS})
        self.assertEqual(len(data["events"]), MAX_EVENTS)

    def test_window_matches_events_array_under_the_cap(self):
        events = bulk_events(5)
        stdin = "\n".join(json.dumps(e) for e in events)
        run_feed(self.root, ["update"], stdin=stdin)
        data = self._feed()
        self.assertEqual(data["total_events"], 5)
        self.assertEqual(data["window"], {"size": MAX_EVENTS, "returned": 5})
        self.assertEqual(len(data["events"]), 5)

    def test_total_events_never_drops_as_window_slides(self):
        """Adding events past the window must never move total_events backward.

        This is the exact regression from PR #55: total_events moved
        222 -> 206 after adding events, because it was computed from
        feed.json's own capped list instead of the ledger.
        """
        seen_total = 0
        for batch in range(5):
            events = bulk_events(60, start=batch * 60)
            stdin = "\n".join(json.dumps(e) for e in events)
            run_feed(self.root, ["update"], stdin=stdin)
            data = self._feed()
            self.assertGreaterEqual(data["total_events"], seen_total)
            seen_total = data["total_events"]
        self.assertEqual(seen_total, 300)

    def test_total_events_survives_a_feed_json_only_checkout(self):
        """The ledger under feed/ alone must reconstitute the true total.

        Mirrors the real failure mode: a CI runner checks out a fresh
        clone. If feed.json is missing but the tracked monthly ledger
        is present, the next update must still report the full count.
        """
        events = bulk_events(30)
        stdin = "\n".join(json.dumps(e) for e in events)
        run_feed(self.root, ["update"], stdin=stdin)
        (self.root / "feed.json").unlink()
        (self.root / "feed.xml").unlink()

        res = run_feed(self.root, ["update"], stdin=json.dumps(ev("extra-1", "2026-02-01T00:00:00+00:00")))
        self.assertEqual(res.returncode, 0, res.stderr)
        data = self._feed()
        self.assertEqual(data["total_events"], 31)

    def test_retract_then_readd_are_both_counted_never_removed(self):
        add1 = ev("paper-a", "2026-03-01T00:00:00+00:00", type_="add_paper")
        retract = ev("paper-a-retract", "2026-03-02T00:00:00+00:00", type_="retract")
        readd = ev("paper-a-v2", "2026-03-03T00:00:00+00:00", type_="add_paper")

        run_feed(self.root, ["update"], stdin=json.dumps(add1))
        run_feed(self.root, ["update"], stdin=json.dumps(retract))
        res = run_feed(self.root, ["update"], stdin=json.dumps(readd))
        self.assertEqual(res.returncode, 0, res.stderr)

        data = self._feed()
        self.assertEqual(data["total_events"], 3)
        ids = {e["id"] for e in data["events"]}
        # the retracted original is still on the ledger, never deleted
        self.assertEqual(ids, {"paper-a", "paper-a-retract", "paper-a-v2"})
        types = {e["id"]: e["type"] for e in data["events"]}
        self.assertEqual(types["paper-a-retract"], "retract")

        march = json.loads((self.root / "feed" / "2026-03.json").read_text())
        march_ids = {e["id"] for e in march["events"]}
        self.assertEqual(march_ids, {"paper-a", "paper-a-retract", "paper-a-v2"})

    def test_validate_catches_total_events_drifting_from_ledger(self):
        events = bulk_events(3)
        stdin = "\n".join(json.dumps(e) for e in events)
        run_feed(self.root, ["update"], stdin=stdin)

        data = self._feed()
        data["total_events"] = 5  # corrupt it, simulating the old drift bug
        (self.root / "feed.json").write_text(json.dumps(data))

        res = run_feed(self.root, ["validate"])
        self.assertNotEqual(res.returncode, 0)
        self.assertIn("ledger count", res.stderr)


if __name__ == "__main__":
    unittest.main()
