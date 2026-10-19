import math, os, sys
sys.path.insert(0, os.path.join(os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")), "papers", "solvability-frontier", "figures"))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Wedge
from matplotlib.lines import Line2D
from common import BRANCH_COLOR, load

PROBLEM = os.environ.get("BKT_GEN_PROBLEM", "navier")
OUT_DIR = os.environ.get("BKT_GEN_OUT", os.getcwd())
HALF = math.radians(6)
f = load("frontier.json")
pts = f["points"]
target = next(p for p in pts if p["id"] == PROBLEM)
th = target["theta"]
def dtheta(q): return abs((q["theta"] - th + math.pi) % (2 * math.pi) - math.pi)
wedge = [q for q in pts if dtheta(q) <= HALF]
pulled = set(target["pulls"])

fig, (ax, bx) = plt.subplots(1, 2, figsize=(16, 8.4), gridspec_kw={"width_ratios": [1, 1.25]})

ax.add_patch(Circle((0, 0), 1.6, color="#f3e9d6", zorder=0))
ax.add_patch(Circle((0, 0), 1.0, color="#ffffff", zorder=0))
ax.add_patch(Circle((0, 0), 0.6, color="#e6efe9", zorder=0))
ax.add_patch(Circle((0, 0), 1.0, fill=False, linewidth=2, color="#1c2b2d", zorder=3))
ax.add_patch(Circle((0, 0), 0.6, fill=False, linestyle=":", linewidth=1, color="#1c2b2d", zorder=3))
ax.scatter([p["radius"] * math.cos(p["theta"]) for p in pts], [-p["radius"] * math.sin(p["theta"]) for p in pts], s=4, c="#9a9a94", alpha=0.25, linewidths=0, zorder=1)
deg = math.degrees(-th)
ax.add_patch(Wedge((0, 0), 1.6, deg - 6, deg + 6, facecolor="#B8861E", alpha=0.18, edgecolor="#8A641A", linewidth=1.2, zorder=2))
ax.scatter([q["radius"] * math.cos(q["theta"]) for q in wedge], [-q["radius"] * math.sin(q["theta"]) for q in wedge], s=10, c=[BRANCH_COLOR.get(q["branch"], "#999") for q in wedge], alpha=0.9, linewidths=0, zorder=4)
tx, ty = target["radius"] * math.cos(th), -target["radius"] * math.sin(th)
ax.scatter([tx], [ty], s=160, marker="*", c="#B8861E", edgecolors="#1c2b2d", linewidths=1, zorder=6)
ax.annotate(target["title"], (tx, ty), xytext=(tx + 0.55, ty - 0.75), ha="left", fontsize=10, fontweight="bold", bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="#1c2b2d", lw=0.8), arrowprops=dict(arrowstyle="-", color="#1c2b2d", lw=0.8), zorder=7)
ax.set_xlim(-1.65, 1.65); ax.set_ylim(-1.65, 1.65); ax.set_aspect("equal"); ax.axis("off")
ax.set_title(f"One direction in meaning: a 12° wedge around {target['title']}\n{len(wedge)} problems in the wedge of {len(pts):,}", fontsize=12, pad=12)

order = {"solved": 0, "reachable": 1, "beyond": 2}
zone_y = {"solved": 2.0, "reachable": 1.0, "beyond": 0.0}
import random
rng = random.Random(7)
for q in wedge:
    y = zone_y[q["zone"]] + rng.uniform(-0.32, 0.32)
    big = q["id"] == PROBLEM or q["id"] in pulled or q["id"] == target["nearest"]["id"]
    bx.scatter([q["reach"]], [y], s=70 if big else 22, c=BRANCH_COLOR.get(q["branch"], "#999"), alpha=0.95 if big else 0.6, edgecolors="#1c2b2d" if big else "none", linewidths=0.8, zorder=4 if big else 2)
bx.axvline(f["threshold"], color="#1c2b2d", linewidth=2, zorder=3)
bx.text(f["threshold"] + 0.006, 2.5, f"frontier, reach {f['threshold']}", fontsize=10, fontweight="bold", va="top")
bx.axvspan(0, f["threshold"], color="#f3e9d6", alpha=0.6, zorder=0)
bx.axvspan(f["threshold"], 1.0, color="#ffffff", zorder=0)
bx.set_yticks([2.0, 1.0, 0.0]); bx.set_yticklabels(["solved", "open, inside\nthe frontier", "open, beyond\nthe frontier"], fontsize=10)
bx.set_xlim(0.45, 1.0); bx.set_ylim(-0.6, 3.6)
bx.set_xlabel("reach: similarity to the closest solved problem", fontsize=10)
bx.grid(axis="x", color="#d3c9ab", linewidth=0.5)
for s in ("top", "right"): bx.spines[s].set_visible(False)
ty = zone_y["beyond"]
bx.annotate(f"{target['title']}\nreach {target['reach']}", (target["reach"], ty), xytext=(target["reach"] - 0.02, ty - 0.52), ha="right", fontsize=10, fontweight="bold",
            bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="#1c2b2d", lw=0.8), arrowprops=dict(arrowstyle="-", color="#1c2b2d", lw=0.8), zorder=6)
nearest = target["nearest"]
names = [next(p["title"] for p in pts if p["id"] == i) for i in list(pulled)[:4]]
bx.text(0.46, 3.5, f"Closest solved problem: {nearest['title']} (similarity {nearest['similarity']}).\nSolving {target['title']} would pull {target['growth'] - 1} beyond neighbours inside (growth {target['growth']}):\n" + "\n".join(f"  · {n[:72]}" for n in names),
        fontsize=9, va="top", color="#1c2b2d", bbox=dict(boxstyle="round,pad=0.4", fc="white", ec="#d3c9ab"))
bx.set_title("Slice profile: every problem in the wedge by reach and zone", fontsize=12, pad=12)
handles = [Line2D([], [], marker="o", linestyle="", markersize=7, color=c, label=b) for b, c in BRANCH_COLOR.items() if any(q["branch"] == b for q in wedge)]
bx.legend(handles=handles, loc="lower right", fontsize=9, frameon=True, edgecolor="#d3c9ab", title="Branch", title_fontsize=9)
fig.text(0.5, 0.015,
  "Left: the full frontier with one direction of meaning shaded, a 12° wedge centred on the problem. Right: the problems in that wedge laid out by reach,\n"
  f"grouped by zone. The problem sits beyond the frontier at reach {target['reach']}; no solved problem is closer than that. Data: public/papers/solvability-frontier/data, built 2026-10-08.",
  ha="center", va="bottom", fontsize=9.5, color="#3a3529", linespacing=1.5)
fig.suptitle(f"The solvability frontier along one direction: {target['title']}", fontsize=16, y=0.98)
fig.subplots_adjust(top=0.86, bottom=0.14, left=0.03, right=0.98, wspace=0.08)
out = os.path.join(OUT_DIR, f"solvability-frontier-slice-{PROBLEM}.png")
fig.savefig(out, dpi=300); fig.savefig(out.replace(".png", ".svg"))
print(out)
