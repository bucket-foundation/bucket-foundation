from __future__ import annotations

import json
import os
import random
import re
import sqlite3
import sys
from collections import Counter, defaultdict

import numpy as np
from scipy import stats

ROOT = os.environ.get("ROOT_GRAPH_DIR", "/home/gian/agfarms/bucket-foundation/_intake/root-graph")
PHOTONS = "/home/gian/agfarms/bucket-foundation/_intake/photons"
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
COG = os.path.join(HERE, "..", "..", "cognate-coverage", "data", "regression.json")
SEED = 4242
BOOT = 2000
MAX_PAIRS = 200_000
PER_SENSE = 20
TOP_SENSES = 1000
MIN_CLASSIFIED = 100
DONORS = {"la", "fr", "en", "grc", "la-med", "la-lat", "la-new", "fro", "frm", "la-ecc"}
IPA_STRIP = re.compile(r"[ˈˌːˑ.\s/\[\]()‿͡ ̯̩̃-]")


def load_forest(db):
    n = db.execute("select max(id) + 1 from node").fetchone()[0]
    parent = np.full(n, -1, np.int64)
    for i, p in db.execute("select node, parent from forest where parent is not null"):
        parent[i] = p
    return parent


def ancestors(parent, x):
    out = {}
    d = 0
    while x != -1 and d < 64:
        out[x] = d
        x = int(parent[x])
        d += 1
    return out


def root_distance(parent, u, v):
    au = ancestors(parent, u)
    d = 0
    x = v
    while x != -1 and d < 64:
        if x in au:
            return au[x] + d
        x = int(parent[x])
        d += 1
    return None


def lev(a, b):
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def phon_sim(a, b):
    a, b = IPA_STRIP.sub("", a), IPA_STRIP.sub("", b)
    if not a or not b:
        return None
    return 1 - lev(a, b) / max(len(a), len(b))


def cluster_boot_spearman(x, y, groups, rng):
    uniq, inv = np.unique(groups, return_inverse=True)
    idx_by = [[] for _ in uniq]
    for i, g in enumerate(inv):
        idx_by[g].append(i)
    idx_by = [np.array(v) for v in idx_by]
    out = []
    for _ in range(BOOT):
        pick = rng.integers(0, len(idx_by), len(idx_by))
        ix = np.concatenate([idx_by[p] for p in pick])
        out.append(stats.spearmanr(x[ix], y[ix])[0])
    return [float(np.nanpercentile(out, 2.5)), float(np.nanpercentile(out, 97.5))]


def wilson(k, n):
    if n == 0:
        return [None, None]
    z = 1.959964
    p = k / n
    c = (p + z * z / (2 * n)) / (1 + z * z / n)
    h = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return [float(c - h), float(c + h)]


def holm(ps):
    order = np.argsort(ps)
    m = len(ps)
    adj = np.empty(m)
    run = 0.0
    for r, i in enumerate(order):
        run = max(run, min(1.0, (m - r) * ps[i]))
        adj[i] = run
    return adj.tolist()


def bh(ps):
    ps = np.asarray(ps)
    m = len(ps)
    order = np.argsort(ps)
    adj = np.empty(m)
    run = 1.0
    for r in range(m - 1, -1, -1):
        i = order[r]
        run = min(run, ps[i] * m / (r + 1))
        adj[i] = run
    return adj.tolist()


def node_classes(db):
    cls = {}
    for node, c in db.execute("select node, cls from lexeme where cls is not null"):
        cls.setdefault(node, c)
    return cls


def main() -> None:
    rng = np.random.default_rng(SEED)
    random.seed(SEED)
    db = sqlite3.connect(os.path.join(ROOT, "graph.sqlite"))
    parent = load_forest(db)
    print("forest loaded", file=sys.stderr, flush=True)
    sense_count = Counter()
    by_sense = defaultdict(list)
    node_lang = {}
    for s, node, lang in db.execute("select t.sense, t.node, n.lang from translation t join node n on n.id = t.node"):
        sense_count[s] += 1
        by_sense[s].append(node)
        node_lang[node] = lang
    ipa = {}
    for node, i in db.execute("select node, ipa from lexeme where ipa is not null"):
        if node in node_lang:
            ipa.setdefault(node, i)
    print("translations loaded", len(by_sense), file=sys.stderr, flush=True)

    vec_rows = {}
    pdb = sqlite3.connect(os.path.join(PHOTONS, "index.sqlite"))
    for lang, surface, row in pdb.execute("select lang, surface, semantic_row from photons where semantic_row is not null"):
        vec_rows[(lang, surface)] = row
    sem = np.memmap(os.path.join(PHOTONS, "semantic-vectors.f32.bin"), np.float32, "r").reshape(-1, 768)
    node_key = {}
    keys = set(vec_rows)
    for i, lang, form in db.execute("select id, lang, form from node"):
        if (lang, form) in keys and i in node_lang:
            node_key[i] = vec_rows[(lang, form)]

    pairs = []
    for s, nodes in by_sense.items():
        nodes = list(dict.fromkeys(nodes))
        cand = [(a, b) for k, a in enumerate(nodes) for b in nodes[k + 1:] if node_lang[a] != node_lang[b]]
        if len(cand) > PER_SENSE:
            cand = random.sample(cand, PER_SENSE)
        pairs.extend((s, a, b) for a, b in cand)
    if len(pairs) > MAX_PAIRS:
        pairs = random.sample(pairs, MAX_PAIRS)
    rows = []
    for s, a, b in pairs:
        d = root_distance(parent, a, b)
        p = phon_sim(ipa[a], ipa[b]) if a in ipa and b in ipa else None
        m = None
        if a in node_key and b in node_key:
            va, vb = sem[node_key[a]], sem[node_key[b]]
            m = float(va @ vb / (np.linalg.norm(va) * np.linalg.norm(vb) + 1e-9))
        rows.append((s, d, p, m))
    print("pairs", len(rows), file=sys.stderr, flush=True)

    t1 = {"pairs_sampled": len(rows), "pairs_related": sum(r[1] is not None for r in rows)}
    for name, col in (("phonetic", 2), ("semantic", 3)):
        sel = [r for r in rows if r[1] is not None and r[col] is not None]
        x = np.array([r[1] for r in sel], float)
        y = np.array([r[col] for r in sel], float)
        g = np.array([r[0] for r in sel])
        rho, p2 = stats.spearmanr(x, y) if len(sel) > 2 else (float("nan"), float("nan"))
        p1 = p2 / 2 if rho < 0 else 1 - p2 / 2
        t1[name] = {"n": len(sel), "rho": float(rho), "p_one_sided": float(p1),
                    "ci95": cluster_boot_spearman(x, y, g, rng) if len(sel) > 50 else None,
                    "by_distance": {int(k): float(np.mean(y[x == k])) for k in np.unique(x)[:12]}}
        rel = np.array([r[col] for r in rows if r[col] is not None and r[1] is not None])
        unrel = np.array([r[col] for r in rows if r[col] is not None and r[1] is None])
        if len(rel) and len(unrel):
            u = stats.mannwhitneyu(rel, unrel, alternative="greater")
            t1[name]["related_vs_unrelated"] = {"n_rel": len(rel), "n_unrel": len(unrel),
                                                "mean_rel": float(rel.mean()), "mean_unrel": float(unrel.mean()),
                                                "rank_biserial": float(2 * u.statistic / (len(rel) * len(unrel)) - 1),
                                                "p": float(u.pvalue)}
    print("t1 done", file=sys.stderr, flush=True)

    cls = node_classes(db)
    top = {s for s, _ in sense_count.most_common(TOP_SENSES)}
    freq_nodes = defaultdict(set)
    for s in top:
        for node in by_sense[s]:
            freq_nodes[node_lang[node]].add(node)
    lang_of = {}
    for i, lang in db.execute("select n.id, n.lang from node n join lexeme l on l.node = n.id"):
        lang_of[i] = lang
    whole = defaultdict(Counter)
    for node, lang in lang_of.items():
        whole[lang][cls.get(node, "none")] += 1
    del lang_of
    t2 = {}
    pvals = []
    for lang, nodes in freq_nodes.items():
        c = Counter(cls.get(n, "none") for n in nodes)
        k_f, n_f = c["bor"], c["bor"] + c["inh"]
        if n_f < MIN_CLASSIFIED:
            continue
        k_w, n_w = whole[lang]["bor"], whole[lang]["bor"] + whole[lang]["inh"]
        if n_w == 0:
            continue
        p_pool = (k_f + k_w) / (n_f + n_w)
        se = np.sqrt(p_pool * (1 - p_pool) * (1 / n_f + 1 / n_w)) or 1e-12
        z = (k_f / n_f - k_w / n_w) / se
        p = float(stats.norm.cdf(z))
        pvals.append(p)
        t2[lang] = {"frequent": dict(c), "n_classified": n_f, "borrowed_share": k_f / n_f, "ci95": wilson(k_f, n_f),
                    "lexicon_borrowed_share": k_w / n_w, "lexicon_n": n_w, "z": float(z), "p": p}
    for (lang, row), q in zip(t2.items(), bh(pvals)):
        row["q_bh"] = q
    fisher = stats.combine_pvalues(pvals, method="fisher") if pvals else None
    t2_summary = {"languages": len(t2), "fisher_stat": float(fisher[0]) if fisher else None,
                  "fisher_p": float(fisher[1]) if fisher else None,
                  "bh_rejections": sum(r["q_bh"] < 0.05 for r in t2.values()),
                  "median_borrowed_share": float(np.median([r["borrowed_share"] for r in t2.values()])) if t2 else None,
                  "frequent_lower_count": sum(r["borrowed_share"] < r["lexicon_borrowed_share"] for r in t2.values())}
    family = defaultdict(list)
    root_lang = {}
    for lang, row in t2.items():
        tops = Counter()
        for n in freq_nodes[lang]:
            if cls.get(n) == "inh":
                x = n
                while parent[x] != -1:
                    x = int(parent[x])
                tops[x] += 1
        if tops:
            r = tops.most_common(1)[0][0]
            root_lang[lang] = db.execute("select lang from node where id = ?", (r,)).fetchone()[0]
            family[root_lang[lang]].append(row["borrowed_share"])
            row["family"] = root_lang[lang]
    t2_family = {f: {"n_languages": len(v), "median": float(np.median(v)),
                     "iqr": [float(np.percentile(v, 25)), float(np.percentile(v, 75))]} for f, v in family.items()}
    print("t2 done", file=sys.stderr, flush=True)

    reg = json.load(open(COG))
    langs = reg["langs"]
    C = np.array(reg["C"])
    en_node = {}
    for s in top:
        w = db.execute("select en_word from sense where id = ?", (s,)).fetchone()[0]
        r = db.execute("select id from node where lang = 'en' and form = ?", (w,)).fetchone()
        if r:
            en_node[s] = r[0]
    node_senses = defaultdict(set)
    for s in top:
        for n in by_sense[s]:
            node_senses[n].add(s)
    g, b, dshare = [], [], []
    for lang in langs:
        nodes = freq_nodes.get(lang, set())
        hit = tot = 0
        bor = inh = don = 0
        for n in nodes:
            pa = ancestors(parent, n)
            pa.pop(n, None)
            ok = False
            for s in node_senses[n]:
                if s in en_node:
                    ea = ancestors(parent, en_node[s])
                    ea.pop(en_node[s], None)
                    if set(pa) & set(ea):
                        ok = True
                        break
            tot += 1
            hit += ok
            c = cls.get(n)
            if c == "inh":
                inh += 1
            elif c == "bor":
                bor += 1
                r = db.execute("select n.lang from edge e join node n on n.id = e.dst where e.src = ? and e.rel = 'bor' order by e.page, e.ord limit 1", (n,)).fetchone()
                don += bool(r and r[0] in DONORS)
        g.append(hit / tot if tot else np.nan)
        b.append(bor / (bor + inh) if bor + inh else np.nan)
        dshare.append(don / tot if tot else np.nan)
    g, b, dshare = map(np.array, (g, b, dshare))
    ok = ~np.isnan(g) & ~np.isnan(b)
    lr = stats.linregress(g[ok], C[ok])
    resid = C[ok] - (lr.intercept + lr.slope * g[ok])
    rho, p = stats.spearmanr(resid, b[ok])
    rho2, p2 = stats.spearmanr(resid, dshare[ok])
    boots = []
    idx = np.arange(ok.sum())
    for _ in range(BOOT):
        ix = rng.choice(idx, len(idx))
        boots.append(stats.spearmanr(resid[ix], b[ok][ix])[0])
    t3 = {"n": int(ok.sum()), "langs": [l for l, k in zip(langs, ok) if k], "g": g[ok].tolist(),
          "borrowed_share": b[ok].tolist(), "donor_share": dshare[ok].tolist(), "C": C[ok].tolist(),
          "step1": {"slope": float(lr.slope), "intercept": float(lr.intercept), "r2": float(lr.rvalue ** 2), "p": float(lr.pvalue)},
          "rho": float(rho), "p": float(p), "ci95": [float(np.nanpercentile(boots, 2.5)), float(np.nanpercentile(boots, 97.5))],
          "secondary_donor": {"rho": float(rho2), "p": float(p2)}}
    print("t3 done", file=sys.stderr, flush=True)

    prim = [t1["phonetic"]["p_one_sided"], t1["semantic"]["p_one_sided"], t2_summary["fisher_p"] or 1.0, t3["p"]]
    out = {"seed": SEED, "T1": t1, "T2": {"summary": t2_summary, "family": t2_family, "languages": t2}, "T3": t3,
           "holm": dict(zip(("T1a", "T1b", "T2", "T3"), holm(prim))), "raw_p": dict(zip(("T1a", "T1b", "T2", "T3"), prim))}
    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, "tests.json"), "w") as fh:
        json.dump(out, fh, indent=1)
    brief = {k: out[k] for k in ("holm", "raw_p")}
    brief["T1"] = {k: {kk: vv for kk, vv in v.items() if kk != "by_distance"} if isinstance(v, dict) else v for k, v in t1.items()}
    brief["T2"] = t2_summary
    brief["T3"] = {k: t3[k] for k in ("n", "step1", "rho", "p", "ci95", "secondary_donor")}
    print(json.dumps(brief, indent=1))


if __name__ == "__main__":
    main()
