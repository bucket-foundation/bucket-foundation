from __future__ import annotations

import json
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
INK = "#1f2937"
BLUE = "#2563eb"
ORANGE = "#d97706"
GRID = "#e5e7eb"


def style(ax):
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", color=GRID, lw=0.6)
    ax.set_axisbelow(True)


def distance_curve(t):
    fig, ax = plt.subplots(figsize=(6, 3.2))
    for name, color in (("phonetic", BLUE), ("semantic", ORANGE)):
        bd = t["T1"][name]["by_distance"]
        ks = sorted(int(k) for k in bd)
        ax.plot(ks, [bd[str(k)] for k in ks], "o-", color=color, label=f"{name} similarity")
        rv = t["T1"][name].get("related_vs_unrelated")
        if rv:
            ax.axhline(rv["mean_unrel"], color=color, ls=":", lw=1)
    ax.set_xlabel("root distance, inheritance steps to the shared ancestor")
    ax.set_ylabel("mean similarity")
    ax.legend(frameon=False)
    style(ax)
    fig.tight_layout()
    fig.savefig(os.path.join(HERE, "fig_distance.png"), dpi=200)


def borrowed_share(t):
    rows = sorted(t["T2"]["languages"].items(), key=lambda kv: -kv[1]["n_classified"])[:40]
    rows.sort(key=lambda kv: kv[1]["borrowed_share"])
    fig, ax = plt.subplots(figsize=(6, 7))
    y = np.arange(len(rows))
    share = [r["borrowed_share"] for _, r in rows]
    lo = [r["borrowed_share"] - r["ci95"][0] for _, r in rows]
    hi = [r["ci95"][1] - r["borrowed_share"] for _, r in rows]
    ax.errorbar(share, y, xerr=[lo, hi], fmt="o", color=BLUE, ms=4, lw=1, label="frequent vocabulary")
    ax.plot([r["lexicon_borrowed_share"] for _, r in rows], y, "|", color=ORANGE, ms=9, mew=2, label="whole lexicon")
    ax.set_yticks(y, [k for k, _ in rows], fontsize=7)
    ax.set_xlabel("borrowed / (borrowed + inherited)")
    ax.legend(frameon=False, loc="lower right")
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="x", color=GRID, lw=0.6)
    fig.tight_layout()
    fig.savefig(os.path.join(HERE, "fig_borrowed.png"), dpi=200)


def residuals(t):
    t3 = t["T3"]
    g, c, b = map(np.array, (t3["g"], t3["C"], t3["borrowed_share"]))
    r = c - (t3["step1"]["intercept"] + t3["step1"]["slope"] * g)
    fig, ax = plt.subplots(figsize=(5, 3.4))
    ax.scatter(b, r, color=BLUE, s=18)
    for x, y, l in zip(b, r, t3["langs"]):
        ax.annotate(l, (x, y), fontsize=7, xytext=(3, 2), textcoords="offset points", color=INK)
    ax.axhline(0, color=GRID)
    ax.set_xlabel("borrowed share of frequent vocabulary")
    ax.set_ylabel("cognate coverage residual")
    style(ax)
    fig.tight_layout()
    fig.savefig(os.path.join(HERE, "fig_residuals.png"), dpi=200)


def main():
    t = json.load(open(os.path.join(DATA, "tests.json")))
    distance_curve(t)
    borrowed_share(t)
    residuals(t)


if __name__ == "__main__":
    main()
