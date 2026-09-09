#!/usr/bin/env python3
"""fig_timeline_view: a schematic per-bin timeline export.

Three time bins on the astronomical-year axis (TIMELINE-AND-COMBINATORICS-
SPEC.md §1), each holding its ranked placement hypotheses as horizontal bars
whose length is the hypothesis's own interval and whose shade is its
projected probability P (TIMELINE §5's per-bin view). One sequence
hypothesis is drawn as an arrow with its Allen relation label (TIMELINE §1).

Bins 1 and 2 reuse the exact intervals and P values from the worked
examples in HISTORY-HYPOTHESIS-ENGINE-SPEC.md §3 (the Younger Dryas
cataclysm-diffusion hypothesis, P=0.28 read as tau) and IDEAL-STATE-AND-
UNKNOWNS-SPEC.md §2 (the Catalhoyuk farmers/extraterrestrials opinion, P=0.982
and P=0.00037). Bin 3 and its two extra hypotheses per bin are schematic
illustrations of the same view and carry no claim status. The sequence arrow
reuses TIMELINE §1's own example edge, rel-yd-precedes-holocene (before,
confidence 0.95).

Deterministic: fixed intervals and P values, no randomness.
Run: python3 fig_timeline_view.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _style import COL_DOUBLE, OKABE_ITO, SEQUENTIAL_CMAP, save, set_style

set_style()
import matplotlib
import matplotlib.pyplot as plt
from matplotlib.colors import Normalize
from matplotlib.patches import FancyArrowPatch

HERE = os.path.dirname(os.path.abspath(__file__))

BINS = [
    {"label": "Younger Dryas\n(per-younger-dryas)", "start": -12900, "end": -9700},
    {"label": "Early Holocene\n(per-early-holocene)", "start": -9700, "end": -6900},
    {"label": "Mid Holocene\n(per-mid-holocene, schematic)", "start": -6900, "end": -4000},
]

# hypotheses per bin: (label, interval_start, interval_end, P), ranked by P desc
HYPOTHESES = {
    0: [
        ("flood diffusion, elevated reading", -11400, -10600, 0.65),
        ("Younger Dryas climate shock", -12200, -11000, 0.42),
        ("cataclysm common source", -10800, -9600, 0.28),
    ],
    1: [
        ("farmers built the shrine", -7100, -6900, 0.982),
        ("organized labor, undated phase", -8500, -7800, 0.55),
        ("extraterrestrials built the shrine", -7100, -6900, 0.00037),
    ],
    2: [
        ("trade-network diffusion", -6500, -5200, 0.71),
        ("independent invention", -6200, -5500, 0.38),
        ("unattested actor", -5800, -4900, 0.15),
    ],
}

SEQ_RELATION = {
    "from_bin": 0, "to_bin": 1,
    "label": "before (rel-yd-precedes-holocene)",
    "confidence": 0.95,
}


def main():
    fig, ax = plt.subplots(figsize=(COL_DOUBLE, 4.35))

    cmap = matplotlib.colormaps[SEQUENTIAL_CMAP]
    norm = Normalize(vmin=0.0, vmax=1.0)

    x_min = BINS[0]["start"] - 300
    x_max = BINS[-1]["end"] + 300

    bin_shade = ["#f4f4f2", "#e9e9e5"]
    for i, b in enumerate(BINS):
        ax.axvspan(b["start"], b["end"], color=bin_shade[i % 2], zorder=0)
        ax.axvline(b["start"], color="#999999", linewidth=0.7, zorder=1)
    ax.axvline(BINS[-1]["end"], color="#999999", linewidth=0.7, zorder=1)

    bar_h = 0.58
    row_gap = 1.25
    top_y = 3 * row_gap
    key_top = -1.05  # top of the key block, below the axis and its tick labels

    for bi, b in enumerate(BINS):
        mid_x = (b["start"] + b["end"]) / 2
        ax.text(mid_x, top_y + 0.95, b["label"], ha="center", va="bottom", fontsize=7.3)
        hyps = HYPOTHESES[bi]
        for rank, (label, s, e, p) in enumerate(hyps):
            y = top_y - rank * row_gap
            color = cmap(norm(p))
            ax.barh(y, e - s, left=s, height=bar_h, color=color, edgecolor="#333333",
                    linewidth=0.6, zorder=2)
            # rank badge on the bar itself: short, so it fits even a narrow bar
            badge_color = "white" if p > 0.55 or p < 0.12 else "#16181d"
            ax.text((s + e) / 2, y, str(rank + 1), va="center", ha="center",
                    fontsize=6.5, color=badge_color, fontweight="bold", zorder=3)
            # full label + P value live in the key block below, tied to the
            # badge number, so text never has to fit inside the bar's width
            ax.text(mid_x - (b["end"] - b["start"]) / 2 + 60,
                    key_top - rank * 0.62,
                    f"{rank + 1}  {label}, P={p:g}",
                    va="top", ha="left", fontsize=6.1, color="#16181d")

    # sequence hypothesis: arrow spanning the boundary between bin 0 and bin 1
    from_end = BINS[SEQ_RELATION["from_bin"]]["end"]
    to_start = BINS[SEQ_RELATION["to_bin"]]["start"]
    seq_y = top_y + 1.85
    arr = FancyArrowPatch((from_end - 1500, seq_y), (to_start + 1500, seq_y),
                           arrowstyle="-|>", mutation_scale=12, linewidth=1.6,
                           color=OKABE_ITO["purple"], zorder=4)
    ax.add_patch(arr)
    ax.text((from_end + to_start) / 2, seq_y + 0.22,
            f"{SEQ_RELATION['label']}, confidence {SEQ_RELATION['confidence']:g}",
            ha="center", va="bottom", fontsize=7.0, color=OKABE_ITO["purple"])

    ax.set_xlim(x_min, x_max)
    ax.set_ylim(key_top - 2.3, top_y + 2.5)
    ax.set_yticks([])
    ax.set_xticks([])
    ax.axhline(0.0, color="#333333", linewidth=0.8, zorder=1)
    for s in ("left", "top", "right", "bottom"):
        ax.spines[s].set_visible(False)
    for xt in range(-12000, -3999, 2000):
        if x_min <= xt <= x_max:
            ax.plot([xt, xt], [0.0, -0.06], color="#333333", linewidth=0.8, zorder=1)
            ax.text(xt, -0.14, f"{xt:g}", ha="center", va="top", fontsize=7.5)
    ax.text((x_min + x_max) / 2, -0.55, "astronomical year", ha="center", va="top", fontsize=9)

    sm = plt.cm.ScalarMappable(cmap=cmap, norm=norm)
    sm.set_array([])
    cax = fig.add_axes([0.93, 0.42, 0.014, 0.42])
    cb = fig.colorbar(sm, cax=cax)
    cb.set_label("posterior P", fontsize=7.5)
    cb.ax.tick_params(labelsize=6.5)

    fig.subplots_adjust(right=0.91, left=0.03, top=0.98, bottom=0.09)
    save(fig, os.path.join(HERE, "fig_timeline_view"))


if __name__ == "__main__":
    main()
