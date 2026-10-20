import os, sqlite3
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT_DIR = os.environ.get("BKT_GEN_OUT", os.getcwd())
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

db = sqlite3.connect(os.path.join(ROOT, "_intake", "photons", "index.sqlite"))
rows = sorted(db.execute("select lang, count(*) from photons group by lang"), key=lambda r: r[1])
fig, ax = plt.subplots(figsize=(10, 9), facecolor="#fbf7ee")
ax.barh([r[0] for r in rows], [r[1] for r in rows], color="#1c2b2d")
ax.set_xlabel("words")
ax.set_title(f"Full Polingual index: {sum(r[1] for r in rows):,} words by language", fontsize=14, pad=14)
fig.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "polingual-index-languages.png"), dpi=110, facecolor="#fbf7ee")
