#!/usr/bin/env python3
"""fig_missing_mass: Good-Turing missing mass and the Chao1 richness estimate
over repeated runs of a simulated generator.

IDEAL-STATE-AND-UNKNOWNS-SPEC.md §6b: run generation several times under
different seeds or prior profiles, treat each run's frontier as a sample,
and estimate the unseen share of the hypothesis space as f1/N (Good-Turing),
where f1 is the count of hypotheses seen in exactly one run and N is the
total draws. Chao1 estimates total richness as S_est = S_obs + f1^2/(2*f2),
f2 the count seen in exactly two runs.

The generator here draws from a fixed, known pool of VOCAB_SIZE addressable
hypotheses with Zipf-distributed draw probability, standing in for the
combinatorial address space of TIMELINE-AND-COMBINATORICS-SPEC.md §3, so the
true richness is known and the estimator's convergence toward it is visible
on the plot as a dashed reference line.

Deterministic: fixed random seed (SEED). Run: python3 fig_missing_mass.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _style import COL_SINGLE, OKABE_ITO, save, set_style

set_style()
import numpy as np
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))

SEED = 42
VOCAB_SIZE = 5000
ZIPF_S = 1.3
N_RUNS = 60
DRAWS_PER_RUN = 40


def zipf_probs(vocab_size, s):
    ranks = np.arange(1, vocab_size + 1, dtype=float)
    weights = 1.0 / ranks**s
    return weights / weights.sum()


def main():
    rng = np.random.default_rng(SEED)
    probs = zipf_probs(VOCAB_SIZE, ZIPF_S)

    counts = np.zeros(VOCAB_SIZE, dtype=int)
    runs, gt_missing_mass, chao1, cumulative_n = [], [], [], []

    N = 0
    for run in range(1, N_RUNS + 1):
        draws = rng.choice(VOCAB_SIZE, size=DRAWS_PER_RUN, p=probs)
        for d in draws:
            counts[d] += 1
        N += DRAWS_PER_RUN

        f1 = int(np.sum(counts == 1))
        f2 = int(np.sum(counts == 2))
        s_obs = int(np.sum(counts > 0))

        runs.append(run)
        cumulative_n.append(N)
        gt_missing_mass.append(f1 / N)
        chao1.append(s_obs + f1**2 / (2 * f2) if f2 > 0 else np.nan)

    fig, ax1 = plt.subplots(figsize=(COL_SINGLE, 2.75))
    ax2 = ax1.twinx()

    l1, = ax1.plot(runs, gt_missing_mass, color=OKABE_ITO["blue"], label=r"$f_1/N$ (Good-Turing)")
    ax1.set_xlabel("generation run")
    ax1.set_ylabel(r"missing mass $f_1/N$", color=OKABE_ITO["blue"])
    ax1.tick_params(axis="y", labelcolor=OKABE_ITO["blue"])
    ax1.set_xlim(1, N_RUNS)
    ax1.set_ylim(0, max(gt_missing_mass) * 1.15)

    l2, = ax2.plot(runs, chao1, color=OKABE_ITO["vermillion"], label=r"Chao1 $S_{est}$")
    ref = ax2.axhline(VOCAB_SIZE, color="#666666", linestyle=(0, (4, 2)), linewidth=1.0,
                       label="true richness (simulated)")
    ax2.set_ylabel(r"Chao1 richness estimate $S_{est}$", color=OKABE_ITO["vermillion"])
    ax2.tick_params(axis="y", labelcolor=OKABE_ITO["vermillion"])
    ax2.set_ylim(0, VOCAB_SIZE * 1.35)

    ax1.legend(handles=[l1, l2, ref], loc="upper right", frameon=True, framealpha=0.9,
               edgecolor="none", fontsize=6.6)

    fig.tight_layout()
    save(fig, os.path.join(HERE, "fig_missing_mass"))


if __name__ == "__main__":
    main()
