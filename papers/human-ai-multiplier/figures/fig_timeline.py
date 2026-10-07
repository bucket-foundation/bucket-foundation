from __future__ import annotations

import os

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

from common import BLUE, BONE, GOLD, GREEN, GREY, INK, RULE, deterministic

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "fig_timeline.pdf")


def box(ax, x, y, w, h, text, fc, ec=INK, fs=8.5, color=INK):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.04", fc=fc, ec=ec, lw=0.9))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs, color=color)


def main() -> None:
    fig, ax = plt.subplots(figsize=(7.2, 3.6), dpi=200)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 5.2)
    ax.axis("off")
    fig.patch.set_facecolor("white")

    ax.plot([0.4, 9.6], [1.0, 1.0], color=INK, lw=1.0)
    for x, label in [(1.5, "day 0"), (5.0, "day 7"), (8.5, "day 14")]:
        ax.plot([x, x], [0.9, 1.1], color=INK, lw=1.0)
        ax.text(x, 0.6, label, ha="center", va="top", fontsize=9, color=INK)
    ax.text(9.7, 1.0, "…", ha="left", va="center", fontsize=11, color=INK)

    box(ax, 0.5, 3.0, 2.0, 1.5, "probe 1, phase t0\n40 unseen items\n20 matched pairs", BONE)
    box(ax, 0.55, 1.5, 0.92, 1.1, "solo\n20 items\n→ Hp", "white", ec=BLUE, fs=7.5, color=BLUE)
    box(ax, 1.53, 1.5, 0.92, 1.1, "pair\n20 items\n→ Jp", "white", ec=GOLD, fs=7.5, color=GOLD)
    ax.plot([1.0, 1.0], [2.6, 3.0], color=RULE, lw=0.8)
    ax.plot([2.0, 2.0], [2.6, 3.0], color=RULE, lw=0.8)

    box(ax, 4.0, 3.0, 2.0, 1.5, "probe 1, retest\nsame 40 items\nunaided, reshuffled", BONE)
    box(ax, 4.05, 1.5, 0.92, 1.1, "ex-solo\n→ Hp(t+7)", "white", ec=BLUE, fs=7.5, color=BLUE)
    box(ax, 5.03, 1.5, 0.92, 1.1, "ex-pair\n→ Jp(t+7)", "white", ec=GOLD, fs=7.5, color=GOLD)

    box(ax, 7.5, 3.0, 2.0, 1.5, "probe 2, phase t0\n40 new items", BONE)
    box(ax, 7.55, 1.5, 1.9, 1.1, "solo and pair\nas in probe 1", "white", ec=GREY, fs=7.5, color=GREY)

    ax.annotate("", xy=(4.0, 3.75), xytext=(2.5, 3.75), arrowprops=dict(arrowstyle="->", color=INK, lw=0.9))
    ax.text(3.25, 3.95, "7 days\nno feedback", ha="center", va="bottom", fontsize=7.5, color=INK)
    ax.annotate("", xy=(7.5, 3.75), xytext=(6.0, 3.75), arrowprops=dict(arrowstyle="->", color=INK, lw=0.9))
    ax.text(6.75, 3.95, "scores\nunlock", ha="center", va="bottom", fontsize=7.5, color=GREEN)

    ax.text(0.5, 4.95, "A, the AI alone, is scored once per frozen item before any probe", ha="left", va="center", fontsize=8, color=GREY)
    fig.tight_layout()
    deterministic(fig, OUT)
    plt.close(fig)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
