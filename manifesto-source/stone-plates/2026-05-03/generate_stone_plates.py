#!/usr/bin/env python3
"""
Stone Plates — same 13 mathematical objects as the chalkboard plates,
re-rendered as engraved tablets: warm sandstone background, deep umber
chiseled strokes, faint highlight bevel, weathered noise texture.

The math is identical to ``../quantum-plates/2026-05-03/generate_plates.py``.
Only the visual register changes:

    chalkboard register      stone register
    --------------------     --------------------
    deep slate green bg      warm sandstone bg with procedural noise
    bone chalk strokes       deep umber engraved strokes
    soft hand jitter         hairline jitter (chisel wear, not handwriting)
    no bevel                 1-pixel highlight stroke offset down-right (faux 3D)
    italic serif labels      bold serif labels (carved feel)

Run:
    python3 generate_stone_plates.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path
from typing import Callable

import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Arc, Circle


# ───────────────────────────── style helpers ─────────────────────────────

STONE_BG = "#c9b78a"        # sandstone / aged limestone
STONE_BG_2 = "#b8a574"      # darker sandstone for noise
STONE_FG = "#2a1d10"        # deep umber, the color of an engraved groove
STONE_GOLD = "#7a5510"      # antique gold (darker than chalk version, reads on stone)
STONE_DIM = "#5a4a30"       # secondary stroke
STONE_HIGHLIGHT = "#e8d9b0" # faux-bevel highlight (lighter than bg)
STONE_FAINT = "#7a6840"     # ghost stroke for axes / grids


def stone_style() -> None:
    """Global rcParams for the stone-tablet register."""
    mpl.rcParams.update({
        "figure.facecolor": STONE_BG,
        "axes.facecolor": STONE_BG,
        "savefig.facecolor": STONE_BG,
        "axes.edgecolor": STONE_FG,
        "axes.labelcolor": STONE_FG,
        "axes.titlecolor": STONE_FG,
        "axes.titlesize": 16,
        "axes.titlepad": 18,
        "xtick.color": STONE_FG,
        "ytick.color": STONE_FG,
        "text.color": STONE_FG,
        "lines.linewidth": 2.6,
        "lines.solid_capstyle": "round",
        "lines.solid_joinstyle": "round",
        "font.family": "serif",
        "font.weight": "bold",
        "font.style": "normal",
        "font.size": 12,
        # Less jitter than chalk — a chisel is precise, slate is forgiving.
        # Tiny hairline irregularity for chisel wear.
        "path.sketch": (0.6, 100, 0.6),
        "axes.grid": False,
        "axes.spines.top": False,
        "axes.spines.right": False,
    })


def stone_noise(ax, xlim, ylim, *, density: float = 0.012) -> None:
    """Procedural noise overlay on the axes — gives the stone its grain.
    Uses a low-resolution warm-toned random field, blurred in interpolation."""
    rng = np.random.default_rng(42)
    nx, ny = 220, 220
    # Smoothed multi-octave noise for a non-uniform stone grain.
    n1 = rng.uniform(-1, 1, (ny, nx))
    n2 = rng.uniform(-1, 1, (ny // 4, nx // 4))
    # upsample n2 to (ny, nx) by repeat
    n2u = np.repeat(np.repeat(n2, 4, axis=0), 4, axis=1)[:ny, :nx]
    n = 0.55 * n1 + 0.45 * n2u
    n = (n - n.min()) / (n.max() - n.min())  # 0..1
    # Map noise → warm sandstone gradient.
    rgb = np.zeros((ny, nx, 4))
    bg = np.array([0xc9, 0xb7, 0x8a]) / 255.0
    bg2 = np.array([0xa8, 0x96, 0x68]) / 255.0
    for i in range(3):
        rgb[..., i] = (1 - n) * bg[i] + n * bg2[i]
    rgb[..., 3] = 1.0
    ax.imshow(rgb, extent=(*xlim, *ylim), aspect="auto", zorder=-10, interpolation="bilinear")


def label(ax, x: float, y: float, text: str, *, color: str = STONE_FG,
          size: int = 13, weight: str = "bold",
          halign: str = "left", valign: str = "center") -> None:
    ax.text(x, y, text, color=color, fontsize=size, family="serif",
            weight=weight, ha=halign, va=valign, zorder=10)


def title(ax, text: str) -> None:
    ax.set_title(text, color=STONE_FG, fontsize=17, family="serif",
                 weight="bold", pad=18)


def stone_axes(ax, xlim, ylim, *, axis_labels: tuple[str, str] | None = None) -> None:
    ax.set_xlim(xlim); ax.set_ylim(ylim)
    ax.set_aspect("equal"); ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values():
        s.set_visible(False)
    stone_noise(ax, xlim, ylim)
    ax.axhline(0, color=STONE_FAINT, lw=1.0, alpha=0.55, zorder=1)
    ax.axvline(0, color=STONE_FAINT, lw=1.0, alpha=0.55, zorder=1)
    if axis_labels:
        xl, yl = axis_labels
        label(ax, xlim[1] * 0.94, -0.06 * (ylim[1] - ylim[0]),
              xl, color=STONE_DIM, size=11)
        label(ax, 0.02 * (xlim[1] - xlim[0]), ylim[1] * 0.94,
              yl, color=STONE_DIM, size=11)


def engraved(ax, x, y, *, color=STONE_FG, lw=2.6, alpha=1.0, **kw):
    """Plot a polyline as an engraved groove: faint highlight offset down-right
    (the lit side of the carve) + main dark stroke (the groove itself)."""
    # The highlight gives the illusion of depth without 3D math.
    # Offset in display coordinates is a hassle in matplotlib; we approximate
    # by drawing a slightly lighter stroke in world coords with a tiny shift.
    xa = np.asarray(x); ya = np.asarray(y)
    if xa.ndim == 0:
        return ax.plot(x, y, color=color, lw=lw, alpha=alpha, **kw)
    # Compute axis extent for offset scale
    xlim = ax.get_xlim(); ylim = ax.get_ylim()
    dx = (xlim[1] - xlim[0]) * 0.0015
    dy = -(ylim[1] - ylim[0]) * 0.0015
    ax.plot(xa + dx, ya + dy, color=STONE_HIGHLIGHT, lw=lw * 1.05,
            alpha=0.55, zorder=kw.pop("zorder", 4) - 1)
    return ax.plot(xa, ya, color=color, lw=lw, alpha=alpha, **kw)


def save(fig, path: Path) -> None:
    fig.savefig(path, dpi=180, bbox_inches="tight", facecolor=STONE_BG)
    plt.close(fig)
    print(f"  → {path.name}  ({path.stat().st_size // 1024} KB)")


def tight_3d(fig, ax) -> None:
    ax.set_box_aspect((1, 1, 1))
    fig.subplots_adjust(left=-0.08, right=1.08, top=0.96, bottom=-0.04)


# ───────────────────────────── plates ─────────────────────────────

def plate_01_eulers_identity(out: Path) -> None:
    fig, ax = plt.subplots(figsize=(8.5, 8.5))
    stone_axes(ax, (-1.5, 1.5), (-1.5, 1.5), axis_labels=("Re", "Im"))

    theta = np.linspace(0, 2 * np.pi, 800)
    engraved(ax, np.cos(theta), np.sin(theta), color=STONE_FG, lw=2.6, zorder=4)

    th = 2 * np.pi / 3
    cx, sx = math.cos(th), math.sin(th)
    engraved(ax, [0, cx], [0, sx], color=STONE_GOLD, lw=2.8, zorder=5)
    ax.plot(cx, sx, "o", color=STONE_GOLD, markersize=9, zorder=6)

    ax.plot([cx, cx], [0, sx], color=STONE_DIM, lw=1.4, ls=(0, (4, 3)), zorder=3)
    ax.plot([0, cx], [sx, sx], color=STONE_DIM, lw=1.4, ls=(0, (4, 3)), zorder=3)

    arc = Arc((0, 0), 0.5, 0.5, angle=0, theta1=0, theta2=math.degrees(th),
              color=STONE_FG, lw=1.6)
    ax.add_patch(arc)
    label(ax, 0.32, 0.18, r"$\theta$", size=14)
    label(ax, cx - 0.02, -0.13, r"$\cos\theta$", color=STONE_DIM, halign="right")
    label(ax, -0.05, sx, r"$\sin\theta$", color=STONE_DIM, halign="right")
    label(ax, cx + 0.06, sx + 0.05, r"$e^{i\theta}$", color=STONE_GOLD, size=15)

    title(ax, r"$e^{i\theta} \;=\; \cos\theta \,+\, i\sin\theta$")
    save(fig, out)


def plate_02_helix(out: Path) -> None:
    fig = plt.figure(figsize=(9, 9))
    ax = fig.add_subplot(111, projection="3d")
    ax.set_facecolor(STONE_BG)

    t = np.linspace(0, 6 * np.pi, 1000)
    x, y, z = np.cos(t), np.sin(t), t / (2 * np.pi)

    # 3D engraved: drop a slightly lighter shadow line, then dark stroke.
    ax.plot(x + 0.012, y + 0.012, z, color=STONE_HIGHLIGHT, lw=2.8, alpha=0.55)
    ax.plot(x, y, z, color=STONE_FG, lw=2.6)
    ax.plot(x, y, np.zeros_like(t), color=STONE_DIM, lw=1.0, alpha=0.65)
    ax.plot([0, 0], [0, 0], [0, t[-1] / (2 * np.pi)],
            color=STONE_FAINT, lw=1.0, ls=(0, (4, 3)))

    ax.set_xlim(-1.5, 1.5); ax.set_ylim(-1.5, 1.5); ax.set_zlim(0, 3.2)
    ax.set_axis_off()
    tight_3d(fig, ax)
    ax.view_init(elev=22, azim=-58)

    fig.suptitle(r"$\gamma(t) \;=\; (\cos t,\; \sin t,\; t)$",
                 color=STONE_FG, fontsize=17, family="serif", weight="bold", y=0.94)
    save(fig, out)


def plate_03_logarithmic_spiral(out: Path) -> None:
    fig, ax = plt.subplots(figsize=(8.5, 8.5))
    stone_axes(ax, (-3, 3), (-3, 3))

    a, b = 0.22, 0.20
    theta = np.linspace(-0.5 * np.pi, 5.5 * np.pi, 1800)
    r = a * np.exp(b * theta)
    x, y = r * np.cos(theta), r * np.sin(theta)
    engraved(ax, x, y, color=STONE_FG, lw=2.6)

    k = 1500
    px, py = x[k], y[k]
    dx = x[k + 1] - x[k - 1]; dy = y[k + 1] - y[k - 1]
    nrm = math.hypot(dx, dy); tx, ty = dx / nrm, dy / nrm
    tlen = 1.1
    engraved(ax, [px - tx * tlen, px + tx * tlen],
             [py - ty * tlen, py + ty * tlen],
             color=STONE_GOLD, lw=2.8)
    ax.plot([0, px], [0, py], color=STONE_GOLD, lw=1.5,
            ls=(0, (4, 3)), alpha=0.85)
    ax.plot(px, py, "o", color=STONE_GOLD, markersize=9, zorder=6)

    title(ax, r"$r \;=\; a\, e^{\,b\theta}$  —  spira mirabilis")
    label(ax, 0, -3.35,
          r"$\angle$(tangent, radius) is constant for every point on the curve",
          color=STONE_DIM, size=11, halign="center")
    save(fig, out)


def plate_04_great_circle(out: Path) -> None:
    fig = plt.figure(figsize=(11, 11))
    ax = fig.add_subplot(111, projection="3d")
    ax.set_facecolor(STONE_BG)

    u = np.linspace(0, 2 * np.pi, 32); v = np.linspace(0, np.pi, 16)
    U, V = np.meshgrid(u, v)
    sx = np.cos(U) * np.sin(V); sy = np.sin(U) * np.sin(V); sz = np.cos(V)
    ax.plot_wireframe(sx, sy, sz, color=STONE_FAINT, lw=0.6, alpha=0.7)

    p1 = np.array([math.cos(0.7) * math.sin(1.0),
                   math.sin(0.7) * math.sin(1.0), math.cos(1.0)])
    p2 = np.array([math.cos(2.6) * math.sin(2.1),
                   math.sin(2.6) * math.sin(2.1), math.cos(2.1)])
    p1 /= np.linalg.norm(p1); p2 /= np.linalg.norm(p2)
    omega = math.acos(np.clip(np.dot(p1, p2), -1, 1))
    ts = np.linspace(0, 1, 200)
    arc = (np.sin((1 - ts) * omega)[:, None] * p1
           + np.sin(ts * omega)[:, None] * p2) / math.sin(omega)
    ax.plot(arc[:, 0], arc[:, 1], arc[:, 2], color=STONE_GOLD, lw=2.8)
    for p in (p1, p2):
        ax.scatter(*p, color=STONE_GOLD, s=55)
    chord = np.linspace(p1, p2, 50)
    ax.plot(chord[:, 0], chord[:, 1], chord[:, 2],
            color=STONE_DIM, lw=1.3, ls=(0, (4, 3)))

    ax.set_xlim(-1.1, 1.1); ax.set_ylim(-1.1, 1.1); ax.set_zlim(-1.1, 1.1)
    ax.set_axis_off()
    tight_3d(fig, ax)
    ax.view_init(elev=18, azim=35)

    fig.suptitle("great-circle geodesic on $S^2$",
                 color=STONE_FG, fontsize=17, family="serif", weight="bold", y=0.94)
    save(fig, out)


def plate_05_loxodrome(out: Path) -> None:
    fig = plt.figure(figsize=(11, 11))
    ax = fig.add_subplot(111, projection="3d")
    ax.set_facecolor(STONE_BG)

    u = np.linspace(0, 2 * np.pi, 32); v = np.linspace(0, np.pi, 16)
    U, V = np.meshgrid(u, v)
    sx = np.cos(U) * np.sin(V); sy = np.sin(U) * np.sin(V); sz = np.cos(V)
    ax.plot_wireframe(sx, sy, sz, color=STONE_FAINT, lw=0.6, alpha=0.7)

    beta = np.deg2rad(72)
    t = np.linspace(-3, 3, 1500)
    lat = 2 * np.arctan(np.exp(t * math.tan(beta))) - np.pi / 2
    lng = t
    x = np.cos(lng) * np.cos(lat); y = np.sin(lng) * np.cos(lat); z = np.sin(lat)
    ax.plot(x, y, z, color=STONE_GOLD, lw=2.6)

    ax.set_xlim(-1.1, 1.1); ax.set_ylim(-1.1, 1.1); ax.set_zlim(-1.1, 1.1)
    ax.set_axis_off()
    tight_3d(fig, ax)
    ax.view_init(elev=22, azim=-30)

    fig.suptitle("loxodrome — spiral of constant bearing on $S^2$",
                 color=STONE_FG, fontsize=16, family="serif", weight="bold", y=0.94)
    save(fig, out)


def plate_06_torus(out: Path) -> None:
    fig = plt.figure(figsize=(9, 9))
    ax = fig.add_subplot(111, projection="3d")
    ax.set_facecolor(STONE_BG)

    R, r = 1.2, 0.45
    u = np.linspace(0, 2 * np.pi, 60); v = np.linspace(0, 2 * np.pi, 30)
    U, V = np.meshgrid(u, v)
    X = (R + r * np.cos(V)) * np.cos(U)
    Y = (R + r * np.cos(V)) * np.sin(U)
    Z = r * np.sin(V)
    ax.plot_wireframe(X, Y, Z, color=STONE_FG, lw=0.75, alpha=0.85)

    theta = np.linspace(0, 4 * np.pi, 600); phi = 6 * theta
    fx = (R + r * np.cos(phi)) * np.cos(theta)
    fy = (R + r * np.cos(phi)) * np.sin(theta)
    fz = r * np.sin(phi)
    ax.plot(fx, fy, fz, color=STONE_GOLD, lw=2.4)

    ax.set_xlim(-1.8, 1.8); ax.set_ylim(-1.8, 1.8); ax.set_zlim(-1.0, 1.0)
    ax.set_axis_off()
    tight_3d(fig, ax)
    ax.view_init(elev=24, azim=-42)

    fig.suptitle(r"torus  $\;(R + r\cos v)(\cos u,\, \sin u),\; r\sin v$",
                 color=STONE_FG, fontsize=16, family="serif", weight="bold", y=0.94)
    save(fig, out)


def plate_07_vesica_piscis(out: Path) -> None:
    fig, ax = plt.subplots(figsize=(9, 7))
    stone_axes(ax, (-2.2, 2.2), (-1.7, 1.7))

    for cx in (-0.5, 0.5):
        circ = Circle((cx, 0), 1.0, fill=False, edgecolor=STONE_FG, lw=2.5)
        ax.add_patch(circ)

    lens_x: list[float] = []; lens_y: list[float] = []
    th = np.linspace(np.deg2rad(120), np.deg2rad(240), 200)
    lens_x.extend(0.5 + np.cos(th)); lens_y.extend(np.sin(th))
    th = np.linspace(np.deg2rad(-60), np.deg2rad(60), 200)
    lens_x.extend(-0.5 + np.cos(th)); lens_y.extend(np.sin(th))
    ax.fill(lens_x, lens_y, color=STONE_GOLD, alpha=0.30, zorder=2)
    ax.plot(lens_x, lens_y, color=STONE_GOLD, lw=2.6, zorder=3)

    for cx in (-0.5, 0.5):
        ax.plot(cx, 0, "o", color=STONE_FG, markersize=6)
    for vy in (math.sqrt(3) / 2, -math.sqrt(3) / 2):
        ax.plot(0, vy, "o", color=STONE_GOLD, markersize=7)

    label(ax, 0, math.sqrt(3) / 2 + 0.15, r"$(0, \frac{\sqrt{3}}{2})$",
          color=STONE_GOLD, halign="center", size=11)
    label(ax, 0, -math.sqrt(3) / 2 - 0.20, r"$(0, -\frac{\sqrt{3}}{2})$",
          color=STONE_GOLD, halign="center", size=11)

    title(ax, "vesica piscis  —  the two-circle seed")
    save(fig, out)


def plate_08_flower_of_life(out: Path) -> None:
    fig, ax = plt.subplots(figsize=(9, 9))
    stone_axes(ax, (-3.4, 3.4), (-3.4, 3.4))

    centers: list[tuple[float, float]] = [(0.0, 0.0)]
    for k in range(6):
        a = k * math.pi / 3
        centers.append((math.cos(a), math.sin(a)))
    for k in range(6):
        a = k * math.pi / 3
        centers.append((2 * math.cos(a), 2 * math.sin(a)))
    for k in range(6):
        a = k * math.pi / 3 + math.pi / 6
        centers.append((math.sqrt(3) * math.cos(a), math.sqrt(3) * math.sin(a)))

    ax.add_patch(Circle((0, 0), 3.0, fill=False, edgecolor=STONE_DIM, lw=1.5))

    for i, (cx, cy) in enumerate(centers):
        col = STONE_GOLD if i == 0 else STONE_FG
        lw = 2.4 if i == 0 else 1.7
        ax.add_patch(Circle((cx, cy), 1.0, fill=False, edgecolor=col,
                            lw=lw, alpha=0.95 if i == 0 else 0.85))

    title(ax, "flower of life  —  vesica iterated on a hex lattice")
    save(fig, out)


def plate_09_phase_portrait(out: Path) -> None:
    fig, ax = plt.subplots(figsize=(9, 9))
    stone_axes(ax, (-1.6, 1.6), (-1.6, 1.6),
               axis_labels=(r"$x$", r"$\dot{x}/\omega$"))

    omega, gamma = 2 * math.pi, 0.45
    dt = 0.003; T = 4.5
    steps = int(T / dt)

    def integrate(x0, v0):
        x, v = x0, v0
        xs = np.empty(steps); ws = np.empty(steps)
        for i in range(steps):
            xs[i] = x; ws[i] = v / omega
            a = -omega * omega * x - 2 * gamma * v
            v += a * dt; x += v * dt
        return xs, ws

    initial = [(1.3, 0.0), (-0.4, 7.5), (0.2, -7.0), (-1.1, -3.0)]
    for x0, v0 in initial:
        xs, ws = integrate(x0, v0)
        engraved(ax, xs, ws, color=STONE_FG, lw=1.9, alpha=0.85)

    xs, ws = integrate(1.3, 0.0)
    engraved(ax, xs, ws, color=STONE_GOLD, lw=2.6)

    ax.plot(0, 0, "o", color=STONE_GOLD, markersize=9, zorder=5)

    title(ax, r"phase portrait:  $\ddot{x} + 2\gamma \dot{x} + \omega^2 x \;=\; 0$")
    label(ax, 0, -1.85,
          "every initial condition spirals into the origin",
          color=STONE_DIM, size=11, halign="center")
    save(fig, out)


def plate_10_radial_wave(out: Path) -> None:
    fig, ax = plt.subplots(figsize=(9, 9))
    stone_axes(ax, (-3.5, 3.5), (-3.5, 3.5))

    n = 800
    x = np.linspace(-3.5, 3.5, n); y = np.linspace(-3.5, 3.5, n)
    X, Y = np.meshgrid(x, y)
    R = np.sqrt(X * X + Y * Y) + 1e-6
    k = 3.2
    Z = np.sin(k * R) / np.sqrt(R)

    crests = np.array([0.30, 0.45, 0.60])
    troughs = -crests
    ax.contour(X, Y, Z, levels=sorted(troughs.tolist()), colors=STONE_FG,
               linewidths=1.0, alpha=0.55, linestyles="dashed")
    ax.contour(X, Y, Z, levels=sorted(crests.tolist()), colors=STONE_FG,
               linewidths=1.4, alpha=0.95)
    ax.contour(X, Y, Z, levels=[0.45], colors=STONE_GOLD, linewidths=2.6)
    ax.plot(0, 0, "o", color=STONE_GOLD, markersize=10, zorder=5)

    title(ax, r"$u(r, t) \;=\; \dfrac{\sin(kr - \omega t)}{\sqrt{r}}$")
    label(ax, 0, -3.85,
          "radial pulse from a point source",
          color=STONE_DIM, size=11, halign="center")
    save(fig, out)


def plate_11_nand_gate(out: Path) -> None:
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.set_xlim(0, 10); ax.set_ylim(0, 6); ax.set_aspect("equal")
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values(): s.set_visible(False)
    ax.set_facecolor(STONE_BG)
    stone_noise(ax, (0, 10), (0, 6))

    engraved(ax, [2.2, 2.2], [1.5, 4.5], color=STONE_FG, lw=2.8)
    engraved(ax, [2.2, 4.0], [4.5, 4.5], color=STONE_FG, lw=2.8)
    engraved(ax, [2.2, 4.0], [1.5, 1.5], color=STONE_FG, lw=2.8)
    th = np.linspace(np.pi / 2, -np.pi / 2, 200)
    arc_x = 4.0 + 1.5 * np.cos(th); arc_y = 3.0 + 1.5 * np.sin(th)
    engraved(ax, arc_x, arc_y, color=STONE_FG, lw=2.8)

    bubble_cx = 5.7
    ax.add_patch(Circle((bubble_cx, 3.0), 0.18, fill=False,
                        edgecolor=STONE_GOLD, lw=2.6))

    engraved(ax, [1.0, 2.2], [3.7, 3.7], color=STONE_FG, lw=2.4)
    engraved(ax, [1.0, 2.2], [2.3, 2.3], color=STONE_FG, lw=2.4)
    label(ax, 0.85, 3.7, "$a$", halign="right", size=15)
    label(ax, 0.85, 2.3, "$b$", halign="right", size=15)

    engraved(ax, [5.88, 7.2], [3.0, 3.0], color=STONE_FG, lw=2.4)
    label(ax, 7.35, 3.0, r"$\overline{a \cdot b}$", color=STONE_GOLD, size=15)

    tx = 8.4
    label(ax, tx, 5.4, r"$a$", size=13, halign="center")
    label(ax, tx + 0.6, 5.4, r"$b$", size=13, halign="center")
    label(ax, tx + 1.4, 5.4, r"NAND", color=STONE_GOLD, size=13, halign="center")
    ax.plot([tx - 0.35, tx + 1.85], [5.15, 5.15], color=STONE_FAINT, lw=1.0)
    rows = [(0, 0, 1), (0, 1, 1), (1, 0, 1), (1, 1, 0)]
    for i, (a, b, n) in enumerate(rows):
        y = 4.6 - i * 0.55
        label(ax, tx, y, str(a), size=13, halign="center")
        label(ax, tx + 0.6, y, str(b), size=13, halign="center")
        label(ax, tx + 1.4, y, str(n),
              color=STONE_GOLD if n == 1 else STONE_FG,
              size=13, halign="center")

    label(ax, 5.0, 0.6,
          r"every Boolean function reduces to compositions of NAND",
          color=STONE_DIM, size=12, halign="center")

    fig.suptitle("the universal logic atom",
                 color=STONE_FG, fontsize=17, family="serif", weight="bold", y=0.95)
    save(fig, out)


def plate_12_stereographic(out: Path) -> None:
    fig = plt.figure(figsize=(11, 9))
    ax = fig.add_subplot(111, projection="3d")
    ax.set_facecolor(STONE_BG)

    u = np.linspace(0, 2 * np.pi, 32); v = np.linspace(0, np.pi, 16)
    U, V = np.meshgrid(u, v)
    sx = np.cos(U) * np.sin(V); sy = np.sin(U) * np.sin(V); sz = np.cos(V)
    ax.plot_wireframe(sx, sy, sz, color=STONE_FAINT, lw=0.55, alpha=0.65)

    th = np.linspace(0, 2 * np.pi, 80)
    ax.plot(2.6 * np.cos(th), 2.6 * np.sin(th), -np.ones_like(th),
            color=STONE_FAINT, lw=0.7, alpha=0.6)

    N = np.array([0, 0, 1])
    ax.scatter(*N, color=STONE_GOLD, s=85, zorder=10)

    pts_sph = [
        np.array([math.cos(0.6) * math.sin(1.2),
                  math.sin(0.6) * math.sin(1.2), math.cos(1.2)]),
        np.array([math.cos(2.4) * math.sin(1.7),
                  math.sin(2.4) * math.sin(1.7), math.cos(1.7)]),
        np.array([math.cos(-1.0) * math.sin(2.4),
                  math.sin(-1.0) * math.sin(2.4), math.cos(2.4)]),
    ]
    for p in pts_sph:
        t = -2.0 / (p[2] - 1.0)
        proj = N + t * (p - N)
        ax.plot([N[0], proj[0]], [N[1], proj[1]], [N[2], proj[2]],
                color=STONE_GOLD, lw=1.1, ls=(0, (4, 3)), alpha=0.9)
        ax.scatter(*p, color=STONE_FG, s=50, zorder=9)
        ax.scatter(*proj, color=STONE_GOLD, s=60, zorder=9)

    ax.set_xlim(-2.6, 2.6); ax.set_ylim(-2.6, 2.6); ax.set_zlim(-2.6, 2.6)
    ax.set_axis_off()
    tight_3d(fig, ax)
    ax.view_init(elev=14, azim=-32)

    fig.suptitle("stereographic projection — $S^2 \\setminus \\{N\\} \\to \\mathbb{R}^2$",
                 color=STONE_FG, fontsize=16, family="serif", weight="bold", y=0.94)
    save(fig, out)


def plate_13_trefoil_knot(out: Path) -> None:
    fig, ax = plt.subplots(figsize=(9, 9))
    stone_axes(ax, (-1.8, 1.8), (-1.8, 1.8))

    R, r = 1.0, 0.40
    N = 1500
    t = np.linspace(0, 2 * np.pi, N)
    x = (R + r * np.cos(3 * t)) * np.cos(2 * t)
    y = (R + r * np.cos(3 * t)) * np.sin(2 * t)
    z = r * np.sin(3 * t)

    mask = np.ones(N, dtype=bool)
    gap = 0.10
    for i in range(N):
        for j in range(i + 30, N - 1):
            d2 = (x[i] - x[j]) ** 2 + (y[i] - y[j]) ** 2
            if d2 < 0.0009:
                if z[i] < z[j]:
                    near = (x - x[i]) ** 2 + (y - y[i]) ** 2 < gap ** 2
                    band = abs(np.arange(N) - i) < 25
                    mask[near & band] = False
                break

    xa = np.where(mask, x, np.nan); ya = np.where(mask, y, np.nan)
    # Highlight bevel + dark stroke = engraved groove.
    xlim = ax.get_xlim(); ylim = ax.get_ylim()
    dx = (xlim[1] - xlim[0]) * 0.0015; dy = -(ylim[1] - ylim[0]) * 0.0015
    ax.plot(xa + dx, ya + dy, color=STONE_HIGHLIGHT, lw=5.2,
            alpha=0.55, solid_capstyle="round")
    ax.plot(xa, ya, color=STONE_GOLD, lw=4.8, solid_capstyle="round")

    title(ax, r"trefoil — the $(2,3)$ torus knot")
    label(ax, 0, -2.0,
          r"the simplest non-trivial knot in $\mathbb{R}^3$",
          color=STONE_DIM, size=11, halign="center")
    save(fig, out)


# ───────────────────────────── runner ─────────────────────────────

PLATES: list[tuple[str, Callable[[Path], None]]] = [
    ("01-eulers-identity.png",          plate_01_eulers_identity),
    ("02-helix-eix-extended.png",       plate_02_helix),
    ("03-logarithmic-spiral.png",       plate_03_logarithmic_spiral),
    ("04-great-circle-geodesic.png",    plate_04_great_circle),
    ("05-loxodrome.png",                plate_05_loxodrome),
    ("06-torus-parametrization.png",    plate_06_torus),
    ("07-vesica-piscis.png",            plate_07_vesica_piscis),
    ("08-flower-of-life.png",           plate_08_flower_of_life),
    ("09-phase-portrait-oscillator.png", plate_09_phase_portrait),
    ("10-radial-wave-pulse.png",        plate_10_radial_wave),
    ("11-nand-gate.png",                plate_11_nand_gate),
    ("12-stereographic-projection.png", plate_12_stereographic),
    ("13-trefoil-knot.png",             plate_13_trefoil_knot),
]


def main() -> int:
    stone_style()
    out_dir = Path(__file__).resolve().parent
    print(f"stone plates → {out_dir}")
    for name, fn in PLATES:
        try:
            fn(out_dir / name)
        except Exception as e:  # noqa: BLE001
            import traceback; traceback.print_exc()
            print(f"  ✗ {name}: {e}")
            return 1
    print("done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
