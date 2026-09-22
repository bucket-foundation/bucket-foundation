"""The loopback encoder worker (ros-ai-worker).

The server sends a bounded query, the corpus revision it expects, and the
eligible (sourceId, sourceRevision) pairs it resolved at request start.
The worker masks the index to those pairs before any score is computed,
embeds the query, and returns ranked ids with finite scores. It returns no
text: the server hydrates text from the corpus after its own live checks.

Limits, from IMPLEMENTATION.md, "API and worker contracts": one model
computation at a time, four requests waiting, at most eight CPU threads,
a deadline the server sets inside its six-second worker budget, and at
most 100 results. A full queue answers 503 at once. The deadline is
checked on entering the queue and between stages, and a request past it
answers 503 without its result.

The socket binds to loopback only, and every request carries the shared
secret from EVIDENCE_WORKER_SECRET, compared in constant time. A field the
contract does not name is refused, so a caller cannot change a worker
option through the body.
"""

from __future__ import annotations

import hmac
import ipaddress
import json
import math
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .vectors import VectorIndex

MAX_ACTIVE = 1
MAX_WAITING = 4
MAX_BODY = 2 * 1024 * 1024
MAX_QUERY_CODE_POINTS = 512
MAX_ELIGIBLE = 20000
MAX_LIMIT = 100
MAX_DEADLINE_MS = 6000
MIN_SECRET = 32
SCORE_FIELDS = {"requestId", "query", "corpusRevision", "eligible", "limit", "deadlineMs"}
HEX64 = re.compile(r"^[0-9a-f]{64}$")


class RequestError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code


def validate_score_request(body: object) -> dict:
    if not isinstance(body, dict):
        raise RequestError(400, "invalid_request", "the body must be a JSON object")
    extra = set(body) - SCORE_FIELDS
    if extra:
        raise RequestError(400, "invalid_request", f"unsupported fields: {', '.join(sorted(extra))}")
    missing = SCORE_FIELDS - set(body)
    if missing:
        raise RequestError(400, "invalid_request", f"missing fields: {', '.join(sorted(missing))}")
    rid = body["requestId"]
    if not isinstance(rid, str) or not (1 <= len(rid) <= 64):
        raise RequestError(400, "invalid_request", "requestId is 1 to 64 characters")
    query = body["query"]
    if not isinstance(query, str) or not query.strip() or len(query) > MAX_QUERY_CODE_POINTS:
        raise RequestError(400, "invalid_request", f"query is 1 to {MAX_QUERY_CODE_POINTS} code points")
    if not isinstance(body["corpusRevision"], str) or not HEX64.match(body["corpusRevision"]):
        raise RequestError(400, "invalid_request", "corpusRevision is 64 hex characters")
    eligible = body["eligible"]
    if not isinstance(eligible, list) or len(eligible) > MAX_ELIGIBLE:
        raise RequestError(400, "invalid_request", f"eligible is a list of at most {MAX_ELIGIBLE} pairs")
    pairs: set[tuple[str, str]] = set()
    for item in eligible:
        if not (isinstance(item, list) and len(item) == 2 and all(isinstance(x, str) for x in item)):
            raise RequestError(400, "invalid_request", "each eligible item is [sourceId, sourceRevision]")
        pairs.add((item[0], item[1]))
    limit = body["limit"]
    if not isinstance(limit, int) or isinstance(limit, bool) or not (1 <= limit <= MAX_LIMIT):
        raise RequestError(400, "invalid_request", f"limit is 1 to {MAX_LIMIT}")
    deadline = body["deadlineMs"]
    if not isinstance(deadline, int) or isinstance(deadline, bool) or not (1 <= deadline <= MAX_DEADLINE_MS):
        raise RequestError(400, "invalid_request", f"deadlineMs is 1 to {MAX_DEADLINE_MS}")
    return {"requestId": rid, "query": query.strip(), "corpusRevision": body["corpusRevision"], "eligible": pairs, "limit": limit, "deadlineMs": deadline}


def rank(index: VectorIndex, query_vector, eligible: set[tuple[str, str]], limit: int) -> tuple[list[dict], int]:
    """Scores only the eligible rows. Returns the ranked sources and the number of rows scored."""
    import numpy as np

    rows: list[int] = []
    for key in eligible:
        rows.extend(index.rows_by_source.get(key, ()))
    if not rows:
        return [], 0
    rows.sort()
    scores = index.matrix[np.asarray(rows)] @ np.asarray(query_vector, dtype="<f4")
    best: dict[tuple[str, str], float] = {}
    for row, score in zip(rows, scores.tolist()):
        key = index.chunks[row]
        if not math.isfinite(score):
            continue
        if key not in best or score > best[key]:
            best[key] = score
    ordered = sorted(best.items(), key=lambda kv: (-kv[1], kv[0][0]))[:limit]
    return [{"sourceId": k[0], "sourceRevision": k[1], "score": round(v, 6)} for k, v in ordered], len(rows)


class Worker:
    """Scoring with a bounded queue. Transport-free, so tests drive it directly."""

    def __init__(self, index: VectorIndex, encode_query, model_revision: str, max_active: int = MAX_ACTIVE, max_waiting: int = MAX_WAITING):
        self.index = index
        self.encode_query = encode_query
        self.model_revision = model_revision
        self._slots = threading.BoundedSemaphore(max_active + max_waiting)
        self._compute = threading.Semaphore(max_active)
        self.counters = {"scored": 0, "queue_full": 0, "deadline": 0, "stale": 0, "invalid": 0}

    def health(self) -> dict:
        return {
            "ok": True,
            "corpusRevision": self.index.corpus_revision,
            "modelId": self.index.model_id,
            "modelRevision": self.model_revision,
            "rows": len(self.index.chunks),
            "counters": dict(self.counters),
        }

    def score(self, raw: object) -> dict:
        started = time.monotonic()
        try:
            req = validate_score_request(raw)
        except RequestError:
            self.counters["invalid"] += 1
            raise
        deadline = started + req["deadlineMs"] / 1000.0
        if req["corpusRevision"] != self.index.corpus_revision:
            self.counters["stale"] += 1
            raise RequestError(409, "stale_corpus", f"the worker holds corpus {self.index.corpus_revision[:12]}")
        if not self._slots.acquire(blocking=False):
            self.counters["queue_full"] += 1
            raise RequestError(503, "queue_full", "the worker queue is full")
        try:
            remaining = deadline - time.monotonic()
            if remaining <= 0 or not self._compute.acquire(timeout=remaining):
                self.counters["deadline"] += 1
                raise RequestError(503, "deadline", "the deadline passed in the queue")
            try:
                vector = self.encode_query(req["query"])
                if time.monotonic() > deadline:
                    self.counters["deadline"] += 1
                    raise RequestError(503, "deadline", "the deadline passed while encoding")
                results, scored = rank(self.index, vector, req["eligible"], req["limit"])
            finally:
                self._compute.release()
        finally:
            self._slots.release()
        self.counters["scored"] += 1
        return {
            "requestId": req["requestId"],
            "corpusRevision": self.index.corpus_revision,
            "modelRevision": self.model_revision,
            "results": results,
            "rowsScored": scored,
            "ms": round((time.monotonic() - started) * 1000, 1),
        }


def require_loopback(host: str) -> None:
    try:
        if ipaddress.ip_address(host).is_loopback:
            return
    except ValueError:
        pass
    raise ValueError(f"the worker binds to loopback only; {host!r} is not a loopback address")


def make_server(worker: Worker, secret: str, host: str = "127.0.0.1", port: int = 0) -> ThreadingHTTPServer:
    require_loopback(host)
    if not isinstance(secret, str) or len(secret) < MIN_SECRET:
        raise ValueError(f"EVIDENCE_WORKER_SECRET must be at least {MIN_SECRET} characters")
    key = secret.encode("utf-8")

    class Handler(BaseHTTPRequestHandler):
        server_version = "evidence-worker/1"

        def log_message(self, fmt, *args):  # Query text never reaches a log line.
            return

        def _send(self, status: int, body: dict) -> None:
            data = json.dumps(body).encode("utf-8")
            self.send_response(status)
            self.send_header("content-type", "application/json")
            self.send_header("cache-control", "no-store")
            self.send_header("content-length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def _authorized(self) -> bool:
            given = (self.headers.get("x-evidence-worker-key") or "").encode("utf-8")
            return hmac.compare_digest(given, key)

        def do_GET(self):
            if not self._authorized():
                return self._send(401, {"error": "unauthorized"})
            if self.path != "/health":
                return self._send(404, {"error": "not_found"})
            self._send(200, worker.health())

        def do_POST(self):
            if not self._authorized():
                return self._send(401, {"error": "unauthorized"})
            if self.path != "/score":
                return self._send(404, {"error": "not_found"})
            length = int(self.headers.get("content-length") or 0)
            if length <= 0 or length > MAX_BODY:
                return self._send(413 if length > MAX_BODY else 400, {"error": "invalid_request", "message": f"a body of 1 to {MAX_BODY} bytes"})
            try:
                body = json.loads(self.rfile.read(length))
            except (ValueError, UnicodeDecodeError):
                return self._send(400, {"error": "invalid_request", "message": "the body is not JSON"})
            try:
                self._send(200, worker.score(body))
            except RequestError as e:
                self._send(e.status, {"error": e.code, "message": str(e)})

    server = ThreadingHTTPServer((host, port), Handler)
    server.daemon_threads = True
    return server
