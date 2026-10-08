import math

import numpy as np

M32 = 0xFFFFFFFF
PERMUTATIONS = 10000
SEED = 20261006
STRATUM_FLOOR = 10
SETTLED = ("solved",)


def imul(a, b):
    return (a * b) & M32


def seeded_random(seed):
    state = [seed & M32]

    def draw():
        state[0] = (state[0] + 0x6D2B79F5) & M32
        t = state[0]
        t = imul(t ^ (t >> 15), t | 1)
        t ^= (t + imul(t ^ (t >> 7), t | 61)) & M32
        return ((t ^ (t >> 14)) & M32) / 4294967296

    return draw


def shuffle_in_place(items, random):
    for i in range(len(items) - 1, 0, -1):
        j = math.floor(random() * (i + 1))
        items[i], items[j] = items[j], items[i]
    return items


def round3(x):
    return math.floor(x * 1000 + 0.5) / 1000


def round4(x):
    return math.floor(x * 10000 + 0.5) / 10000


def permutation_p(inside, outside, permutations=PERMUTATIONS, seed=SEED):
    n_in, n_out = len(inside), len(outside)
    observed = abs(sum(inside) / n_in - sum(outside) / n_out)
    pool = [int(b) for b in list(inside) + list(outside)]
    total = sum(pool)
    random = seeded_random(seed)
    hits = 0
    for _ in range(permutations):
        shuffle_in_place(pool, random)
        a = sum(pool[:n_in])
        diff = abs(a / n_in - (total - a) / n_out)
        if diff >= observed - 1e-12:
            hits += 1
    return (hits + 1) / (permutations + 1)


def auc(scores, outcomes):
    s = np.asarray(scores, dtype=float)
    o = np.asarray(outcomes, dtype=bool)
    pos, neg = s[o], s[~o]
    if len(pos) == 0 or len(neg) == 0:
        return None
    greater = (pos[:, None] > neg[None, :]).sum()
    ties = (pos[:, None] == neg[None, :]).sum()
    return float(greater + 0.5 * ties) / (len(pos) * len(neg))


def stratum(name, rows, permutations=PERMUTATIONS, seed=SEED, floor=STRATUM_FLOOR):
    ins = [r for r in rows if r["inside"]]
    outs = [r for r in rows if not r["inside"]]
    resolved_in = sum(1 for r in ins if r["settled"])
    resolved_out = sum(1 for r in outs if r["settled"])
    out = {"name": name, "inside": len(ins), "outside": len(outs), "resolvedInside": resolved_in, "resolvedOutside": resolved_out}
    if len(ins) < floor or len(outs) < floor:
        return {**out, "rateInside": None, "rateOutside": None, "ratio": None, "pValue": None, "belowFloor": True}
    rate_in, rate_out = resolved_in / len(ins), resolved_out / len(outs)
    p = permutation_p([r["settled"] for r in ins], [r["settled"] for r in outs], permutations, seed)
    return {**out, "rateInside": round3(rate_in), "rateOutside": round3(rate_out), "ratio": None if rate_out == 0 else round3(rate_in / rate_out), "pValue": round4(p), "belowFloor": False}


def score_forecast(forecast, status, permutations=PERMUTATIONS, seed=SEED):
    rows = []
    for f in sorted(forecast["rows"], key=lambda r: r["id"]):
        s = status.get(f["id"])
        if s is None:
            raise KeyError(f"forecast {forecast['cutoff']} names {f['id']}, which has no current status")
        rows.append({
            "id": f["id"], "reach": f["reach"], "inside": f["zone"] == "inside", "decided": f["zone"] != "undecided", "sampled": f["zone"] != "unsampled",
            "undatedSolved": bool(s["solved"]) and s["resolved"] is None, "settled": s["status"] in SETTLED,
        })
    sampled = [r for r in rows if r["sampled"] and r["decided"]]
    dated = [r for r in sampled if not r["undatedSolved"]]
    a = auc([r["reach"] for r in sampled], [r["settled"] for r in sampled])
    ad = auc([r["reach"] for r in dated], [r["settled"] for r in dated])
    return {
        "cutoff": forecast["cutoff"],
        "tested": len(rows),
        "unsampled": sum(1 for r in rows if not r["sampled"]),
        "undecided": sum(1 for r in rows if r["sampled"] and not r["decided"]),
        "threshold": round3(forecast["threshold"]),
        "all": stratum("all", sampled, permutations, seed),
        "auc": None if a is None else round3(a),
        "aucRows": len(sampled),
        "undatedRemoved": {"auc": None if ad is None else round3(ad), "aucRows": len(dated), "all": stratum("all, undated solved rows removed", dated, permutations, seed)},
    }
