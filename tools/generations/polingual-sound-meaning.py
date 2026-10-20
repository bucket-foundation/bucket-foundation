import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.environ.get("BKT_GEN_OUT", os.getcwd())
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from polingual_subset import INK, PAPER, load, concept_rows

subset, sem, pho = load()
names = subset["manifest"]["language_names"]
pairs = {}
for by in concept_rows(subset).values():
    if "en" not in by or not pho[by["en"]].any():
        continue
    e = by["en"]
    for l, r in by.items():
        if l != "en" and pho[r].any():
            pairs.setdefault(l, []).append((float(sem[e] @ sem[r]), float(pho[e] @ pho[r])))
fig, ax = plt.subplots(figsize=(10, 8), facecolor=PAPER)
ax.set_facecolor(PAPER)
for l, v in sorted(pairs.items()):
    a = np.array(v)
    x, y = a[:, 0].mean(), a[:, 1].mean()
    ax.scatter(x, y, s=14 + 4 * len(v), color="#c9a45c", edgecolor=INK, linewidth=0.6, alpha=0.85)
    ax.annotate(names[l], (x, y), xytext=(5, 4), textcoords="offset points", fontsize=9, color=INK)
ax.set_xlabel("meaning similarity to the English word")
ax.set_ylabel("sound similarity to the English word")
for s in ("top", "right"):
    ax.spines[s].set_visible(False)
ax.set_title("Sound against meaning for the core concepts, each language compared with English", fontsize=12.5, color=INK, pad=14)
fig.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "polingual-sound-meaning.png"), dpi=110, facecolor=PAPER)
