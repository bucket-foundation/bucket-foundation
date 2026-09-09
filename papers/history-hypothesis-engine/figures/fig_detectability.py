#!/usr/bin/env python3
"""fig_detectability: toy detectability table delta(period, evidence kind).

IDEAL-STATE-AND-UNKNOWNS-SPEC.md §4 defines
  delta(period, medium, region) = P(evidence of h observed | h true, period, medium, region)
and scales absence evidence by it: e_absence = delta * e_raw_absence. This
figure fixes region and illustrates delta over period x evidence kind, one
slice of that table (`tools/hypothesis-engine/detectability.json` per §4).
The nine evidence kinds are TIMELINE-AND-COMBINATORICS-SPEC.md §4's
knowledge kinds. Values are illustrative placeholders pending a fitted table: textual
detectability sits near 0 before writing and rises once a period has a
literate record; genetic detectability rises toward the present.

Deterministic: the matrix below is a fixed literal, no randomness.
Run: python3 fig_detectability.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _style import COL_DOUBLE, SEQUENTIAL_CMAP, save, set_style

set_style()
import numpy as np
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))

PERIODS = [
    "Upper Paleolithic",
    "Younger Dryas",
    "Early Holocene / Neolithic",
    "Bronze Age",
    "Iron Age / Classical",
]

KINDS = [
    "material /\narchaeological",
    "textual /\ndocumentary",
    "genetic",
    "linguistic",
    "astronomical /\nradiometric",
    "geological /\nclimate",
    "oral tradition /\nmyth",
    "iconographic",
    "model-based\ninference",
]

# rows = periods (old to recent), columns = kinds, in the order above
DELTA = np.array([
    [0.55, 0.00, 0.35, 0.05, 0.70, 0.75, 0.30, 0.45, 0.50],
    [0.60, 0.00, 0.45, 0.08, 0.80, 0.85, 0.35, 0.50, 0.52],
    [0.68, 0.02, 0.55, 0.15, 0.82, 0.80, 0.45, 0.60, 0.55],
    [0.75, 0.55, 0.65, 0.45, 0.78, 0.72, 0.55, 0.75, 0.58],
    [0.80, 0.85, 0.75, 0.70, 0.75, 0.68, 0.60, 0.85, 0.60],
])


def main():
    fig, ax = plt.subplots(figsize=(COL_DOUBLE, 3.5))

    im = ax.imshow(DELTA, cmap=SEQUENTIAL_CMAP, vmin=0.0, vmax=1.0, aspect="auto")

    ax.set_xticks(range(len(KINDS)))
    ax.set_xticklabels(KINDS, rotation=42, ha="right", fontsize=7.2)
    ax.set_yticks(range(len(PERIODS)))
    ax.set_yticklabels(PERIODS, fontsize=8)
    ax.set_xlabel("evidence kind")
    ax.set_ylabel("period, old to recent")

    for i in range(DELTA.shape[0]):
        for j in range(DELTA.shape[1]):
            val = DELTA[i, j]
            color = "white" if val < 0.45 else "#16181d"
            ax.text(j, i, f"{val:.2f}", ha="center", va="center", fontsize=6.6, color=color)

    for edge in ("top", "right", "left", "bottom"):
        ax.spines[edge].set_visible(False)
    ax.set_xticks(np.arange(-0.5, len(KINDS), 1), minor=True)
    ax.set_yticks(np.arange(-0.5, len(PERIODS), 1), minor=True)
    ax.grid(which="minor", color="white", linewidth=1.2)
    ax.tick_params(which="minor", length=0)

    cb = fig.colorbar(im, ax=ax, fraction=0.035, pad=0.02)
    cb.set_label(r"$\delta$ (detectability)", fontsize=8.5)
    cb.ax.tick_params(labelsize=7)

    fig.tight_layout()
    save(fig, os.path.join(HERE, "fig_detectability"))


if __name__ == "__main__":
    main()
