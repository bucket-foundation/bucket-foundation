from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.colors import LinearSegmentedColormap  # noqa: E402
from scipy.stats import gaussian_kde  # noqa: E402

from .canon import five_number  # noqa: E402
from .model import PrimeResult  # noqa: E402
from .render import BASALT, BASALT_2, BONE, BONE_DIM, GOLD, GOLD_BRIGHT, PICK_COLORS  # noqa: E402

CHARTS = ("projection", "boxplot", "residuals")
CLUSTER_COLORS = PICK_COLORS + ["#C9B458", "#5FA37A", "#B0656F", "#7C8FB5"]
DENSITY = LinearSegmentedColormap.from_list("basalt_gold", [BASALT_2, "#5A4A22", GOLD, "#F2D48A"])

def view_limits(values: np.ndarray, low: float = 1.0, high: float = 99.0, pad: float = 0.15) -> tuple[float, float]:
    lo, hi = np.percentile(values, [low, high])
    span = max(hi - lo, 1e-9)
    return float(lo - pad * span), float(hi + pad * span)

def _style(ax) -> None:
    ax.set_facecolor(BASALT_2)
    for spine in ax.spines.values():
        spine.set_color(GOLD)
        spine.set_alpha(0.4)
    ax.tick_params(colors=BONE_DIM, labelsize=8)
    ax.xaxis.label.set_color(BONE)
    ax.yaxis.label.set_color(BONE)
    ax.title.set_color(BONE)
    ax.grid(color=GOLD, alpha=0.12, lw=0.5)

def _figure(w: float, h: float):
    return plt.figure(figsize=(w, h), facecolor=BASALT)

def _save(fig, path: Path, dpi: int) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=dpi, facecolor=BASALT, bbox_inches="tight")
    plt.close(fig)
    return path

def projection(
    result: PrimeResult,
    path: Path,
    axes: tuple[int, int] = (2, 3),
    labels: np.ndarray | None = None,
    names: list[str] | None = None,
    size: np.ndarray | None = None,
    smooth: bool = False,
    title: str | None = None,
    dpi: int = 160,
) -> Path:
    a, b = axes[0] - 1, axes[1] - 1
    if not (0 <= a < result.k and 0 <= b < result.k and a != b):
        raise ValueError(f"axes {axes} must name two distinct components in 1..{result.k}")
    x, y = result.scores[:, a], result.scores[:, b]
    fig = _figure(10, 9)
    ax = fig.add_subplot(111)
    _style(ax)
    xlim, ylim = view_limits(x), view_limits(y)
    if smooth and len(x) > 3:
        kde = gaussian_kde(np.vstack([x, y]))
        gx, gy = np.mgrid[xlim[0]:xlim[1]:180j, ylim[0]:ylim[1]:180j]
        z = kde(np.vstack([gx.ravel(), gy.ravel()])).reshape(gx.shape)
        ax.contourf(gx, gy, z, levels=np.linspace(z.max() * 0.02, z.max(), 14), cmap=DENSITY, alpha=0.9)
        ax.contour(gx, gy, z, levels=6, colors=GOLD, linewidths=0.4, alpha=0.5)
    s = 6 if size is None else 4 + 400 * size / max(size.max(), 1e-12)
    if labels is None:
        ax.scatter(x, y, s=s, color=GOLD_BRIGHT, alpha=0.55, lw=0)
    else:
        for c in np.unique(labels):
            m = labels == c
            label = names[c] if names and c < len(names) else f"Canon {c + 1}"
            ax.scatter(x[m], y[m], s=s[m] if np.ndim(s) else s, color=CLUSTER_COLORS[c % len(CLUSTER_COLORS)],
                       alpha=0.35 if smooth else 0.7, lw=0, label=label)
        legend = ax.legend(fontsize=7, frameon=False, labelcolor=BONE, loc="upper left", bbox_to_anchor=(1.01, 1))
        for handle in legend.legend_handles:
            handle.set_sizes([30])
            handle.set_alpha(0.9)
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)
    outside = int(((x < xlim[0]) | (x > xlim[1]) | (y < ylim[0]) | (y > ylim[1])).sum())
    if outside:
        ax.text(0.99, 0.01, f"{outside} points beyond the 1st to 99th percentile view", transform=ax.transAxes,
                ha="right", va="bottom", color=BONE_DIM, fontsize=7)
    ax.axhline(0, color=GOLD, lw=0.6, alpha=0.4)
    ax.axvline(0, color=GOLD, lw=0.6, alpha=0.4)
    ax.set_xlabel(f"component {axes[0]} ({result.variance_ratio[a] * 100:.1f}% var), standardized score")
    ax.set_ylabel(f"component {axes[1]} ({result.variance_ratio[b] * 100:.1f}% var), standardized score")
    ax.set_title(title or f"{result.corpus}: space projection on components {axes[0]} and {axes[1]}"
                 + (", kernel density" if smooth else ""), fontsize=11)
    return _save(fig, path, dpi)

def boxplot(result: PrimeResult, path: Path, title: str | None = None, dpi: int = 160) -> tuple[Path, list[dict]]:
    data = [result.raw_scores[:, k] for k in range(result.k)]
    stats = [five_number(d) for d in data]
    fig = _figure(max(8, 0.8 * result.k + 3), 6)
    ax = fig.add_subplot(111)
    _style(ax)
    pos = np.arange(1, result.k + 1)
    ax.boxplot(
        data, positions=pos, whis=(0, 100), widths=0.55, showfliers=False, patch_artist=True,
        boxprops={"facecolor": BASALT, "edgecolor": GOLD}, medianprops={"color": GOLD_BRIGHT, "lw": 1.6},
        whiskerprops={"color": GOLD}, capprops={"color": GOLD},
    )
    means = np.array([s["mean"] for s in stats])
    sds = np.array([s["sd"] for s in stats])
    ax.errorbar(pos + 0.33, means, yerr=sds, fmt="D", color="#1FB5B5", ms=4, capsize=3, lw=1, label="mean ± 1 SD")
    ax.set_xticks(pos, [str(p) for p in pos])
    ax.set_xlabel("component")
    ax.set_ylabel("score u·s (projection length)")
    ax.legend(fontsize=8, frameon=False, labelcolor=BONE)
    ax.set_title(title or f"{result.corpus}: five-number summary per component, whiskers at min and max", fontsize=11)
    return _save(fig, path, dpi), stats

def residuals(
    result: PrimeResult,
    path: Path,
    against: np.ndarray | None = None,
    against_label: str = "PageRank",
    title: str | None = None,
    dpi: int = 160,
) -> tuple[Path, dict]:
    res = result.residuals()
    fitted = (result.raw_scores**2).sum(axis=1)
    total = res + fitted
    frac = np.divide(res, total, out=np.zeros_like(res), where=total > 0)
    fig = _figure(15, 5)
    ax1, ax2, ax3 = fig.subplots(1, 3)
    for ax in (ax1, ax2, ax3):
        _style(ax)
    ax1.hist(frac, bins=40, color=GOLD, alpha=0.8)
    ax1.set_xlabel("residual share ‖x − x̂‖² / ‖x‖²")
    ax1.set_ylabel("rows")
    ax1.set_title("unexplained share per row", fontsize=10)
    if against is None:
        ax2.scatter(fitted, res, s=5, color=GOLD_BRIGHT, alpha=0.5, lw=0)
        ax2.set_xlabel("fitted ‖x̂‖²")
        ax2.set_ylabel("residual ‖x − x̂‖²")
        ax2.set_title("residual against fit", fontsize=10)
    else:
        ax2.scatter(against, frac, s=5, color=GOLD_BRIGHT, alpha=0.5, lw=0)
        if np.all(against > 0):
            ax2.set_xscale("log")
        ax2.set_xlabel(against_label)
        ax2.set_ylabel("residual share")
        ax2.set_title(f"residual share against {against_label}", fontsize=10)
    pos = np.arange(1, result.k + 1)
    ax3.bar(pos, result.variance_ratio * 100, color=GOLD, alpha=0.8)
    ax3.plot(pos, np.cumsum(result.variance_ratio) * 100, color="#1FB5B5", marker="o", ms=3)
    ax3.set_xlabel("component")
    ax3.set_ylabel("% of total variance, bar and cumulative")
    ax3.set_title("scree", fontsize=10)
    fig.suptitle(title or f"{result.corpus}: rank-{result.k} reconstruction residuals", color=BONE, fontsize=12)
    summary = {"residual_share": five_number(frac), "explained_variance_total": float(result.variance_ratio.sum())}
    return _save(fig, path, dpi), summary
