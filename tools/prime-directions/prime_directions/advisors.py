from __future__ import annotations

import csv
import html
import json
import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import scipy.sparse as sp
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, CountVectorizer

from .clean import scrub
from .model import PrimeResult, TOKEN_PATTERN, fit_matrix, vectorize
from .neighbors import build_index, brute_knn, distance_recall

TEXT_KEYS = ("text", "abstracts", "titles", "works", "topics", "concepts", "keywords", "interests", "summary")
ID_KEYS = ("id", "openalex_id", "orcid", "email", "name")
NAME_KEYS = ("name", "display_name", "full_name")
FILTER_KEYS = ("field", "country", "funding", "institution", "taking_students")

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

def _first(record: dict, keys) -> str:
    for key in keys:
        value = record.get(key)
        if value not in (None, ""):
            return _flatten(value)
    return ""

def load_people(path: Path, text_keys=TEXT_KEYS, max_chars: int = 60000, allow_partial_tail: bool = True) -> list[Person]:
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
        text = scrub(" \n".join(_flatten(record.get(k)) for k in text_keys if record.get(k)))[:max_chars]
        meta = {k: v for k, v in record.items() if k not in text_keys and not isinstance(v, (dict, list))}
        for k in FILTER_KEYS:
            if isinstance(record.get(k), list):
                meta[k] = "; ".join(_flatten(x) for x in record[k])
        people.append(Person(pid, _first(record, NAME_KEYS) or pid, text, meta))
    return people

@dataclass
class AdvisorModel:
    result: PrimeResult
    vocab: np.ndarray
    idf: np.ndarray
    people: list[Person]
    kept: list[int]

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

def cosine(a: np.ndarray, q: np.ndarray) -> np.ndarray:
    na = np.linalg.norm(a, axis=1)
    nq = np.linalg.norm(q)
    denom = na * nq
    return np.divide(a @ q, denom, out=np.zeros(a.shape[0]), where=denom > 0)

def shared_terms(model: AdvisorModel, query_row: sp.csr_matrix, rows: list[int], n: int = 6) -> list[list[str]]:
    q = query_row.toarray().ravel()
    person = model.embed([model.people[model.kept[r]].text for r in rows])
    out = []
    for r in range(person.shape[0]):
        contrib = person[r].toarray().ravel() * q
        top = np.argsort(-contrib)[:n]
        out.append([str(model.vocab[t]) for t in top if contrib[t] > 0])
    return out

def rank(model: AdvisorModel, query_text: str, top: int = 300) -> tuple[list[dict], np.ndarray]:
    scores = model.result.raw_scores
    qvec = model.project([query_text])[0]
    cos = cosine(scores, qvec)
    euclid = np.linalg.norm(scores - qvec[None, :], axis=1)
    order_cos = np.argsort(-cos, kind="stable")
    order_euc = np.argsort(euclid, kind="stable")
    rank_cos = np.empty(len(cos), dtype=int)
    rank_cos[order_cos] = np.arange(1, len(cos) + 1)
    rank_euc = np.empty(len(cos), dtype=int)
    rank_euc[order_euc] = np.arange(1, len(cos) + 1)
    chosen = [int(i) for i in order_cos[:top]]
    terms = shared_terms(model, model.embed([query_text]), chosen)
    rows = []
    for j, i in enumerate(chosen):
        person = model.people[model.kept[i]]
        rows.append({
            "rank_cosine": int(rank_cos[i]),
            "rank_euclidean": int(rank_euc[i]),
            "cosine": round(float(cos[i]), 5),
            "euclidean": round(float(euclid[i]), 5),
            "id": person.id,
            "name": person.name,
            **{k: person.meta.get(k, "") for k in FILTER_KEYS},
            "email": person.meta.get("email", ""),
            "shared_terms": " ".join(terms[j]),
        })
    return rows, qvec

def unit(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    n[n == 0] = 1
    return v / n

def index_benchmark(model: AdvisorModel, query_vectors: np.ndarray, k: int = 25, backends=("brute", "kdtree", "hnsw")) -> list[dict]:
    space = unit(model.result.raw_scores)
    queries = unit(np.atleast_2d(query_vectors))
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

def write_csv(rows: list[dict], path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]) if rows else ["rank_cosine"])
        writer.writeheader()
        writer.writerows(rows)
    return path

def plot(model: AdvisorModel, qvec: np.ndarray, rows: list[dict], path: Path, label: int = 25, dpi: int = 160) -> tuple[Path, tuple[int, int]]:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from .render import BASALT, BASALT_2, BONE, BONE_DIM, GOLD, GOLD_BRIGHT

    raw = model.result.raw_scores
    std = raw.std(axis=0)
    live = std > 1e-9 * max(float(std.max()), 1e-300)
    std[~live] = 1
    z = (raw - raw.mean(axis=0)) / std
    zq = (qvec - raw.mean(axis=0)) / std
    order = [int(c) for c in np.argsort(-np.abs(zq)) if c != 0 and live[c]][:2]
    a, b = (int(order[0]), int(order[1])) if len(order) == 2 else (0, 1)
    fig = plt.figure(figsize=(12, 10), facecolor=BASALT)
    ax = fig.add_subplot(111)
    ax.set_facecolor(BASALT_2)
    ax.scatter(z[:, a], z[:, b], s=5, color=BONE_DIM, alpha=0.35, lw=0, label="professors")
    ids = {r["id"]: r for r in rows[:label]}
    idx = [i for i, pid in enumerate(model.result.doc_ids) if pid in ids]
    ax.scatter(z[idx, a], z[idx, b], s=22, color=GOLD, alpha=0.95, lw=0, label=f"nearest {len(idx)} by cosine")
    for i in idx:
        ax.annotate(ids[model.result.doc_ids[i]]["name"][:28], (z[i, a], z[i, b]), fontsize=6.5, color=BONE,
                    xytext=(3, 3), textcoords="offset points")
    ax.scatter([zq[a]], [zq[b]], marker="*", s=420, color=GOLD_BRIGHT, edgecolor=BONE, lw=0.8, zorder=5, label="research statement")
    for spine in ax.spines.values():
        spine.set_color(GOLD)
        spine.set_alpha(0.4)
    ax.tick_params(colors=BONE_DIM, labelsize=8)
    terms_a = ", ".join(t for t, _ in model.result.top_terms(a, 4))
    terms_b = ", ".join(t for t, _ in model.result.top_terms(b, 4))
    ax.set_xlabel(f"component {a + 1}: {terms_a} (standardized)", color=BONE)
    ax.set_ylabel(f"component {b + 1}: {terms_b} (standardized)", color=BONE)
    ax.set_title(f"Research statement among {len(raw):,} professors on the two components where it scores highest",
                 color=BONE, fontsize=11)
    ax.legend(frameon=False, labelcolor=BONE, fontsize=8, loc="best")
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=dpi, facecolor=BASALT, bbox_inches="tight")
    plt.close(fig)
    return path, (a + 1, b + 1)

PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Advisor review</title>
<style>
:root{--bg:#1F1C16;--panel:#2A261E;--ink:#EFE8D4;--dim:#A89F88;--gold:#D9A43A}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,sans-serif}
main{max-width:1200px;margin:0 auto;padding:16px}
h1{font-size:20px;margin:8px 0}
.meta{color:var(--dim);font-size:12px}
img{max-width:100%;border:1px solid #3A3529;border-radius:6px}
.filters{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
select,input{background:var(--panel);color:var(--ink);border:1px solid #3A3529;border-radius:4px;padding:6px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:6px;border-bottom:1px solid #3A3529;text-align:left;vertical-align:top}
th{cursor:pointer;color:var(--gold);position:sticky;top:0;background:var(--bg)}
td.num{text-align:right;font-variant-numeric:tabular-nums}
.terms{color:var(--dim);font-size:12px}
.wrap{overflow-x:auto}
</style></head><body><main>
<h1>Advisor review</h1>
<p class="meta">__SUMMARY__</p>
<img src="__PLOT__" alt="PCA projection with the research statement as a star and the nearest professors labeled">
<div class="filters">
<input id="q" placeholder="search name, institution, terms">
__SELECTS__
<span id="count" class="meta"></span>
</div>
<div class="wrap"><table><thead><tr>__HEAD__</tr></thead><tbody id="rows"></tbody></table></div>
</main>
<script id="data" type="application/json">__DATA__</script>
<script>
const rows=JSON.parse(document.getElementById('data').textContent);
const cols=__COLS__;const filters=__FILTERS__;
let sortKey='rank_cosine',asc=true;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
  const q=document.getElementById('q').value.toLowerCase();
  const active=Object.fromEntries(filters.map(f=>[f,document.getElementById('f-'+f).value]));
  let out=rows.filter(r=>filters.every(f=>!active[f]||String(r[f]??'')===active[f]));
  if(q)out=out.filter(r=>[r.name,r.institution,r.field,r.shared_terms].join(' ').toLowerCase().includes(q));
  out.sort((a,b)=>{const x=a[sortKey],y=b[sortKey];const c=(typeof x==='number'&&typeof y==='number')?x-y:String(x).localeCompare(String(y));return asc?c:-c});
  document.getElementById('rows').innerHTML=out.map(r=>'<tr>'+cols.map(c=>{
    const v=r[c];if(c==='email'&&v)return '<td><a style="color:var(--gold)" href="mailto:'+esc(v)+'">'+esc(v)+'</a></td>';
    if(c==='shared_terms')return '<td class="terms">'+esc(v)+'</td>';
    return '<td'+(typeof v==='number'?' class="num"':'')+'>'+esc(v)+'</td>'}).join('')+'</tr>').join('');
  document.getElementById('count').textContent=out.length+' of '+rows.length+' shown';
}
document.querySelectorAll('th').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.k;asc=sortKey===k?!asc:true;sortKey=k;render()}));
document.querySelectorAll('select,input').forEach(e=>e.addEventListener('input',render));
render();
</script></body></html>
"""

def write_page(rows: list[dict], plot_name: str, summary: str, path: Path) -> Path:
    cols = [c for c in ("rank_cosine", "rank_euclidean", "cosine", "euclidean", "name", "institution", "field",
                        "country", "funding", "taking_students", "email", "shared_terms") if any(r.get(c) not in ("", None) for r in rows)]
    filters = [f for f in FILTER_KEYS if any(r.get(f) not in ("", None) for r in rows)]
    selects = []
    for f in filters:
        values = sorted({str(r.get(f)) for r in rows if r.get(f) not in ("", None)})
        opts = "".join(f'<option value="{html.escape(v, quote=True)}">{html.escape(v)}</option>' for v in values)
        selects.append(f'<select id="f-{f}"><option value="">all {html.escape(f.replace("_", " "))}</option>{opts}</select>')
    head = "".join(f'<th data-k="{c}">{html.escape(c.replace("_", " "))}</th>' for c in cols)
    data = json.dumps(rows, ensure_ascii=False).replace("</", "<\\/")
    page = (PAGE.replace("__SUMMARY__", html.escape(summary)).replace("__PLOT__", html.escape(plot_name, quote=True))
            .replace("__SELECTS__", "".join(selects)).replace("__HEAD__", head)
            .replace("__COLS__", json.dumps(cols)).replace("__FILTERS__", json.dumps(filters)).replace("__DATA__", data))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(page, encoding="utf-8")
    return path
