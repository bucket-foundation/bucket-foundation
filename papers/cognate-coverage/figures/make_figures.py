from __future__ import annotations

import json
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
plt.rcParams.update({"font.size": 8, "svg.hashsalt": "bucket", "pdf.fonttype": 42})


def save(fig, name: str) -> None:
    fig.savefig(os.path.join(HERE, name), dpi=200, bbox_inches="tight", metadata={"Software": None})
    plt.close(fig)


def heatmap(cov: dict) -> None:
    targets = sorted(cov)
    held = sorted({s for t in targets for s in cov[t]["pairs"]} | set(targets))
    m = np.full((len(targets), len(held)), np.nan)
    for i, t in enumerate(targets):
        for j, s in enumerate(held):
            if s in cov[t]["pairs"]:
                m[i, j] = cov[t]["pairs"][s]["C"]
    fig, ax = plt.subplots(figsize=(7, 5.4))
    im = ax.imshow(m, cmap="Blues", vmin=0, vmax=1)
    ax.set_xticks(range(len(held)), held, rotation=90)
    ax.set_yticks(range(len(targets)), targets)
    ax.set_xlabel("held language s")
    ax.set_ylabel("target language t")
    fig.colorbar(im, ax=ax, label="C({s}, t)")
    save(fig, "fig_pairs.png")


def sizes(cov: dict) -> None:
    fig, axes = plt.subplots(1, 2, figsize=(7, 2.8))
    for t in sorted(cov):
        if t == "en":
            continue
        best = [cov[t]["best"][str(k)]["C"] for k in range(1, 5)]
        mean = [cov[t]["mean_by_size"][str(k)] for k in range(1, 5)]
        axes[0].plot(range(1, 5), best, color="#1f4e79", alpha=0.5, lw=1)
        axes[1].plot(range(1, 5), mean, color="#7f7f7f", alpha=0.5, lw=1)
    for ax, title in zip(axes, ("best set of size k", "mean over all sets of size k")):
        ax.set_xticks(range(1, 5))
        ax.set_xlabel("|S|")
        ax.set_ylabel("C(S, t)")
        ax.set_title(title)
        ax.set_ylim(0, 1)
    save(fig, "fig_sizes.png")


def regression(reg: dict) -> None:
    c = np.array(reg["C"])
    h = np.array(reg["hours"])
    fig, ax = plt.subplots(figsize=(4.2, 3))
    ax.scatter(c, h, s=12, color="#1f4e79")
    for x, y, l in zip(c, h, reg["langs"]):
        ax.annotate(l, (x, y), xytext=(3, 2), textcoords="offset points", fontsize=7)
    xs = np.linspace(0, c.max() * 1.05, 50)
    fit = reg["linear"]
    ax.plot(xs, fit["intercept"] + fit["slope"] * xs, color="#7f7f7f", lw=1)
    ax.set_xlabel("C({en}, t)")
    ax.set_ylabel("FSI class hours")
    save(fig, "fig_fsi.png")


def main() -> None:
    cov = json.load(open(os.path.join(DATA, "coverage.json")))["targets"]
    reg = json.load(open(os.path.join(DATA, "regression.json")))
    heatmap(cov)
    sizes(cov)
    regression(reg)


if __name__ == "__main__":
    main()
