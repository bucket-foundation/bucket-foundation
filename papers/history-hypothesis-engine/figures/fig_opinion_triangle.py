#!/usr/bin/env python3
"""fig_opinion_triangle: the subjective-logic opinion triangle, vertices
belief / disbelief / uncertainty, with the farmers vs extraterrestrials
worked example from IDEAL-STATE-AND-UNKNOWNS-SPEC.md §2.

An opinion (b, d, u) plots at the barycentric point b*B + d*D + u*U. The
projected probability P(h) = b + a*u reads off the base edge along the line
through the opinion point that runs parallel to the segment from the
uncertainty vertex U to the base-rate point (a, 0): every point on that
parallel line shares one P value, so the construction recovers P without a
lookup, only a ruler.

Worked values (§2, farmers vs extraterrestrials at Catalhoyuk, after pooling
three evidence items):
  farmers:         b=0.756, d=0.000, u=0.244, a=0.924  -> P=0.982
  extraterrestrials: b=0.000, d=0.756, u=0.244, a=0.0015 -> P=0.00037

Deterministic: fixed input opinions, no randomness.
Run: python3 fig_opinion_triangle.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _style import COL_SINGLE, OKABE_ITO, save, set_style

set_style()
import numpy as np
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
H = np.sqrt(3) / 2  # apex height of a unit-base equilateral triangle

# vertices: Belief, Disbelief, Uncertainty
B_V = np.array([1.0, 0.0])
D_V = np.array([0.0, 0.0])
U_V = np.array([0.5, H])

POINTS = {
    "farmers": {"b": 0.756, "d": 0.000, "u": 0.244, "a": 0.924, "P": 0.982,
                "color": OKABE_ITO["blue"], "marker": "o"},
    "extraterrestrials": {"b": 0.000, "d": 0.756, "u": 0.244, "a": 0.0015, "P": 0.00037,
                           "color": OKABE_ITO["vermillion"], "marker": "s"},
}


def bary_to_xy(b, d, u):
    return b * B_V + d * D_V + u * U_V


def main():
    fig, ax = plt.subplots(figsize=(COL_SINGLE, 3.55))

    tri = plt.Polygon([B_V, D_V, U_V], closed=True, fill=False,
                       edgecolor="#333333", linewidth=1.2, zorder=2)
    ax.add_patch(tri)

    ax.text(*(B_V + [0.06, -0.045]), "belief", ha="left", va="top", fontsize=8.5)
    ax.text(*(D_V + [-0.06, -0.045]), "disbelief", ha="right", va="top", fontsize=8.5)
    ax.text(*(U_V + [0.0, 0.045]), "uncertainty", ha="center", va="bottom", fontsize=8.5)

    for name, p in POINTS.items():
        xy = bary_to_xy(p["b"], p["d"], p["u"])
        a_xy = np.array([p["a"], 0.0])

        # base-rate direction: reference line from U to (a, 0)
        ax.plot([U_V[0], a_xy[0]], [U_V[1], a_xy[1]], color=p["color"],
                linestyle=(0, (1, 1.4)), linewidth=0.9, zorder=1)
        ax.plot(*a_xy, marker="|", markersize=8, color=p["color"], zorder=3)

        # projector line: through the opinion point, parallel to U-(a,0), to the base
        p_xy = np.array([p["P"], 0.0])
        ax.plot([xy[0], p_xy[0]], [xy[1], p_xy[1]], color=p["color"],
                linestyle=(0, (4, 2)), linewidth=1.0, zorder=1)
        ax.plot(*p_xy, marker="|", markersize=8, color=p["color"], zorder=3)

        ax.scatter(*xy, s=32, color=p["color"], marker=p["marker"], edgecolor="black",
                   linewidth=0.6, zorder=4, label=name)

        label_y = -0.075 if name == "farmers" else -0.13
        ax.annotate(f"a={p['a']:g}", a_xy, xytext=(a_xy[0], label_y),
                    ha="center", va="top", fontsize=6.6, color=p["color"])
        ax.annotate(f"P={p['P']:g}", p_xy, xytext=(p_xy[0], label_y - 0.075),
                    ha="center", va="top", fontsize=6.6, color=p["color"], fontweight="bold")

    ax.set_xlim(-0.18, 1.18)
    ax.set_ylim(-0.30, H + 0.16)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.legend(loc="upper left", bbox_to_anchor=(-0.05, 1.02), frameon=False, fontsize=7.5,
              handletextpad=0.4, borderaxespad=0.0)

    fig.tight_layout()
    save(fig, os.path.join(HERE, "fig_opinion_triangle"))


if __name__ == "__main__":
    main()
