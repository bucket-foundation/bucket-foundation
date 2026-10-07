from __future__ import annotations

import json
import os

import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

from common import BLUE, BONE, GOLD, GREEN, GREY, INK, RULE, deterministic

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "fig_knowledge_region.pdf")
METRICS = os.path.join(HERE, "..", "..", "..", "learning", "research-os", "learning-system", "analysis", "results", "metrics.json")


def main() -> None:
    with open(METRICS) as f:
        milestones = json.load(f)["axes"]["milestones"]

    fig, (ax, right) = plt.subplots(1, 2, figsize=(7.2, 3.1), dpi=200, gridspec_kw={"width_ratios": [1, 1.25]})
    fig.patch.set_facecolor("white")

    ax.add_patch(Rectangle((0, 0), 1, 1, fc=BONE, ec=RULE, lw=1))
    ax.add_patch(Rectangle((0, 0), 2 / 3, 2 / 3, fc=BLUE, alpha=0.14, ec="none"))
    xs, ys = zip(*(m["coordinates"] for m in milestones))
    ax.plot(xs, ys, color=BLUE, marker="o", lw=2.0, ms=5.5)
    for (x, y), label, dx, dy in zip(zip(xs, ys), ["none", "a", "a + b", "a + b + t"], [0.03, 0.04, -0.3, -0.36], [0.07, 0.05, 0.07, -0.12]):
        ax.text(x + dx, y + dy, label, fontsize=8.5, color=INK)
    ax.set(xlim=(-0.02, 1.08), ylim=(-0.02, 1.1), xticks=[0, 2 / 3, 1], yticks=[0, 2 / 3, 1])
    ax.set_xlabel("confirmed coordinate on axis a", fontsize=8.5)
    ax.set_ylabel("confirmed coordinate on axis b", fontsize=8.5)
    ax.set_xticklabels(["0", "2/3", "1"], fontsize=8)
    ax.set_yticklabels(["0", "2/3", "1"], fontsize=8)
    ax.set_aspect("equal")
    ax.spines[["top", "right"]].set_visible(False)

    labels = ["none", "a", "a + b", "a + b + t"]
    coverage = [m["coverage"] for m in milestones]
    extent = [m["extent_squared"] ** 0.5 for m in milestones]
    ypos = list(range(len(labels)))
    right.barh([y - 0.18 for y in ypos], coverage, height=0.34, color=[RULE, GOLD, BLUE, GREEN], label="coverage G")
    right.barh([y + 0.18 for y in ypos], extent, height=0.34, color=[RULE, GOLD, BLUE, GREEN], alpha=0.45, label="radial extent r")
    for i, (g, r) in enumerate(zip(coverage, extent)):
        right.text(g + 0.02, i - 0.18, f"G = {g:.2f}", va="center", fontsize=7.5, color=INK)
        right.text(r + 0.02, i + 0.18, f"r = {r:.2f}", va="center", fontsize=7.5, color=GREY)
    right.set_yticks(ypos)
    right.set_yticklabels(labels, fontsize=8.5)
    right.invert_yaxis()
    right.set(xlim=(0, 1.3), xticks=[0, 1 / 3, 2 / 3, 1])
    right.set_xticklabels(["0", "1/3", "2/3", "1"], fontsize=8)
    right.set_xlabel("confirmed catalog coverage G and radial extent r", fontsize=8.5)
    right.spines[["top", "right", "left"]].set_visible(False)
    right.tick_params(axis="y", length=0)

    fig.subplots_adjust(wspace=0.42, bottom=0.2, left=0.1, right=0.98, top=0.95)
    deterministic(fig, OUT)
    fig.savefig(OUT.replace(".pdf", ".png"), dpi=200)
    plt.close(fig)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
