from __future__ import annotations

import math
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from common import BRANCH_COLOR, HERE, deterministic_pdf, load

OUT = os.path.join(HERE, "fig_frontier.pdf")


def main() -> None:
    f = load("frontier.json")
    fig, ax = plt.subplots(figsize=(7.2, 7.2))
    for r, style in ((0.6, ":"), (1.0, "-"), (1.5, ":")):
        ax.add_patch(plt.Circle((0, 0), r, fill=False, linestyle=style, linewidth=0.8 if style == ":" else 1.4, color="#1c2b2d"))
    for zone, marker, size, alpha in (("solved", "o", 4, 0.35), ("reachable", "o", 4, 0.5), ("beyond", "o", 5, 0.75), ("unsampled", "x", 10, 0.6)):
        pts = [p for p in f["points"] if p["zone"] == zone]
        xs = [p["radius"] * math.cos(p["theta"]) for p in pts]
        ys = [-p["radius"] * math.sin(p["theta"]) for p in pts]
        cs = [BRANCH_COLOR.get(p["branch"], "#999") if zone != "unsampled" else "#8f8f88" for p in pts]
        ax.scatter(xs, ys, s=size, c=cs, marker=marker, alpha=alpha, linewidths=0.4 if marker == "x" else 0)
    for b, c in BRANCH_COLOR.items():
        if b in f["branches"]:
            ax.scatter([], [], s=18, c=c, label=f"{b} ({f['branches'][b]['total']})")
    ax.legend(loc="lower left", fontsize=7, frameon=False, bbox_to_anchor=(-0.02, -0.02))
    ax.set_xlim(-1.6, 1.6)
    ax.set_ylim(-1.6, 1.6)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title(f"Solvability frontier at reach {f['threshold']}: {f['inside']} inside, {f['outside']} outside", fontsize=10)
    fig.tight_layout()
    deterministic_pdf(fig, OUT)


if __name__ == "__main__":
    main()
