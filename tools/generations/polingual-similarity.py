import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.environ.get("BKT_GEN_OUT", os.getcwd())
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from polingual_subset import INK, PAPER, load, concept_rows

subset, sem, _ = load()
names = subset["manifest"]["language_names"]
langs = sorted(names)
idx = {l: i for i, l in enumerate(langs)}
total = np.zeros((len(langs), len(langs)))
count = np.zeros((len(langs), len(langs)))
for by in concept_rows(subset).values():
    present = [(idx[l], r) for l, r in by.items() if l in idx]
    for a, ra in present:
        for b, rb in present:
            total[a, b] += float(sem[ra] @ sem[rb])
            count[a, b] += 1
mean = np.divide(total, count, out=np.full_like(total, np.nan), where=count > 0)
np.fill_diagonal(mean, np.nan)
order = np.argsort(-np.nanmean(mean, axis=1))
mean = mean[order][:, order]
labels = [names[langs[i]] for i in order]
fig, ax = plt.subplots(figsize=(11, 10), facecolor=PAPER)
im = ax.imshow(mean, cmap="YlGnBu", vmin=np.nanmin(mean), vmax=np.nanmax(mean))
ax.set_xticks(range(len(labels)), labels, rotation=90, fontsize=8.5)
ax.set_yticks(range(len(labels)), labels, fontsize=8.5)
fig.colorbar(im, ax=ax, shrink=0.75, label="mean meaning similarity of the same concept")
ax.set_title("How closely each pair of languages words the same core concepts", fontsize=13, color=INK, pad=14)
fig.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "polingual-similarity.png"), dpi=100, facecolor=PAPER)
