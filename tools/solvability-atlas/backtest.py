import argparse, csv, json, pathlib
import numpy as np

import claims

HERE = pathlib.Path(__file__).parent
PROBLEMS = HERE / "problems.tsv"
RESULT = HERE / "backtest.json"
PLOT = HERE / "backtest.png"
FORMAL = {"proved": 1.0, "partial": 0.6, "statement": 0.35, "none": 0.1}
WEIGHT_RESOLVED, WEIGHT_FORMAL = 0.55, 0.45
LABELS = {"solvability_score": "Solvability score, contains the outcome", "formal_term_alone": "Formal term, recorded after resolution", "level_reversed": "Level, reversed",
          "market_count": "Market count", "year_posed": "Year posed"}
INK, MUTE, BLUE, RULE, GRID = "#1f2328", "#6b7280", "#2f6db5", "#d0d4da", "#eceef1"


def auc(scores, labels):
    s, y = np.asarray(scores, float), np.asarray(labels, bool)
    pos, neg = s[y], s[~y]
    return round(float(np.mean([(p > n) + 0.5 * (p == n) for p in pos for n in neg])), 3)


def interval(scores, labels, rng, n=2000):
    s, y = np.asarray(scores, float), np.asarray(labels, bool)
    vals = []
    for _ in range(n):
        i = rng.integers(0, len(s), len(s))
        if y[i].any() and (~y[i]).any():
            vals.append(auc(s[i], y[i]))
    return [round(float(np.percentile(vals, 2.5)), 3), round(float(np.percentile(vals, 97.5)), 3)]


def claimed_ids(rows, ledger=None):
    ruling = claims.governing(claims.entries() if ledger is None else ledger)
    return sorted(r["id"] for r in rows if ruling.get(r["id"], {}).get("status") == claims.CLAIMED)


def compute(rows, ledger=None):
    rng = np.random.default_rng(0)
    y = [bool(r["resolved"]) for r in rows]
    level = [int(r["level"]) for r in rows]
    formal = [FORMAL[r["lean"]] for r in rows]
    score = [WEIGHT_RESOLVED * a + WEIGHT_FORMAL * f for a, f in zip(y, formal)]
    markets = [len([m for m in r["market"].split(";") if m]) for r in rows]
    posed = [int(r["posed"]) for r in rows]
    wait = [int(r["resolved"]) - int(r["posed"]) for r in rows if r["resolved"]]
    features = {"solvability_score": score, "formal_term_alone": formal, "level_reversed": [-v for v in level], "year_posed": posed, "market_count": markets}
    table = lambda key: {k: {"problems": sum(1 for r in rows if r[key] == k), "resolved": sum(1 for r, v in zip(rows, y) if r[key] == k and v)} for k in sorted({r[key] for r in rows})}
    return {"problems": len(rows), "resolved": int(sum(y)), "auc": {k: {"auc": auc(v, y), "ci95": interval(v, y, rng)} for k, v in features.items()},
            "by_level": table("level"), "by_branch": table("branch"), "by_lean": table("lean"),
            "years_to_resolution": {"n": len(wait), "median": float(np.median(wait)), "min": min(wait), "max": max(wait)},
            "resolved_since_2000": sum(1 for r in rows if r["resolved"] and int(r["resolved"]) >= 2000),
            "posed_before_resolved_check": all(int(r["resolved"]) >= int(r["posed"]) for r in rows if r["resolved"]),
            "claimed_counted_open": claimed_ids(rows, ledger)}


def plot(result, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    keys = sorted(result["auc"], key=lambda k: result["auc"][k]["auc"])
    values = [result["auc"][k]["auc"] for k in keys]
    fig, ax = plt.subplots(figsize=(9, 4.2), dpi=160)
    ax.barh(range(len(keys)), values, height=0.55, color=BLUE)
    for i, v in enumerate(values):
        ax.annotate(f"{v:.2f}", (v, i), xytext=(8, 0), textcoords="offset points", va="center", color=INK, fontsize=11)
    ax.axvline(0.5, color=MUTE, lw=1, ls=(0, (4, 3)))
    ax.annotate("chance, 0.50", (0.5, len(keys) - 0.5), xytext=(6, 0), textcoords="offset points", color=MUTE, fontsize=10)
    ax.set_yticks(range(len(keys)))
    ax.set_yticklabels([LABELS[k] for k in keys], color=MUTE, fontsize=10)
    ax.set_xlim(0, 1.12)
    ax.set_xlabel("AUC", color=MUTE, fontsize=10)
    ax.set_title(f"Solvability atlas: AUC of each feature against resolved, {result['problems']} problems", color=INK, fontsize=12, loc="left")
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(RULE)
    ax.tick_params(colors=MUTE, length=0)
    ax.grid(axis="x", color=GRID, lw=1)
    ax.set_axisbelow(True)
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plot", action="store_true")
    a = ap.parse_args()
    result = compute(list(csv.DictReader(open(PROBLEMS), delimiter="\t")))
    RESULT.write_text(json.dumps(result, indent=1))
    print(json.dumps(result, indent=1))
    if a.plot:
        plot(result, PLOT)


if __name__ == "__main__":
    main()
