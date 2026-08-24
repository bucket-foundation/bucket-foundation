#!/usr/bin/env python3
"""
Polingual Photon API, the FULL 45k-photon dictionary as a live service.

Wraps the proven multi-axis query engine (scripts/photon/query.py) in a small
FastAPI app so bucket.foundation's explorer can serve every photon + all five
comparison axes, instead of the ~6,500-word baked subset.

Endpoints (all GET, JSON out):
 GET /healthz liveness + index stats
 GET /lookup?surface=&lang= the photon itself (+ provenance)
 GET /semantic?surface=&lang=&k=&cross= words that MEAN the same
 GET /phonetic?surface=&lang=&k= words that SOUND the same
 GET /spelling?surface=&lang=&k= words SPELLED similarly
 GET /etymology?surface=&lang= where a word COMES FROM
 GET /translate?surface=&from=&to=&k= same meaning across languages

Design notes:
 * The semantic/phonetic vectors are memmapped (.f32.bin), never copied into
 RAM per request. The sqlite metadata is loaded once at startup into numpy
 arrays + a (lang, surface) lookup dict; the connection is reused.
 * Vector dimensions are AUTO-DETECTED from the bin file size vs row count, so
 this serves the live LaBSE-768 build without any source edit (and would
 still work if the substrate is rebuilt at a different dim).
 * No embedding model is loaded: all five axes operate on photons that already
 exist in the substrate (top-k over stored vectors / edit distance / kaikki
 cache), which is exactly what the explorer needs. Query-time embedding of
 arbitrary free text is a deliberate v2 follow-up, out of scope here.
 * Source data is Wiktionary via Kaikki (CC-BY-SA). Every response carries the
 provenance (source + uri) so attribution travels with the data.

Run:
 uvicorn server:app --host 127.0.0.1 --port 8088
Env:
 PHOTONS_DIR override path to the photon substrate dir
 POLINGUAL_CORS comma-sep allowed origins (default: bucket.foundation set)
 POLINGUAL_RATE requests/min/IP for the data axes (default 120)
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
import time
from collections import defaultdict, deque
from threading import Lock

import numpy as np

# --------------------------------------------------------------------------- #
# Paths / config #
# --------------------------------------------------------------------------- #
PHOTONS_DIR = os.environ.get(
    "PHOTONS_DIR",
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "_intake", "photons")
    ),
)
DB_PATH = os.path.join(PHOTONS_DIR, "index.sqlite")
SEMANTIC_BIN = os.path.join(PHOTONS_DIR, "semantic-vectors.f32.bin")
PHONETIC_BIN = os.path.join(PHOTONS_DIR, "phonetic-vectors.f32.bin")
KAIKKI_DIR = os.path.join(PHOTONS_DIR, "kaikki-cache")

FLOAT_SIZE = 4

DEFAULT_CORS = (
    "https://bucket.foundation,https://www.bucket.foundation,"
    "https://bucket-foundation.vercel.app,http://localhost:3000"
)
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("POLINGUAL_CORS", DEFAULT_CORS).split(",")
    if o.strip()
]
RATE_PER_MIN = int(os.environ.get("POLINGUAL_RATE", "120"))

PROVENANCE_DEFAULT = "Wiktionary via Kaikki (CC-BY-SA 3.0)"

# kaikki lang_code -> cache filename (for etymology lookups)
KAIKKI = {
    "akk": "Akkadian.jsonl", "ang": "Old_English.jsonl", "ar": "Arabic.jsonl",
    "cop": "Coptic.jsonl", "cs": "Czech.jsonl", "de": "German.jsonl",
    "egy": "Egyptian.jsonl", "el": "Greek.jsonl", "en": "English.jsonl",
    "es": "Spanish.jsonl", "fa": "Persian.jsonl", "fi": "Finnish.jsonl",
    "fr": "French.jsonl", "got": "Gothic.jsonl", "grc": "Ancient_Greek.jsonl",
    "he": "Hebrew.jsonl", "hi": "Hindi.jsonl", "id": "Indonesian.jsonl",
    "it": "Italian.jsonl", "ja": "Japanese.jsonl", "ko": "Korean.jsonl",
    "la": "Latin.jsonl", "nl": "Dutch.jsonl", "non": "Old_Norse.jsonl",
    "pl": "Polish.jsonl", "pt": "Portuguese.jsonl", "ru": "Russian.jsonl",
    "sa": "Sanskrit.jsonl", "sux": "Sumerian.jsonl", "sv": "Swedish.jsonl",
    "ta": "Tamil.jsonl", "th": "Thai.jsonl", "tr": "Turkish.jsonl",
    "vi": "Vietnamese.jsonl", "zh": "Chinese.jsonl",
}


def _rows_count(db: str) -> int:
    c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    try:
        return int(c.execute("SELECT count(*) FROM photons").fetchone()[0])
    finally:
        c.close()


def _detect_dim(bin_path: str, max_row_plus_1: int) -> int:
    """Infer the per-row float width from file size / (#rows)."""
    if not os.path.exists(bin_path) or max_row_plus_1 <= 0:
        return 0
    floats = os.path.getsize(bin_path) // FLOAT_SIZE
    if floats % max_row_plus_1 != 0:
        # fall back to common dims if not perfectly divisible
        for d in (768, 384, 64, 512, 256, 128):
            if floats % d == 0:
                return d
        return 0
    return floats // max_row_plus_1


# --------------------------------------------------------------------------- #
# Index (loaded once at startup) #
# --------------------------------------------------------------------------- #
class PhotonIndex:
    def __init__(self):
        if not os.path.exists(DB_PATH):
            raise RuntimeError(f"index.sqlite not found at {DB_PATH}")
        self.conn = sqlite3.connect(
            f"file:{DB_PATH}?mode=ro", uri=True, check_same_thread=False
        )
        self._db_lock = Lock()
        rows = self.conn.execute(
            "SELECT rowid, id, lang, surface, meaning_en, pos, ipa, "
            "semantic_row, phonetic_row, provenance_source, provenance_uri "
            "FROM photons ORDER BY rowid"
        ).fetchall()
        self.rowid = np.array([r[0] for r in rows])
        self.id = [r[1] for r in rows]
        self.lang = [r[2] for r in rows]
        self.surface = [r[3] for r in rows]
        self.meaning = [r[4] for r in rows]
        self.pos = [r[5] for r in rows]
        self.ipa = [r[6] for r in rows]
        self.sem_row = [r[7] for r in rows]
        self.pho_row = [r[8] for r in rows]
        self.prov_src = [r[9] for r in rows]
        self.prov_uri = [r[10] for r in rows]
        self.n = len(rows)

        # auto-detect vector widths from the live bins
        max_sem = max([r for r in self.sem_row if r is not None], default=-1) + 1
        max_pho = max([r for r in self.pho_row if r is not None], default=-1) + 1
        self.sem_dim = _detect_dim(SEMANTIC_BIN, max_sem)
        self.pho_dim = _detect_dim(PHONETIC_BIN, max_pho)

        self._sem = None
        self._pho = None

        # (lang, surface) -> array idx + surface-only fallback
        self.by_key = {}
        for i in range(self.n):
            self.by_key.setdefault((self.lang[i], self.surface[i]), i)
            self.by_key.setdefault(self.surface[i], i)

        # precomputed valid masks
        self._sem_valid = np.array(
            [r is not None for r in self.sem_row], dtype=bool
        )
        self._pho_valid = np.array(
            [r is not None for r in self.pho_row], dtype=bool
        )
        self.langs = sorted(set(self.lang))

        # Vectorized lang array + per-lang boolean mask cache. At 200k+ rows the
        # old per-request `np.array([lg == lang for lg in self.lang])` list
        # comprehension dominated latency on the semantic/translate axes; a
        # numpy `==` over a precomputed array is ~100x faster and the result is
        # cached so a hot lang pays the cost once.
        self._lang_arr = np.array(self.lang)
        self._lang_mask_cache: dict[str, np.ndarray] = {}
        # surfaces as a lowercased numpy array for the spelling axis prefilter.
        self._surface_arr = np.array(self.surface)
        self._surface_lower = np.array([(s or "").lower() for s in self.surface])
        self._surface_len = np.array([len(s or "") for s in self.surface])

    def lang_mask(self, lang: str) -> np.ndarray:
        m = self._lang_mask_cache.get(lang)
        if m is None:
            m = (self._lang_arr == lang)
            self._lang_mask_cache[lang] = m
        return m

    @property
    def sem(self):
        if self._sem is None and self.sem_dim:
            mm = np.memmap(SEMANTIC_BIN, dtype="float32", mode="r")
            self._sem = mm.reshape(-1, self.sem_dim)
        return self._sem

    @property
    def pho(self):
        if self._pho is None and self.pho_dim:
            mm = np.memmap(PHONETIC_BIN, dtype="float32", mode="r")
            self._pho = mm.reshape(-1, self.pho_dim)
        return self._pho

    def find(self, surface, lang=None):
        if not surface:
            return None
        if lang and (lang, surface) in self.by_key:
            return self.by_key[(lang, surface)]
        return self.by_key.get(surface)

    def provenance(self, i):
        return {
            "source": self.prov_src[i] or PROVENANCE_DEFAULT,
            "uri": self.prov_uri[i]
            or f"https://en.wiktionary.org/wiki/{self.surface[i]}",
            "license": "CC-BY-SA",
        }


# --------------------------------------------------------------------------- #
# Axes (cosine top-k over memmapped, L2-normalized vectors) #
# --------------------------------------------------------------------------- #
def _cosine_topk(matrix, valid_mask, vec, k, exclude=None):
    sims = matrix @ vec.astype("float32")
    sims = np.where(valid_mask, sims, -2.0)
    if exclude is not None:
        sims[exclude] = -2.0
    n_valid = int(valid_mask.sum())
    k = min(k, n_valid)
    if k <= 0:
        return []
    top = np.argpartition(-sims, k - 1)[:k]
    top = top[np.argsort(-sims[top])]
    return [(int(i), float(sims[i])) for i in top]


def _fmt(ix, surface, lang, hits, score_name="score"):
    out = []
    for i, s in hits:
        out.append({
            "surface": ix.surface[i], "lang": ix.lang[i],
            "meaning_en": (ix.meaning[i] or "")[:120],
            "ipa": ix.ipa[i], "pos": ix.pos[i],
            score_name: round(s, 4),
            "provenance": ix.provenance(i),
        })
    return {"query": surface, "lang": lang, "results": out}


def semantic_topk(ix, surface, lang=None, k=10, cross_lingual=True):
    i = ix.find(surface, lang)
    if i is None or ix.sem_row[i] is None:
        return {"error": f"no semantic vector for {surface!r} ({lang})",
                "results": []}
    vec = ix.sem[ix.sem_row[i]]
    if not cross_lingual and lang:
        mask = ix._sem_valid & ix.lang_mask(lang)
    else:
        mask = ix._sem_valid
    hits = _cosine_topk(ix.sem, mask, vec, k + 1, exclude=i)
    res = _fmt(ix, surface, lang, hits[:k])
    res["axis"] = "semantic"
    res["cross_lingual"] = cross_lingual
    return res


def phonetic_topk(ix, surface, lang=None, k=10):
    i = ix.find(surface, lang)
    if i is None or ix.pho_row[i] is None:
        return {"error": f"no phonetic vector for {surface!r} ({lang})",
                "results": []}
    vec = ix.pho[ix.pho_row[i]]
    hits = _cosine_topk(ix.pho, ix._pho_valid, vec, k + 1, exclude=i)
    res = _fmt(ix, surface, lang, hits[:k])
    res["axis"] = "phonetic"
    return res


def _norm_edit(a, b):
    a, b = a.lower(), b.lower()
    if a == b:
        return 0.0
    la, lb = len(a), len(b)
    if la == 0 or lb == 0:
        return 1.0
    prev = list(range(lb + 1))
    for i in range(1, la + 1):
        cur = [i] + [0] * lb
        ca = a[i - 1]
        for j in range(1, lb + 1):
            cost = 0 if ca == b[j - 1] else 1
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
        prev = cur
    return prev[lb] / max(la, lb)


def spelling_topk(ix, surface, lang=None, k=10):
    # Vectorized candidate prefilter so the O(len*len) Python edit-distance only
    # runs on plausible neighbors (was a full n-row Python loop, too slow at
    # 200k). A normalized edit distance < 1 requires the candidate to share at
    # least one character AND not differ wildly in length; we gate on lang +
    # |len diff| <= max(2, 40% of the query length).
    sl = (surface or "").lower()
    L = len(sl)
    if L == 0:
        res = {"query": surface, "lang": lang, "results": [], "axis": "spelling"}
        return res
    len_tol = max(2, int(L * 0.4) + 1)
    cand_mask = np.abs(ix._surface_len - L) <= len_tol
    if lang:
        cand_mask &= ix.lang_mask(lang)
    cand_idx = np.nonzero(cand_mask)[0]
    scored = []
    for j in cand_idx:
        j = int(j)
        if ix._surface_lower[j] == sl and (not lang or ix.lang[j] == lang):
            continue
        d = _norm_edit(sl, ix._surface_lower[j])
        if d < 1.0:
            scored.append((j, 1.0 - d))
    scored.sort(key=lambda x: -x[1])
    res = _fmt(ix, surface, lang, scored[:k], score_name="similarity")
    res["axis"] = "spelling"
    return res


def etymology(ix, surface, lang, max_chars=320):
    fn = KAIKKI.get(lang)
    if not fn:
        return {"error": f"no kaikki cache for lang {lang!r}"}
    path = os.path.join(KAIKKI_DIR, fn)
    if not os.path.exists(path):
        return {"error": f"cache file missing: {fn}"}
    best = None
    with open(path, encoding="utf-8") as f:
        for line in f:
            if surface not in line:
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            if d.get("word") != surface:
                continue
            et = d.get("etymology_text")
            if et:
                best = {
                    "surface": surface, "lang": lang,
                    "pos": d.get("pos"),
                    "etymology": et[:max_chars]
                    + ("…" if len(et) > max_chars else ""),
                    "axis": "etymology",
                    "provenance": {
                        "source": PROVENANCE_DEFAULT,
                        "uri": f"https://en.wiktionary.org/wiki/{surface}",
                        "license": "CC-BY-SA",
                    },
                }
                break
            if best is None:
                best = {"surface": surface, "lang": lang, "etymology": None,
                        "axis": "etymology",
                        "provenance": {"source": PROVENANCE_DEFAULT,
                                       "license": "CC-BY-SA"}}
    return best or {"error": f"{surface!r} ({lang}) not found in cache"}


def translate(ix, surface, frm, to, k=8):
    i = ix.find(surface, frm)
    if i is None:
        return {"error": f"{surface!r} not found in {frm}", "results": []}
    src_meaning = ix.meaning[i] or ""
    # Only scan rows in the target language (vectorized mask -> index list),
    # instead of a full n-row Python loop.
    exact = []
    if src_meaning:
        for j in np.nonzero(ix.lang_mask(to))[0]:
            j = int(j)
            if j != i and (ix.meaning[j] or "") == src_meaning:
                exact.append({
                    "surface": ix.surface[j], "meaning_en": ix.meaning[j],
                    "ipa": ix.ipa[j], "provenance": ix.provenance(j),
                })
    sem = []
    if ix.sem_row[i] is not None and ix.sem is not None:
        vec = ix.sem[ix.sem_row[i]]
        mask = ix._sem_valid & ix.lang_mask(to)
        hits = _cosine_topk(ix.sem, mask, vec, k, exclude=i)
        sem = [{
            "surface": ix.surface[h], "score": round(s, 4),
            "meaning_en": (ix.meaning[h] or "")[:80],
            "ipa": ix.ipa[h], "provenance": ix.provenance(h),
        } for h, s in hits]
    return {
        "axis": "translate",
        "word": surface, "from": frm, "to": to,
        "meaning_en": src_meaning[:120],
        "exact_meaning_matches": exact[:k],
        "semantic_neighbors": sem,
        "provenance": ix.provenance(i),
    }


def lookup(ix, surface, lang=None):
    i = ix.find(surface, lang)
    if i is None:
        return {"error": f"{surface!r} ({lang}) not found", "found": False}
    return {
        "found": True,
        "id": ix.id[i],
        "surface": ix.surface[i], "lang": ix.lang[i],
        "meaning_en": ix.meaning[i], "pos": ix.pos[i], "ipa": ix.ipa[i],
        "has_semantic": ix.sem_row[i] is not None,
        "has_phonetic": ix.pho_row[i] is not None,
        "provenance": ix.provenance(i),
    }


# --------------------------------------------------------------------------- #
# Rate limiter (in-process sliding window per IP) #
# --------------------------------------------------------------------------- #
class RateLimiter:
    def __init__(self, per_min: int):
        self.per_min = per_min
        self.hits = defaultdict(deque)
        self.lock = Lock()

    def allow(self, ip: str) -> bool:
        if self.per_min <= 0:
            return True
        now = time.time()
        with self.lock:
            dq = self.hits[ip]
            while dq and now - dq[0] > 60:
                dq.popleft()
            if len(dq) >= self.per_min:
                return False
            dq.append(now)
            return True


# --------------------------------------------------------------------------- #
# FastAPI app #
# --------------------------------------------------------------------------- #
from fastapi import FastAPI, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

app = FastAPI(title="Polingual Photon API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
    max_age=86400,
)

_INDEX: PhotonIndex | None = None
_RATE = RateLimiter(RATE_PER_MIN)


def get_index() -> PhotonIndex:
    global _INDEX
    if _INDEX is None:
        _INDEX = PhotonIndex()
    return _INDEX


@app.on_event("startup")
def _startup():
    ix = get_index()
    print(
        f"[polingual] index loaded: {ix.n} photons, {len(ix.langs)} langs, "
        f"sem_dim={ix.sem_dim} pho_dim={ix.pho_dim}",
        flush=True,
    )


def _client_ip(req: Request) -> str:
    xff = req.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return req.client.host if req.client else "unknown"


def _rate_guard(req: Request):
    if not _RATE.allow(_client_ip(req)):
        return JSONResponse(
            {"error": "rate_limited", "retry_after_s": 60}, status_code=429,
            headers={"retry-after": "60"},
        )
    return None


def _k(v, default, lo=1, hi=50):
    try:
        return max(lo, min(hi, int(v)))
    except (TypeError, ValueError):
        return default


@app.get("/healthz")
def healthz():
    ix = get_index()
    return {
        "ok": True,
        "service": "polingual-photon-api",
        "photons": ix.n,
        "languages": len(ix.langs),
        "lang_codes": ix.langs,
        "semantic_dim": ix.sem_dim,
        "phonetic_dim": ix.pho_dim,
        "axes": ["lookup", "semantic", "phonetic", "spelling",
                 "etymology", "translate"],
        "provenance": PROVENANCE_DEFAULT,
    }


@app.get("/lookup")
def api_lookup(request: Request, surface: str, lang: str | None = None):
    rl = _rate_guard(request)
    if rl:
        return rl
    t0 = time.time()
    out = lookup(get_index(), surface, lang)
    out["took_ms"] = round((time.time() - t0) * 1000, 1)
    return out


@app.get("/semantic")
def api_semantic(request: Request, surface: str, lang: str | None = None,
                 k: int = 10, cross: int = 1):
    rl = _rate_guard(request)
    if rl:
        return rl
    t0 = time.time()
    out = semantic_topk(get_index(), surface, lang, _k(k, 10),
                        cross_lingual=bool(cross))
    out["took_ms"] = round((time.time() - t0) * 1000, 1)
    return out


@app.get("/phonetic")
def api_phonetic(request: Request, surface: str, lang: str | None = None,
                 k: int = 10):
    rl = _rate_guard(request)
    if rl:
        return rl
    t0 = time.time()
    out = phonetic_topk(get_index(), surface, lang, _k(k, 10))
    out["took_ms"] = round((time.time() - t0) * 1000, 1)
    return out


@app.get("/spelling")
def api_spelling(request: Request, surface: str, lang: str | None = None,
                 k: int = 10):
    rl = _rate_guard(request)
    if rl:
        return rl
    t0 = time.time()
    out = spelling_topk(get_index(), surface, lang, _k(k, 10))
    out["took_ms"] = round((time.time() - t0) * 1000, 1)
    return out


@app.get("/etymology")
def api_etymology(request: Request, surface: str, lang: str = "en"):
    rl = _rate_guard(request)
    if rl:
        return rl
    t0 = time.time()
    out = etymology(get_index(), surface, lang)
    out["took_ms"] = round((time.time() - t0) * 1000, 1)
    return out


@app.get("/translate")
def api_translate(request: Request, surface: str):
    # `from` is a Python keyword, so all params are read from query_params
    # directly (a **kw signature makes FastAPI 422 on the `from`/`to` fields).
    rl = _rate_guard(request)
    if rl:
        return rl
    frm = request.query_params.get("from", "en")
    to = request.query_params.get("to", "es")
    k = _k(request.query_params.get("k"), 8)
    t0 = time.time()
    out = translate(get_index(), surface, frm, to, k)
    out["took_ms"] = round((time.time() - t0) * 1000, 1)
    return out


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8088"))
    uvicorn.run(app, host="127.0.0.1", port=port)
