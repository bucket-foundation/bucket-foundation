import json, math, os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
from matplotlib.lines import Line2D
from matplotlib.patches import Circle, Patch, ConnectionPatch, Polygon as MplPolygon
from matplotlib.path import Path

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
PROBLEM = os.environ.get("BKT_GEN_PROBLEM", "navier")
OUT_DIR = os.environ.get("BKT_GEN_OUT", os.getcwd())
OUT = OUT_DIR.rstrip("/") + "/"
POLYGON = os.environ.get("BKT_GEN_POLYGON", OUT + f"{PROBLEM}-polygon.json")
INK = "#1c2b2d"; RED = "#d1302f"

f = json.load(open(os.path.join(ROOT, "output", "solvability-frontier", "report", "frontier.json")))
P = f["points"]; tau = f["threshold"]
C2 = {"mathematics": "#1f6f78", "physics": "#8a5fb0", "chemistry": "#c9833f", "information": "#2f5fa8", "biophysics": "#4d9a6a", "cosmology": "#b0486b", "mind": "#a3923a", "applied": "#6b6b6b"}
def xy(p):
    return p["radius"] * math.cos(p["theta"]), -p["radius"] * math.sin(p["theta"])
nv = next(p for p in P if p["id"] == PROBLEM); nx, ny = xy(nv)
LABEL = os.environ.get("BKT_GEN_LABEL") or ("Navier-Stokes" if PROBLEM == "navier" else nv.get("title", PROBLEM))
cnt = {z: sum(1 for p in P if p["zone"] == z) for z in ("solved", "reachable", "beyond")}
FH = 10.35; AB = 2.54 / 10.35; PY = -0.26
fig = plt.figure(figsize=(8, FH))
ax = fig.add_axes([0.04, AB, 0.92, 0.92 * 8 / FH])
ax.add_patch(Circle((0, 0), 1.5, color="#f3e7d3", zorder=0))
ax.add_patch(Circle((0, 0), 1.0, color="white", zorder=1))
ax.add_patch(Circle((0, 0), 0.6, color="#e3efe6", zorder=2))
ax.add_patch(Circle((0, 0), 0.6, fill=False, ls=":", lw=1.0, color=INK, zorder=3))
ax.add_patch(Circle((0, 0), 1.0, fill=False, ls="-", lw=1.8, color=INK, zorder=3))
ax.set_aspect("equal"); ax.axis("off"); ax.set_xlim(-1.58, 1.58); ax.set_ylim(-1.58, 1.58)
for zone, marker, size, alpha in (("solved", "o", 5, 0.45), ("reachable", "^", 10, 0.6), ("beyond", "^", 10, 0.8)):
    pts = [p for p in P if p["zone"] == zone]
    xs, ys = zip(*[xy(p) for p in pts])
    ax.scatter(xs, ys, s=size, c=[C2.get(p["branch"], "#999") for p in pts], marker=marker, alpha=alpha, linewidths=0, zorder=4)
PG = json.load(open(POLYGON)); N = len(PG["you"])
ANG = [2 * math.pi * k / N for k in range(N)]
GOLD = "#B8861E"; S = 0.075
small = [(nx + S * r / 100 * math.cos(a), ny + S * r / 100 * math.sin(a)) for a, r in zip(ANG, PG["you"])]
ax.add_patch(MplPolygon(small, closed=True, fc=GOLD, ec="black", lw=1.1, zorder=8))
ax.scatter([nx], [ny], s=4, c="black", zorder=9)
AH = 0.92 * 8 / FH
PH = 0.36; PW = 0.265
ins = ax.inset_axes([0.0, PY, PW, PH])
ins.set_xticks([]); ins.set_yticks([])
for sp in ins.spines.values():
    sp.set_edgecolor("black"); sp.set_linewidth(1.2)
ins.set_zorder(9)
pw, ph = 0.275 * 0.92, 0.275 * AH
pax = fig.add_axes([0.04 + 0.1 * PW * 0.92, AB + PY * AH + 0.338 * PH * AH, 0.8 * PW * 0.92, 0.8 * PW * 0.92 * 8 / FH], projection="polar")
pax.set_zorder(10); pax.patch.set_alpha(0)
cl = lambda v: list(v) + [v[0]]
pax.plot(cl(ANG), cl(PG["median_solved"]), color=INK, lw=1.0, ls="--")
if PG["nearest"]: pax.plot(cl(ANG), cl(PG["nearest"]), color="#1f6f8b", lw=1.1, ls=":")
pax.plot(cl(ANG), cl(PG["you"]), color=GOLD, lw=1.8); pax.fill(cl(ANG), cl(PG["you"]), color=GOLD, alpha=0.25)
pax.scatter([0], [0], s=14, color=INK, zorder=10, clip_on=False)
pax.set_ylim(0, 100); pax.set_yticks([25, 50, 75, 100]); pax.set_yticklabels([]); pax.set_xticks(ANG); pax.set_xticklabels([str(k + 1) for k in range(N)], fontsize=6); pax.tick_params(axis="x", pad=-1); pax.grid(lw=0.5)
hp = [Line2D([], [], color=GOLD, lw=2, label=LABEL), Line2D([], [], color=INK, lw=1.2, ls="--", label="median solved problem"), Line2D([], [], color="#1f6f8b", lw=1.3, ls=":", label="closest solved: " + PG["nearest_title"])]
BT = json.load(open(os.path.join(ROOT, "output", "solvability-frontier", "report", "backtest.json")))
tab = []
def row4(a, b, c_, d):
    ph_ = (a * d - b * c_) / math.sqrt((a + b) * (c_ + d) * (a + c_) * (b + d)); ri, ro = a / (a + b), c_ / (c_ + d)
    return (f"{100 * ri:.1f}%", f"{100 * ro:.1f}%", f"{ri / ro:.1f}x", f"{ph_:.2f}", f"{ph_ * ph_:.2f}")
for c in BT["cutoffs"]:
    s_ = next(x for x in c["codings"] if x["coding"] == "settled")["all"]
    tab.append((f"Solved since {c['cutoff']}",) + row4(s_["resolvedInside"], s_["inside"] - s_["resolvedInside"], s_["resolvedOutside"], s_["outside"] - s_["resolvedOutside"]))
tab.append(("Claimed by OpenAI",) + row4(52, 951, 14, 323))
sol_ = [p for p in P if p["zone"] == "solved"]; opn_ = [p for p in P if p["zone"] != "solved"]
si_ = sum(p["reach"] >= tau for p in sol_); oi_ = sum(p["reach"] >= tau for p in opn_)
tab.insert(0, ("Solved today, all",) + row4(si_, oi_, len(sol_) - si_, len(opn_) - oi_))
mx = ax.inset_axes([0.56, PY, 0.44, 0.23]); mx.set_xlim(0, 1); mx.set_ylim(0, 1); mx.set_xticks([]); mx.set_yticks([]); mx.patch.set_facecolor("#fdfaf3"); mx.set_zorder(9)
for sp in mx.spines.values():
    sp.set_edgecolor("#d9c9a8"); sp.set_linewidth(0.9)
mx.text(0.04, 0.9, "Predictive value of the frontier line", fontsize=9.5, fontweight="bold", color=INK, va="center")
for x_, h_ in ((0.50, "inside"), (0.64, "outside"), (0.76, "ratio"), (0.86, "r"), (0.96, "R\u00b2")):
    mx.text(x_, 0.75, h_, fontsize=7.2, color="#555", va="center", ha="right")
mx.plot([0.04, 0.96], [0.67, 0.67], color="#d9c9a8", lw=0.8)
for r_, (n_, a_, b_, c_, d_, e_) in enumerate(tab):
    y_ = 0.57 - 0.105 * r_
    mx.text(0.04, y_, n_, fontsize=7.4, color=INK, va="center")
    for x_, v_, w_ in ((0.50, a_, "normal"), (0.64, b_, "normal"), (0.76, c_, "normal"), (0.86, d_, "normal"), (0.96, e_, "normal")):
        mx.text(x_, y_, v_, fontsize=7.2, fontweight=w_, fontfamily="DejaVu Sans", color=INK, va="center", ha="right")
mx.text(0.04, 0.09, "Share solved or claimed, inside against outside the frontier line. r and R\u00b2 score\ninside or outside as a yes-or-no prediction. The top row is in sample.", fontsize=5.3, color="#555", va="center", linespacing=1.3)
l3 = ins.legend(handles=hp, loc="lower center", bbox_to_anchor=(0.5, 0.035), fontsize=4.9, ncol=1, frameon=True, edgecolor="#d9c9a8", facecolor="white", handletextpad=0.5, labelspacing=0.35, borderpad=0.6)

fig.canvas.draw()
inv = fig.transFigure.inverted()
ks = sorted(range(N), key=lambda k: small[k][0]); ks = [ks[0], ks[-1]]
sm_f = [inv.transform(ax.transData.transform(small[k])) for k in ks]
bg_f = [inv.transform(pax.transData.transform((ANG[k], PG["you"][k]))) for k in ks]
fig.add_artist(MplPolygon([sm_f[0], sm_f[1], bg_f[1], bg_f[0]], closed=True, transform=fig.transFigure, fc=GOLD, ec="none", alpha=0.16, zorder=5))
for a_, b_ in zip(sm_f, bg_f):
    fig.add_artist(Line2D([a_[0], b_[0]], [a_[1], b_[1]], transform=fig.transFigure, color=GOLD, lw=1.2, zorder=6))
ins.set_xlim(0, 1); ins.set_ylim(0, 1); ins.patch.set_facecolor("#fdfaf3")
ins.text(0.5, 0.235, LABEL, fontsize=11.5, fontweight="bold", color=INK, va="center", ha="center")
def box(x, y, t, fs=8):
    ax.text(x, y, t, ha="center", va="center", fontsize=fs, color=INK, bbox=dict(boxstyle="round,pad=0.25", fc="white", ec=INK, lw=0.6), zorder=6)
box(0, 0.02, f"SOLVED\n{cnt['solved']:,} problems", 8.5)
box(0.05, 0.8, f"OPEN, INSIDE THE FRONTIER\n{cnt['reachable']:,} problems with a close solved neighbour")
box(0, 1.27, f"OPEN, BEYOND THE FRONTIER\n{cnt['beyond']:,} problems that need a new idea")
ax.annotate(f"frontier at similarity {tau}", xy=(math.cos(0.45), math.sin(0.45)), xytext=(0.9, 0.78), fontsize=8, fontweight="bold", color=INK, bbox=dict(boxstyle="round,pad=0.25", fc="white", ec=INK, lw=0.6), arrowprops=dict(arrowstyle="-", color=INK, lw=0.7), zorder=6)
fig.text(0.5, 0.969, "The Solvability Frontier", ha="center", fontsize=17, fontweight="bold", color=INK)
lg = fig.add_axes([0.02, 0.008, 0.96, 0.05]); lg.axis("off")
hb = [Line2D([], [], marker="o", ls="", color=c, ms=6, label=f"{b} ({f['branches'][b]['total']:,})") for b, c in C2.items() if b in f["branches"]]
l1 = ax.legend(handles=hb, loc="upper left", bbox_to_anchor=(0.0, 0.988), fontsize=8, ncol=1, frameon=True, edgecolor="#d9c9a8", facecolor="#fdfaf3", title="Branch (problems)", title_fontsize=8.5, handletextpad=0.3, labelspacing=0.3); l1.set_zorder(9)
ax.add_artist(l1)
hm = [Line2D([], [], marker="o", ls="", color="#555", ms=6, label=f"solved problem ({cnt['solved']:,})"), Line2D([], [], marker="^", ls="", color="#555", ms=7, label=f"open problem ({cnt['reachable'] + cnt['beyond']:,})"), Line2D([], [], marker=Path([(r / 100 * math.cos(a), r / 100 * math.sin(a)) for a, r in zip(ANG + ANG[:1], PG["you"] + PG["you"][:1])]), ls="", color=GOLD, mec="black", ms=15, label=LABEL)]
l2 = ax.legend(handles=hm, loc="upper right", bbox_to_anchor=(1.0, 0.988), fontsize=8, frameon=True, edgecolor="#d9c9a8", facecolor="#fdfaf3", title="Marks", title_fontsize=8.5, handletextpad=0.3); l2.set_zorder(9)



lg.text(0.5, 0.0, "Each point is one research problem placed by a text embedding of its statement. Angle is its position in meaning.\nRadius is similarity to the closest solved problem, 1 at the centre. The solid circle is the frontier.\nData built 2026-10-08. Encoder bge-small-en-v1.5.", ha="center", va="bottom", fontsize=7.2, color="#444")
fig.savefig(OUT + f"frontier-card-{PROBLEM}.png", dpi=450, facecolor="white"); fig.savefig(OUT + f"frontier-card-{PROBLEM}.pdf", facecolor="white")
print("card ok")
