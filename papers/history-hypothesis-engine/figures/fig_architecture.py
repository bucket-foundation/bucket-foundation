#!/usr/bin/env python3
"""fig_architecture: the hypothesis engine loop as a block diagram.

Retrieval envelopes -> evidence spans -> claims graph -> combinatorial
generator (four generator kinds plus the unknown-unknown generator) -> critic
and preservation critic -> tournament -> evolver -> meta-review and
self-report. The belief scorer feeds the tournament; the gap-node VOI queue
reads the meta-review and self-report and feeds back into retrieval.

Source: HISTORY-HYPOTHESIS-ENGINE-SPEC.md §5 (generation loop) and
IDEAL-STATE-AND-UNKNOWNS-SPEC.md §5 (gap nodes), §7 (unknown-unknown
generator, preservation critic, self-report).

Deterministic: pure geometry, no randomness. Run: python3 fig_architecture.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _style import COL_DOUBLE, OKABE_ITO, save, set_style

set_style()
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

HERE = os.path.dirname(os.path.abspath(__file__))

BOX_W, BOX_H = 1.55, 0.72
GAP_X = 0.30
ROW1_Y = 3.2
ROW2_Y = 1.1

# main-pipeline box fills, one color family per pipeline stage (Okabe-Ito).
FILL_INPUT = "#DCEBF7"   # pale blue: retrieval/evidence/graph
FILL_GEN = "#FCEBCF"     # pale orange: generation
FILL_CRIT = "#D9F0E8"    # pale green: critique/scoring
FILL_LATE = "#FBE3D6"    # pale vermillion: tournament/evolve/review
EDGE_INPUT = OKABE_ITO["blue"]
EDGE_GEN = OKABE_ITO["orange"]
EDGE_CRIT = OKABE_ITO["green"]
EDGE_LATE = OKABE_ITO["vermillion"]
FILL_SIDE = "#F1E3EE"    # pale purple: auxiliary loops (belief scorer, gap queue)
EDGE_SIDE = OKABE_ITO["purple"]

ROW1 = [
    ("Retrieval\nenvelopes", FILL_INPUT, EDGE_INPUT, None),
    ("Evidence\nspans", FILL_INPUT, EDGE_INPUT, None),
    ("Claims\ngraph", FILL_INPUT, EDGE_INPUT, None),
    ("Combinatorial\ngenerator", FILL_GEN, EDGE_GEN,
     "cluster · gap · contradiction ·\ncross-period · unknown-unknown"),
]
ROW2 = [
    ("Critic +\npreservation critic", FILL_CRIT, EDGE_CRIT, None),
    ("Tournament", FILL_LATE, EDGE_LATE, None),
    ("Evolver", FILL_LATE, EDGE_LATE, None),
    ("Meta-review +\nself-report", FILL_LATE, EDGE_LATE, None),
]


def box_center(row_idx, col_idx):
    x0 = 0.15 + col_idx * (BOX_W + GAP_X)
    y = ROW1_Y if row_idx == 0 else ROW2_Y
    return x0, y


def draw_box(ax, x, y, label, fill, edge, sublabel=None):
    b = FancyBboxPatch(
        (x, y), BOX_W, BOX_H,
        boxstyle="round,pad=0.02,rounding_size=0.06",
        linewidth=1.1, edgecolor=edge, facecolor=fill, zorder=3,
    )
    ax.add_patch(b)
    cy = y + BOX_H * (0.74 if sublabel else 0.5)
    ax.text(x + BOX_W / 2, cy, label, ha="center", va="center",
            fontsize=8.0, color="#16181d", zorder=4, linespacing=1.2)
    if sublabel:
        ax.text(x + BOX_W / 2, y + BOX_H * 0.16, sublabel, ha="center", va="center",
                fontsize=5.2, color="#4a4a4a", zorder=4, linespacing=1.15)


def arrow(ax, p0, p1, color="#333333", style="-", lw=1.2, connectionstyle="arc3,rad=0.0",
          shrink=2, ls="solid"):
    a = FancyArrowPatch(
        p0, p1, arrowstyle="-|>", mutation_scale=9, linewidth=lw,
        color=color, linestyle=ls, connectionstyle=connectionstyle,
        shrinkA=shrink, shrinkB=shrink, zorder=2,
    )
    ax.add_patch(a)


def main():
    fig, ax = plt.subplots(figsize=(COL_DOUBLE, 4.1))
    ax.set_xlim(0, 0.15 + 4 * (BOX_W + GAP_X) - GAP_X + 0.30)
    ax.set_ylim(-1.15, 4.25)
    ax.axis("off")

    centers1, centers2 = [], []
    for i, (label, fill, edge, sub) in enumerate(ROW1):
        x, y = box_center(0, i)
        draw_box(ax, x, y, label, fill, edge, sub)
        centers1.append((x, y))
    for i, (label, fill, edge, sub) in enumerate(ROW2):
        x, y = box_center(1, i)
        draw_box(ax, x, y, label, fill, edge, sub)
        centers2.append((x, y))

    # row 1: left to right
    for i in range(len(ROW1) - 1):
        x0, y0 = centers1[i]
        x1, _ = centers1[i + 1]
        arrow(ax, (x0 + BOX_W, y0 + BOX_H / 2), (x1, y0 + BOX_H / 2))

    # elbow connector: end of row 1 down to start of row 2 (boustrophedon turn)
    x_end, y_end = centers1[-1]
    x_start, y_start = centers2[0]
    mid_y = (y_end + (y_start + BOX_H)) / 2
    ax.plot(
        [x_end + BOX_W / 2, x_end + BOX_W / 2, x_start + BOX_W / 2],
        [y_end, mid_y, mid_y],
        color="#333333", linewidth=1.2, zorder=2,
    )
    arrow(ax, (x_start + BOX_W / 2, mid_y), (x_start + BOX_W / 2, y_start + BOX_H))

    # row 2: left to right
    for i in range(len(ROW2) - 1):
        x0, y0 = centers2[i]
        x1, _ = centers2[i + 1]
        arrow(ax, (x0 + BOX_W, y0 + BOX_H / 2), (x1, y0 + BOX_H / 2))

    # belief scorer: auxiliary box feeding the tournament
    tour_x, tour_y = centers2[1]
    bs_x, bs_y = tour_x + BOX_W * 0.5 - 0.62, ROW2_Y - 0.98
    draw_box(ax, bs_x, bs_y, "Belief scorer\n(opinion b, d, u, a)", FILL_SIDE, EDGE_SIDE)
    arrow(ax, (bs_x + BOX_W / 2, bs_y + BOX_H), (tour_x + BOX_W / 2, tour_y),
          color=EDGE_SIDE, connectionstyle="arc3,rad=0.0")

    # gap-node VOI queue: fed by meta-review, feeds back into retrieval
    mr_x, mr_y = centers2[-1]
    gq_x, gq_y = mr_x + BOX_W * 0.5 - 0.62, ROW2_Y - 0.98
    draw_box(ax, gq_x, gq_y, "Gap-node VOI\nqueue", FILL_SIDE, EDGE_SIDE)
    arrow(ax, (mr_x + BOX_W / 2, mr_y), (gq_x + BOX_W / 2, gq_y + BOX_H),
          color=EDGE_SIDE, connectionstyle="arc3,rad=0.0")

    ret_x, ret_y = centers1[0]
    # route the feedback line low across the whole width for legibility
    ax.plot(
        [gq_x + BOX_W / 2, gq_x + BOX_W / 2, ret_x + BOX_W / 2, ret_x + BOX_W / 2],
        [gq_y, -0.85, -0.85, ret_y - 0.32],
        color=EDGE_SIDE, linewidth=1.1, linestyle=(0, (4, 2)), zorder=1,
    )
    arrow(ax, (ret_x + BOX_W / 2, ret_y - 0.32), (ret_x + BOX_W / 2, ret_y),
          color=EDGE_SIDE, ls=(0, (4, 2)))

    ax.text(
        (gq_x + ret_x) / 2 + BOX_W / 2, -1.05,
        "gap-node VOI queue feeds retrieval",
        ha="center", va="top", fontsize=6.6, color=EDGE_SIDE, style="italic",
    )

    save(fig, os.path.join(HERE, "fig_architecture"))


if __name__ == "__main__":
    main()
