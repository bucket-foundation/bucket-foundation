import json
import threading
import time
import unittest
import urllib.error
import urllib.request

import numpy as np

from evidence_search.vectors import VectorIndex
from evidence_search.worker import RequestError, Worker, make_server, rank, require_loopback, validate_score_request

REV = "e" * 64
SECRET = "k" * 40

def index() -> VectorIndex:
    matrix = np.array([[1, 0, 0], [0, 1, 0], [0.9, 0.1, 0], [0, 0, 1]], dtype="<f4")
    chunks = [("graph:a", "ra"), ("graph:b", "rb"), ("graph:a", "ra"), ("graph:c", "rc")]
    by: dict = {}
    for i, k in enumerate(chunks):
        by.setdefault(k, []).append(i)
    return VectorIndex(REV, "m" * 40, "fake", 3, matrix, chunks, by)

VECTORS = {"toward a": [1.0, 0.0, 0.0], "toward b": [0.0, 1.0, 0.0], "toward c": [0.0, 0.0, 1.0], "between": [0.6, 0.6, 0.0]}

def encode(q):
    return np.asarray(VECTORS[q], dtype="<f4")

def request(**over):
    body = {"requestId": "r1", "query": "toward a", "corpusRevision": REV, "eligible": [["graph:a", "ra"], ["graph:b", "rb"], ["graph:c", "rc"]], "limit": 10, "deadlineMs": 2000}
    body.update(over)
    return body

class Ranking(unittest.TestCase):
    def test_only_eligible_rows_are_scored(self):
        results, scored = rank(index(), encode("toward c"), {("graph:a", "ra"), ("graph:b", "rb")}, 10)
        self.assertEqual({r["sourceId"] for r in results}, {"graph:a", "graph:b"})
        self.assertEqual(scored, 3, "a's two chunks and b's one; c's row is never touched")

    def test_a_revision_mismatch_is_ineligible(self):
        results, scored = rank(index(), encode("toward a"), {("graph:a", "an-older-revision")}, 10)
        self.assertEqual((results, scored), ([], 0))

    def test_a_source_scores_by_its_best_chunk(self):
        results, _ = rank(index(), encode("toward a"), {("graph:a", "ra")}, 10)
        self.assertEqual(results, [{"sourceId": "graph:a", "sourceRevision": "ra", "score": 1.0}])

    def test_order_limit_and_ties(self):
        results, _ = rank(index(), encode("between"), {("graph:a", "ra"), ("graph:b", "rb"), ("graph:c", "rc")}, 2)
        self.assertEqual([r["sourceId"] for r in results], ["graph:a", "graph:b"])
        self.assertAlmostEqual(results[0]["score"], 0.6, places=5)

class Contract(unittest.TestCase):
    def test_valid(self):
        req = validate_score_request(request())
        self.assertEqual(req["eligible"], {("graph:a", "ra"), ("graph:b", "rb"), ("graph:c", "rc")})

    def test_refusals(self):
        cases = {
            "unknown field": request(threads=64),
            "missing field": {k: v for k, v in request().items() if k != "limit"},
            "blank query": request(query="   "),
            "long query": request(query="x" * 513),
            "short revision": request(corpusRevision="abc"),
            "bad pair": request(eligible=[["graph:a"]]),
            "limit zero": request(limit=0),
            "limit high": request(limit=101),
            "limit bool": request(limit=True),
            "deadline high": request(deadlineMs=6001),
            "not an object": [1, 2],
        }
        for name, body in cases.items():
            with self.subTest(name), self.assertRaises(RequestError) as ctx:
                validate_score_request(body)
            self.assertEqual(ctx.exception.status, 400)

    def test_stale_corpus(self):
        w = Worker(index(), encode, "m")
        with self.assertRaises(RequestError) as ctx:
            w.score(request(corpusRevision="f" * 64))
        self.assertEqual((ctx.exception.status, ctx.exception.code), (409, "stale_corpus"))
        self.assertEqual(w.counters["stale"], 1)

class Queue(unittest.TestCase):
    def slow(self, seconds):
        def enc(q):
            time.sleep(seconds)
            return encode(q)
        return enc

    def test_a_full_queue_answers_at_once(self):
        w = Worker(index(), self.slow(0.4), "m", max_active=1, max_waiting=1)
        outcomes = []

        def call():
            try:
                w.score(request())
                outcomes.append("ok")
            except RequestError as e:
                outcomes.append(e.code)

        threads = [threading.Thread(target=call) for _ in range(3)]
        for t in threads:
            t.start()
            time.sleep(0.05)
        for t in threads:
            t.join()
        self.assertEqual(sorted(outcomes), ["ok", "ok", "queue_full"])

    def test_a_deadline_that_passes_in_the_queue(self):
        w = Worker(index(), self.slow(0.5), "m", max_active=1, max_waiting=4)
        first = threading.Thread(target=lambda: w.score(request()))
        first.start()
        time.sleep(0.05)
        with self.assertRaises(RequestError) as ctx:
            w.score(request(deadlineMs=100))
        first.join()
        self.assertEqual(ctx.exception.code, "deadline")

    def test_a_deadline_that_passes_while_encoding(self):
        w = Worker(index(), self.slow(0.2), "m")
        with self.assertRaises(RequestError) as ctx:
            w.score(request(deadlineMs=50))
        self.assertEqual(ctx.exception.code, "deadline")

class Http(unittest.TestCase):
    def setUp(self):
        self.server = make_server(Worker(index(), encode, "m" * 40), SECRET)
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()

    def call(self, method, path, body=None, key=SECRET, raw=None):
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}", data=data, method=method)
        if key is not None:
            req.add_header("x-evidence-worker-key", key)
        req.add_header("content-type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=5) as res:
                return res.status, json.loads(res.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    def test_the_secret_is_required(self):
        self.assertEqual(self.call("GET", "/health", key=None)[0], 401)
        self.assertEqual(self.call("GET", "/health", key="x" * 40)[0], 401)
        self.assertEqual(self.call("POST", "/score", request(), key=None)[0], 401)

    def test_health_and_score(self):
        status, body = self.call("GET", "/health")
        self.assertEqual((status, body["corpusRevision"], body["rows"]), (200, REV, 4))
        status, body = self.call("POST", "/score", request(query="toward b"))
        self.assertEqual(status, 200)
        self.assertEqual(body["results"][0]["sourceId"], "graph:b")
        self.assertEqual((body["requestId"], body["corpusRevision"]), ("r1", REV))
        self.assertNotIn("text", json.dumps(body), "the worker returns ids and scores only")

    def test_errors(self):
        self.assertEqual(self.call("POST", "/score", request(threads=2))[0], 400)
        self.assertEqual(self.call("POST", "/score", raw=b"not json")[0], 400)
        self.assertEqual(self.call("POST", "/score", request(corpusRevision="f" * 64))[0], 409)
        self.assertEqual(self.call("GET", "/elsewhere")[0], 404)
        self.assertEqual(self.oversize(), 413)

    def oversize(self):
        import http.client

        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        conn.putrequest("POST", "/score")
        conn.putheader("x-evidence-worker-key", SECRET)
        conn.putheader("content-length", str(2 * 1024 * 1024 + 1))
        conn.endheaders()
        conn.send(b"{}")
        status = conn.getresponse().status
        conn.close()
        return status

class Binding(unittest.TestCase):
    def test_loopback_only(self):
        for host in ["0.0.0.0", "192.168.1.2", "example.org", ""]:
            with self.subTest(host), self.assertRaises(ValueError):
                require_loopback(host)
        require_loopback("127.0.0.1")
        require_loopback("::1")

    def test_secret_length(self):
        with self.assertRaises(ValueError):
            make_server(Worker(index(), encode, "m"), "short")

if __name__ == "__main__":
    unittest.main()
