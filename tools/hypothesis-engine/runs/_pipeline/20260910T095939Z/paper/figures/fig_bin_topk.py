from __future__ import annotations

import json
import os
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = Path(__file__).resolve().parent
PAPER_DIR = HERE.parent
OUT = HERE / "fig_bin_topk.png"
RUN_DIR = (PAPER_DIR / '../../../quantum-history/20260910T085020Z').resolve()

def main() -> None:
    timeline = json.loads(open(os.path.join(RUN_DIR, "timeline.json")).read())
    bins = timeline.get("bins", [])

    fig, axes = plt.subplots(1, max(1, len(bins)), figsize=(4.2 * max(1, len(bins)), 3.0), dpi=200, squeeze=False)
    for ax, b in zip(axes[0], bins or [{"time_bin": {"index": "n/a"}, "ranked_hypotheses": []}]):
        ranked = b.get("ranked_hypotheses", [])
        labels = [r["hypothesis_id"][:8] for r in ranked]
        values = [r.get("posterior") or 0.0 for r in ranked]
        ax.bar(range(len(values)), values, color="#14417a")
        ax.set_xticks(range(len(labels)))
        ax.set_xticklabels(labels, rotation=60, ha="right", fontsize=6)
        ax.set_ylim(0.0, 1.0)
        ax.set_title(f"bin {b['time_bin']['index']}")
        ax.set_ylabel("posterior")
    fig.tight_layout()
    fig.savefig(OUT)
    plt.close(fig)
    print(f"wrote {OUT}")

if __name__ == "__main__":
    main()
