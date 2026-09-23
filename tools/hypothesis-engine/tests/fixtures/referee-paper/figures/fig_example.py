from __future__ import annotations

import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "fig_example.png")

def main() -> None:
    theta = np.linspace(0.0, np.pi, 400)
    cosine = np.cos(theta)

    fig, ax = plt.subplots(figsize=(4.4, 3.0), dpi=200)
    ax.plot(theta, cosine, color="#14417a", linewidth=2.0)
    ax.axhline(1.0, color="#5f5f5f", linewidth=0.8, linestyle="--")
    ax.axhline(-1.0, color="#5f5f5f", linewidth=0.8, linestyle="--")
    ax.set_xlabel(r"angle $\theta$ between $u$ and $v$ (radians)")
    ax.set_ylabel(r"overlap $\cos\theta$")
    ax.set_title("Lemma 1: the overlap is bounded by one")
    ax.set_xlim(0.0, np.pi)
    ax.set_ylim(-1.15, 1.15)
    fig.tight_layout()
    fig.savefig(OUT)
    plt.close(fig)
    print(f"wrote {OUT}")

if __name__ == "__main__":
    main()
