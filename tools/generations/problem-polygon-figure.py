import json, math, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "solvability-atlas"))
sys.path.insert(0, os.path.join(ROOT, "papers", "solvability-frontier", "figures"))
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
os.chdir(os.path.join(ROOT, "tools", "solvability-atlas"))
import atlas
from common import BRANCH_COLOR, load

PROBLEM = os.environ.get("BKT_GEN_PROBLEM", "navier")
OUT_DIR = os.environ.get("BKT_GEN_OUT", os.getcwd())
N = 8
f = load("frontier.json")
zone = {p["id"]: p for p in f["points"]}
problems, lean = atlas.load_problems(), atlas.load_bucketmath()
nodes = [n for n in atlas.full_nodes(problems, lean) if n["kind"] != "lean" and n["id"] in zone]
keys = json.load(open(os.path.expanduser("~/.cache/bucket-atlas/keys.json")))
V = np.load(os.path.expanduser("~/.cache/bucket-atlas/vectors.npy"))
kidx = {k: i for i, k in enumerate(keys)}
rows, emb = [], []
for n in nodes:
    text, _ = atlas.full_text(n)
    k = atlas.text_key(text)
    if k in kidx:
        rows.append(n); emb.append(V[kidx[k]])
emb = np.array(emb); emb = emb / np.linalg.norm(emb, axis=1, keepdims=True)
centre = emb.mean(0)
_, sv, vt = np.linalg.svd(emb - centre, full_matrices=False)
axes = vt[:N]; coords = (emb - centre) @ axes.T
explained = sv[:N] ** 2 / (sv ** 2).sum()

tokens = sorted({k.lower() for n in problems for k in n.get("keywords", [])} | {m for n in problems for m in n.get("market", [])})
tok_vecs, tok_names = [], []
for t in tokens:
    k = atlas.text_key(t)
    if k in kidx: tok_vecs.append(V[kidx[k]]); tok_names.append(t)
labels = []
if tok_vecs:
    tok = (np.array(tok_vecs) - centre) @ axes.T
    for k in range(N):
        o = np.argsort(tok[:, k])
        labels.append((" ".join(tok_names[i] for i in o[::-1][:2]), " ".join(tok_names[i] for i in o[:2])))
else:
    labels = [(f"PC{k+1}+", f"PC{k+1}-") for k in range(N)]

pct = np.argsort(np.argsort(coords, axis=0), axis=0) / (len(rows) - 1) * 100
ids = [n["id"] for n in rows]
solved = np.array([zone[i]["zone"] == "solved" for i in ids])
inside = np.array([zone[i]["zone"] == "reachable" for i in ids])
beyond = np.array([zone[i]["zone"] == "beyond" for i in ids])
t = ids.index(PROBLEM)
near_id = zone[PROBLEM]["nearest"]["id"]; nb = ids.index(near_id) if near_id in ids else None

fig, (ax, bx) = plt.subplots(1, 2, figsize=(17, 8.6), subplot_kw={"projection": "polar"})
ang = np.linspace(0, 2 * math.pi, N, endpoint=False)
def close(v): return np.concatenate([v, v[:1]])
A = close(ang)

dom = np.argmax(np.abs(coords), axis=1)
share, counts = [], []
for k in range(N):
    m = (dom == k) & ~solved
    share.append(100 * inside[m].sum() / max(1, m.sum())); counts.append(int(m.sum()))
share = np.array(share)
ax.plot(A, close(share), color="#B8861E", linewidth=2.4); ax.fill(A, close(share), color="#B8861E", alpha=0.25)
ax.plot(A, close(np.full(N, 100 * inside.sum() / (~solved).sum())), color="#1c2b2d", linewidth=1.2, linestyle="--")
for k in range(N):
    ax.annotate(f"{counts[k]} open", (ang[k], share[k]), xytext=(0, 8), textcoords="offset points", ha="center", fontsize=8, color="#3a3529")
ax.set_ylim(0, 100); ax.set_yticks([25, 50, 75, 100]); ax.set_yticklabels(["25%", "50%", "75%", "100%"], fontsize=8, color="#6b6b66")
ax.set_xticks(ang); ax.set_xticklabels([f"{k+1}  {labels[k][0]}\n(opp. {labels[k][1]})" for k in range(N)], fontsize=8.5)
ax.set_title(f"How filled the circle is along each principal direction\nshare of open problems inside the frontier, by dominant direction (dashed: all open, {100 * inside.sum() / (~solved).sum():.0f}%)", fontsize=11.5, pad=24)

you = pct[t]; sm = np.median(pct[solved], axis=0)
bx.plot(A, close(sm), color="#1c2b2d", linewidth=1.6, linestyle="--", label="median solved problem")
bx.plot(A, close(you), color="#B8861E", linewidth=2.6, label=zone[PROBLEM]["title"]); bx.fill(A, close(you), color="#B8861E", alpha=0.25)
if nb is not None:
    bx.plot(A, close(pct[nb]), color="#1f6f8b", linewidth=1.8, linestyle=":", label=f"closest solved: {zone[near_id]['title']}")
bx.set_ylim(0, 100); bx.set_yticks([25, 50, 75, 100]); bx.set_yticklabels(["25", "50", "75", "100"], fontsize=8, color="#6b6b66")
bx.set_xticks(ang); bx.set_xticklabels([f"{k+1}  {labels[k][0]}" for k in range(N)], fontsize=8.5)
bx.legend(loc="upper left", bbox_to_anchor=(-0.25, 1.12), fontsize=9, frameon=True, edgecolor="#d3c9ab")
bx.set_title(f"{zone[PROBLEM]['title']} on the same eight directions\ncorpus percentile per component, as on the advisor cards", fontsize=11.5, pad=24)

fig.suptitle("The solvability frontier on its principal directions", fontsize=16, y=0.99)
fig.text(0.5, 0.01,
  f"Axes are the first {N} principal components of the {len(rows):,} problem embeddings (bge-small-en-v1.5), {100 * explained.sum():.1f}% of variance; each is named by the keyword tokens that project furthest along it.\n"
  "Left: each open problem is assigned to the component it loads on most; the polygon is the share of those problems inside the frontier (reach at or above 0.762).\n"
  "Right: one problem's percentile on each component against the whole corpus, the reading used on the advisor fit cards. Data built 2026-10-08.",
  ha="center", va="bottom", fontsize=9, color="#3a3529", linespacing=1.5)
fig.subplots_adjust(top=0.84, bottom=0.14, left=0.05, right=0.95, wspace=0.35)
out = os.path.join(OUT_DIR, f"solvability-frontier-polygon-{PROBLEM}.png")
fig.savefig(out, dpi=300); fig.savefig(out.replace(".png", ".svg"))
print(out, len(rows), [round(float(x), 3) for x in explained])
