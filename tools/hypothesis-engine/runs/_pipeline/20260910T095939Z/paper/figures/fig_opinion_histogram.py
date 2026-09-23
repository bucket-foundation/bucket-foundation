from __future__ import annotations

import json
import os
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = Path(__file__).resolve().parent
PAPER_DIR = HERE.parent
OUT = HERE / "fig_opinion_histogram.png"
RUN_DIR = (PAPER_DIR / '../../../quantum-history/20260910T085020Z').resolve()

def main() -> None:
    timeline = json.loads(open(os.path.join(RUN_DIR, "timeline.json")).read())
    seen = {}
    for b in timeline.get("bins", []):
        for entry in b.get("ranked_hypotheses", []):
            hid, posterior = entry.get("hypothesis_id"), entry.get("posterior")
            if hid is not None and posterior is not None and hid not in seen:
                seen[hid] = posterior
    values = list(seen.values())

    fig, ax = plt.subplots(figsize=(4.6, 3.0), dpi=200)
    if values:
        ax.hist(values, bins=min(10, max(1, len(set(values)))), color="#14417a", edgecolor="white")
    ax.set_xlabel("projected posterior $P(h)$")
    ax.set_ylabel("survivor count")
    ax.set_title(f"opinion distribution ({len(values)} survivors)")
    ax.set_xlim(0.0, 1.0)
    fig.tight_layout()
    fig.savefig(OUT)
    plt.close(fig)
    print(f"wrote {OUT}")

if __name__ == "__main__":
    main()
