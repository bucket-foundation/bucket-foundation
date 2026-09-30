from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

TOPICS_URL = "https://api.openalex.org/topics"
SELECT = "id,display_name,description,keywords,subfield,field,domain"


def topic_text(t: dict) -> str:
    parts = [t.get("display_name") or "", t.get("description") or "", " ".join(t.get("keywords") or [])]
    for level in ("subfield", "field", "domain"):
        v = t.get(level) or {}
        parts.append(v.get("display_name") or "")
    return ". ".join(p for p in parts if p)


def fetch_topics(cache: Path, contact: str | None = None, pause: float = 0.2) -> list[dict]:
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    ua = "bucket.foundation prime-directions" + (f" (mailto:{contact})" if contact else "")
    out, cursor = [], "*"
    while cursor:
        q = urllib.parse.urlencode({"per-page": 200, "cursor": cursor, "select": SELECT})
        req = urllib.request.Request(f"{TOPICS_URL}?{q}", headers={"User-Agent": ua})
        with urllib.request.urlopen(req, timeout=60) as r:
            page = json.load(r)
        for t in page.get("results", []):
            out.append({
                "id": t["id"].rsplit("/", 1)[-1], "name": t.get("display_name") or "",
                "field": (t.get("field") or {}).get("display_name") or "",
                "domain": (t.get("domain") or {}).get("display_name") or "",
                "text": topic_text(t),
            })
        cursor = (page.get("meta") or {}).get("next_cursor")
        time.sleep(pause)
    if not out:
        raise RuntimeError("OpenAlex returned no topics")
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(out), encoding="utf-8")
    return out


def load_basis(path: Path) -> list[dict]:
    rows = json.loads(Path(path).read_text(encoding="utf-8"))
    if not rows or not all("text" in r and "name" in r for r in rows):
        raise ValueError(f"{path} is not a basis file of {{name, text}} rows")
    return rows


BASIS_SCHEMA = "bucket.reference-basis/1"
SIGN_CONVENTION = "each component is signed so that its largest-magnitude term loading is positive; ties go to the lowest term index"


def fix_signs(u, vt):
    import numpy as np

    idx = np.argmax(np.abs(vt), axis=1)
    signs = np.sign(vt[np.arange(vt.shape[0]), idx])
    signs[signs == 0] = 1
    return u * signs[None, :], vt * signs[:, None]


def build_reference_basis(basis: list[dict], k: int = 12, min_df: int = 2, max_df: float = 0.2,
                          max_features: int = 6000, seed: int = 0, top_n: int = 12) -> dict:
    from collections import Counter

    import numpy as np
    from sklearn.utils.extmath import randomized_svd

    from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

    from .advisors import SHORT_FIELD, weigh
    from .model import vectorize
    from .render import angles

    binary, vocab, _ = vectorize([b["text"] for b in basis], min_df, max_df, max_features)
    n = binary.shape[0]
    df = np.asarray(binary.getnnz(axis=0)).ravel()
    idf = np.log((1 + n) / (1 + df)) + 1
    dense = weigh(binary, idf).toarray().astype(np.float64)
    mean = dense.mean(axis=0)
    centered = dense - mean
    u, sv, vt = randomized_svd(centered, n_components=k, n_iter=7, random_state=seed)
    u, vt = fix_signs(u, vt)
    raw = u * sv
    total = float((centered ** 2).sum())
    offset = mean @ vt.T
    score_mean = raw.mean(axis=0)
    score_std = raw.std(axis=0)
    score_std[score_std == 0] = 1
    fields = [SHORT_FIELD.get(b.get("field") or "", b.get("field") or b.get("domain") or b["name"]) for b in basis]
    m = max(20, n // 60)
    ang = np.degrees(angles(k)) % 360
    components = []
    for j in range(k):
        order = np.argsort(-raw[:, j])
        pos = Counter(fields[i] for i in order[:m]).most_common(1)[0][0]
        neg = Counter(fields[i] for i in order[-m:]).most_common(1)[0][0]
        top = np.argsort(-vt[j])[:top_n]
        bottom = np.argsort(vt[j])[:top_n]
        components.append({
            "index": j + 1,
            "angle_deg": round(float(ang[j]), 3),
            "variance_ratio": round(float(sv[j] ** 2 / total), 6),
            "label": pos if pos == neg else f"{pos} vs {neg}",
            "top_terms": [str(vocab[i]) for i in top],
            "bottom_terms": [str(vocab[i]) for i in bottom],
        })
    return {
        "schema": BASIS_SCHEMA,
        "source": {"name": "OpenAlex topics", "documents": int(n)},
        "params": {"k": k, "min_df": min_df, "max_df": max_df, "max_features": max_features, "seed": seed, "weighting": "idf-rownorm", "centered": True},
        "sign_convention": SIGN_CONVENTION,
        "stop_words": sorted(ENGLISH_STOP_WORDS),
        "vocab": [str(t) for t in vocab],
        "idf": [round(float(x), 5) for x in idf],
        "loadings": [[round(float(x), 6) for x in row] for row in vt],
        "offset": [round(float(x), 8) for x in offset],
        "score_mean": [round(float(x), 8) for x in score_mean],
        "score_std": [round(float(x), 8) for x in score_std],
        "components": components,
    }


def project_texts(basis_file: dict, texts: list[str]):
    import numpy as np
    import scipy.sparse as sp
    from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, CountVectorizer

    from .advisors import weigh
    from .model import TOKEN_PATTERN

    vocab = basis_file["vocab"]
    cv = CountVectorizer(binary=True, lowercase=True, stop_words=list(ENGLISH_STOP_WORDS), token_pattern=TOKEN_PATTERN,
                         vocabulary={t: i for i, t in enumerate(vocab)}, dtype=np.float64)
    emb = weigh(cv.transform(texts), np.array(basis_file["idf"]))
    raw = np.asarray(emb @ np.array(basis_file["loadings"]).T) - np.array(basis_file["offset"])
    return (raw - np.array(basis_file["score_mean"])) / np.array(basis_file["score_std"])


def coverage_of(basis_file: dict, text: str) -> float:
    import re

    from .model import TOKEN_PATTERN

    stop = set(basis_file.get("stop_words") or [])
    vocab = set(basis_file["vocab"])
    tokens = [t for t in re.findall(TOKEN_PATTERN, text.lower()) if t not in stop]
    return sum(t in vocab for t in tokens) / len(tokens) if tokens else 0.0
