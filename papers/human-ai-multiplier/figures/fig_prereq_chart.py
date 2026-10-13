from __future__ import annotations

import os

import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

from common import BLUE, BONE, GOLD, GREEN, GREY, INK, RULE, deterministic

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "fig_prereq_chart.pdf")


def node(ax, xy, label, detail, state, width=1.7):
    x, y = xy
    color = GREEN if state == "known" else BLUE if state == "ready" else GREY
    fill = color if state == "known" else "white" if state == "ready" else BONE
    ax.add_patch(FancyBboxPatch((x - width / 2, y - 0.32), width, 0.64, boxstyle="round,pad=0.03,rounding_size=0.06", lw=1.4, ec=color, fc=fill, zorder=4))
    ax.text(x, y + 0.05, label, ha="center", va="center", weight="bold", fontsize=9.5, color="white" if state == "known" else color, zorder=5)
    ax.text(x, y - 0.17, detail, ha="center", va="center", fontsize=7.3, color="white" if state == "known" else GREY, zorder=5)


def arrow(ax, start, end, color=RULE, shrink=0):
    ax.add_patch(FancyArrowPatch(start, end, arrowstyle="-|>", mutation_scale=11, lw=1.4, color=color, shrinkA=shrink, shrinkB=shrink, zorder=2))


def main() -> None:
    fig, (top, bottom) = plt.subplots(2, 1, figsize=(7.2, 5.6), dpi=200, gridspec_kw={"height_ratios": [1.05, 1]})
    fig.patch.set_facecolor("white")

    top.set(xlim=(0, 8.3), ylim=(0, 2.7))
    top.axis("off")
    top.text(0.1, 2.5, "PREREQUISITE CHART FOR TARGET T", fontsize=8.5, weight="bold", color=GOLD)
    top.text(8.2, 2.5, "4 required  /  1 verified  /  3 remaining", ha="right", fontsize=8.5, color=INK)
    points = [(1.1, 1.2), (3.75, 1.78), (3.75, 0.62), (6.6, 1.2)]
    for start, end in [((2.02, 1.3), (2.88, 1.68)), ((2.02, 1.1), (2.88, 0.72)), ((4.62, 1.68), (5.68, 1.3)), ((4.62, 0.72), (5.68, 1.1))]:
        arrow(top, start, end, BLUE)
    node(top, points[0], "Foundation F", "verified mastery", "known", 1.8)
    node(top, points[1], "Concept A", "ready: F known", "ready")
    node(top, points[2], "Concept B", "ready: F known", "ready")
    node(top, points[3], "Target T", "needs A and B", "blocked", 1.8)
    top.text(4.15, 0.05, "filled: known   outline: ready, the frontier where probe items are drawn   tinted: blocked", ha="center", fontsize=7.5, color=GREY)

    bottom.set(xlim=(0, 8.3), ylim=(0, 2.7))
    bottom.axis("off")
    bottom.text(0.1, 2.5, "SHORTEST KNOWLEDGE-STATE PATH FROM EMPTY MASTERY", fontsize=8.5, weight="bold", color=GOLD)
    states = ["{}", "{F}", "{F, A}", "{F, A, B}", "{F, A, B, T}"]
    for index, label in enumerate(states):
        x = 0.7 + index * 1.72
        bottom.add_patch(FancyBboxPatch((x - 0.62, 1.35), 1.24, 0.5, boxstyle="round,pad=0.02,rounding_size=0.05", lw=1.0, ec=INK, fc=BONE if index in (0, 4) else "white"))
        bottom.text(x, 1.6, label, ha="center", va="center", fontsize=8.8, weight="bold", color=INK)
        if index < 4:
            arrow(bottom, (x + 0.66, 1.6), (x + 1.06, 1.6), GOLD)
            bottom.text(x + 0.86, 1.86, "+" + "FABT"[index], ha="center", fontsize=8, color=GOLD)
    bottom.text(4.15, 0.78, "4 transitions = |R(T, {})| = 4 required concepts", ha="center", fontsize=9.5, color=BLUE)
    bottom.text(4.15, 0.38, "the chain F, A, T has 3 nodes and never reaches T: after {F, A}, T is still blocked by B", ha="center", fontsize=8, color=GREY)
    bottom.text(4.15, 0.05, "swapping A and B gives a second optimum; the minimum is a count, the order is a certificate", ha="center", fontsize=7.5, color=GREY)

    fig.tight_layout()
    deterministic(fig, OUT)
    fig.savefig(OUT.replace(".pdf", ".png"), dpi=200)
    plt.close(fig)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
