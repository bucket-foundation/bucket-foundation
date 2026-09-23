from __future__ import annotations

import json
import os
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = Path(__file__).resolve().parent
PAPER_DIR = HERE.parent
OUT = HERE / "fig_calibration_curve.png"
RUN_DIR = (PAPER_DIR / '../../../quantum-history/20260910T085020Z').resolve()

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
