from __future__ import annotations

import csv
import json
import re
import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import scipy.sparse as sp
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, CountVectorizer

from .clean import scrub
from .model import PrimeResult, TOKEN_PATTERN, fit_matrix, vectorize
from .neighbors import build_index, brute_knn, distance_recall

TEXT_KEYS = (
    "text", "abstracts", "titles", "works", "topics", "concepts", "keywords", "interests", "summary",
    "author_topics.name", "author_topics.field", "atlas_topics", "research_areas_official",
    "cockpit.interests_matched", "funding.recent_grants.title",
)
ID_KEYS = ("id", "openalex_id", "orcid", "email", "name")
NAME_KEYS = ("name", "display_name", "full_name")
FILTER_KEYS = ("field", "country", "funding", "institution", "taking_students")
EXTRA_KEYS = ("department", "h_index", "sources", "profile_url", "image_url")
PUBLIC_EMAIL_SOURCES = ("official_directory", "opt_in")

@dataclass
class Person:
    id: str
    name: str
    text: str
    meta: dict = field(default_factory=dict)

def _flatten(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return " ".join(_flatten(v) for v in value.values())
    if isinstance(value, (list, tuple)):
        return " ".join(_flatten(v) for v in value)
    return str(value)

def get_path(record, path: str):
    head, _, rest = path.partition(".")
    if isinstance(record, list):
        values = [get_path(item, path) for item in record]
        values = [v for v in values if v not in (None, "", [])]
        return values or None
    if not isinstance(record, dict):
        return None
    value = record.get(head)
    return get_path(value, rest) if rest and value is not None else value

def derive_field(record: dict) -> str:
    value = record.get("field")
    if isinstance(value, str) and value:
        return value
    if isinstance(value, list) and value:
        return "; ".join(_flatten(v) for v in value)
    weights: dict[str, float] = {}
    for topic in record.get("author_topics") or []:
        if isinstance(topic, dict) and topic.get("field"):
            weights[topic["field"]] = weights.get(topic["field"], 0.0) + float(topic.get("count") or 1)
    if weights:
        return max(sorted(weights), key=lambda f: weights[f])
    atlas = record.get("atlas_topics")
    return str(atlas.get("primary_field") or "") if isinstance(atlas, dict) else _flatten(value)

def derive_funding(value) -> str:
    if isinstance(value, dict):
        if "active" in value:
            return "active grant" if value.get("active") else "past grants"
        return _flatten(value)
    return _flatten(value)

def _first(record: dict, keys) -> str:
    for key in keys:
        value = record.get(key)
        if value not in (None, ""):
            return _flatten(value)
    return ""

PROFILE_KEYS = ("openalex_id", "orcid", "ror", "title", "cited_by_count", "works_count", "research_areas", "program_url", "works_top", "tracker_notes")


def _clean(v):
    return "" if v is None or v == "None" else v


def profile_meta(record: dict) -> dict:
    works = []
    for w in (record.get("works") or [])[:12]:
        if isinstance(w, dict) and w.get("title"):
            works.append({"id": str(w.get("id") or ""), "title": str(w["title"])[:240], "year": _clean(w.get("year")) or "",
                          "cited": w.get("cited_by_count") or 0, "pick": str(w.get("pick") or "")})
    works.sort(key=lambda w: (-(int(w["cited"]) if str(w["cited"]).isdigit() else 0), str(w["year"])))
    seen, unique = set(), []
    for w in works:
        key = w["title"].strip().lower()
        if key not in seen:
            seen.add(key)
            unique.append(w)
    works = unique
    cockpit = record.get("cockpit") if isinstance(record.get("cockpit"), dict) else {}
    areas = record.get("research_areas_official")
    tracker = record.get("tracker") if isinstance(record.get("tracker"), list) else []
    return {
        "openalex_id": _clean(record.get("openalex_id")) or "",
        "orcid": _clean(record.get("orcid")) or "",
        "ror": _clean(record.get("ror")) or "",
        "title": _clean(record.get("title")) or "",
        "cited_by_count": _clean(record.get("cited_by_count")) or "",
        "works_count": _clean(record.get("works_count")) or "",
        "research_areas": "; ".join(_flatten(x) for x in areas) if isinstance(areas, list) else (_clean(areas) or ""),
        "program_url": _clean(record.get("program_url") or cockpit.get("program_url")) or "",
        "works_top": works[:8],
        "tracker_notes": [f"{t.get('opportunity', '')} ({t.get('priority', '')})".strip() for t in tracker if isinstance(t, dict)][:3],
    }


def load_people(
    path: Path,
    text_keys=TEXT_KEYS,
    max_chars: int = 60000,
    allow_partial_tail: bool = True,
    label_key: str | None = "author_topics.name",
) -> list[Person]:
    people: list[Person] = []
    seen: set[str] = set()
    raw = Path(path).read_text(encoding="utf-8")
    lines = raw.split("\n")
    writing = bool(raw) and not raw.endswith("\n")
    for n, line in enumerate(lines, start=1):
        line = line.strip()
        if not line:
            continue
        try:
            record = json.loads(line)
        except ValueError as exc:
            if allow_partial_tail and writing and n == len(lines):
                break
            raise ValueError(f"{path}:{n}: invalid JSON: {exc}") from exc
        if not isinstance(record, dict):
            raise ValueError(f"{path}:{n}: each line must be a JSON object")
        pid = _first(record, ID_KEYS) or _first(record, NAME_KEYS) or f"row-{n}"
        if pid in seen:
            continue
        seen.add(pid)
        text = scrub(" \n".join(_flatten(get_path(record, k)) for k in text_keys if get_path(record, k)))[:max_chars]
        meta = {k: v for k, v in record.items() if k not in text_keys and not isinstance(v, (dict, list))}
        for k in FILTER_KEYS + EXTRA_KEYS:
            if isinstance(record.get(k), list):
                meta[k] = "; ".join(_flatten(x) for x in record[k])
        meta.update(profile_meta(record))
        meta["field"] = derive_field(record)
        meta["funding"] = derive_funding(record.get("funding"))
        labels = get_path(record, label_key) if label_key else None
        if isinstance(labels, list):
            meta["topic_labels"] = [str(x) for x in labels if isinstance(x, str) and x]
        people.append(Person(pid, _first(record, NAME_KEYS) or pid, text, meta))
    return people

@dataclass
class AdvisorModel:
    result: PrimeResult
    vocab: np.ndarray
    idf: np.ndarray
    people: list[Person]
    kept: list[int]
    basis_names: list[str] | None = None
    basis_scores: np.ndarray | None = None

    def embed(self, texts: list[str]) -> np.ndarray:
        cv = CountVectorizer(
            binary=True, lowercase=True, stop_words=list(ENGLISH_STOP_WORDS), token_pattern=TOKEN_PATTERN,
            vocabulary={str(t): i for i, t in enumerate(self.vocab)}, dtype=np.float64,
        )
        return weigh(cv.transform([scrub(t) for t in texts]), self.idf)

    def project(self, texts: list[str]) -> np.ndarray:
        return np.asarray(self.embed(texts) @ self.result.components.T)

def weigh(matrix: sp.spmatrix, idf: np.ndarray) -> sp.csr_matrix:
    weighted = sp.csr_matrix(matrix) @ sp.diags(idf)
    norms = np.sqrt(np.asarray(weighted.multiply(weighted).sum(axis=1)).ravel())
    norms[norms == 0] = 1
    return (sp.diags(1 / norms) @ weighted).tocsr()

def fit_people(
    people: list[Person],
    k: int = 24,
    min_df: int = 3,
    max_df: float = 0.2,
    max_features: int = 40000,
    min_chars: int = 200,
    seed: int = 0,
) -> AdvisorModel:
    kept = [i for i, p in enumerate(people) if len(p.text) >= min_chars]
    if len(kept) <= k:
        raise ValueError(f"{len(kept)} people with at least {min_chars} characters of text; need more than {k}")
    texts = [people[i].text for i in kept]
    binary, vocab, stats = vectorize(texts, min_df, max_df, max_features)
    n = binary.shape[0]
    df = np.asarray(binary.getnnz(axis=0)).ravel()
    idf = np.log((1 + n) / (1 + df)) + 1
    matrix = weigh(binary, idf)
    result = fit_matrix(
        "advisors", matrix, vocab, [people[i].id for i in kept], [people[i].name for i in kept], stats,
        k=k, seed=seed, params={"min_df": min_df, "max_df": max_df, "weighting": "idf-rownorm"},
    )
    return AdvisorModel(result, vocab, idf, people, kept)


SHORT_FIELD = {
    "Biochemistry, Genetics and Molecular Biology": "Molecular Biology",
    "Agricultural and Biological Sciences": "Agriculture and Biology",
    "Economics, Econometrics and Finance": "Economics",
    "Business, Management and Accounting": "Business",
    "Pharmacology, Toxicology and Pharmaceutics": "Pharmacology",
    "Immunology and Microbiology": "Immunology",
    "Earth and Planetary Sciences": "Earth Sciences",
    "Physics and Astronomy": "Physics",
    "Chemical Engineering": "Chem Engineering",
    "Environmental Science": "Environment",
    "Decision Sciences": "Decision Sciences",
    "Health Professions": "Health Professions",
}


def fit_people_on_basis(people: list[Person], basis: list[dict], k: int = 64, min_df: int = 2, max_df: float = 0.2,
                        max_features: int = 40000, min_chars: int = 200, seed: int = 0) -> AdvisorModel:
    import dataclasses
    from collections import Counter

    from sklearn.utils.extmath import randomized_svd

    kept = [i for i, p in enumerate(people) if len(p.text) >= min_chars]
    if not kept:
        raise ValueError(f"no people with at least {min_chars} characters of text")
    texts = [b["text"] for b in basis]
    binary, vocab, stats = vectorize(texts, min_df, max_df, max_features)
    n = binary.shape[0]
    df = np.asarray(binary.getnnz(axis=0)).ravel()
    idf = np.log((1 + n) / (1 + df)) + 1
    dense = weigh(binary, idf).toarray().astype(np.float32)
    mean = dense.mean(axis=0)
    k = min(k, n - 1)
    u, sv, vt = randomized_svd(dense - mean, n_components=k, n_iter=7, random_state=seed)
    flip = np.sign(vt[np.arange(k), np.argmax(np.abs(vt), axis=1)])
    vt, u = vt * flip[:, None], u * flip[None, :]
    basis_raw = u * sv
    fields = [SHORT_FIELD.get(b.get("field") or "", b.get("field") or b.get("domain") or b["name"]) for b in basis]
    m = max(20, n // 60)
    labels, seen = [], set()
    for j in range(k):
        order = np.argsort(-basis_raw[:, j])
        pos = Counter(fields[i] for i in order[:m]).most_common(1)[0][0]
        neg = Counter(fields[i] for i in order[-m:]).most_common(1)[0][0]
        label = pos if pos == neg else f"{pos} vs {neg}"
        if label in seen:
            label = f"{label}: {basis[int(order[0])]['name']}"
        seen.add(label)
        labels.append(label)
    total = float(((dense - mean) ** 2).sum())
    ref = model_result(vocab, vt, sv, basis_raw, total, stats, [str(b.get("id", i)) for i, b in enumerate(basis)], [b["name"] for b in basis], min_df, max_df)
    model = AdvisorModel(ref, vocab, idf, people, kept, labels, None)
    raw = model.project([people[i].text for i in kept]) - (mean @ vt.T)
    std = raw.std(axis=0)
    std[std == 0] = 1
    model.result = dataclasses.replace(ref, corpus="advisors", doc_ids=[people[i].id for i in kept],
                                       titles=[people[i].name for i in kept], raw_scores=raw,
                                       scores=(raw - raw.mean(axis=0)) / std, shape=(len(kept), ref.shape[1]))
    return model


def model_result(vocab, vt, sv, raw, total, stats, ids, titles, min_df, max_df) -> PrimeResult:
    std = raw.std(axis=0)
    std[std == 0] = 1
    return PrimeResult(
        corpus="basis", doc_ids=ids, titles=titles, vocab=vocab, components=vt, singular_values=sv,
        variance_ratio=(sv ** 2) / total if total > 0 else np.zeros(len(sv)), raw_scores=raw,
        scores=(raw - raw.mean(axis=0)) / std, shape=(raw.shape[0], vt.shape[1]), density=0.0,
        orthogonality=float(np.abs(vt @ vt.T - np.eye(vt.shape[0])).max()), term_stats=stats,
        params={"min_df": min_df, "max_df": max_df, "weighting": "idf-rownorm", "basis": "reference", "centered": True},
    )

def cosine(a: np.ndarray, q: np.ndarray) -> np.ndarray:
    na = np.linalg.norm(a, axis=1)
    nq = np.linalg.norm(q)
    denom = na * nq
    return np.divide(a @ q, denom, out=np.zeros(a.shape[0]), where=denom > 0)

TOKEN = re.compile(TOKEN_PATTERN)

def shared_terms(model: AdvisorModel, query_row: sp.csr_matrix, rows: list[int], n: int = 6) -> list[list[str]]:
    return [terms for terms, _ in shared_evidence(model, query_row, rows, n)]

def shared_evidence(model: AdvisorModel, query_row: sp.csr_matrix, rows: list[int], n: int = 5) -> list[tuple[list[str], list[str]]]:
    q = query_row.toarray().ravel()
    person = model.embed([model.people[model.kept[r]].text for r in rows])
    index = {str(t): i for i, t in enumerate(model.vocab)}
    out = []
    for r, row in enumerate(rows):
        contrib = person[r].toarray().ravel() * q
        top = np.argsort(-contrib)[:n]
        terms = [str(model.vocab[t]) for t in top if contrib[t] > 0]
        labels = model.people[model.kept[row]].meta.get("topic_labels") or []
        scored = []
        for label in dict.fromkeys(labels):
            weight = sum(contrib[index[tok]] for tok in set(TOKEN.findall(label.lower())) if tok in index)
            if weight > 0:
                scored.append((weight, label))
        topics = [label for _, label in sorted(scored, key=lambda x: -x[0])[:n]]
        out.append((terms, topics))
    return out

SCORINGS = ("whitened", "centered", "raw")

def score_space(raw: np.ndarray, q: np.ndarray, scoring: str = "whitened") -> tuple[np.ndarray, np.ndarray]:
    if scoring not in SCORINGS:
        raise ValueError(f"scoring must be one of {SCORINGS}")
    if scoring == "raw":
        return raw, q
    mu = raw.mean(axis=0)
    if scoring == "centered":
        return raw - mu, q - mu
    sd = raw.std(axis=0)
    sd[sd <= 1e-12] = 1
    return (raw - mu) / sd, (q - mu) / sd

def percentile_of(values: np.ndarray) -> np.ndarray:
    from scipy.stats import rankdata

    ranks = rankdata(values, method="max") - 1
    return 100.0 * ranks / max(len(values) - 1, 1)

def spread(values: np.ndarray) -> dict:
    s = np.sort(values)[::-1]
    pick = lambda k: round(float(s[min(k, len(s)) - 1]), 4)
    return {
        "top1": pick(1), "top10": pick(10), "top100": pick(100), "top300": pick(300),
        "median": round(float(np.median(s)), 4), "sd": round(float(s.std()), 4),
        "gap_top1_top100": round(pick(1) - pick(100), 4),
    }

def rank(model: AdvisorModel, query_text: str, top: int | None = 300, scoring: str = "whitened") -> tuple[list[dict], np.ndarray, dict]:
    raw = model.result.raw_scores
    qraw = model.project([query_text])[0]
    space, qvec = score_space(raw, qraw, scoring)
    cos = cosine(space, qvec)
    euclid = np.linalg.norm(space - qvec[None, :], axis=1)
    pct = percentile_of(cos)
    embedded = model.embed([model.people[i].text for i in model.kept])
    qrow = model.embed([query_text])
    term_cos = np.asarray((embedded @ qrow.T).todense()).ravel()
    order_cos = np.argsort(-cos, kind="stable")
    rank_euc = np.empty(len(cos), dtype=int)
    rank_euc[np.argsort(euclid, kind="stable")] = np.arange(1, len(cos) + 1)
    chosen = [int(i) for i in (order_cos if not top else order_cos[:top])]
    evidence = shared_evidence(model, qrow, chosen, n=5)
    rows = []
    for j, i in enumerate(chosen):
        person = model.people[model.kept[i]]
        meta = person.meta
        rows.append({
            "rank": j + 1,
            "rank_euclidean": int(rank_euc[i]),
            "score": round(float(cos[i]), 4),
            "percentile": round(float(pct[i]), 2),
            "term_overlap": round(float(term_cos[i]), 4),
            "id": person.id,
            "name": person.name,
            **{k: meta.get(k, "") for k in FILTER_KEYS},
            **{k: meta.get(k, "") for k in EXTRA_KEYS},
            "identity": meta.get("identity", ""),
            "profile_institution": meta.get("profile_institution", ""),
            "email": meta.get("email") or "",
            **{k: meta.get(k, "" if k not in ("works_top", "tracker_notes") else []) for k in PROFILE_KEYS},
            "email_public": str(meta.get("email_source") or "") in PUBLIC_EMAIL_SOURCES,
            "shared_terms": " ".join(evidence[j][0]),
            "shared_topics": evidence[j][1],
        })
    report = {"scoring": scoring, "score_spread": spread(cos), "people_scored": int(len(cos))}
    return rows, qraw, report

STAR_AXES = 8


def axis_offset(model: AdvisorModel) -> int:
    return 0


def axis_labels(model: AdvisorModel, n: int = STAR_AXES, terms: int = 3) -> list[str]:
    if model.basis_names is not None:
        return model.basis_names[:n]
    comps = model.result.components[:n]
    return [" ".join(str(model.vocab[t]) for t in np.argsort(-c)[:terms]) for c in comps]


def load_directions(path: Path | None) -> list[tuple[str, str]]:
    if not path:
        return []
    out = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        parts = line.split("\t")
        if len(parts) >= 2 and parts[0].strip() and parts[0].strip().lower() != "label":
            out.append((parts[0].strip(), parts[1].strip()))
    return out


def direction_profiles(model: AdvisorModel, rows: list[dict], query_text: str, directions: list[tuple[str, str]],
                       scoring: str = "whitened", ref_n: int = 200) -> dict:
    raw = model.result.raw_scores
    qraw = model.project([query_text])[0]
    space, qvec = score_space(raw, qraw, scoring)
    o = axis_offset(model)
    n = min(STAR_AXES, space.shape[1] - o)
    pct = np.stack([percentile_of(space[:, o + j]) for j in range(n)], axis=1) / 100
    sorted_axes = [np.sort(space[:, o + j]) for j in range(n)]
    qpct = np.array([np.searchsorted(sorted_axes[j], qvec[o + j]) / max(len(space) - 1, 1) for j in range(n)]).clip(0, 1)
    index = {model.people[model.kept[i]].id: i for i in range(len(model.kept))}
    context = {"prime_axes": axis_labels(model, n), "star_query_prime": [round(float(v), 3) for v in qpct]}
    rel = space - qvec[None, :]
    ang = np.arctan2(rel[:, o + 1], rel[:, o])
    order = np.argsort(ang, kind="stable")
    theta = np.empty(len(ang))
    theta[order] = np.linspace(0, 2 * np.pi, len(ang), endpoint=False)
    cos_q = cosine(space, qvec)
    radius = 1 - percentile_of(cos_q) / 100
    ours = None
    if directions:
        draw = model.project([t for _, t in directions])
        _, dvec = score_space(raw, draw, scoring)
        sim = cosine_matrix(space, dvec)
        qsim = cosine_matrix(qvec[None, :], dvec)[0]
        ours = np.stack([percentile_of(sim[:, j]) for j in range(sim.shape[1])], axis=1) / 100
        sorted_sim = [np.sort(sim[:, j]) for j in range(sim.shape[1])]
        qours = np.array([np.searchsorted(sorted_sim[j], qsim[j], side="right") / len(sim) for j in range(sim.shape[1])]).clip(0, 1)
        top = [index[r["id"]] for r in rows[:ref_n] if r["id"] in index]
        context["our_axes"] = [label for label, _ in directions]
        context["star_query_ours"] = [round(float(v), 3) for v in qours]
        context["star_ref_ours"] = [round(float(v), 3) for v in np.median(ours[top] if top else ours, axis=0)]
    for r in rows:
        i = index.get(r["id"])
        if i is None:
            continue
        r["star_prime"] = [round(float(v), 3) for v in pct[i]]
        r["theta"] = round(float(theta[i]), 4)
        r["radius"] = round(float(radius[i]), 4)
        if ours is not None:
            r["star_ours"] = [round(float(v), 3) for v in ours[i]]
    return context


def cosine_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    an = a / np.maximum(np.linalg.norm(a, axis=1, keepdims=True), 1e-12)
    bn = b / np.maximum(np.linalg.norm(b, axis=1, keepdims=True), 1e-12)
    return an @ bn.T


def is_source(row: dict, source: str) -> bool:
    return source in [s.strip() for s in str(row.get("sources") or "").split(";")]

def diversify(rows: list[dict], cap: int = 5, window: int = 50, key: str = "institution") -> list[dict]:
    picked, held, counts = [], [], {}
    for row in rows:
        inst = str(row.get(key) or "")
        if len(picked) < window and inst and counts.get(inst, 0) >= cap:
            held.append(row)
            continue
        counts[inst] = counts.get(inst, 0) + 1
        picked.append(row)
        if len(picked) == window:
            picked.extend(held)
            held = []
    return picked + held

def institution_mix(rows: list[dict], n: int = 100, top: int = 8) -> dict:
    head = rows[:n]
    counts: dict[str, int] = {}
    for row in head:
        inst = str(row.get("institution") or "unknown")
        counts[inst] = counts.get(inst, 0) + 1
    ordered = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return {
        "rows": len(head),
        "institutions": len(counts),
        "largest_share": round(ordered[0][1] / max(len(head), 1), 3) if ordered else 0.0,
        "top": [{"institution": k, "count": v} for k, v in ordered[:top]],
        "stevens_share": round(sum(is_source(r, "stevens") for r in head) / max(len(head), 1), 3),
    }

def unit(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    n[n == 0] = 1
    return v / n

def index_benchmark(space: np.ndarray, query_vectors: np.ndarray, k: int = 25, backends=("brute", "kdtree", "hnsw")) -> list[dict]:
    space = unit(np.asarray(space, dtype=np.float64))
    queries = unit(np.atleast_2d(query_vectors).astype(np.float64))
    truth, truth_dist = brute_knn(space, queries, k)
    rows = []
    for backend in backends:
        t0 = time.perf_counter()
        index = build_index(backend, space)
        build = time.perf_counter() - t0
        t0 = time.perf_counter()
        found, found_dist = index.query(queries, k)
        query = (time.perf_counter() - t0) / len(queries)
        index.close()
        rows.append({
            "backend": backend,
            "n": int(space.shape[0]),
            "dim": int(space.shape[1]),
            "k": k,
            "build_ms": round(build * 1000, 3),
            "query_us": round(query * 1e6, 2),
            "tie_aware_recall": round(distance_recall(found_dist, truth_dist, 1e-6), 4),
        })
    return rows

FORMULA_START = ("=", "+", "-", "@", "\t", "\r")

def csv_cell(value):
    if isinstance(value, list):
        value = "; ".join(str(v) for v in value)
    if isinstance(value, str) and value.startswith(FORMULA_START):
        return "'" + value
    return value

def write_csv(rows: list[dict], path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]) if rows else ["rank_cosine"])
        writer.writeheader()
        writer.writerows({k: csv_cell(v) for k, v in row.items()} for row in rows)
    return path

def plot_axes(raw: np.ndarray, qraw: np.ndarray) -> tuple[int, int, np.ndarray, np.ndarray, float]:
    z, zq = score_space(raw, qraw, "whitened")
    order = [int(c) for c in np.argsort(-np.abs(zq))][:2]
    a, b = (order[0], order[1]) if len(order) == 2 else (0, 1)
    share = float((zq[a] ** 2 + zq[b] ** 2) / max(float((zq**2).sum()), 1e-12))
    return a, b, z, zq, share

def plot(model: AdvisorModel, qraw: np.ndarray, rows: list[dict], path: Path, label: int = 25, dpi: int = 150) -> tuple[Path, dict]:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    ink, soft, ochre, bone, panel = "#1F1C16", "#6B6150", "#8A641A", "#EFE8D4", "#E4DCC4"
    raw = model.result.raw_scores
    a, b, z, zq, share = plot_axes(raw, qraw)
    fig = plt.figure(figsize=(9, 8), facecolor=bone)
    ax = fig.add_subplot(111)
    ax.set_facecolor(panel)
    ax.scatter(z[:, a], z[:, b], s=4, color=soft, alpha=0.3, lw=0)
    ids = {r["id"]: r for r in rows[:label]}
    idx = [i for i, pid in enumerate(model.result.doc_ids) if pid in ids]
    ax.scatter(z[idx, a], z[idx, b], s=26, color=ochre, lw=0, zorder=4)
    for i in idx:
        ax.annotate(str(ids[model.result.doc_ids[i]]["rank"]), (z[i, a], z[i, b]), xytext=(3, 2),
                    textcoords="offset points", fontsize=7, color=ink, zorder=5)
    ax.scatter([zq[a]], [zq[b]], marker="*", s=520, color=ochre, edgecolor=ink, lw=0.9, zorder=6)
    ax.annotate("statement", (zq[a], zq[b]), xytext=(10, -14), textcoords="offset points", fontsize=9, color=ink, zorder=6)
    lo_x, hi_x = np.percentile(z[:, a], [0.5, 99.5])
    lo_y, hi_y = np.percentile(z[:, b], [0.5, 99.5])
    ax.set_xlim(min(lo_x, zq[a]) - 0.5, max(hi_x, zq[a]) + 0.5)
    ax.set_ylim(min(lo_y, zq[b]) - 0.5, max(hi_y, zq[b]) + 0.5)
    for spine in ax.spines.values():
        spine.set_color(ink)
        spine.set_alpha(0.3)
    ax.tick_params(colors=soft, labelsize=8)
    ax.grid(color=ink, alpha=0.08, lw=0.5)
    terms = lambda c: ", ".join(t for t, _ in model.result.top_terms(c, 4, sign=1 if zq[c] >= 0 else -1))
    ax.set_xlabel(f"component {a + 1}: {terms(a)}  (sd from the mean)", color=ink, fontsize=9)
    ax.set_ylabel(f"component {b + 1}: {terms(b)}  (sd from the mean)", color=ink, fontsize=9)
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=dpi, facecolor=bone, bbox_inches="tight")
    plt.close(fig)
    info = {
        "components": [a + 1, b + 1],
        "statement_sd": [round(float(zq[a]), 2), round(float(zq[b]), 2)],
        "share_of_statement": round(share, 3),
        "terms": [terms(a), terms(b)],
    }
    return path, info

PAGE = (Path(__file__).parent / "advisor_page.html").read_text(encoding="utf-8")

def publishable_rows(rows: list[dict]) -> list[dict]:
    return [{**r, "email": "", "email_public": False, "image_url": "", "tracker_notes": []} for r in rows]


REVIEW_SCHEMA = "bucket.advisor-review/1"
PRIVATE_ROW_KEYS = ("email", "email_public", "image_url", "tracker_notes", "id")


def review_rows(rows: list[dict]) -> list[dict]:
    return [{k: v for k, v in r.items() if k not in PRIVATE_ROW_KEYS} for r in publishable_rows(rows)]


def write_review_json(rows: list[dict], context: dict, path: Path) -> Path:
    payload = {"schema": REVIEW_SCHEMA, "rows": review_rows(rows), "context": context}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return path


def image_hosts(rows: list[dict]) -> list[str]:
    from urllib.parse import urlparse

    hosts = set()
    for r in rows:
        u = str(r.get("image_url") or "")
        if u.startswith("https://"):
            host = urlparse(u).hostname
            if host and re.fullmatch(r"[a-z0-9.-]+", host):
                hosts.add(host)
    return sorted(hosts)


def csp(hosts: list[str]) -> str:
    img = " ".join(["data:"] + [f"https://{h}" for h in hosts])
    return (f"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src {img}; "
            "connect-src 'none'; base-uri 'none'; form-action 'none'")


def write_page(rows: list[dict], plot_png: Path, context: dict, path: Path, publishable: bool = False, images: bool = False) -> Path:
    import base64

    if publishable:
        rows = publishable_rows(rows)
    if publishable or not images:
        rows = [{**r, "image_url": ""} for r in rows]

    image = "data:image/png;base64," + base64.b64encode(Path(plot_png).read_bytes()).decode("ascii")
    payload = {"rows": rows, "context": context}
    data = json.dumps(payload, ensure_ascii=False).replace("<", "\\u003c")
    page = PAGE.replace("__CSP__", csp(image_hosts(rows))).replace("__IMAGE__", image).replace("__DATA__", data)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(page, encoding="utf-8")
    return path

def statement_body(text: str, stop_heading: str = "## References") -> str:
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if line.strip().lower() == stop_heading.lower():
            return "\n".join(lines[:i])
    return text
