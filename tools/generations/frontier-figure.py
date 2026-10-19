import math, sys, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "papers", "solvability-frontier", "figures"))
OUT_DIR = os.environ.get("BKT_GEN_OUT", os.getcwd())
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch, Circle
from matplotlib.lines import Line2D
from common import BRANCH_COLOR, load

f = load("frontier.json")
c = f["counts"]
fig, ax = plt.subplots(figsize=(10, 11))
ax.add_patch(Circle((0, 0), 1.6, color="#f3e9d6", zorder=0))
ax.add_patch(Circle((0, 0), 1.0, color="#ffffff", zorder=0))
ax.add_patch(Circle((0, 0), 0.6, color="#e6efe9", zorder=0))
ax.add_patch(Circle((0, 0), 0.6, fill=False, linestyle=":", linewidth=1.2, color="#1c2b2d", zorder=3))
ax.add_patch(Circle((0, 0), 1.0, fill=False, linewidth=2.4, color="#1c2b2d", zorder=3))
for zone, size, alpha in (("solved", 6, 0.4), ("reachable", 6, 0.55), ("beyond", 7, 0.8)):
    pts = [p for p in f["points"] if p["zone"] == zone]
    ax.scatter([p["radius"] * math.cos(p["theta"]) for p in pts], [-p["radius"] * math.sin(p["theta"]) for p in pts],
               s=size, c=[BRANCH_COLOR.get(p["branch"], "#999") for p in pts], alpha=alpha, linewidths=0, zorder=2)
box = dict(boxstyle="round,pad=0.35", fc="white", ec="#1c2b2d", lw=0.8)
ax.annotate(f"SOLVED\n{c['solved']:,} problems", (0, 0.38), ha="center", va="center", fontsize=10, color="#1c2b2d", bbox=box, zorder=5)
ax.annotate(f"OPEN, INSIDE THE FRONTIER\n{c['reachable']:,} problems with a close solved neighbour", (0, -0.78), ha="center", va="center", fontsize=10, color="#1c2b2d", bbox=box, zorder=5)
ax.annotate(f"OPEN, BEYOND THE FRONTIER\n{c['beyond']:,} problems that need a new idea", (0, 1.3), ha="center", va="center", fontsize=10, color="#1c2b2d", bbox=box, zorder=5)
ax.annotate(f"frontier at reach {f['threshold']}", (1.0, 0.0), xytext=(1.22, 0.42), fontsize=10, fontweight="bold", color="#1c2b2d",
            arrowprops=dict(arrowstyle="-", color="#1c2b2d", lw=0.8), bbox=box, zorder=5)
branch_handles = [Line2D([], [], marker="o", linestyle="", markersize=7, color=col, label=f"{b} ({f['branches'][b]['total']:,})") for b, col in BRANCH_COLOR.items() if b in f["branches"]]
leg1 = ax.legend(handles=branch_handles, loc="upper left", bbox_to_anchor=(-0.02, 1.0), fontsize=9.5, frameon=True, framealpha=0.95, edgecolor="#d3c9ab", title="Branch (problems)", title_fontsize=10)
ax.add_artist(leg1)
zone_handles = [
    Patch(facecolor="#e6efe9", edgecolor="#1c2b2d", linestyle=":", label="solved problems fill the centre"),
    Patch(facecolor="#ffffff", edgecolor="#1c2b2d", linewidth=2, label="open, inside: reach at or above the threshold"),
    Patch(facecolor="#f3e9d6", edgecolor="#d3c9ab", label="open, beyond: reach below the threshold"),
]
ax.legend(handles=zone_handles, loc="lower right", bbox_to_anchor=(1.02, -0.02), fontsize=9.5, frameon=True, framealpha=0.95, edgecolor="#d3c9ab", title="Zones", title_fontsize=10)
ax.set_xlim(-1.65, 1.65); ax.set_ylim(-1.65, 1.65); ax.set_aspect("equal"); ax.axis("off")
ax.set_title(f"The solvability frontier\n{len(f['points']):,} research problems · reach threshold {f['threshold']}", fontsize=15, pad=16)
fig.text(0.5, 0.025,
  "Each point is one research problem placed by a text embedding of its statement. Angle is its position in meaning.\n"
  "Radius is reach: how similar the problem is to the closest solved problem (1 at the centre, 0 at the edge).\n"
  "The solid circle is the frontier. Inside it an open problem has a close solved neighbour, so known results may reach it.\n"
  "Beyond it no solved problem is close, so a new idea is needed. Colour is the problem's branch.\n"
  "Data: public/papers/solvability-frontier/data, built 2026-10-08. Encoder bge-small-en-v1.5.",
  ha="center", va="bottom", fontsize=9.5, color="#3a3529", linespacing=1.55)
fig.subplots_adjust(top=0.9, bottom=0.15, left=0.03, right=0.97)
out = os.path.join(OUT_DIR, "solvability-frontier-figure.png")
fig.savefig(out, dpi=300)
fig.savefig(out.replace(".png", ".svg"))
print(out)
