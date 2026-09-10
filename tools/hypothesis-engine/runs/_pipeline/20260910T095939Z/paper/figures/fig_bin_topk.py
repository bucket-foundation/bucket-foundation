"""Deterministic figure for the top-ranked hypotheses per time bin, generated from `timeline.json`.

Part of the Bucket Foundation Figures rule (`papers/PAPER-STANDARDS.md`):
every figure is a script under this paper's own `figures/` directory,
rebuilt by `make figures`, and takes no random seed it does not fix. This
script's one input is the run directory this paper reports on, baked in
below as `RUN_DIR`: the paper is a report on that one run, so the figure
has no meaning re-pointed at a different run without regenerating the
whole paper alongside it.

Run:
    python3 figures/fig_bin_topk.py
Writes:
    figures/fig_bin_topk.png
"""
from __future__ import annotations

import json
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "fig_bin_topk.png")
RUN_DIR = '/home/gian/agfarms/bucket-foundation/tools/hypothesis-engine/runs/quantum-history/20260910T085020Z'


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
