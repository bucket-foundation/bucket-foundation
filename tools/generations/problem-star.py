import json, math, os, sys
sys.path.insert(0, os.path.join(os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")), "papers", "solvability-frontier", "figures"))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle
from matplotlib.lines import Line2D
from common import BRANCH_COLOR, ROOT, load

PROBLEM = os.environ.get("BKT_GEN_PROBLEM", "navier")
OUT_DIR = os.environ.get("BKT_GEN_OUT", os.getcwd())
d = json.load(open(os.path.join(ROOT, "src", "lib", "research-os", "solvability-neighbors-data.json")))
f = load("frontier.json")
zone = {p["id"]: p["zone"] for p in f["points"]}
nodes = d["nodes"]; ids = d["ids"]
c = nodes[ids.index(PROBLEM)]
nbrs = [(nodes[j], s) for j, s in zip(c["n"], c["s"]) if nodes[j]["kind"] != "theorem"]
nbrs = [(n, s) for n, s in nbrs if n["id"] in zone]
T = f["threshold"]

fig, ax = plt.subplots(figsize=(13, 13))
ax.add_patch(Circle((0, 0), 1.0 - T, color="#e6efe9", zorder=0))
ax.add_patch(Circle((0, 0), 1.0 - T, fill=False, linewidth=2, color="#1c2b2d", zorder=3))
ax.text((1.0 - T) * math.cos(math.radians(225)) - 0.01, (1.0 - T) * math.sin(math.radians(225)) - 0.01, f"frontier threshold {T}", ha="right", va="top", fontsize=10, fontweight="bold", bbox=dict(boxstyle="round,pad=0.25", fc="white", ec="#1c2b2d", lw=0.7), zorder=5)
for r in (0.1, 0.2, 0.3, 0.4):
    ax.add_patch(Circle((0, 0), r, fill=False, linestyle=":", linewidth=0.7, color="#9a9a94", zorder=1))
    ax.text(r * math.cos(math.radians(45)), r * math.sin(math.radians(45)), f"{1 - r:.1f}", fontsize=8, color="#6b6b66", ha="left", va="bottom")
k = len(nbrs)
for i, (n, s) in enumerate(sorted(nbrs, key=lambda t: -t[1])):
    ang = math.pi / 2 - 2 * math.pi * i / k
    r = 1.0 - s
    x, y = r * math.cos(ang), r * math.sin(ang)
    col = BRANCH_COLOR.get(n["branch"], "#999")
    ax.plot([0, x], [0, y], color=col, alpha=0.35, linewidth=1, zorder=2)
    marker = "o" if n["solved"] else ("s" if zone[n["id"]] == "reachable" else "^")
    ax.scatter([x], [y], s=70, c=col, marker=marker, edgecolors="#1c2b2d", linewidths=0.6, zorder=4)
    lx, ly = (r + 0.045) * math.cos(ang), (r + 0.045) * math.sin(ang)
    title = n["title"] if len(n["title"]) <= 46 else n["title"][:44] + "…"
    rot = math.degrees(ang); ha = "left"
    if rot > 90 or rot < -90: rot += 180; ha = "right"
    ax.text(lx, ly, f"{title}  {s:.2f}", fontsize=7.2, rotation=rot, rotation_mode="anchor", ha=ha, va="center", color="#1c2b2d", zorder=5)
ax.scatter([0], [0], s=420, marker="*", c="#B8861E", edgecolors="#1c2b2d", linewidths=1.2, zorder=6)
ax.text(0, -0.035, c["title"], ha="center", va="top", fontsize=11, fontweight="bold", bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="#1c2b2d", lw=0.8), zorder=7)
ax.set_xlim(-0.72, 0.72); ax.set_ylim(-0.72, 0.72); ax.set_aspect("equal"); ax.axis("off")
solved = sum(1 for n, _ in nbrs if n["solved"]); inside = sum(1 for n, _ in nbrs if not n["solved"] and zone[n["id"]] == "reachable"); beyond = k - solved - inside
ax.set_title(f"{c['title']}: its {k} nearest problems\n{solved} solved · {inside} open inside the frontier · {beyond} open beyond it · nearest solved at {c['solved_nearest']['sim']}", fontsize=13, pad=16)
h = [Line2D([], [], marker="o", linestyle="", markersize=8, color="#6b6b66", label="solved"),
     Line2D([], [], marker="s", linestyle="", markersize=8, color="#6b6b66", label="open, inside the frontier"),
     Line2D([], [], marker="^", linestyle="", markersize=8, color="#6b6b66", label="open, beyond the frontier")]
h += [Line2D([], [], marker="o", linestyle="", markersize=8, color=col, label=b) for b, col in BRANCH_COLOR.items() if any(n["branch"] == b for n, _ in nbrs)]
ax.legend(handles=h, loc="lower left", bbox_to_anchor=(-0.04, -0.04), fontsize=9, frameon=True, edgecolor="#d3c9ab", title="Status and branch", title_fontsize=9)
fig.text(0.5, 0.015,
  "Star graph: the problem at the centre, each of its 50 stored neighbours on a ray. Distance from the centre is 1 minus cosine similarity,\n"
  f"so closer means more alike; the solid circle marks the frontier threshold {T}. Shape is status, colour is branch, the number after each title is the similarity.\n"
  "Reach is the closest solved neighbour, so a problem whose only close neighbours are open sits beyond the frontier however many neighbours it has.\n"
  "Data: src/lib/research-os/solvability-neighbors-data.json and public/papers/solvability-frontier/data, built 2026-10-08.",
  ha="center", va="bottom", fontsize=9, color="#3a3529", linespacing=1.5)
fig.subplots_adjust(top=0.9, bottom=0.11, left=0.02, right=0.98)
out = os.path.join(OUT_DIR, f"solvability-frontier-star-{PROBLEM}.png")
fig.savefig(out, dpi=300); fig.savefig(out.replace(".png", ".svg")); print(out)
