"""Deterministic figure for the discovery-date holdout calibration curve, generated from `calibration.json`.

Part of the Bucket Foundation Figures rule (`papers/PAPER-STANDARDS.md`):
every figure is a script under this paper's own `figures/` directory,
rebuilt by `make figures`, and takes no random seed it does not fix. This
script's one input is the run directory this paper reports on, baked in
below as `RUN_DIR`: the paper is a report on that one run, so the figure
has no meaning re-pointed at a different run without regenerating the
whole paper alongside it.

Run:
    python3 figures/fig_calibration_curve.py
Writes:
    figures/fig_calibration_curve.png
"""
from __future__ import annotations

import json
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "fig_calibration_curve.png")
RUN_DIR = '/home/gian/agfarms/bucket-foundation/tools/hypothesis-engine/runs/quantum-history/20260910T085020Z'


def main() -> None:
    path = os.path.join(RUN_DIR, "calibration.json")
    fig, ax = plt.subplots(figsize=(4.2, 4.0), dpi=200)
    ax.plot([0, 1], [0, 1], color="#5f5f5f", linewidth=0.8, linestyle="--", label="perfect calibration")

    if os.path.isfile(path):
        calibration = json.loads(open(path).read())
        curve = [b for b in calibration.get("calibration_curve", []) if b.get("count", 0) > 0]
        xs = [b["mean_predicted"] for b in curve]
        ys = [b["mean_observed"] for b in curve]
        sizes = [20 + 15 * b["count"] for b in curve]
        ax.scatter(xs, ys, s=sizes, color="#14417a", zorder=3, label="observed bins")
        title = f"calibration curve (brier={calibration.get('brier_score')})"
    else:
        title = "calibration curve (no calibration.json for this run)"

    ax.set_xlabel("mean predicted probability")
    ax.set_ylabel("mean observed outcome")
    ax.set_xlim(-0.02, 1.02)
    ax.set_ylim(-0.02, 1.02)
    ax.set_title(title, fontsize=9)
    ax.legend(fontsize=7, loc="upper left")
    fig.tight_layout()
    fig.savefig(OUT)
    plt.close(fig)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
