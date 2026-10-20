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

OUT = OUT_DIR.rstrip("/") + "/"
ang = np.linspace(0, 2 * math.pi, N, endpoint=False)
def close(v): return np.concatenate([v, v[:1]])
A = close(ang)
you = pct[t]; sm = np.median(pct[solved], axis=0)
for name, size, fs, full in ((f"{PROBLEM}-polygon-circle.png", 7.2, 10, True), (f"{PROBLEM}-polygon-inset.png", 4.2, 0, False)):
    fig, bx = plt.subplots(figsize=(size, size), subplot_kw={"projection": "polar"})
    bx.plot(A, close(sm), color="#1c2b2d", linewidth=1.6, linestyle="--", label="median solved problem")
    bx.plot(A, close(you), color="#B8861E", linewidth=2.6, label=zone[PROBLEM]["title"]); bx.fill(A, close(you), color="#B8861E", alpha=0.25)
    if nb is not None:
        bx.plot(A, close(pct[nb]), color="#1f6f8b", linewidth=1.8, linestyle=":", label=f"closest solved: {zone[near_id]['title']}")
    bx.scatter([0], [0], s=60 if full else 45, color="#1c2b2d", zorder=10, clip_on=False)
    bx.set_ylim(0, 100); bx.set_yticks([25, 50, 75, 100]); bx.set_xticks(ang)
    if full:
        bx.set_yticklabels(["25", "50", "75", "100"], fontsize=8, color="#6b6b66")
        bx.set_xticklabels([f"{k+1}  {labels[k][0]}" for k in range(N)], fontsize=fs)
        bx.legend(loc="upper center", bbox_to_anchor=(0.5, -0.17), fontsize=10, frameon=True, edgecolor="#d3c9ab")
        bx.tick_params(axis="x", pad=26)
        for lab, a in zip(bx.get_xticklabels(), ang):
            c = math.cos(a); lab.set_ha("left" if c > 0.3 else "right" if c < -0.3 else "center")
        bx.tick_params(axis="x", pad=8); bx.set_title(zone[PROBLEM]["title"], fontsize=15, pad=30)
    else:
        bx.set_yticklabels([]); bx.set_xticklabels([str(k + 1) for k in range(N)], fontsize=11)
    fig.savefig(OUT + name, dpi=300, bbox_inches="tight", facecolor="white")
json.dump({"labels": [l[0] for l in labels], "nearest_title": zone[near_id]["title"], "you": [float(x) for x in you], "median_solved": [float(x) for x in sm], "nearest": [float(x) for x in pct[nb]] if nb is not None else None}, open(OUT + f"{PROBLEM}-polygon.json", "w"))
