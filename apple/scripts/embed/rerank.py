import itertools, json, math, re, sys
from pathlib import Path
import numpy as np
import pyarrow as pa, pyarrow.parquet as pq
from common import LANGS, OUT, ROOT, VEC, candidates, index
import pyeval

MODS = ["script", "char", "phonetic", "meaning"]


def gloss_senses(g):
    out = []
    for x in (g or "").split("; ")[:3]:
        x = x.strip()
        if x and x.lower() not in [o.lower() for o in out]:
            out.append(x)
    return out


def gloss_vectors(cand):
    path = OUT / "gloss_vec.npy"
    strings = sorted({x for lang in LANGS for d in cand.get(lang, []) if not d["k"].startswith("=") for x in gloss_senses(d["g"])})
    if path.exists() and (OUT / "gloss_strings.json").exists() and json.load(open(OUT / "gloss_strings.json")) == strings:
        return {x: i for i, x in enumerate(strings)}, np.load(path).astype(np.float32)
    from meaning import model
    m = model()
    v = m.encode([re.sub(r"\s*\([^)]*\)", "", x) or x for x in strings], batch_size=1024, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False)
    np.save(path, v.astype(np.float16)); json.dump(strings, open(OUT / "gloss_strings.json", "w"), ensure_ascii=False)
    return {x: i for i, x in enumerate(strings)}, v.astype(np.float32)


def pair_table(cand):
    gi, G = gloss_vectors(cand)
    ei = index("en")
    E = {m: np.load(VEC / "en" / f"{m}.npy").astype(np.float32) for m in MODS + ["joint"]}
    w = json.load(open(VEC / "joint_report.json"))["weights"]
    tables = {}
    for lang in LANGS:
        li = index(lang)
        A = {m: np.load(VEC / lang / f"{m}.npy").astype(np.float32) for m in MODS + ["joint"]}
        rows = {"lang": [], "key": [], "word": [], "english": [], "direction": [], "freq_rank": []}
        wi, xi = [], []
        for d in cand.get(lang, []):
            rev = d["k"].startswith("=")
            for j, x in enumerate(d["e"]):
                fw, en = (x, d["w"]) if rev else (d["w"], x)
                if fw not in li or en not in ei:
                    continue
                rows["lang"].append(lang); rows["key"].append(d["k"]); rows["word"].append(fw); rows["english"].append(en)
                rows["direction"].append("en>xx" if rev else "xx>en"); rows["freq_rank"].append(j)
                wi.append(li[fw]); xi.append(ei[en])
        wi, xi = np.array(wi, int), np.array(xi, int)
        for m in MODS + ["joint"]:
            rows[f"cos_{m}"] = (A[m][wi] * E[m][xi]).sum(1) if len(wi) else np.zeros(0)
        rows["weighted"] = sum(w[m] * rows[f"cos_{m}"] for m in MODS)
        gk, gw, gs, gj, gwi, ggi = [], [], [], [], [], []
        for d in cand.get(lang, []):
            if d["k"].startswith("=") or d["w"] not in li:
                continue
            for j, x in enumerate(gloss_senses(d["g"])):
                gk.append(d["k"]); gw.append(d["w"]); gs.append(x); gj.append(j); gwi.append(li[d["w"]]); ggi.append(gi[x])
        gm = (A["meaning"][np.array(gwi, int)] * G[np.array(ggi, int)]).sum(1) if gwi else np.zeros(0)
        n = len(gk)
        rows["lang"] += [lang] * n; rows["key"] += gk; rows["word"] += gw; rows["english"] += gs
        rows["direction"] += ["xx>gloss"] * n; rows["freq_rank"] += gj
        for m in MODS + ["joint"]:
            rows[f"cos_{m}"] = np.concatenate([rows[f"cos_{m}"], gm if m == "meaning" else np.full(n, np.nan)])
        rows["weighted"] = np.concatenate([rows["weighted"], gm])
        tables[lang] = rows
    return tables


_freq = {}


def freq(lang):
    if lang not in _freq:
        sys.path.insert(0, str(Path(__file__).parent.parent / "translate"))
        from build_lexicon import freq_list
        _freq[lang] = freq_list(lang, 60000)
    return _freq[lang]


def prior(lang, w):
    r = freq(lang).get(w.lower())
    return 0.0 if r is None else 1 - math.log1p(r) / math.log1p(60000)


def order(cand, tables, scorer, beta, tau, rel, gloss=False, bonus=0.0, gamma=0.0, rbeta=None):
    out = {}
    rbeta = beta if rbeta is None else rbeta
    for lang in LANGS:
        t = tables[lang]
        sim, gsim = {}, {}
        for k, fw, en, dr, s, sm in zip(t["key"], t["word"], t["english"], t["direction"], t[scorer], t["cos_meaning"]):
            if dr == "xx>gloss":
                gsim[(k, en)] = float(sm)
            else:
                sim[(k, en if not k.startswith("=") else fw)] = float(s)
        o = {}
        for d in cand.get(lang, []):
            rev = d["k"].startswith("=")
            scored = []
            for j, x in enumerate(d["e"]):
                s = sim.get((d["k"], x))
                if s is None:
                    s = -1.0
                if rev:
                    same = x.lower() == d["w"].lower() and len(d["e"]) > 1
                    scored.append((s - rbeta * math.log1p(j) + gamma * prior(lang, x) - (9 if same else 0), s, x))
                else:
                    scored.append((s - beta * math.log1p(j), s, x))
            if gloss and not rev:
                have = {x.lower() for _, _, x in scored}
                for j, x in enumerate(gloss_senses(d["g"])):
                    s = gsim.get((d["k"], x))
                    if s is not None and x.lower() not in have:
                        scored.append((s - beta * math.log1p(j) + (bonus if j == 0 else 0), s, x))
            if not scored:
                continue
            best = max(s for _, s, _ in scored)
            if rev:
                keep = [x for _, s, x in sorted(scored, key=lambda z: -z[0])]
            else:
                keep = [x for _, s, x in sorted(scored, key=lambda z: -z[0]) if s >= tau and s >= best - rel]
            o[d["k"]] = keep
        out[lang] = o
    return out


_lex = {}


def base_lexicon(p):
    if p not in _lex:
        _lex[p] = pyeval.load(p)
    return _lex[p]


def simulate(cand, ordered, part, strict=False):
    res = {}
    for lang in LANGS:
        p = ROOT / "lexicon" / f"{lang}.tsv.z"
        rows = pyeval.eval_set(lang).get("aligned", [])
        if part is not None:
            rows = rows[part::2]
        if not p.exists() or not rows:
            continue
        entries, exact, loose = base_lexicon(p)
        o = ordered.get(lang, {})
        gl = {d["k"]: d for d in cand.get(lang, []) if not d["k"].startswith("=")}
        patched = []
        for w, eng, g, lemma in entries:
            k = pyeval.key(w)
            if lemma is None and k in o:
                d = gl[k]
                eng = o[k][:4]
                g = "; ".join(d["g"].split("; ")[:3]) if d["g"] else None
                if not eng and not g:
                    eng = d["e"][:1]
            patched.append((w, eng, g, lemma))
        lex = (patched, exact, loose)
        n = a = r = 0
        for w, refs in rows:
            n += 1
            ans = pyeval.answer(lex, w)
            if ans:
                a += 1; r += pyeval.aligned_ok(ans.split(";")[0] if strict else ans, refs)
        res[lang] = (n, a, r)
    return res


def rev_accuracy(cand, o, part):
    import regression
    g = json.load(open(OUT / "en_gold.json"))
    words = regression.common_words()[part::2]
    res = regression.score(cand, o, g, words)
    return sum(x["right"] for x in res.values()) / max(sum(x["n"] for x in res.values()), 1)


def main():
    cand = candidates()
    tables = pair_table(cand)
    base = simulate(cand, {}, 0, True)
    bp, bc = pyeval.table(base)
    print("dev baseline strict", round(bp * 100, 1), round(bc * 100, 1), flush=True)
    grid = []
    for scorer, beta, tau, rel, gloss, bonus in itertools.product(["cos_meaning", "cos_joint"], [0, 0.05], [-1, 0.2, 0.3], [9, 0.2], [False, True], [0, 0.05, 0.1]):
        if bonus and not gloss:
            continue
        o = order(cand, tables, scorer, beta, tau, rel, gloss, bonus)
        p, c = pyeval.table(simulate(cand, o, 0, True))
        p2, _ = pyeval.table(simulate(cand, o, 0))
        grid.append({"scorer": scorer, "beta": beta, "tau": tau, "rel": rel, "gloss": gloss, "bonus": bonus, "dev_first_sense": p, "dev_precision": p2, "dev_coverage": c})
        print(json.dumps(grid[-1]), flush=True)
    ok = [g for g in grid if g["dev_coverage"] >= bc - 1e-9]
    best = max(ok, key=lambda g: g["dev_first_sense"])
    rgrid = []
    for rbeta, gamma in itertools.product([0, 0.05, 0.1], [0, 0.1, 0.2, 0.3, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0]):
        o = order(cand, tables, best["scorer"], best["beta"], best["tau"], best["rel"], best["gloss"], best["bonus"], gamma, rbeta)
        rgrid.append({"rbeta": rbeta, "gamma": gamma, "dev_rev_first": rev_accuracy(cand, o, 0)})
        print(json.dumps(rgrid[-1]), flush=True)
    rbest = max(rgrid, key=lambda g: g["dev_rev_first"])
    best.update(rbest)
    o = order(cand, tables, best["scorer"], best["beta"], best["tau"], best["rel"], best["gloss"], best["bonus"], best["gamma"], best["rbeta"])
    test_base = pyeval.table(simulate(cand, {}, 1)) + pyeval.table(simulate(cand, {}, 1, True))
    test_new = pyeval.table(simulate(cand, o, 1)) + pyeval.table(simulate(cand, o, 1, True))
    best["test_rev_first_before"] = rev_accuracy(cand, None, 1)
    best["test_rev_first_after"] = rev_accuracy(cand, o, 1)
    json.dump(o, open(OUT / "order.json", "w"), ensure_ascii=False)
    per = {}
    for part in (0, 1):
        b, a = simulate(cand, {}, part, True), simulate(cand, o, part, True)
        ba, aa = simulate(cand, {}, part), simulate(cand, o, part)
        for lang in b:
            per.setdefault(lang, {})["even" if part == 0 else "odd"] = {"n": b[lang][0], "first_before": b[lang][2] / max(b[lang][1], 1), "first_after": a[lang][2] / max(a[lang][1], 1), "any_before": ba[lang][2] / max(ba[lang][1], 1), "any_after": aa[lang][2] / max(aa[lang][1], 1)}
    for lang, t in tables.items():
        kept = set()
        for k, xs in o[lang].items():
            for r, x in enumerate(xs):
                kept.add((k, x, r))
        rank = {(k, x): r for k, x, r in kept}
        t["new_rank"] = [rank.get((k, en if not k.startswith("=") else fw), -1) for k, fw, en in zip(t["key"], t["word"], t["english"])]
        t["freq_rank"] = np.array(t["freq_rank"], np.int32)
        t["kept"] = [r >= 0 for r in t["new_rank"]]
        pq.write_table(pa.table({c: (v if not isinstance(v, np.ndarray) else v.astype(np.float32)) for c, v in t.items()}), VEC / lang / "pairs.parquet")
    json.dump({"best": best, "dev_baseline_first_sense": [bp, bc], "test_baseline": test_base, "test_rerank": test_new, "grid": grid, "rev_grid": rgrid, "per_language": per},
              open(VEC / "rerank_report.json", "w"), indent=1)
    print("best", best, "test", test_base, test_new)


if __name__ == "__main__":
    main()
