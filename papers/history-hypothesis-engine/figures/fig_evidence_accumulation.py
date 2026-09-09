#!/usr/bin/env python3
"""fig_evidence_accumulation: belief b, disbelief d, uncertainty u, and
projected probability P against the number of independent evidence items n,
for one hypothesis at a fixed tier weight.

Opinion equations, IDEAL-STATE-AND-UNKNOWNS-SPEC.md §2:
  D(n) = 1 + lambda * ln(1 + n),  lambda = 0.5
  r = D(n_+) * S_+,  s = D(n_-) * S_-,  W = 2
  b = r / (r + s + W),  d = s / (r + s + W),  u = W / (r + s + W)
  P = b + a * u

Each independent evidence item carries unit strength at a fixed tier
(S_+ = S_- = 1 per cluster; the tier weight k(tier)*e_i is folded into that
constant 1). The base rate is held at the uninformative value a = 0.5 (the
"uniform" prior profile of IDEAL-STATE §6d), so the two panels isolate what
accumulating evidence alone does to belief. Panel (a) is a supporting-only
stream; panel (b) mixes support and refutation 2:1.

Deterministic: closed-form curves, no randomness.
Run: python3 fig_evidence_accumulation.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _style import COL_DOUBLE, OKABE_ITO, save, set_style

set_style()
import numpy as np
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))

LAMBDA = 0.5
W = 2.0
A_PRIOR = 0.5
N_MAX = 40
S_PLUS = 1.0
S_MINUS = 1.0


def D(n):
    return 1.0 + LAMBDA * np.log(1.0 + n)


def opinion(n_plus, n_minus):
    r = np.where(n_plus > 0, D(n_plus) * S_PLUS, 0.0)
    s = np.where(n_minus > 0, D(n_minus) * S_MINUS, 0.0)
    denom = r + s + W
    b = r / denom
    d = s / denom
    u = W / denom
    P = b + A_PRIOR * u
    return b, d, u, P


def draw_panel(ax, n, n_plus, n_minus, panel_tag, xlabel):
    b, d, u, P = opinion(n_plus, n_minus)
    ax.plot(n, b, color=OKABE_ITO["blue"], label=r"$b$ (belief)")
    ax.plot(n, d, color=OKABE_ITO["vermillion"], label=r"$d$ (disbelief)")
    ax.plot(n, u, color=OKABE_ITO["grey"], label=r"$u$ (uncertainty)")
    ax.plot(n, P, color=OKABE_ITO["black"], linestyle=(0, (4, 2)), linewidth=1.5,
            label=r"$P$ (projected)")
    ax.set_xlabel(xlabel)
    ax.set_ylim(-0.03, 1.03)
    ax.set_xlim(0, N_MAX)
    ax.text(0.03, 0.96, panel_tag, transform=ax.transAxes, ha="left", va="top", fontsize=8.5)


def main():
    n = np.arange(0, N_MAX + 1)

    fig, axes = plt.subplots(1, 2, figsize=(COL_DOUBLE, 3.05), sharey=True)

    # panel (a): supporting evidence only
    draw_panel(axes[0], n, n_plus=n, n_minus=np.zeros_like(n),
               panel_tag="(a)", xlabel="n, evidence items (supporting only)")
    axes[0].set_ylabel("opinion value")

    # panel (b): mixed stream, 2 support : 1 refute (continuous split of n, so
    # the curve stays smooth; D(n) is defined for any non-negative n)
    n_plus_mixed = 2 * n / 3.0
    n_minus_mixed = n / 3.0
    draw_panel(axes[1], n, n_plus=n_plus_mixed, n_minus=n_minus_mixed,
               panel_tag="(b)", xlabel="n, evidence items (mixed, 2 support : 1 refute)")

    axes[1].legend(loc="center right", frameon=True, framealpha=0.9, edgecolor="none",
                   fontsize=7.2)

    fig.tight_layout()
    save(fig, os.path.join(HERE, "fig_evidence_accumulation"))


if __name__ == "__main__":
    main()
