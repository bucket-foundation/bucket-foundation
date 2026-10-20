import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.environ.get("BKT_GEN_OUT", os.getcwd())
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from collections import Counter
from polingual_subset import INK, PAPER, load, concept_rows

subset, _, _ = load()
names = subset["manifest"]["language_names"]
words = Counter(w["l"] for w in subset["words"])
concepts = concept_rows(subset)
covered = Counter(l for by in concepts.values() for l in by)
langs = sorted(names, key=lambda l: words[l])
fig, ax = plt.subplots(figsize=(10, 9), facecolor=PAPER)
ax.set_facecolor(PAPER)
y = list(range(len(langs)))
ax.barh(y, [words[l] for l in langs], color="#c9a45c", label="words in the starter set")
ax.barh(y, [covered[l] for l in langs], color=INK, height=0.4, label=f"of the {len(concepts)} core concepts")
ax.set_yticks(y, [f"{names[l]} ({l})" for l in langs], fontsize=9.5)
ax.set_xlabel("words")
for s in ("top", "right"):
    ax.spines[s].set_visible(False)
ax.legend(loc="lower right", frameon=False)
ax.set_title(f"Polingual starter set: {len(subset['words']):,} words across {len(langs)} languages", fontsize=14, color=INK, pad=14)
fig.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "polingual-coverage.png"), dpi=110, facecolor=PAPER)
