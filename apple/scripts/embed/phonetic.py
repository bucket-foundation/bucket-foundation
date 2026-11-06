import hashlib, json, unicodedata
import numpy as np
import regex
import panphon
import torch, torch.nn as nn
from common import LANGS, ROOT, VEC, words
from script import char_vectors

FT = panphon.FeatureTable()
NF = len(FT.names)
BINS = 4
DIM = NF * BINS
HASH = 1 << 18
SMALL_KANA = set("ゃゅょぁぃぅぇぉっャュョァィゥェォッー")
_seg = {}


def h(s):
    return int(hashlib.sha1(s.encode()).hexdigest()[:8], 16)


def seg_vecs(tok):
    v = _seg.get(tok)
    if v is None:
        v = _seg[tok] = [np.array(x, np.float32) for x in FT.word_to_vector_list(tok, numeric=True)]
    return v


def ipa_vector(ipa):
    segs = [v for tok in ipa.split() for v in seg_vecs(tok)]
    if not segs:
        return None
    n = len(segs)
    out = np.zeros((BINS, NF), np.float32)
    cnt = np.zeros(BINS, np.float32)
    for j, v in enumerate(segs):
        lo, hi = j * BINS / n, (j + 1) * BINS / n
        for b in range(BINS):
            w = max(0.0, min(hi, b + 1) - max(lo, b))
            out[b] += w * v
            cnt[b] += w
    return (out / np.maximum(cnt, 1e-6)[:, None]).ravel()


def units(w, lang):
    w = w.lower()
    if lang == "ko":
        return [c for c in unicodedata.normalize("NFD", w) if not c.isspace()]
    if lang == "zh":
        from pypinyin import lazy_pinyin, Style
        ini = lazy_pinyin(w, style=Style.INITIALS, strict=False)
        fin = lazy_pinyin(w, style=Style.FINALS, strict=False)
        return [u for a, b in zip(ini, fin) for u in (f"i:{a}", f"f:{b}")]
    out = []
    for c in regex.findall(r"\X", w):
        if c.isspace():
            continue
        if lang == "ja" and out and c in SMALL_KANA:
            out[-1] += c
        else:
            out.append(c)
    return out


def feats(w, lang):
    u = units(w, lang)
    n = len(u)
    toks = []
    for j, x in enumerate(u):
        toks += [x, f"{x}@{j * BINS // max(n, 1)}"]
        if j + 1 < n:
            toks.append(f"{x}+{u[j + 1]}")
    if u:
        toks += [f"^{u[0]}", f"{u[-1]}$"]
    return toks


def bags(ws, lang):
    ids, offs = [], []
    for w in ws:
        offs.append(len(ids))
        ids += [h(t) % HASH for t in feats(w, lang)] or [0]
    return torch.tensor(ids, device="cuda"), torch.tensor(offs, device="cuda")


class G2P:
    def __init__(self):
        torch.manual_seed(0)
        self.bag = nn.EmbeddingBag(HASH, DIM, mode="mean").cuda()
        nn.init.zeros_(self.bag.weight)
        self.bias = nn.Parameter(torch.zeros(DIM, device="cuda"))

    def fit(self, ws, Y, lang, epochs=8, bs=4096):
        opt = torch.optim.Adam(list(self.bag.parameters()) + [self.bias], 0.05)
        Yt = torch.tensor(Y, device="cuda")
        g = torch.Generator().manual_seed(0)
        for _ in range(epochs):
            perm = torch.randperm(len(ws), generator=g).tolist()
            for i in range(0, len(ws), bs):
                b = perm[i:i + bs]
                ids, offs = bags([ws[j] for j in b], lang)
                loss = ((self.bag(ids, offs) + self.bias - Yt[b]) ** 2).mean() + 1e-6 * (self.bag.weight ** 2).sum()
                opt.zero_grad(); loss.backward(); opt.step()
        return self

    @torch.no_grad()
    def predict(self, ws, lang, bs=8192):
        out = [(self.bag(*bags(ws[i:i + bs], lang)) + self.bias).cpu().numpy() for i in range(0, len(ws), bs)]
        return np.concatenate(out) if out else np.zeros((0, DIM), np.float32)


def wikipron(lang):
    p = ROOT / "wikipron" / f"{lang}.tsv"
    files = [p] + ([ROOT / "wikipron" / "ja2.tsv", ROOT / "wikipron" / "ja3.tsv"] if lang == "ja" else [])
    d = {}
    for f in files:
        if not f.exists():
            continue
        for line in open(f, encoding="utf-8"):
            parts = line.rstrip("\n").split("\t")
            if len(parts) == 2:
                d.setdefault(parts[0].lower(), parts[1])
    return d


def norm(a):
    return a / np.maximum(np.linalg.norm(a, axis=1, keepdims=True), 1e-6)


def recall(q, pool, gold, k=10, exclude=None):
    s = q @ pool.T
    if exclude is not None:
        for i, x in enumerate(exclude):
            if x >= 0:
                s[i, x] = -9
    top = np.argsort(-s, axis=1)[:, :k]
    return float(np.mean([g in t[:1] for g, t in zip(gold, top)])), float(np.mean([g in t for g, t in zip(gold, top)]))


def main():
    report = {}
    for lang in ["en"] + LANGS:
        wp = wikipron(lang)
        items = sorted(wp.items(), key=lambda x: h(x[0]))[:150000]
        ws, Y = [], []
        for w, ipa in items:
            v = ipa_vector(ipa)
            if v is not None:
                ws.append(w); Y.append(v)
        vocab = words(lang)
        P = np.zeros((len(vocab), DIM), np.float32)
        has = np.zeros(len(vocab), bool)
        r = {"wikipron": len(ws)}
        if len(ws) >= 200:
            Y = np.stack(Y)
            test = np.array([h("t" + w) % 10 == 0 for w in ws])
            reg = G2P().fit([w for w, t in zip(ws, test) if not t], Y[~test], lang)
            tw = [w for w, t in zip(ws, test) if t][:3000]
            pred = norm(reg.predict(tw, lang))
            true = norm(Y[test][:3000])
            r["g2p_cos"] = float(np.mean(np.sum(pred * true, 1)))
            r["g2p_r1"], r["g2p_r10"] = recall(pred, true, list(range(len(tw))))
            reg = G2P().fit(ws, Y, lang)
            P = reg.predict(vocab, lang).astype(np.float32)
            lut = dict(zip(ws, Y))
            for i, w in enumerate(vocab):
                v = lut.get(w.lower())
                if v is not None:
                    P[i] = v; has[i] = True
            groups = {}
            for w, ipa in items:
                groups.setdefault(ipa.replace(" ", ""), []).append(w)
            pairs = [(g[0], g[1]) for g in groups.values() if len(g) >= 2 and g[0] != g[1]][:1000]
            if len(pairs) >= 30:
                pool_w = list(dict.fromkeys([b for _, b in pairs] + [w for w, _ in items[:20000]]))
                pos = {w: i for i, w in enumerate(pool_w)}
                qa = [a for a, _ in pairs]
                gold = [pos[b] for _, b in pairs]
                ex = [pos.get(a, -1) for a in qa]
                qp, pp = norm(reg.predict(qa, lang)), norm(reg.predict(pool_w, lang))
                r["homophone_pairs"] = len(pairs)
                r["homophone_phon_r1"], r["homophone_phon_r10"] = recall(qp, pp, gold, exclude=ex)
                r["homophone_char_r1"], r["homophone_char_r10"] = recall(char_vectors(qa), char_vectors(pool_w), gold, exclude=ex)
        r["vocab_with_ipa"] = int(has.sum())
        r["vocab"] = len(vocab)
        np.save(VEC / lang / "phonetic.npy", norm(P).astype(np.float16))
        np.save(VEC / lang / "phonetic_has_ipa.npy", has)
        report[lang] = r
        print(lang, json.dumps(r), flush=True)
    json.dump(report, open(VEC / "phonetic_report.json", "w"), indent=1)


if __name__ == "__main__":
    main()
