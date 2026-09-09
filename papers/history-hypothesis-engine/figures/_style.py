"""Shared matplotlib setup for the history hypothesis engine paper figures.

Not a figure script. Every fig_<name>.py imports this module for a consistent
palette, font stack, and save routine. Serif fonts approximate the paper's
LaTeX body text without invoking a LaTeX toolchain (text.usetex stays False).

    from _style import set_style, save, OKABE_ITO, SEQUENTIAL_CMAP, COL_SINGLE, COL_DOUBLE
"""
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Okabe-Ito: the standard colorblind-safe qualitative palette.
OKABE_ITO = {
    "black": "#000000",
    "orange": "#E69F00",
    "sky": "#56B4E9",
    "green": "#009E73",
    "yellow": "#F0E442",
    "blue": "#0072B2",
    "vermillion": "#D55E00",
    "purple": "#CC79A7",
    "grey": "#999999",
}

# Perceptually uniform, colorblind-safe sequential map for heatmaps and shading.
SEQUENTIAL_CMAP = "cividis"

COL_SINGLE = 3.4  # inches, single-column figure width
COL_DOUBLE = 7.0  # inches, double-column figure width


def set_style():
    plt.rcParams.update(
        {
            "text.usetex": False,
            "font.family": "serif",
            "font.serif": ["Nimbus Roman", "Times New Roman", "DejaVu Serif"],
            "mathtext.fontset": "dejavuserif",
            "font.size": 9,
            "axes.labelsize": 9,
            "axes.titlesize": 9,
            "xtick.labelsize": 8,
            "ytick.labelsize": 8,
            "legend.fontsize": 7.5,
            "axes.linewidth": 0.8,
            "lines.linewidth": 1.3,
            "figure.dpi": 300,
            "savefig.dpi": 300,
            "pdf.fonttype": 42,
            "ps.fonttype": 42,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "axes.grid": False,
        }
    )


def save(fig, path_stem):
    """Write <path_stem>.pdf and <path_stem>.png at 300 dpi, then close fig."""
    fig.savefig(f"{path_stem}.pdf")
    fig.savefig(f"{path_stem}.png", dpi=300)
    plt.close(fig)
