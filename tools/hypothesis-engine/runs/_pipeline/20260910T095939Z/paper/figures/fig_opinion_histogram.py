"""Deterministic figure for the survivor opinion distribution, generated from `timeline.json`.

Part of the Bucket Foundation Figures rule (`papers/PAPER-STANDARDS.md`):
every figure is a script under this paper's own `figures/` directory,
rebuilt by `make figures`, and takes no random seed it does not fix. This
script's one input is the run directory this paper reports on, baked in
below as `RUN_DIR`: the paper is a report on that one run, so the figure
has no meaning re-pointed at a different run without regenerating the
whole paper alongside it.

`RUN_DIR` is stored relative to this paper's own directory (one level up
from `HERE`, this script's own directory, resolved at import time via
`Path(__file__).resolve().parent` rather than trusted to whatever `cwd`
`make figures` or a direct `python3` invocation happens to run from), so
this file carries no machine-specific absolute path and stays correct
after a `git clone` onto a different machine or username.

Run:
    python3 figures/fig_opinion_histogram.py
Writes:
    figures/fig_opinion_histogram.png
"""
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
