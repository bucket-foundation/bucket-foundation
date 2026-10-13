from __future__ import annotations

import os
from collections import Counter

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from common import BRANCH_COLOR, HERE, deterministic_pdf, load

OUT = os.path.join(HERE, "fig_classes.pdf")
CLASSES = ["close to known results", "borderline", "needs a new idea", "unsampled"]


def main() -> None:
    p = load("predictions.json")
    counts = {k: Counter(r["branch"] for r in p["rows"] if r["reachClass"] == k) for k in CLASSES}
    branches = [b for b in BRANCH_COLOR if any(counts[k][b] for k in CLASSES)]
    fig, ax = plt.subplots(figsize=(8.0, 3.2))
    bottom = [0] * len(CLASSES)
    for b in branches:
        vals = [counts[k][b] for k in CLASSES]
        ax.bar(CLASSES, vals, bottom=bottom, color=BRANCH_COLOR[b], label=b)
        bottom = [x + y for x, y in zip(bottom, vals)]
    for i, k in enumerate(CLASSES):
        ax.text(i, bottom[i] + 8, str(p["counts"][k]), ha="center", fontsize=8)
    ax.set_ylabel("open problems")
    ax.tick_params(axis="x", labelsize=8)
    ax.legend(fontsize=7, frameon=False, ncol=2)
    fig.tight_layout()
    deterministic_pdf(fig, OUT)


if __name__ == "__main__":
    main()
