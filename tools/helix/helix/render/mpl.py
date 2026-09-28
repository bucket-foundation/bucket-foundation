from __future__ import annotations

import textwrap
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

BG, INK, SUB = "#EFE8D4", "#1F1C16", "#3A3529"


def palette(K: int) -> list:
    cmap = plt.get_cmap("tab20" if K > 10 else "tab10")
    return [cmap(i % cmap.N) for i in range(K)]


def render(scene: dict, title: str, footer: str, out_dir: Path) -> tuple[Path, Path]:
    plt.rcParams["svg.hashsalt"] = "bucket-helix"
    plt.rcParams["font.family"] = "DejaVu Sans"
    primes = scene["primes"]
    cols = palette(len(primes))
    P = np.asarray(scene["points"])
    t = np.asarray(scene["t"])
    fig = plt.figure(figsize=(14, 7.5), facecolor=BG)
    ax = fig.add_axes([0.0, 0.12, 0.55, 0.78], projection="3d", facecolor=BG)
    bx = fig.add_axes([0.6, 0.2, 0.37, 0.62], facecolor=BG)
    for k, name in enumerate(primes):
        ax.plot(P[:, k, 2], P[:, k, 0], P[:, k, 1], color=cols[k], lw=1.6, label=name)
        share = np.hypot(P[:, k, 0], P[:, k, 1])
        bx.plot(t, share, color=cols[k], lw=1.6, label=name)
    ax.plot(t, np.zeros_like(t), np.zeros_like(t), color=INK, lw=1.2)
    proj = scene.get("projection")
    if proj:
        Q = np.asarray(proj["points"])
        tf = np.asarray(proj["t"])
        lo, hi = np.asarray(proj["lo95"]), np.asarray(proj["hi95"])
        for k in range(len(primes)):
            ax.plot(Q[:, k, 2], Q[:, k, 0], Q[:, k, 1], color=cols[k], lw=1.2, ls="--")
            bx.plot(
                np.r_[t[-1], tf],
                np.r_[np.hypot(P[-1, k, 0], P[-1, k, 1]), np.hypot(Q[:, k, 0], Q[:, k, 1])],
                color=cols[k],
                lw=1.2,
                ls="--",
            )
            bx.fill_between(tf, lo[:, k], hi[:, k], color=cols[k], alpha=0.15, lw=0)
    for ts in scene["slice_t"]:
        bx.axvline(ts, color=SUB, lw=0.4, alpha=0.4)
    ax.set_axis_off()
    ax.view_init(18, -60)
    ax.set_box_aspect((3, 1, 1), zoom=1.25)
    bx.set_ylabel("share", color=INK)
    bx.set_xlabel("t", color=INK)
    bx.set_ylim(0, 1)
    bx.legend(fontsize=7, frameon=False, ncol=2, loc="upper left")
    fig.text(0.03, 0.94, title, fontsize=20, fontweight="bold", color=INK)
    fig.text(0.03, 0.03, "\n".join(textwrap.wrap(footer, 180)), fontsize=7.5, color=SUB)
    png, svg = out_dir / "chart.png", out_dir / "chart.svg"
    fig.savefig(png, dpi=110, facecolor=BG, metadata={"Software": None})
    fig.savefig(svg, facecolor=BG, metadata={"Date": None, "Creator": None})
    plt.close(fig)
    return png, svg
