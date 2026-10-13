from __future__ import annotations

import os

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch

from common import BLUE, BONE, GOLD, GREEN, GREY, INK, RULE, deterministic

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "fig_protocol_region.pdf")

DECAY = -0.5
FACTOR = 0.9 ** (1 / DECAY) - 1


def retrievability(t, s):
    return (1 + FACTOR * (t / s)) ** DECAY


def arrow(ax, start, end, color=RULE):
    ax.add_patch(FancyArrowPatch(start, end, arrowstyle="-|>", mutation_scale=9, lw=1.0, color=color, shrinkA=9, shrinkB=9, zorder=2))


def main() -> None:
    fig, (left, right) = plt.subplots(1, 2, figsize=(7.2, 3.4), dpi=200, gridspec_kw={"width_ratios": [1, 1.25]})
    fig.patch.set_facecolor("white")

    left.set(xlim=(0, 6), ylim=(0, 5.2))
    left.axis("off")
    left.text(3.0, 5.0, "LEARNER'S KNOWLEDGE REGION", ha="center", fontsize=8.5, weight="bold", color=GOLD)
    layers = [
        [(1.0, 0.7), (2.0, 0.7), (3.0, 0.7), (4.0, 0.7), (5.0, 0.7)],
        [(1.5, 1.7), (2.5, 1.7), (3.5, 1.7), (4.5, 1.7)],
        [(1.0, 2.7), (2.0, 2.7), (3.0, 2.7), (4.0, 2.7), (5.0, 2.7)],
        [(2.0, 3.7), (3.0, 3.7), (4.0, 3.7)],
        [(3.0, 4.5)],
    ]
    state = {
        (0, 0): "known", (0, 1): "known", (0, 2): "known", (0, 3): "known", (0, 4): "known",
        (1, 0): "known", (1, 1): "known", (1, 2): "known", (1, 3): "frontier",
        (2, 0): "frontier", (2, 1): "frontier", (2, 2): "frontier", (2, 3): "blocked", (2, 4): "blocked",
        (3, 0): "blocked", (3, 1): "blocked", (3, 2): "blocked",
        (4, 0): "blocked",
    }
    edges = [((0, 0), (1, 0)), ((0, 1), (1, 0)), ((0, 1), (1, 1)), ((0, 2), (1, 1)), ((0, 2), (1, 2)), ((0, 3), (1, 2)), ((0, 3), (1, 3)), ((0, 4), (1, 3)),
             ((1, 0), (2, 0)), ((1, 0), (2, 1)), ((1, 1), (2, 1)), ((1, 1), (2, 2)), ((1, 2), (2, 2)), ((1, 3), (2, 3)), ((1, 3), (2, 4)), ((1, 2), (2, 3)),
             ((2, 0), (3, 0)), ((2, 1), (3, 0)), ((2, 1), (3, 1)), ((2, 2), (3, 1)), ((2, 3), (3, 2)), ((2, 4), (3, 2)),
             ((3, 0), (4, 0)), ((3, 1), (4, 0)), ((3, 2), (4, 0))]
    for a, b in edges:
        arrow(left, layers[a[0]][a[1]], layers[b[0]][b[1]])
    probe = {(1, 3): ("solo", BLUE), (2, 0): ("pair", GOLD), (2, 1): ("solo", BLUE), (2, 2): ("pair", GOLD)}
    for key, (x, y) in ((k, layers[k[0]][k[1]]) for k in state):
        s = state[key]
        color = GREEN if s == "known" else BLUE if s == "frontier" else GREY
        fill = color if s == "known" else "white" if s == "frontier" else BONE
        left.add_patch(Circle((x, y), 0.26, fc=fill, ec=color, lw=1.4, zorder=4))
        if key in probe:
            label, c = probe[key]
            left.add_patch(Circle((x, y), 0.36, fc="none", ec=c, lw=1.6, ls="--", zorder=5))
            left.text(x, y - 0.5, label, ha="center", fontsize=6.8, color=c, zorder=6)
    left.text(0.2, 0.2, "filled: known   outline: frontier, where probe items are drawn   tinted: blocked", fontsize=6.6, color=GREY)

    right.set(xlim=(-0.5, 15), ylim=(0, 1.08))
    t = np.linspace(0, 14, 300)
    right.plot(t, retrievability(t, 7), color=BLUE, lw=1.6, label="FSRS prediction, solo item, S = 7 d")
    right.plot(t, retrievability(t, 14), color=GOLD, lw=1.6, label="FSRS prediction, pair item, S = 14 d")
    for x, lab in [(0, "day 0\nprobe"), (7, "day 7\nretest"), (14, "day 14\nnext probe")]:
        right.axvline(x, color=GREY, lw=0.8, ls=":")
        right.text(x, 1.04, lab, ha="center", va="bottom", fontsize=7, color=INK)
    right.scatter([0, 0, 0], [0.55, 0.68, 0.8], color=[BLUE, GREY, GOLD], s=28, zorder=5)
    right.text(0.3, 0.52, "Hp", fontsize=7.5, color=BLUE)
    right.text(0.3, 0.655, "A", fontsize=7.5, color=GREY)
    right.text(0.3, 0.775, "Jp", fontsize=7.5, color=GOLD)
    right.scatter([7, 7], [0.58, 0.62], facecolors="white", edgecolors=[BLUE, GOLD], s=34, zorder=5, lw=1.4)
    right.text(7.3, 0.50, "Hp(t+7)", fontsize=7.5, color=BLUE)
    right.text(7.3, 0.64, "Jp(t+7)", fontsize=7.5, color=GOLD)
    right.annotate("", xy=(7, 0.93), xytext=(7, 0.64), arrowprops=dict(arrowstyle="<->", color=GREY, lw=0.8))
    right.text(6.7, 0.78, "predicted minus\nobserved recall", fontsize=6.6, color=GREY, ha="right")
    right.set_xlabel("days since the probe", fontsize=8.5)
    right.set_ylabel("recall on the probe's items", fontsize=8.5)
    right.set(xticks=[0, 7, 14], yticks=[0, 0.5, 1])
    right.tick_params(labelsize=8)
    right.legend(fontsize=6.6, frameon=False, loc="lower right")
    right.spines[["top", "right"]].set_visible(False)

    fig.subplots_adjust(wspace=0.32, bottom=0.17, left=0.02, right=0.98, top=0.9)
    deterministic(fig, OUT)
    fig.savefig(OUT.replace(".pdf", ".png"), dpi=200)
    plt.close(fig)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
