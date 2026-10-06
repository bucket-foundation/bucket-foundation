from __future__ import annotations

import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from common import HERE, deterministic_pdf, load

OUT = os.path.join(HERE, "fig_backtest.pdf")


def main() -> None:
    b = load("backtest.json")
    fig, axes = plt.subplots(1, len(b["cutoffs"]), figsize=(8.4, 3.4), sharey=True)
    for ax, c in zip(axes, b["cutoffs"]):
        strata = [c["all"], *c["byLength"]]
        names = [s["name"] for s in strata]
        x = range(len(strata))
        inside = [s["rateInside"] if s["rateInside"] is not None else 0 for s in strata]
        outside = [s["rateOutside"] if s["rateOutside"] is not None else 0 for s in strata]
        ax.bar([i - 0.2 for i in x], inside, width=0.4, color="#1f6f78", label="inside")
        ax.bar([i + 0.2 for i in x], outside, width=0.4, color="#c9833f", label="outside")
        for i, s in enumerate(strata):
            label = "under 10" if s["belowFloor"] else f"n={s['inside']}/{s['outside']}\np={s['pValue']:.3f}"
            ax.text(i, max(inside[i], outside[i]) + 0.03, label, ha="center", fontsize=6.5)
        ax.set_xticks(list(x))
        ax.set_xticklabels(names, fontsize=7, rotation=15)
        ax.set_ylim(0, 1)
        ax.set_title(f"cutoff {c['cutoff']}: AUC {c['auc']:.3f}, n={c['aucRows']}", fontsize=9)
    axes[0].set_ylabel("resolved by 2026")
    axes[0].legend(fontsize=7, frameon=False)
    fig.tight_layout()
    deterministic_pdf(fig, OUT)


if __name__ == "__main__":
    main()
