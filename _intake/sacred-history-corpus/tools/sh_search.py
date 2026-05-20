"""Sacred-History Corpus search library.

Cloned and adapted from ~/jackkruse/kruse_search.py.

Reuses:
  - the FTS5 + sentence-transformer + RRF hybrid pattern (Kruse Index)
  - the EMBED_MODEL fallback when ollama is offline
  - the chunk_text() helper

Adapted for sacred-history corpus shape: every chunk knows its
`source_id` (tanzil-quran-simple, ctext-analects, sefaria-index,
wikidata-event-Qxxxx, ...) and its `locator` (sura:aya, urn, qid).

All paths resolve relative to ROOT so the package is portable.

Device (cuda / rocm / mps / cpu) auto-detected.

Citation-only by default. Tier-B content is not embedded.
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
from dataclasses import dataclass
from typing import Iterable

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK_DIR = os.path.join(ROOT, "work")
EMBED_DIR = os.path.join(WORK_DIR, "embeddings")
DB_PATH = os.path.join(WORK_DIR, "index.db")
VEC_PATH = os.path.join(EMBED_DIR, "vectors.npy")
META_PATH = os.path.join(EMBED_DIR, "vectors_meta.json")

# Embedding model selection.
# Primary: ollama nomic-embed-text (768d, fast, local).
# Fallback: sentence-transformers MiniLM-L6-v2 (384d).
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_EMBED_MODEL = os.environ.get("OLLAMA_EMBED_MODEL", "nomic-embed-text")
ST_EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


# ---------------------------------------------------------------------------
# Device detection (Kruse pattern, unchanged)
# ---------------------------------------------------------------------------


def pick_device() -> str:
    try:
        import torch
    except ImportError:
        return "cpu"
    if torch.cuda.is_available():
        return "cuda"
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


# ---------------------------------------------------------------------------
# Embedding backends
# ---------------------------------------------------------------------------


def ollama_available() -> bool:
    try:
        import urllib.request
        with urllib.request.urlopen(f"{OLLAMA_URL}/api/version", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


class OllamaEmbedder:
    """Calls ollama /api/embeddings. One vector per request (ollama's API).

    nomic-embed-text returns 768d float vectors. We L2-normalize so
    cosine = dot-product (matches Kruse pattern downstream).
    """

    def __init__(self, model: str = OLLAMA_EMBED_MODEL):
        import urllib.request, urllib.error
        self.urllib_request = urllib.request
        self.urllib_error = urllib.error
        self.model = model

    def encode(self, texts: list[str], batch_size: int = 1,
               normalize_embeddings: bool = True,
               show_progress_bar: bool = False,
               convert_to_numpy: bool = True) -> np.ndarray:
        out: list[np.ndarray] = []
        total = len(texts)
        for i, t in enumerate(texts):
            data = json.dumps({"model": self.model, "prompt": t}).encode("utf-8")
            req = self.urllib_request.Request(
                f"{OLLAMA_URL}/api/embeddings",
                data=data,
                headers={"Content-Type": "application/json"},
            )
            try:
                with self.urllib_request.urlopen(req, timeout=60) as r:
                    body = json.loads(r.read().decode("utf-8"))
            except Exception as e:
                # Skip bad chunks rather than blow up the whole run.
                print(f"  [embed] skip chunk {i}: {e}")
                out.append(np.zeros(768, dtype=np.float32))
                continue
            v = np.asarray(body.get("embedding", []), dtype=np.float32)
            if v.size == 0:
                v = np.zeros(768, dtype=np.float32)
            if normalize_embeddings:
                n = np.linalg.norm(v)
                if n > 0:
                    v = v / n
            out.append(v)
            if show_progress_bar and (i + 1) % 200 == 0:
                print(f"  [embed] {i+1}/{total}")
        return np.stack(out).astype(np.float32)


def get_embedder():
    """Prefer ollama (local, fast), fall back to sentence-transformers."""
    if ollama_available():
        try:
            return ("ollama", OllamaEmbedder())
        except Exception:
            pass
    from sentence_transformers import SentenceTransformer
    device = pick_device()
    return ("sentence-transformers", SentenceTransformer(ST_EMBED_MODEL, device=device))


# ---------------------------------------------------------------------------
# Shared result type (Kruse pattern)
# ---------------------------------------------------------------------------


@dataclass
class Hit:
    chunk_id: str
    source_id: str
    locator: str
    title: str
    tradition: str
    score: float
    snippet: str

    def to_dict(self) -> dict:
        return {
            "chunk_id": self.chunk_id,
            "source_id": self.source_id,
            "locator": self.locator,
            "title": self.title,
            "tradition": self.tradition,
            "score": round(float(self.score), 4),
            "snippet": self.snippet,
        }


# ---------------------------------------------------------------------------
# Keyword search (SQLite FTS5) — cloned from Kruse
# ---------------------------------------------------------------------------


class KeywordSearch:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row

    def search(self, query: str, limit: int = 10) -> list[Hit]:
        try:
            rows = self.conn.execute(
                """
                SELECT chunk_id, source_id, locator, title, tradition,
                       snippet(chunks, 5, '[', ']', '…', 30) AS snip,
                       bm25(chunks) AS score
                FROM chunks
                WHERE chunks MATCH ?
                ORDER BY score
                LIMIT ?
                """,
                (query, limit),
            ).fetchall()
        except sqlite3.OperationalError:
            return []
        return [
            Hit(r["chunk_id"], r["source_id"], r["locator"], r["title"],
                r["tradition"], -r["score"], " ".join(r["snip"].split()))
            for r in rows
        ]


# ---------------------------------------------------------------------------
# Semantic search (Kruse pattern)
# ---------------------------------------------------------------------------


class SemanticSearch:
    def __init__(self, vec_path: str = VEC_PATH, meta_path: str = META_PATH):
        self.vectors = np.load(vec_path)
        with open(meta_path, "r", encoding="utf-8") as f:
            self.meta = json.load(f)
        self._embedder = None
        self._embedder_kind = None

    def _embedder_loaded(self):
        if self._embedder is None:
            self._embedder_kind, self._embedder = get_embedder()
        return self._embedder

    def _encode_query(self, query: str) -> np.ndarray:
        emb = self._embedder_loaded()
        vec = emb.encode([query], normalize_embeddings=True, show_progress_bar=False)
        return np.asarray(vec[0], dtype=np.float32)

    def search(self, query: str, limit: int = 10) -> list[Hit]:
        qvec = self._encode_query(query)
        # Align dim if vectors were built with a different backend.
        if qvec.shape[0] != self.vectors.shape[1]:
            return []
        scores = self.vectors @ qvec
        order = np.argsort(-scores)[:limit]
        hits = []
        for idx in order:
            m = self.meta[int(idx)]
            hits.append(Hit(
                m["chunk_id"], m["source_id"], m["locator"], m["title"],
                m["tradition"], float(scores[idx]), m["chunk_preview"],
            ))
        return hits


# ---------------------------------------------------------------------------
# Hybrid (RRF) — cloned from Kruse
# ---------------------------------------------------------------------------


class HybridSearch:
    def __init__(self, keyword: KeywordSearch, semantic: SemanticSearch, k: int = 60):
        self.keyword = keyword
        self.semantic = semantic
        self.k = k

    def search(self, query: str, limit: int = 10) -> list[Hit]:
        pool = max(limit * 3, 20)
        kw_hits = self.keyword.search(query, limit=pool)
        sem_hits = self.semantic.search(query, limit=pool)
        rrf: dict[str, float] = {}
        bank: dict[str, Hit] = {}
        for rank, h in enumerate(kw_hits):
            rrf[h.chunk_id] = rrf.get(h.chunk_id, 0.0) + 1.0 / (self.k + rank)
            bank.setdefault(h.chunk_id, h)
        for rank, h in enumerate(sem_hits):
            rrf[h.chunk_id] = rrf.get(h.chunk_id, 0.0) + 1.0 / (self.k + rank)
            bank.setdefault(h.chunk_id, h)
        ranked = sorted(rrf.items(), key=lambda kv: -kv[1])[:limit]
        out = []
        for cid, score in ranked:
            h = bank[cid]
            out.append(Hit(h.chunk_id, h.source_id, h.locator, h.title, h.tradition, score, h.snippet))
        return out


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


def load_searcher(mode: str = "hybrid"):
    if mode == "keyword":
        return KeywordSearch()
    if mode == "semantic":
        return SemanticSearch()
    if mode == "hybrid":
        return HybridSearch(KeywordSearch(), SemanticSearch())
    raise ValueError(f"unknown mode: {mode}")


# ---------------------------------------------------------------------------
# Corpus iteration (sacred-history shape — adapted from Kruse iter_articles)
# ---------------------------------------------------------------------------


def chunk_text(text: str, words_per_chunk: int = 300, overlap: int = 50) -> list[str]:
    """Kruse helper — verbatim. Word-based overlapping chunks."""
    words = text.split()
    if len(words) <= words_per_chunk:
        return [text] if text else []
    chunks, step = [], words_per_chunk - overlap
    for start in range(0, len(words), step):
        chunks.append(" ".join(words[start : start + words_per_chunk]))
        if start + words_per_chunk >= len(words):
            break
    return chunks


def _safe_chunk_id(source_id: str, locator: str, idx: int) -> str:
    s = f"{source_id}:{locator}:{idx}"
    return re.sub(r"[^A-Za-z0-9._:/-]+", "_", s)[:200]


def _load_sura_lengths() -> list[int]:
    """Parse tanzil-quran-data.js to get the 114-tuple of ayat-per-sura.

    The Tanzil metadata file is a JS literal — we look for the
    `quranMetaData.sura` map and extract the `[ayas, ...]` count for
    each entry. Returns [] on any parse failure.
    """
    fpath = os.path.join(WORK_DIR, "tanzil-quran-data.js")
    if not os.path.exists(fpath):
        return []
    try:
        with open(fpath, "r", encoding="utf-8") as f:
            text = f.read()
    except Exception:
        return []
    # Each sura row looks like:
    #   1 : [7, 1, "Al-Faatiha", "الفاتحة", "The Opening", "Meccan", 5, 48],
    # The second number after "[" is the ayas count.
    rows = re.findall(r"\d+\s*:\s*\[\s*(\d+)\s*,", text)
    if len(rows) != 114:
        return []
    return [int(r) for r in rows]


def iter_corpus_chunks() -> Iterable[dict]:
    """Yield {chunk_id, source_id, locator, title, tradition, rights_tier, text}.

    Only Tier-A (PD/open) sources are yielded. Tier-B copyrighted
    content stays out (rights gate, RIGHTS-POLICY.md).

    Sources covered in Phase 1:
      - Quran Arabic (Tanzil verbatim, Tier A — license CC-BY 3.0
        for metadata file; Arabic text PD/free verbatim)
      - ctext structural index (PD source text references; we
        embed only the title/labels, not text bodies)
      - Sefaria index (structural)
      - SuttaCentral menu (CC0)
      - Wikidata sacred events (CC0 labels)
    """
    # 1. Tanzil Quran — uthmani + simple. We GROUP by sura
    # (~114 chunks/edition) instead of per-aya (6266 chunks/edition).
    # The sura boundaries are derived from tanzil-quran-data.js
    # (the "Quran-data" metadata file in the same dir) so this is
    # deterministic. Per-aya granularity is preserved in the FTS5
    # body via the locator string, but embeddings work at sura level
    # — that's the right granularity for cross-tradition motif
    # correlation (a single ayah is too small to embed meaningfully).
    sura_lens = _load_sura_lengths()
    for fname, edition in [("tanzil-quran-uthmani.txt", "uthmani"),
                            ("tanzil-quran-simple.txt", "simple")]:
        fpath = os.path.join(WORK_DIR, fname)
        if not os.path.exists(fpath):
            continue
        with open(fpath, "r", encoding="utf-8") as f:
            ayat = [ln.strip() for ln in f if ln.strip()]
        if sura_lens and sum(sura_lens) == len(ayat):
            offset = 0
            for sura_idx, n in enumerate(sura_lens, start=1):
                body = " ".join(ayat[offset:offset + n])
                offset += n
                locator = f"sura:{sura_idx}"
                yield {
                    "chunk_id": _safe_chunk_id(f"tanzil-{edition}", locator, 0),
                    "source_id": f"tanzil-{edition}",
                    "locator": locator,
                    "title": f"Quran sura {sura_idx} (Tanzil {edition})",
                    "tradition": "islam",
                    "rights_tier": "A",
                    "text": body,
                }
        else:
            # Fallback if sura metadata missing — coarse 50-aya chunks.
            for i in range(0, len(ayat), 50):
                body = " ".join(ayat[i:i + 50])
                locator = f"lines:{i+1}-{i+50}"
                yield {
                    "chunk_id": _safe_chunk_id(f"tanzil-{edition}", locator, 0),
                    "source_id": f"tanzil-{edition}",
                    "locator": locator,
                    "title": f"Quran lines {i+1}-{i+50} (Tanzil {edition})",
                    "tradition": "islam",
                    "rights_tier": "A",
                    "text": body,
                }

    # 2. ctext structural index — titles + URNs only (PD safe).
    for fname in sorted(os.listdir(WORK_DIR)):
        if not fname.startswith("ctext-") or not fname.endswith(".json"):
            continue
        fpath = os.path.join(WORK_DIR, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                d = json.load(f)
        except Exception:
            continue
        urn = d.get("urn", "")
        title = d.get("title", urn)
        slug = fname[len("ctext-"):-len(".json")]
        # Top-level
        text = f"{title} {urn}"
        for sub in d.get("subsections", []) or []:
            text += f" {sub}"
        yield {
            "chunk_id": _safe_chunk_id(f"ctext-{slug}", urn, 0),
            "source_id": f"ctext-{slug}",
            "locator": urn,
            "title": title,
            "tradition": "tao-confucian",
            "rights_tier": "A",
            "text": text,
        }
        # Per-subsection
        for j, sub in enumerate(d.get("subsections", []) or []):
            yield {
                "chunk_id": _safe_chunk_id(f"ctext-{slug}", sub, j+1),
                "source_id": f"ctext-{slug}",
                "locator": sub,
                "title": title,
                "tradition": "tao-confucian",
                "rights_tier": "A",
                "text": f"{title} {sub}",
            }

    # 3. Wikidata sacred events — labels (CC0).
    wd_path = os.path.join(WORK_DIR, "wikidata-sacred-events.json")
    if os.path.exists(wd_path):
        try:
            with open(wd_path, "r", encoding="utf-8") as f:
                d = json.load(f)
            for b in d.get("results", {}).get("bindings", []):
                ev_uri = b.get("event", {}).get("value", "")
                qid = ev_uri.rsplit("/", 1)[-1] if ev_uri else ""
                label = b.get("eventLabel", {}).get("value", "")
                when = b.get("when", {}).get("value", "")
                if not qid or not label:
                    continue
                text = f"{label} ({when})" if when else label
                yield {
                    "chunk_id": _safe_chunk_id(f"wikidata-event-{qid}", when or "n", 0),
                    "source_id": f"wikidata-event-{qid}",
                    "locator": qid,
                    "title": label,
                    "tradition": "cross",
                    "rights_tier": "A",
                    "text": text,
                }
        except Exception:
            pass

    # 4. Sefaria index — top-2-level categories only (structural).
    # The full TOC has ~7850 leaves; for embedding/correlation purposes
    # the top categories carry the cross-tradition signal. Deeper
    # work-level granularity stays available via the FTS5 index but is
    # NOT embedded here.
    sef_path = os.path.join(WORK_DIR, "sefaria-index.json")
    if os.path.exists(sef_path) and os.path.getsize(sef_path) > 2:
        try:
            with open(sef_path, "r", encoding="utf-8") as f:
                d = json.load(f)
            entries = d if isinstance(d, list) else d.get("contents", d.get("data", []))
            MAX_DEPTH = 2
            def walk(node, parent: str = "", depth: int = 0):
                if depth > MAX_DEPTH:
                    return
                if isinstance(node, dict):
                    cat = node.get("category") or node.get("title") or node.get("heTitle")
                    if cat:
                        path = f"{parent}/{cat}" if parent else cat
                        yield {
                            "chunk_id": _safe_chunk_id("sefaria-index", path, 0),
                            "source_id": "sefaria-index",
                            "locator": path,
                            "title": cat,
                            "tradition": "judaism",
                            "rights_tier": "A",  # index only, no bodies
                            "text": path,
                        }
                        for v in node.get("contents", []) or []:
                            yield from walk(v, path, depth + 1)
                    else:
                        for v in node.values():
                            yield from walk(v, parent, depth)
                elif isinstance(node, list):
                    for v in node:
                        yield from walk(v, parent, depth)
            yield from walk(entries, "", 0)
        except Exception:
            pass

    # 5. SuttaCentral menu (CC0).
    sc_path = os.path.join(WORK_DIR, "suttacentral-menu.json")
    if os.path.exists(sc_path) and os.path.getsize(sc_path) > 2:
        try:
            with open(sc_path, "r", encoding="utf-8") as f:
                d = json.load(f)
            MAX_DEPTH_SC = 2
            def walk_sc(node, parent: str = "", depth: int = 0):
                if depth > MAX_DEPTH_SC:
                    return
                if isinstance(node, dict):
                    uid = node.get("uid") or node.get("acronym") or node.get("translated_name") or node.get("name")
                    if uid:
                        path = f"{parent}/{uid}" if parent else uid
                        yield {
                            "chunk_id": _safe_chunk_id("suttacentral", path, 0),
                            "source_id": "suttacentral",
                            "locator": path,
                            "title": str(node.get("translated_name") or uid),
                            "tradition": "buddhism",
                            "rights_tier": "A",
                            "text": path + " " + str(node.get("translated_name") or ""),
                        }
                        for v in node.get("children", []) or []:
                            yield from walk_sc(v, path, depth + 1)
                    else:
                        for v in node.values():
                            yield from walk_sc(v, parent, depth)
                elif isinstance(node, list):
                    for v in node:
                        yield from walk_sc(v, parent, depth)
            yield from walk_sc(d, "", 0)
        except Exception:
            pass
