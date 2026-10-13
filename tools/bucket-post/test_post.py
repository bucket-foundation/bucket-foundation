import json, pathlib, sys, tempfile, unittest
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import post


class PostTest(unittest.TestCase):
    def setUp(self):
        self.root = pathlib.Path(tempfile.mkdtemp())
        (self.root / "data").mkdir()
        (self.root / "data" / "whats-new.json").write_text(json.dumps({"version": 1, "entries": [{"id": "old", "date": "2026-01-01"}]}))
        (self.root / "docs" / "foundation").mkdir(parents=True)
        (self.root / "docs" / "foundation" / "HISTORY.md").write_text("# History\n\ntext\n\n---\n\n## Recovery metadata\n\n- x\n")

    def args(self, argv):
        import argparse
        ns = argparse.Namespace(id=None, date="2026-09-30", branch=None, commit="abc", pr=None, status="open", image=None, image_alt=None, plot_title=None, discussion=None, link=None, category="production", body=None)
        for k, v in argv.items():
            setattr(ns, k, v)
        return ns

    def test_whats_new_prepends_and_rejects_duplicates(self):
        a = self.args({"title": "Solver gap engine", "summary": "s", "pr": 430, "link": ["PR=https://x"]})
        eid = post.whats_new(a, self.root)
        doc = json.loads((self.root / "data" / "whats-new.json").read_text())
        self.assertEqual(doc["entries"][0]["id"], eid)
        self.assertEqual(doc["entries"][0]["links"], [{"label": "PR", "href": "https://x"}])
        with self.assertRaises(SystemExit):
            post.whats_new(a, self.root)

    def test_history_adds_section_once_before_recovery_metadata(self):
        post.history(self.args({"title": "One", "summary": "a"}), self.root)
        post.history(self.args({"title": "Two", "summary": "b"}), self.root)
        t = (self.root / "docs" / "foundation" / "HISTORY.md").read_text()
        self.assertEqual(t.count(post.HISTORY_HEAD), 1)
        self.assertLess(t.index("One"), t.index("Two"))
        self.assertLess(t.index("Two"), t.index("## Recovery metadata"))

    def test_report_writes_dated_file(self):
        out = post.report(self.args({"title": "Solver Gap Engine", "summary": "s"}), self.root)
        self.assertEqual(out, "reports/2026-09-30-solver-gap-engine.md")


if __name__ == "__main__":
    unittest.main()
