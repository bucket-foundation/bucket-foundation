import hashlib, itertools, json
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as F
from sklearn.linear_model import LogisticRegression
from common import LANGS, VEC, candidates, index, words

MODS = ["script", "char", "phonetic", "meaning"]
RELATED = [("es", "pt"), ("es", "it"), ("fr", "it"), ("de", "nl"), ("sv", "de"), ("cs", "pl"), ("ru", "pl"), ("hi", "sa"), ("ar", "fa"), ("ja", "zh"), ("el", "grc"), ("la", "it")]


def h(s):
    return int(hashlib.sha1(s.encode()).hexdigest()[:8], 16)


def load(lang):
    return {m: np.load(VEC / lang / f"{m}.npy").astype(np.float32) for m in MODS}


def gold_pairs(cand, lang, li, ei):
    g = {}
    for d in cand.get(lang, []):
        if d["k"].startswith("=") or d["w"] not in li:
            continue
        es = {ei[e] for e in d["e"] if e in ei}
        if es:
            g.setdefault(li[d["w"]], set()).update(es)
    return g


def split(lang, g):
    test = {i for i in g if h(lang + str(i)) % 5 == 0}
    return {i: s for i, s in g.items() if i not in test}, {i: s for i, s in g.items() if i in test}


def topk_hits(S, qs, gold, k=10):
    top = np.argpartition(-S, k, axis=1)[:, :k]
    order = np.take_along_axis(top, np.argsort(-np.take_along_axis(S, top, 1), 1), 1)
    p1 = np.mean([order[j, 0] in gold[q] for j, q in enumerate(qs)])
    p10 = np.mean([bool(set(order[j]) & gold[q]) for j, q in enumerate(qs)])
    return float(p1), float(p10)


class Proj(nn.Module):
    def __init__(self, dims, out=256):
        super().__init__()
        self.scale = nn.Parameter(torch.ones(len(dims)))
        self.dims = dims
        self.lin = nn.Linear(sum(dims), out)

    def forward(self, parts):
        x = torch.cat([p * s for p, s in zip(parts, self.scale)], 1)
        return F.normalize(self.lin(x), dim=-1)


def main():
    cand = candidates()
    en = load("en")
    ei = index("en")
    data, golds = {}, {}
    rng = np.random.default_rng(0)
    feats, labels = [], []
    for lang in LANGS:
        data[lang] = load(lang)
        g = gold_pairs(cand, lang, index(lang), ei)
        tr, te = split(lang, g)
        golds[lang] = (tr, te)
        qs = list(tr)[:3000]
        S = data[lang]["meaning"][qs] @ en["meaning"].T
        for j, q in enumerate(qs):
            pos = list(tr[q])[:3]
            hard = [x for x in np.argsort(-S[j])[:12] if x not in tr[q]][:4]
            neg = hard + list(rng.integers(0, len(ei), 4))
            for e, y in [(p, 1) for p in pos] + [(n, 0) for n in neg]:
                feats.append([float(data[lang][m][q] @ en[m][e]) for m in MODS]); labels.append(y)
    lr = LogisticRegression(C=1.0, max_iter=1000).fit(np.array(feats), np.array(labels))
    logistic = dict(zip(MODS, lr.coef_[0].tolist()))
    print("logistic", logistic, flush=True)
    train_sims = []
    for lang in LANGS:
        tr = golds[lang][0]
        qs = sorted(tr, key=lambda q: h("w" + str(q)))[:300]
        if qs:
            train_sims.append((qs, tr, [data[lang][m][qs] @ en[m].T for m in MODS]))
    best = None
    grid = [0, 0.05, 0.1, 0.2, 0.3]
    for ws_ in itertools.product(grid, grid, grid):
        wv = list(ws_) + [1.0]
        hits = sum(topk_hits(sum(wv[i] * S[i] for i in range(4)), qs, tr)[0] * len(qs) for qs, tr, S in train_sims)
        if best is None or hits > best[0]:
            best = (hits, wv)
    weights = dict(zip(MODS, best[1]))
    print("weights", weights, flush=True)

    dims = [en[m].shape[1] for m in MODS]
    proj = Proj(dims).cuda()
    opt = torch.optim.AdamW(proj.parameters(), 1e-3, weight_decay=1e-4)
    T = {m: torch.tensor(en[m], device="cuda") for m in MODS}
    L = {lang: {m: torch.tensor(data[lang][m], device="cuda") for m in MODS} for lang in LANGS}
    pairs = [(lang, q, e) for lang in LANGS for q, es in golds[lang][0].items() for e in list(es)[:2]]
    torch.manual_seed(0)
    g = torch.Generator().manual_seed(0)
    if (VEC / "joint_proj.pt").exists():
        proj.load_state_dict(torch.load(VEC / "joint_proj.pt"))
    for step in range(0 if (VEC / "joint_proj.pt").exists() else 4000):
        idx = torch.randint(0, len(pairs), (1024,), generator=g).tolist()
        batch = [pairs[i] for i in idx]
        qa = [torch.stack([L[l][m][q] for l, q, _ in batch]) for m in MODS]
        eb = torch.tensor([e for _, _, e in batch], device="cuda")
        za, zb = proj(qa), proj([T[m][eb] for m in MODS])
        logits = za @ zb.T / 0.05
        y = torch.arange(len(batch), device="cuda")
        same = eb[:, None] == eb[None, :]
        logits = logits.masked_fill(same & ~torch.eye(len(batch), dtype=torch.bool, device="cuda"), -1e4)
        loss = (F.cross_entropy(logits, y) + F.cross_entropy(logits.T, y)) / 2
        opt.zero_grad(); loss.backward(); opt.step()
        if step % 1000 == 0:
            print("proj", step, loss.item(), flush=True)
    torch.save(proj.state_dict(), VEC / "joint_proj.pt")

    @torch.no_grad()
    def project(lang):
        src = T if lang == "en" else L[lang]
        n = src["meaning"].shape[0]
        return torch.cat([proj([src[m][i:i + 8192] for m in MODS]) for i in range(0, n, 8192)]).cpu().numpy()

    J = {"en": project("en")}
    np.save(VEC / "en" / "joint.npy", J["en"].astype(np.float16))
    w = np.array([weights[m] for m in MODS])
    report = {"weights": weights, "logistic": logistic, "bli": {}, "related": {}}
    for lang in LANGS:
        J[lang] = project(lang)
        np.save(VEC / lang / "joint.npy", J[lang].astype(np.float16))
        te = golds[lang][1]
        qs = sorted(te, key=lambda q: h(str(q)))[:1000]
        if not qs:
            continue
        r = {}
        sims = {m: data[lang][m][qs] @ en[m].T for m in MODS}
        for m in MODS:
            r[m] = topk_hits(sims[m], qs, te)
        r["weighted"] = topk_hits(sum(w[i] * sims[m] for i, m in enumerate(MODS)), qs, te)
        r["projection"] = topk_hits(J[lang][qs] @ J["en"].T, qs, te)
        r["n"] = len(qs)
        report["bli"][lang] = r
        print(lang, json.dumps(r), flush=True)
    for a, b in RELATED:
        ga, gb = golds[a][1], {**golds[b][0], **golds[b][1]}
        inv = {}
        for q, es in gb.items():
            for e in es:
                inv.setdefault(e, set()).add(q)
        gold = {q: set().union(*[inv.get(e, set()) for e in es]) for q, es in ga.items()}
        gold = {q: s for q, s in gold.items() if s}
        qs = sorted(gold, key=lambda q: h(str(q)))[:1000]
        if not qs:
            continue
        r = {}
        sims = {m: data[a][m][qs] @ data[b][m].T for m in MODS}
        for m in MODS:
            r[m] = topk_hits(sims[m], qs, gold)
        r["weighted"] = topk_hits(sum(w[i] * sims[m] for i, m in enumerate(MODS)), qs, gold)
        r["projection"] = topk_hits(J[a][qs] @ J[b].T, qs, gold)
        r["n"] = len(qs)
        report["related"][f"{a}-{b}"] = r
        print(a, b, json.dumps(r), flush=True)
    json.dump(report, open(VEC / "joint_report.json", "w"), indent=1)


if __name__ == "__main__":
    main()
