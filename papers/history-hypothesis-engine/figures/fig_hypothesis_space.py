#!/usr/bin/env python3
"""fig_hypothesis_space: placement-space |H| and sequence-space |H_seq| size at
three vocabulary scales, log-scale.

|H| = ACTOR x ACTION x OBJECT x PLACE x TIME_BIN x MECHANISM
|H_seq| = 13 x |H|^2

The realistic scale uses the vocabulary sizes named in TIMELINE-AND-
COMBINATORICS-SPEC.md §3 (ACTOR=40, ACTION=50, OBJECT=300, PLACE=120,
TIME_BIN=200, MECHANISM=25), which the spec computes to |H| ~ 3.6e11 and
|H_seq| ~ 1.7e24. The small and large scales are illustrative endpoints one
order of magnitude below and above the realistic vocabulary per axis, not
values stated in the spec.

Deterministic: every value is computed from the vocab sizes below, no
randomness. Run: python3 fig_hypothesis_space.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _style import COL_SINGLE, OKABE_ITO, save, set_style

set_style()
import numpy as np
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
N_ALLEN_RELATIONS = 13

SCALES = {
    "small": {"ACTOR": 10, "ACTION": 12, "OBJECT": 40, "PLACE": 25, "TIME_BIN": 40, "MECHANISM": 8},
    "realistic": {"ACTOR": 40, "ACTION": 50, "OBJECT": 300, "PLACE": 120, "TIME_BIN": 200, "MECHANISM": 25},
    "large": {"ACTOR": 100, "ACTION": 150, "OBJECT": 1000, "PLACE": 400, "TIME_BIN": 500, "MECHANISM": 60},
}


def placement_size(vocab):
    return float(np.prod(list(vocab.values())))


def sequence_size(h_size):
    return N_ALLEN_RELATIONS * h_size**2


def main():
    labels = list(SCALES.keys())
    h_sizes = [placement_size(SCALES[k]) for k in labels]
    hseq_sizes = [sequence_size(h) for h in h_sizes]

    x = np.arange(len(labels))
    width = 0.34

    fig, ax = plt.subplots(figsize=(COL_SINGLE, 2.85))
    b1 = ax.bar(x - width / 2, h_sizes, width, color=OKABE_ITO["blue"], label=r"$|H|$ (placement)")
    b2 = ax.bar(x + width / 2, hseq_sizes, width, color=OKABE_ITO["vermillion"], label=r"$|H_{seq}|$ (sequence)")

    ax.set_yscale("log")
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylabel("hypothesis-space size (log scale)")
    ax.set_xlabel("vocabulary scale")
    ax.set_ylim(1e2, 3e31)

    def annotate(bars, sizes, note=None):
        for rect, val in zip(bars, sizes):
            label = f"{val:.1e}"
            ax.text(rect.get_x() + rect.get_width() / 2, val * 1.6, label,
                    ha="center", va="bottom", fontsize=6.3, rotation=90)

    annotate(b1, h_sizes)
    annotate(b2, hseq_sizes)

    # annotate the two spec-cited values on the realistic scale explicitly
    realistic_idx = labels.index("realistic")
    ax.annotate(
        "~3.6e11",
        xy=(realistic_idx - width / 2, h_sizes[realistic_idx]),
        xytext=(realistic_idx - width / 2 - 0.62, h_sizes[realistic_idx] * 40),
        fontsize=7, color=OKABE_ITO["blue"],
        arrowprops=dict(arrowstyle="-", color=OKABE_ITO["blue"], lw=0.8),
    )
    ax.annotate(
        "~1.7e24",
        xy=(realistic_idx + width / 2, hseq_sizes[realistic_idx]),
        xytext=(realistic_idx + width / 2 + 0.10, hseq_sizes[realistic_idx] * 2.2),
        fontsize=7, color=OKABE_ITO["vermillion"],
        arrowprops=dict(arrowstyle="-", color=OKABE_ITO["vermillion"], lw=0.8),
    )

    ax.legend(loc="lower right", frameon=False)
    fig.tight_layout()
    save(fig, os.path.join(HERE, "fig_hypothesis_space"))


if __name__ == "__main__":
    main()
