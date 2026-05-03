#!/usr/bin/env python3
"""
Quantum Plates — chalkboard mathematical illustrations for the Bucket
Foundation /quantum page.

Every plate is a real mathematical object, parametrized exactly, rendered
in a chalkboard register: dark slate background, off-white chalk strokes,
serif-italic labels, slight hand drawn sketch jitter (matplotlib's path.sketch).

Run:
    python3 generate_plates.py

Outputs:
    01-eulers-identity.png         e^(iθ) on the unit circle, with cos/sin shadows
    02-helix-eix-extended.png      (cos t, sin t, t) — Euler in 3D, the "coil"
    03-logarithmic-spiral.png      r = a·e^(bθ), spira mirabilis (Bernoulli)
    04-great-circle-geodesic.png   shortest path between two points on a sphere
    05-loxodrome.png               rhumb line — spiral of constant bearing on a sphere
    06-torus-parametrization.png   donut: (R+r cos v) cos u, (R+r cos v) sin u, r sin v
    07-vesica-piscis.png           two unit circles offset by 1, intersection lens
    08-flower-of-life.png          19-circle hex packing, vesica iterated
    09-phase-portrait-oscillator.png   damped harmonic in (x, x') — the bobber's heart
    10-radial-wave-pulse.png       sin(kr − ωt)/√r — the bobber's wave on water
    11-nand-gate.png               universal logic atom — bridge from continuous to discrete

Voice: this is math. Each plate is the simplest possible rendering of the
underlying object, no decoration. Labels in LaTeX where they help the
reader; nothing where they don't.
"""

from __future__ import annotations

import math
import os
import sys
from pathlib import Path
from typing import Callable

import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Arc, Circle, FancyArrow, FancyArrowPatch
from mpl_toolkits.mplot3d import Axes3D  # noqa: F401  (registers 3d projection)


# ───────────────────────────── style helpers ─────────────────────────────

CHALK_BG = "#1d2d2c"      # deep slate-green chalkboard
CHALK_FG = "#f4ead5"      # bone parchment (matches /canon palette)
CHALK_GOLD = "#B8861E"    # antique gold accent
CHALK_DIM = "#9e8e6e"     # muted secondary stroke
CHALK_FAINT = "#5a6968"   # ghost stroke for axes / grids


def chalk_style() -> None:
    """Global rcParams for the chalkboard register. Idempotent."""
    mpl.rcParams.update({
        "figure.facecolor": CHALK_BG,
        "axes.facecolor": CHALK_BG,
        "savefig.facecolor": CHALK_BG,
        "axes.edgecolor": CHALK_FG,
        "axes.labelcolor": CHALK_FG,
        "axes.titlecolor": CHALK_FG,
        "axes.titlesize": 16,
        "axes.titlepad": 18,
        "xtick.color": CHALK_FG,
        "ytick.color": CHALK_FG,
        "text.color": CHALK_FG,
        "lines.linewidth": 2.0,
        "lines.solid_capstyle": "round",
        "lines.solid_joinstyle": "round",
        "font.family": "serif",
        "font.style": "italic",
        "font.size": 12,
        # sketch = (scale, length, randomness) — gives a slight hand-drawn jitter.
        # Subtle. Professorial chalk, not xkcd cartoon.
        "path.sketch": (1.5, 80, 1.5),
        "axes.grid": False,
        "axes.spines.top": False,
        "axes.spines.right": False,
    })


def label(ax, x: float, y: float, text: str, *, color: str = CHALK_FG,
          size: int = 13, halign: str = "left", valign: str = "center") -> None:
    """Italic serif chalk label, no math wrapper — pass raw $...$ TeX if you want LaTeX."""
    ax.text(x, y, text, color=color, fontsize=size, family="serif",
            style="italic", ha=halign, va=valign, zorder=10)


def title(ax, text: str) -> None:
    ax.set_title(text, color=CHALK_FG, fontsize=16, family="serif", style="italic", pad=18)


def chalk_axes(ax, xlim, ylim, *, axis_labels: tuple[str, str] | None = None) -> None:
    """Faint origin cross instead of standard axes. Hand-drawn feel."""
    ax.set_xlim(xlim)
    ax.set_ylim(ylim)
    ax.set_aspect("equal")
    ax.set_xticks([])
    ax.set_yticks([])
    for s in ax.spines.values():
        s.set_visible(False)
    ax.axhline(0, color=CHALK_FAINT, lw=1.0, alpha=0.6, zorder=1)
    ax.axvline(0, color=CHALK_FAINT, lw=1.0, alpha=0.6, zorder=1)
    if axis_labels:
        xl, yl = axis_labels
        label(ax, xlim[1] * 0.94, -0.06 * (ylim[1] - ylim[0]),
              xl, color=CHALK_DIM, size=11)
        label(ax, 0.02 * (xlim[1] - xlim[0]), ylim[1] * 0.94,
              yl, color=CHALK_DIM, size=11)


def save(fig, path: Path) -> None:
    fig.savefig(path, dpi=180, bbox_inches="tight", facecolor=CHALK_BG)
    plt.close(fig)
    print(f"  → {path.name}  ({path.stat().st_size // 1024} KB)")


# ───────────────────────────── plates ─────────────────────────────

def plate_01_eulers_identity(out: Path) -> None:
    fig, ax = plt.subplots(figsize=(8.5, 8.5))
    chalk_axes(ax, (-1.5, 1.5), (-1.5, 1.5), axis_labels=("Re", "Im"))

    theta = np.linspace(0, 2 * np.pi, 800)
    ax.plot(np.cos(theta), np.sin(theta), color=CHALK_FG, lw=2.2, zorder=4)

    # Pick θ = 2π/3 for the demonstration vector.
    th = 2 * np.pi / 3
    cx, sx = math.cos(th), math.sin(th)

    # Radius vector
    ax.plot([0, cx], [0, sx], color=CHALK_GOLD, lw=2.4, zorder=5)
    ax.plot(cx, sx, "o", color=CHALK_GOLD, markersize=8, zorder=6)

    # Drop perpendiculars to axes — cos and sin shadows.
    ax.plot([cx, cx], [0, sx], color=CHALK_DIM, lw=1.4, ls=(0, (4, 3)), zorder=3)
    ax.plot([0, cx], [sx, sx], color=CHALK_DIM, lw=1.4, ls=(0, (4, 3)), zorder=3)

    # Arc for θ
    arc = Arc((0, 0), 0.5, 0.5, angle=0, theta1=0, theta2=math.degrees(th),
              color=CHALK_FG, lw=1.4)
    ax.add_patch(arc)
    label(ax, 0.32, 0.18, r"$\theta$", size=14)

    # Annotations
    label(ax, cx - 0.02, -0.13, r"$\cos\theta$", color=CHALK_DIM, halign="right")
    label(ax, -0.05, sx, r"$\sin\theta$", color=CHALK_DIM, halign="right")
    label(ax, cx + 0.06, sx + 0.05, r"$e^{i\theta}$", color=CHALK_GOLD, size=15)

    title(ax, r"$e^{i\theta} \;=\; \cos\theta \,+\, i\sin\theta$")
    save(fig, out)


def plate_02_helix(out: Path) -> None:
    fig = plt.figure(figsize=(9, 9))
    ax = fig.add_subplot(111, projection="3d")
    ax.set_facecolor(CHALK_BG)

    t = np.linspace(0, 6 * np.pi, 1000)
    x, y, z = np.cos(t), np.sin(t), t / (2 * np.pi)

    ax.plot(x, y, z, color=CHALK_FG, lw=2.2)
    # Project shadow on z=0 — the unit circle traced again and again.
    ax.plot(x, y, np.zeros_like(t), color=CHALK_DIM, lw=1.0, alpha=0.65)
    # Vertical line guide.
    ax.plot([0, 0], [0, 0], [0, t[-1] / (2 * np.pi)],
            color=CHALK_FAINT, lw=1.0, ls=(0, (4, 3)))

    ax.set_xlim(-1.5, 1.5); ax.set_ylim(-1.5, 1.5); ax.set_zlim(0, 3.2)
    ax.set_axis_off()
    ax.view_init(elev=22, azim=-58)

    fig.suptitle(r"$\gamma(t) \;=\; (\cos t,\; \sin t,\; t)$",
                 color=CHALK_FG, fontsize=16, family="serif", style="italic", y=0.94)
    save(fig, out)


def plate_03_logarithmic_spiral(out: Path) -> None:
    fig, ax = plt.subplots(figsize=(8.5, 8.5))
    chalk_axes(ax, (-3, 3), (-3, 3))

    a, b = 0.18, 0.18  # tight Bernoulli spiral
    theta = np.linspace(0, 6 * np.pi, 1500)
    r = a * np.exp(b * theta)
    x, y = r * np.cos(theta), r * np.sin(theta)
    ax.plot(x, y, color=CHALK_FG, lw=2.2)

    # A tangent illustrating the spira mirabilis property:
    # angle between tangent and radius is constant.
    k = 980
    px, py = x[k], y[k]
    rang = math.atan2(py, px)  # radial angle
    tang = math.atan2(np.cos(theta[k]) - b * np.sin(theta[k]) * 0,  # placeholder
                      np.sin(theta[k]) + b * np.cos(theta[k]) * 0)
    # Easier: numerical tangent
    dx = x[k + 1] - x[k - 1]
    dy = y[k + 1] - y[k - 1]
    tang_len = 0.9
    norm = math.hypot(dx, dy)
    ax.plot([px, px + dx / norm * tang_len], [py, py + dy / norm * tang_len],
            color=CHALK_GOLD, lw=2.0)
    ax.plot([0, px], [0, py], color=CHALK_DIM, lw=1.2, ls=(0, (4, 3)))
    ax.plot(px, py, "o", color=CHALK_GOLD, markersize=7)

    title(ax, r"$r \;=\; a\, e^{\,b\theta}$  —  spira mirabilis")
    label(ax, 0, -3.3, "the angle between tangent and radius is constant",
          color=CHALK_DIM, size=11, halign="center")
    save(fig, out)


def plate_04_great_circle(out: Path) -> None:
    fig = plt.figure(figsize=(9, 9))
    ax = fig.add_subplot(111, projection="3d")
    ax.set_facecolor(CHALK_BG)

    # Wireframe sphere — sparse, ghosted.
    u = np.linspace(0, 2 * np.pi, 32)
    v = np.linspace(0, np.pi, 16)
    U, V = np.meshgrid(u, v)
    sx = np.cos(U) * np.sin(V); sy = np.sin(U) * np.sin(V); sz = np.cos(V)
    ax.plot_wireframe(sx, sy, sz, color=CHALK_FAINT, lw=0.6, alpha=0.7)

    # Two endpoints (lat, lng), then the great-circle arc between them.
    p1 = np.array([math.cos(0.7) * math.sin(1.0),
                   math.sin(0.7) * math.sin(1.0),
                   math.cos(1.0)])
    p2 = np.array([math.cos(2.6) * math.sin(2.1),
                   math.sin(2.6) * math.sin(2.1),
                   math.cos(2.1)])
    p1 /= np.linalg.norm(p1); p2 /= np.linalg.norm(p2)
    omega = math.acos(np.clip(np.dot(p1, p2), -1, 1))
    ts = np.linspace(0, 1, 200)
    arc = (np.sin((1 - ts) * omega)[:, None] * p1
           + np.sin(ts * omega)[:, None] * p2) / math.sin(omega)
    ax.plot(arc[:, 0], arc[:, 1], arc[:, 2], color=CHALK_GOLD, lw=2.6)
    for p in (p1, p2):
        ax.scatter(*p, color=CHALK_GOLD, s=50)

    # Straight chord (the wrong path) for contrast.
    chord = np.linspace(p1, p2, 50)
    ax.plot(chord[:, 0], chord[:, 1], chord[:, 2],
            color=CHALK_DIM, lw=1.2, ls=(0, (4, 3)))

    ax.set_xlim(-1.1, 1.1); ax.set_ylim(-1.1, 1.1); ax.set_zlim(-1.1, 1.1)
    ax.set_axis_off()
    ax.view_init(elev=18, azim=35)

    fig.suptitle("great-circle geodesic on $S^2$",
                 color=CHALK_FG, fontsize=16, family="serif", style="italic", y=0.94)
    save(fig, out)


def plate_05_loxodrome(out: Path) -> None:
    fig = plt.figure(figsize=(9, 9))
    ax = fig.add_subplot(111, projection="3d")
    ax.set_facecolor(CHALK_BG)

    # Wireframe sphere.
    u = np.linspace(0, 2 * np.pi, 32)
    v = np.linspace(0, np.pi, 16)
    U, V = np.meshgrid(u, v)
    sx = np.cos(U) * np.sin(V); sy = np.sin(U) * np.sin(V); sz = np.cos(V)
    ax.plot_wireframe(sx, sy, sz, color=CHALK_FAINT, lw=0.6, alpha=0.7)

    # Loxodrome (rhumb line): lat = 2·arctan(e^(t·tan β)) − π/2, lng = t.
    beta = np.deg2rad(72)  # bearing
    t = np.linspace(-3, 3, 1500)
    lat = 2 * np.arctan(np.exp(t * math.tan(beta))) - np.pi / 2
    lng = t
    x = np.cos(lng) * np.cos(lat)
    y = np.sin(lng) * np.cos(lat)
    z = np.sin(lat)
    ax.plot(x, y, z, color=CHALK_GOLD, lw=2.4)

    ax.set_xlim(-1.1, 1.1); ax.set_ylim(-1.1, 1.1); ax.set_zlim(-1.1, 1.1)
    ax.set_axis_off()
    ax.view_init(elev=22, azim=-30)

    fig.suptitle("loxodrome — spiral of constant bearing on $S^2$",
                 color=CHALK_FG, fontsize=15, family="serif", style="italic", y=0.94)
    save(fig, out)


def plate_06_torus(out: Path) -> None:
    fig = plt.figure(figsize=(9, 9))
    ax = fig.add_subplot(111, projection="3d")
    ax.set_facecolor(CHALK_BG)

    R, r = 1.2, 0.45
    u = np.linspace(0, 2 * np.pi, 60)
    v = np.linspace(0, 2 * np.pi, 30)
    U, V = np.meshgrid(u, v)
    X = (R + r * np.cos(V)) * np.cos(U)
    Y = (R + r * np.cos(V)) * np.sin(U)
    Z = r * np.sin(V)

    ax.plot_wireframe(X, Y, Z, color=CHALK_FG, lw=0.7, alpha=0.85)

    # Highlight one toroidal flow line — the "particle" tracing the field.
    theta = np.linspace(0, 4 * np.pi, 600)
    phi = 6 * theta
    fx = (R + r * np.cos(phi)) * np.cos(theta)
    fy = (R + r * np.cos(phi)) * np.sin(theta)
    fz = r * np.sin(phi)
    ax.plot(fx, fy, fz, color=CHALK_GOLD, lw=2.2)

    ax.set_xlim(-1.8, 1.8); ax.set_ylim(-1.8, 1.8); ax.set_zlim(-1.0, 1.0)
    ax.set_axis_off()
    ax.view_init(elev=24, azim=-42)

    fig.suptitle(r"torus  $\;(R + r\cos v)(\cos u,\, \sin u),\; r\sin v$",
                 color=CHALK_FG, fontsize=15, family="serif", style="italic", y=0.94)
    save(fig, out)


def plate_07_vesica_piscis(out: Path) -> None:
    fig, ax = plt.subplots(figsize=(9, 7))
    chalk_axes(ax, (-2.2, 2.2), (-1.7, 1.7))

    # Two unit circles, centers at (-0.5, 0) and (0.5, 0)
    for cx in (-0.5, 0.5):
        ax.add_patch(Circle((cx, 0), 1.0, fill=False, edgecolor=CHALK_FG, lw=2.0))

    # Highlight the lens — the intersection.
    theta = np.linspace(0, 2 * np.pi, 400)
    lens_x = []
    lens_y = []
    # Left arc of right circle, from (0, +√3/2) to (0, -√3/2)
    th = np.linspace(np.deg2rad(120), np.deg2rad(240), 200)
    lens_x.extend(0.5 + np.cos(th)); lens_y.extend(np.sin(th))
    # Right arc of left circle, returning
    th = np.linspace(np.deg2rad(-60), np.deg2rad(60), 200)
    lens_x.extend(-0.5 + np.cos(th)); lens_y.extend(np.sin(th))
    ax.fill(lens_x, lens_y, color=CHALK_GOLD, alpha=0.18, zorder=2)
    ax.plot(lens_x, lens_y, color=CHALK_GOLD, lw=2.2, zorder=3)

    # Mark centers + the two lens vertices.
    for cx in (-0.5, 0.5):
        ax.plot(cx, 0, "o", color=CHALK_FG, markersize=5)
    for vy in (math.sqrt(3) / 2, -math.sqrt(3) / 2):
        ax.plot(0, vy, "o", color=CHALK_GOLD, markersize=6)

    label(ax, 0, math.sqrt(3) / 2 + 0.15, r"$(0, \frac{\sqrt{3}}{2})$",
          color=CHALK_GOLD, halign="center", size=11)
    label(ax, 0, -math.sqrt(3) / 2 - 0.20, r"$(0, -\frac{\sqrt{3}}{2})$",
          color=CHALK_GOLD, halign="center", size=11)

    title(ax, "vesica piscis  —  the two-circle seed")
    save(fig, out)


def plate_08_flower_of_life(out: Path) -> None:
    fig, ax = plt.subplots(figsize=(9, 9))
    chalk_axes(ax, (-3.4, 3.4), (-3.4, 3.4))

    # 19-circle flower: center, 6 around, 12 around those (hex packing, radius 1)
    centers = [(0.0, 0.0)]
    for k in range(6):
        a = k * math.pi / 3
        centers.append((math.cos(a), math.sin(a)))
    for k in range(6):
        a = k * math.pi / 3
        # ring 2: outer hex, every other vertex translated by 2 units
        centers.append((2 * math.cos(a), 2 * math.sin(a)))
    for k in range(6):
        a = k * math.pi / 3 + math.pi / 6
        centers.append((math.sqrt(3) * math.cos(a), math.sqrt(3) * math.sin(a)))

    # Outer enclosing circle (the seed-of-life containment)
    ax.add_patch(Circle((0, 0), 3.0, fill=False, edgecolor=CHALK_DIM, lw=1.4))

    for i, (cx, cy) in enumerate(centers):
        col = CHALK_GOLD if i == 0 else CHALK_FG
        lw = 2.2 if i == 0 else 1.6
        ax.add_patch(Circle((cx, cy), 1.0, fill=False, edgecolor=col,
                            lw=lw, alpha=0.95 if i == 0 else 0.85))

    title(ax, "flower of life  —  vesica iterated on a hex lattice")
    save(fig, out)


def plate_09_phase_portrait(out: Path) -> None:
    """Damped harmonic oscillator phase portrait — this IS the bobber's heart.

        x'' + 2γ x' + ω² x = 0
    """
    fig, ax = plt.subplots(figsize=(9, 8))
    chalk_axes(ax, (-1.4, 1.4), (-1.6, 1.6),
               axis_labels=(r"$x$", r"$\dot{x}$"))

    omega, gamma = 2 * math.pi, 0.35
    # Numerical integration (RK4 lite, just Euler with small dt is fine for a
    # plate). Multiple initial conditions → spiral inward to origin.
    dt = 0.005
    T = 14.0
    steps = int(T / dt)

    initial = [(1.0, 0.0), (0.6, 1.0), (-0.9, -0.4), (0.0, 1.4), (-1.2, 0.6)]
    for x0, v0 in initial:
        x, v = x0, v0
        xs = np.empty(steps); vs = np.empty(steps)
        for i in range(steps):
            xs[i], vs[i] = x, v
            a = -omega * omega * x - 2 * gamma * v
            v += a * dt
            x += v * dt
        ax.plot(xs, vs, color=CHALK_FG, lw=1.6, alpha=0.85)

    # Highlight one trajectory in gold
    x, v = 1.0, 0.0
    xs = np.empty(steps); vs = np.empty(steps)
    for i in range(steps):
        xs[i], vs[i] = x, v
        a = -omega * omega * x - 2 * gamma * v
        v += a * dt
        x += v * dt
    ax.plot(xs, vs, color=CHALK_GOLD, lw=2.2)

    # Origin marker — the attractor.
    ax.plot(0, 0, "o", color=CHALK_GOLD, markersize=8, zorder=5)

    title(ax, r"phase portrait:  $\ddot{x} + 2\gamma \dot{x} + \omega^2 x \;=\; 0$")
    label(ax, 0, -1.85, "every initial condition spirals into the origin — the bobber comes to rest",
          color=CHALK_DIM, size=11, halign="center")
    save(fig, out)


def plate_10_radial_wave(out: Path) -> None:
    """sin(kr − ωt) / √r  — radial wave from a point source on a 2D surface."""
    fig, ax = plt.subplots(figsize=(9, 9))
    chalk_axes(ax, (-3.5, 3.5), (-3.5, 3.5))

    n = 600
    x = np.linspace(-3.5, 3.5, n)
    y = np.linspace(-3.5, 3.5, n)
    X, Y = np.meshgrid(x, y)
    R = np.sqrt(X * X + Y * Y) + 1e-6
    k, omega, t = 4.0, 0.0, 0.0
    Z = np.sin(k * R - omega * t) / np.sqrt(R)

    # Render as contour lines — chalkboard reads contour, not heatmap.
    levels = np.linspace(-1.0, 1.0, 13)
    ax.contour(X, Y, Z, levels=levels, colors=CHALK_FG,
               linewidths=1.1, alpha=0.85)
    # Highlight the +0.5 contour in gold — picks the wave crests.
    ax.contour(X, Y, Z, levels=[0.5], colors=CHALK_GOLD, linewidths=2.0)
    # Source dot.
    ax.plot(0, 0, "o", color=CHALK_GOLD, markersize=9, zorder=5)

    title(ax, r"$u(r, t) \;=\; \dfrac{\sin(kr - \omega t)}{\sqrt{r}}$")
    label(ax, 0, -3.85,
          "radial pulse from a point source — the bobber's wave",
          color=CHALK_DIM, size=11, halign="center")
    save(fig, out)


def plate_11_nand_gate(out: Path) -> None:
    """The universal logic atom. Drawn as the standard AND-shape + bubble,
    plus its truth table."""
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.set_xlim(0, 10); ax.set_ylim(0, 6); ax.set_aspect("equal")
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values(): s.set_visible(False)
    ax.set_facecolor(CHALK_BG)

    # ── Gate body: "D" shape (AND) with NOT bubble at output ──
    # left flat side
    ax.plot([2.2, 2.2], [1.5, 4.5], color=CHALK_FG, lw=2.4)
    # top edge to apex of D
    ax.plot([2.2, 4.0], [4.5, 4.5], color=CHALK_FG, lw=2.4)
    # bottom edge
    ax.plot([2.2, 4.0], [1.5, 1.5], color=CHALK_FG, lw=2.4)
    # rounded D arc from (4,4.5) → (4,1.5) bowing right
    th = np.linspace(np.pi / 2, -np.pi / 2, 200)
    arc_x = 4.0 + 1.5 * np.cos(th)
    arc_y = 3.0 + 1.5 * np.sin(th)
    ax.plot(arc_x, arc_y, color=CHALK_FG, lw=2.4)

    # NOT bubble (the inversion)
    bubble_cx = 5.7
    ax.add_patch(Circle((bubble_cx, 3.0), 0.18, fill=False,
                        edgecolor=CHALK_GOLD, lw=2.4))

    # Input wires
    ax.plot([1.0, 2.2], [3.7, 3.7], color=CHALK_FG, lw=2.0)
    ax.plot([1.0, 2.2], [2.3, 2.3], color=CHALK_FG, lw=2.0)
    label(ax, 0.85, 3.7, "$a$", halign="right", size=15)
    label(ax, 0.85, 2.3, "$b$", halign="right", size=15)

    # Output wire
    ax.plot([5.88, 7.2], [3.0, 3.0], color=CHALK_FG, lw=2.0)
    label(ax, 7.35, 3.0, r"$\overline{a \cdot b}$", color=CHALK_GOLD, size=15)

    # ── Truth table ──
    tx = 8.4
    label(ax, tx, 5.4, r"$a$", size=13, halign="center")
    label(ax, tx + 0.6, 5.4, r"$b$", size=13, halign="center")
    label(ax, tx + 1.4, 5.4, r"NAND", color=CHALK_GOLD, size=13, halign="center")
    ax.plot([tx - 0.35, tx + 1.85], [5.15, 5.15], color=CHALK_FAINT, lw=1.0)
    rows = [(0, 0, 1), (0, 1, 1), (1, 0, 1), (1, 1, 0)]
    for i, (a, b, n) in enumerate(rows):
        y = 4.6 - i * 0.55
        label(ax, tx, y, str(a), size=13, halign="center")
        label(ax, tx + 0.6, y, str(b), size=13, halign="center")
        label(ax, tx + 1.4, y, str(n),
              color=CHALK_GOLD if n == 1 else CHALK_FG,
              size=13, halign="center")

    # Caption
    label(ax, 5.0, 0.6,
          r"every Boolean function reduces to compositions of NAND",
          color=CHALK_DIM, size=12, halign="center")

    fig.suptitle("the universal logic atom",
                 color=CHALK_FG, fontsize=16, family="serif", style="italic", y=0.95)
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
]


def main() -> int:
    chalk_style()
    out_dir = Path(__file__).resolve().parent
    print(f"chalkboard plates → {out_dir}")
    for name, fn in PLATES:
        try:
            fn(out_dir / name)
        except Exception as e:  # noqa: BLE001
            print(f"  ✗ {name}: {e}")
            return 1
    print("done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
