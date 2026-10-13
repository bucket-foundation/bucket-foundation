from __future__ import annotations

import json
import os

import matplotlib.pyplot as plt

from common import BLUE, GOLD, GREY, INK, RULE, deterministic

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "fig_validation.pdf")
METRICS = os.path.join(HERE, "..", "..", "..", "learning", "research-os", "learning-system", "analysis", "results", "metrics.json")


def main() -> None:
    with open(METRICS) as f:
        stats = json.load(f)["statistics"]

    fig, (left, right) = plt.subplots(1, 2, figsize=(7.2, 3.0), dpi=200, gridspec_kw={"width_ratios": [1, 1.2]})
    fig.patch.set_facecolor("white")

    keys = ["intercept", "item_baseline", "prerequisite_axis"]
    values = [stats["models"][k]["brier"] for k in keys]
    left.barh(["intercept only", "item effects", "axis + prerequisite"], values, color=[RULE, GOLD, BLUE], height=0.5)
    left.invert_yaxis()
    for i, v in enumerate(values):
        left.text(v + 0.008, i, f"{v:.5f}", va="center", fontsize=8.5, color=INK)
    left.set(xlim=(0, 0.34), xticks=[0, 0.1, 0.2, 0.3])
    left.set_xlabel("Brier score on 4,800 test responses", fontsize=8.5)
    left.tick_params(axis="y", length=0, labelsize=8.5)
    left.tick_params(axis="x", labelsize=8)
    left.spines[["top", "right", "left"]].set_visible(False)

    for i, key in enumerate(["planted_shared_latent", "control"]):
        result = stats["residual_correlations"][key]
        p = result["correlation"]
        lo, hi = result["bonferroni_97_5_percent_bootstrap_interval"]
        right.errorbar(p, i, xerr=[[p - lo], [hi - p]], fmt="o", capsize=5, color=BLUE if i == 0 else GOLD, lw=2)
        right.text(-0.22, i - 0.28, f"Holm p = {result['holm_adjusted_p']:.3f}", va="center", fontsize=8, color=INK)
    right.axvline(0, color=GREY, lw=1, ls=":")
    right.set(xlim=(-0.25, 0.55), ylim=(-0.7, 1.7), yticks=[0, 1], yticklabels=["planted pair", "control pair"])
    right.set_xlabel("residual correlation, 97.5% interval", fontsize=8.5)
    right.invert_yaxis()
    right.tick_params(axis="y", length=0, labelsize=8.5)
    right.tick_params(axis="x", labelsize=8)
    right.spines[["top", "right", "left"]].set_visible(False)

    fig.subplots_adjust(wspace=0.55, bottom=0.2, left=0.2, right=0.96, top=0.95)
    deterministic(fig, OUT)
    fig.savefig(OUT.replace(".pdf", ".png"), dpi=200)
    plt.close(fig)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
