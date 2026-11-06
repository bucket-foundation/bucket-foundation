import hashlib, json, random, unicodedata, urllib.request
import numpy as np
import torch
from common import ROOT, VEC, words
from script import Net, char_vectors, embed, render

PREFIX = {"LATIN": "Latn", "GREEK": "Grek", "CYRILLIC": "Cyrl", "ARABIC": "Arab", "HEBREW": "Hebr", "DEVANAGARI": "Deva",
          "TAMIL": "Taml", "THAI": "Thai", "CJK": "Hans", "HANGUL": "Kore", "HIRAGANA": "Jpan", "KATAKANA": "Jpan", "DIGIT": "Latn"}
FUZZY = {"es": "Latn", "de": "Latn", "ru": "Cyrl", "el": "Grek", "ar": "Arab", "he": "Hebr", "hi": "Deva", "ta": "Taml", "th": "Thai", "ja": "Jpan", "zh": "Hans", "ko": "Kore"}


def script_of_char(c):
    try:
        n = unicodedata.name(c)
    except ValueError:
        return None
    for p, s in PREFIX.items():
        if n.startswith(p):
            return s
    return None


def confusables():
    path = ROOT / "confusables.txt"
    if not path.exists():
        urllib.request.urlretrieve("https://www.unicode.org/Public/security/latest/confusables.txt", path)
    pairs = []
    for line in open(path, encoding="utf-8-sig"):
        line = line.split("#")[0].strip()
        if not line:
            continue
        a, b = [x.strip() for x in line.split(";")[:2]]
        a = "".join(chr(int(x, 16)) for x in a.split())
        b = "".join(chr(int(x, 16)) for x in b.split())
        if len(a) == 1 and len(b) == 1 and a != b and script_of_char(a) and script_of_char(b) and unicodedata.category(a)[0] == "L":
            pairs.append((a, b))
    return pairs


def vecs(net, items):
    by = {}
    for i, (c, s) in enumerate(items):
        by.setdefault(s, []).append(i)
    out = np.zeros((len(items), 64), np.float32)
    pix = np.zeros((len(items), 32 * 128), np.float32)
    for s, idx in by.items():
        out[idx] = embed(net, [items[i][0] for i in idx], s)
        pix[idx] = np.stack([render(items[i][0], s).ravel() for i in idx]).astype(np.float32)
    pix -= pix.mean(1, keepdims=True)
    pix /= np.maximum(np.linalg.norm(pix, axis=1, keepdims=True), 1e-6)
    return out, pix


def ranks(V, qi, gi):
    S = V[qi] @ V.T
    S[np.arange(len(qi)), qi] = -9
    g = S[np.arange(len(qi)), gi][:, None]
    r = (S > g).sum(1) + 1
    return {"r1": float(np.mean(r <= 1)), "r10": float(np.mean(r <= 10)), "mrr": float(np.mean(1 / r))}


def main():
    net = Net().cuda(); net.load_state_dict(torch.load(VEC / "script_cnn.pt")); net.eval()
    pairs = confusables()
    chars = {}
    for a, b in pairs:
        chars.setdefault(a, script_of_char(a)); chars.setdefault(b, script_of_char(b))
    for lang, s in FUZZY.items():
        for w in words(lang)[:3000]:
            for c in w:
                if unicodedata.category(c)[0] == "L" and script_of_char(c):
                    chars.setdefault(c, script_of_char(c))
    items = sorted(chars.items())
    pos = {c: i for i, (c, _) in enumerate(items)}
    V, P = vecs(net, items)
    C = char_vectors([c for c, _ in items])
    qi = np.array([pos[a] for a, _ in pairs]); gi = np.array([pos[b] for _, b in pairs])
    report = {"confusables": {"pairs": len(pairs), "pool": len(items), "cnn": ranks(V, qi, gi), "pixels": ranks(P, qi, gi), "char": ranks(C, qi, gi)}}
    print(json.dumps(report), flush=True)
    conf = {}
    for a, b in pairs:
        conf.setdefault(a, []).append(b); conf.setdefault(b, []).append(a)
    rnd = random.Random(0)
    report["fuzzy"] = {}
    for lang, s in FUZZY.items():
        ws = words(lang)
        alpha = sorted({c for w in ws for c in w if unicodedata.category(c)[0] == "L"})
        idx = [i for i in sorted(range(len(ws)), key=lambda i: hashlib.sha1(ws[i].encode()).hexdigest()) if len(ws[i]) >= 4][:1000]
        V = np.load(VEC / lang / "script.npy").astype(np.float32)
        C = np.load(VEC / lang / "char.npy").astype(np.float32)
        r = {}
        for kind in ("edit", "confusable"):
            qs, gold = [], []
            for i in idx:
                w = list(ws[i]); j = rnd.randrange(len(w))
                if kind == "edit":
                    if rnd.random() < 0.5:
                        w[j] = rnd.choice(alpha)
                    else:
                        del w[j]
                else:
                    opts = [k for k, c in enumerate(w) if c in conf]
                    if not opts:
                        continue
                    k = rnd.choice(opts); w[k] = rnd.choice(conf[w[k]])
                q = "".join(w)
                if q != ws[i]:
                    qs.append(q); gold.append(i)
            if len(qs) < 50:
                continue
            qv, qc = embed(net, qs, s), char_vectors(qs)
            gold = np.array(gold)
            out = {"n": len(qs)}
            for name, S in (("cnn", qv @ V.T), ("char", qc @ C.T), ("fused", qv @ V.T + qc @ C.T)):
                g = S[np.arange(len(qs)), gold][:, None]
                rk = (S > g).sum(1) + 1
                out[name] = {"r1": float(np.mean(rk <= 1)), "r10": float(np.mean(rk <= 10))}
            r[kind] = out
        report["fuzzy"][lang] = r
        print(lang, json.dumps(r), flush=True)
    json.dump(report, open(VEC / "script_report.json", "w"), indent=1)


if __name__ == "__main__":
    main()
