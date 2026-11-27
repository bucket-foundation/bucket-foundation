from __future__ import annotations

import json
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "..", "data", "tests.json")) as f:
    T = json.load(f)

labels = ["meaning", "phonetic", "script", "subword"]
R = np.array(T["exploratory"]["rank_corr"]["matrix"])
fig, ax = plt.subplots(figsize=(4.2, 3.6))
im = ax.imshow(R, vmin=-1, vmax=1, cmap="RdBu_r")
ax.set_xticks(range(4), labels, rotation=30)
ax.set_yticks(range(4), labels)
for i in range(4):
    for j in range(4):
        ax.text(j, i, f"{R[i, j]:.2f}", ha="center", va="center", fontsize=9)
fig.colorbar(im, ax=ax, shrink=0.8, label="Spearman rho")
fig.tight_layout()
fig.savefig(os.path.join(HERE, "fig_corr.png"), dpi=200)

per = sorted(T["h2_per_pair"], key=lambda r: r["delta"])
fig, ax = plt.subplots(figsize=(4.8, 0.22 * len(per) + 1.2))
y = np.arange(len(per))
d = np.array([r["delta"] for r in per])
lo = d - np.array([r["ci"][0] for r in per])
hi = np.array([r["ci"][1] for r in per]) - d
colors = ["#1f5fa8" if r["q_bh"] < 0.05 else "#888888" for r in per]
ax.errorbar(d, y, xerr=[lo, hi], fmt="none", ecolor=colors, elinewidth=1)
ax.scatter(d, y, c=colors, s=14, zorder=3)
ax.axvline(0, color="black", lw=0.8)
ax.set_yticks(y, [r["group"] for r in per], fontsize=7)
ax.set_xlabel("AUC gain from subword levels over script")
fig.tight_layout()
fig.savefig(os.path.join(HERE, "fig_delta.png"), dpi=200)
