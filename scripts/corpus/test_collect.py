import json
import pathlib
import tempfile
import unittest
from protego import Protego
from unittest.mock import patch

from collect import Collector, canonical, digest, extract


CONFIG = {"collections": [{"name": "test", "hosts": ["example.org"], "seeds": []}]}


class CorpusTests(unittest.TestCase):
    def collector(self, root):
        c = Collector(root, CONFIG)
        self.addCleanup(c.db.close)
        return c

    def test_url_identity(self):
        self.assertEqual(canonical("https://EXAMPLE.org/a?x=1&utm_source=s#b"), "https://example.org/a?x=1")
        self.assertNotEqual(canonical("https://example.org/a?x=1"), canonical("https://example.org/a?x=2"))
        self.assertNotEqual(digest("https://example.org/a"), digest("https://example.org/a/"))

    def test_reject_credentials_and_non_http(self):
        for url in ("file:///etc/passwd", "https://user:pass@example.org/", "http://example.org:8080/"):
            with self.assertRaises(ValueError):
                canonical(url)

    def test_verbatim_transcript(self):
        raw = '<html><main><h1>Title</h1><p>Introduction</p><div class="wrap-podcast-transcript"><h2>Transcript</h2><p>Alice: α &amp; β.</p><p>Bob: Agreed.</p></div><script>invented()</script></main></html>'.encode()
        result = extract(raw, "https://example.org/", "text/html")
        self.assertEqual(result["transcript"], "Transcript\nAlice: α & β.\nBob: Agreed.")
        self.assertNotIn("invented", result["text"])
        self.assertNotIn("Introduction", result["transcript"])

    def test_pdf_failure_is_visible(self):
        with self.assertRaises(ValueError):
            extract(b"%PDF broken", "https://example.org/a.pdf", "application/pdf")

    def test_robots_fail_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            c = self.collector(temp)
            with patch("collect.public_host"), self.assertRaises(PermissionError):
                c.request("https://example.org/a")

    def test_redirect_host_rejection(self):
        with tempfile.TemporaryDirectory() as temp:
            c = self.collector(temp)
            with self.assertRaises(ValueError):
                c.request("http://127.0.0.1/private", robots=True)

    def test_roundtrip_idempotent_graph_and_withdrawal(self):
        with tempfile.TemporaryDirectory() as temp:
            c = self.collector(temp)
            a, b = "https://example.org/a", "https://example.org/b"
            c.discover(a)
            c.discover(a)
            c.discover(b)
            raw = ('<main><h1>Test</h1><p>' + 'source ' * 40 + '</p><a href="/b">Other source</a></main>').encode()
            with patch.object(c, "request", return_value=(raw, a, "text/html", {})):
                c.fetch(a)
            meta = json.loads(c.db.execute("select metadata from sources where url=?", (a,)).fetchone()[0])
            saved = pathlib.Path(temp) / meta["raw_path"]
            self.assertEqual((saved / "response.bin").read_bytes(), raw)
            self.assertEqual(digest(raw), meta["revision_sha256"])
            self.assertEqual(digest((saved / "text.txt").read_bytes()), meta["text_sha256"])
            c.build(pathlib.Path(temp) / "out")
            first = (pathlib.Path(temp) / "out/graph-preview.json").read_bytes()
            c.build(pathlib.Path(temp) / "out")
            self.assertEqual(first, (pathlib.Path(temp) / "out/graph-preview.json").read_bytes())
            g = json.loads(first)
            self.assertEqual(len(g["nodes"]), 2)
            self.assertEqual(len(g["edges"]), 1)
            self.assertTrue(all(e["confidenceSource"] in (None, "seed", "academy_requires", "canon_map", "inferred", "teacher") for e in g["edges"]))
            self.assertTrue(all(n["summary"] is None for n in g["nodes"]))
            self.assertEqual(sum(sum(v.values()) for v in c.counts().values()), 2)
            c.db.execute("update sources set state='withdrawn' where url=?", (b,))
            c.db.commit()
            c.build(pathlib.Path(temp) / "out")
            g = json.loads((pathlib.Path(temp) / "out/graph-preview.json").read_bytes())
            self.assertEqual(len(g["nodes"]), 1)
            self.assertEqual(g["edges"], [])

    def test_no_text_on_failed_fetch(self):
        with tempfile.TemporaryDirectory() as temp:
            c = self.collector(temp)
            c.discover("https://example.org/a")
            with patch.object(c, "request", side_effect=PermissionError("robots disallowed")):
                c.fetch("https://example.org/a")
            self.assertEqual(c.db.execute("select state from sources").fetchone()[0], "blocked")
            self.assertEqual(c.db.execute("select count(*) from texts").fetchone()[0], 0)

    def test_response_limits_and_redirects(self):
        class Response:
            is_redirect = False
            headers = {"Content-Type": "text/html"}

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def raise_for_status(self):
                return None

            def iter_content(self, size):
                yield b"too many bytes"

        with tempfile.TemporaryDirectory() as temp:
            c = self.collector(temp)
            rp = Protego.parse("User-agent: *\nDisallow:\n")
            c.robots["example.org"] = rp
            with patch("collect.public_host"), patch.object(c, "pace"), patch("collect.requests.get", return_value=Response()), patch("collect.MAX_BYTES", 2):
                with self.assertRaisesRegex(ValueError, "response exceeds"):
                    c.request("https://example.org/a")
            redirected = Response()
            redirected.is_redirect = True
            redirected.headers = {"Location": "http://127.0.0.1/private"}
            with patch("collect.public_host"), patch.object(c, "pace"), patch("collect.requests.get", return_value=redirected):
                with self.assertRaisesRegex(ValueError, "declared hosts"):
                    c.request("https://example.org/a")

    def test_withdrawal_wins_over_inflight_fetch(self):
        with tempfile.TemporaryDirectory() as temp:
            c = self.collector(temp)
            url = "https://example.org/a"
            c.discover(url)
            c.db.execute("update sources set state='withdrawn'")
            c.db.commit()
            raw = ("<main>" + "source " * 40 + "</main>").encode()
            with patch.object(c, "request", return_value=(raw, url, "text/html", {})):
                c.fetch(url)
            self.assertEqual(c.db.execute("select state from sources").fetchone()[0], "withdrawn")
            self.assertEqual(c.db.execute("select count(*) from texts").fetchone()[0], 0)

    def test_wildcard_robots_and_specific_allow(self):
        rules = "User-agent: *\nDisallow: /*?category=\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\nDisallow: /private$\nCrawl-delay: 2\n"
        rp = Protego.parse(rules)
        self.assertFalse(rp.can_fetch("https://example.org/latest/?category=12", "BucketResearchArchive/1.0"))
        self.assertFalse(rp.can_fetch("https://example.org/private", "BucketResearchArchive/1.0"))
        self.assertTrue(rp.can_fetch("https://example.org/private-more", "BucketResearchArchive/1.0"))
        self.assertTrue(rp.can_fetch("https://example.org/wp-admin/admin-ajax.php", "BucketResearchArchive/1.0"))
        self.assertEqual(rp.crawl_delay("BucketResearchArchive/1.0"), 2)

    def test_topic_edges_rehydrate(self):
        from enrich import enrich
        import gzip

        with tempfile.TemporaryDirectory() as temp:
            c = self.collector(temp)
            url = "https://example.org/a"
            c.discover(url)
            raw = ("<main>Expected value. " + "source " * 40 + "</main>").encode()
            with patch.object(c, "request", return_value=(raw, url, "text/html", {})):
                c.fetch(url)
            out = pathlib.Path(temp) / "out"
            c.build(out)
            enrich(temp, out)
            graph = json.loads(gzip.decompress((out / "graph-with-topics.json.gz").read_bytes()))
            edge = next(e for e in graph["edges"] if e["provenance"].get("method") == "literal_phrase_candidate")
            text = c.db.execute("select body from texts").fetchone()[0]
            p = edge["provenance"]
            self.assertEqual(text[p["start"]:p["end"]], p["match"])
            self.assertEqual(digest(text), p["text_sha256"])


if __name__ == "__main__":
    unittest.main()
