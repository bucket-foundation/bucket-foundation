from __future__ import annotations

import os

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

from common import BLUE, BONE, GOLD, GREEN, GREY, INK, deterministic

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "fig_scores.pdf")


def node(ax, x, y, title, sub, ec, w=2.1, h=1.15):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.02,rounding_size=0.05", fc="white", ec=ec, lw=1.1))
    ax.text(x, y + 0.22, title, ha="center", va="center", fontsize=10, color=ec, fontweight="bold")
    ax.text(x, y - 0.22, sub, ha="center", va="center", fontsize=7.5, color=INK)


def arrow(ax, p, q, color=INK):
    ax.annotate("", xy=q, xytext=p, arrowprops=dict(arrowstyle="->", color=color, lw=0.9, shrinkA=2, shrinkB=2))


def main() -> None:
    fig, ax = plt.subplots(figsize=(7.2, 4.4), dpi=200)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6.2)
    ax.axis("off")
    fig.patch.set_facecolor("white")

    node(ax, 1.6, 5.0, "Hp", "person alone, day 0\nsolo items", BLUE)
    node(ax, 5.0, 5.0, "A", "AI alone\nsame frozen items", GREY)
    node(ax, 8.4, 5.0, "Jp", "person with AI, day 0\npair items", GOLD)
    node(ax, 1.6, 2.6, "Hp(t+7)", "person alone, day 7\nsame solo items", BLUE)
    node(ax, 8.4, 2.6, "Jp(t+7)", "person alone, day 7\nsame pair items", GOLD)

    ax.add_patch(FancyBboxPatch((3.65, 2.05), 2.7, 1.1, boxstyle="round,pad=0.02,rounding_size=0.05", fc=BONE, ec=INK, lw=1.0))
    ax.text(5.0, 2.85, "mp = Jp / max(Hp, A)", ha="center", va="center", fontsize=10, color=INK)
    ax.text(5.0, 2.4, "D = Jp − max(Hp, A)", ha="center", va="center", fontsize=8.5, color=INK)
    arrow(ax, (2.65, 4.75), (3.75, 3.15), BLUE)
    arrow(ax, (5.0, 4.42), (5.0, 3.15), GREY)
    arrow(ax, (7.35, 4.75), (6.25, 3.15), GOLD)

    ax.add_patch(FancyBboxPatch((0.35, 0.3), 2.5, 1.0, boxstyle="round,pad=0.02,rounding_size=0.05", fc=BONE, ec=BLUE, lw=1.0))
    ax.text(1.6, 0.98, "Rp = Hp(t+7) − Hp(t)", ha="center", va="center", fontsize=9, color=INK)
    ax.text(1.6, 0.58, "retention", ha="center", va="center", fontsize=7.5, color=GREY)
    arrow(ax, (1.6, 4.42), (1.6, 3.18), BLUE)
    arrow(ax, (1.6, 2.02), (1.6, 1.32), BLUE)

    ax.add_patch(FancyBboxPatch((7.15, 0.3), 2.5, 1.0, boxstyle="round,pad=0.02,rounding_size=0.05", fc=BONE, ec=GOLD, lw=1.0))
    ax.text(8.4, 0.98, "L = Jp(t+7) − Hp(t+7)", ha="center", va="center", fontsize=9, color=INK)
    ax.text(8.4, 0.58, "learning", ha="center", va="center", fontsize=7.5, color=GREY)
    arrow(ax, (8.4, 4.42), (8.4, 3.18), GOLD)
    arrow(ax, (8.4, 2.02), (8.4, 1.32), GOLD)
    arrow(ax, (2.65, 2.25), (7.15, 1.05), BLUE)

    ax.text(5.0, 0.55, "dependence: D > 0 and L ≤ 0\nacross the whole 95% interval", ha="center", va="center", fontsize=8.5, color=GREEN)

    fig.tight_layout()
    deterministic(fig, OUT)
    plt.close(fig)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
