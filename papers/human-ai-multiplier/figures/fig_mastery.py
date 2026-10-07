from __future__ import annotations

import os

import numpy as np
import matplotlib.pyplot as plt

from common import BLUE, GOLD, GREEN, GREY, INK, RULE, deterministic

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "fig_mastery.pdf")

DECAY = -0.5
FACTOR = 0.9 ** (1 / DECAY) - 1
ALPHA = 1.0
BETA = 1.0
THRESHOLD = 0.7
HORIZON = 90


def retrievability(t, s):
    return (1 + FACTOR * (t / s)) ** DECAY


def main() -> None:
    fig, (left, right) = plt.subplots(1, 2, figsize=(7.2, 3.1), dpi=200, gridspec_kw={"width_ratios": [1.15, 1]})
    fig.patch.set_facecolor("white")

    t = np.linspace(0, 120, 400)
    for s, color in [(3, RULE), (7, GOLD), (21, BLUE), (90, GREEN)]:
        left.plot(t, retrievability(t, s), color=color, lw=1.8, label=f"S = {s} d")
    left.axvline(7, color=GREY, lw=0.9, ls=":")
    left.axvline(HORIZON, color=GREY, lw=0.9, ls=":")
    left.text(7.5, 0.06, "day 7 retest", fontsize=7.5, color=GREY)
    left.text(91, 0.06, "90 d horizon", fontsize=7.5, color=GREY)
    left.axhline(0.9, color=RULE, lw=0.8, ls="--")
    left.text(30, 0.84, "R(S, S) = 0.9", fontsize=7.5, color=GREY)
    left.set(xlim=(0, 120), ylim=(0, 1.02))
    left.set_xlabel("days since last review t", fontsize=8.5)
    left.set_ylabel("FSRS-5 retrievability R(t, S)", fontsize=8.5)
    left.tick_params(labelsize=8)
    left.legend(fontsize=7.5, frameon=False, loc="upper right")
    left.spines[["top", "right"]].set_visible(False)

    p = np.linspace(0, 1, 201)
    r = np.linspace(0, 1, 201)
    P, R = np.meshgrid(p, r)
    M = np.clip(P ** ALPHA * R ** BETA, 0, 1)
    cs = right.contourf(P, R, M, levels=np.linspace(0, 1, 11), cmap="Blues", alpha=0.9)
    right.contour(P, R, M, levels=[THRESHOLD], colors=[GOLD], linewidths=1.8)
    right.text(0.05, 0.93, "M = 0.7: mastered above", fontsize=7, color=GOLD)
    right.set(xlim=(0, 1), ylim=(0, 1), xticks=[0, 0.5, 1], yticks=[0, 0.5, 1])
    right.set_xlabel("proficiency P = sigmoid(theta + 0.2)", fontsize=8.5)
    right.set_ylabel("retention R = R(90 d, S)", fontsize=8.5)
    right.tick_params(labelsize=8)
    right.set_aspect("equal")
    cbar = fig.colorbar(cs, ax=right, fraction=0.046, pad=0.04)
    cbar.set_label("mastery M = P R", fontsize=8)
    cbar.ax.tick_params(labelsize=7)

    fig.subplots_adjust(wspace=0.4, bottom=0.18, left=0.09, right=0.97, top=0.95)
    deterministic(fig, OUT)
    fig.savefig(OUT.replace(".pdf", ".png"), dpi=200)
    plt.close(fig)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
