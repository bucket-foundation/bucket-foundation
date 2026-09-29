from __future__ import annotations

import shutil
import subprocess
import time
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.collections import LineCollection, PolyCollection  # noqa: E402

from .model import PrimeResult  # noqa: E402

BASALT = "#1F1C16"
BASALT_2 = "#2A261E"
GOLD = "#B8861E"
GOLD_BRIGHT = "#D9A43A"
BONE = "#EFE8D4"
BONE_DIM = "#A89F88"
TEAL = "#1FA3A3"
PICK_COLORS = ["#D9A43A", "#1FB5B5", "#E4DCC4", "#D96C4A", "#8FBF5A", "#9C7FD1", "#E08BB0", "#6FA8DC"]
RADIUS = 1.0
SIGMA_SPAN = 2.5

def angles(k: int, offset: float = 0.0) -> np.ndarray:
    return np.pi / 2 - np.linspace(0, 2 * np.pi, k, endpoint=False) + offset

def radii(scores: np.ndarray) -> np.ndarray:
    return RADIUS * np.clip((scores + SIGMA_SPAN) / (2 * SIGMA_SPAN), 0.02, 1.0)

def polygon(scores: np.ndarray, ang: np.ndarray) -> np.ndarray:
    r = radii(scores)
    return np.column_stack([r * np.cos(ang), r * np.sin(ang)])

def default_picks(result: PrimeResult, n: int = 6) -> list[int]:
    picks: list[int] = []
    for k in range(result.k):
        for i in np.argsort(-result.scores[:, k]):
            if int(i) not in picks:
                picks.append(int(i))
                break
        if len(picks) >= n:
            break
    return picks

def find_picks(result: PrimeResult, queries: list[str]) -> list[int]:
    picks = []
    lowered = [t.lower() for t in result.titles]
    for q in queries:
        q = q.lower()
        for i, t in enumerate(lowered):
            if q in t and i not in picks:
                picks.append(i)
                break
    return picks

def component_label(result: PrimeResult, k: int, n_terms: int = 3) -> str:
    ranked = [t for t, _ in result.top_terms(k, 4 * n_terms)]
    terms = " / ".join(([t for t in ranked if not t.startswith("@")] or [t.lstrip("@") for t in ranked])[:n_terms])
    return f"{k + 1}. {terms}\n{result.variance_ratio[k] * 100:.1f}%"

def _draw_frame(ax, result: PrimeResult, ang: np.ndarray, cloud: int, seed: int, label_size: float) -> None:
    ax.set_facecolor(BASALT)
    ax.set_aspect("equal")
    ax.axis("off")
    lim = RADIUS * 1.42
    ax.set_xlim(-lim, lim)
    ax.set_ylim(-lim, lim)
    t = np.linspace(0, 2 * np.pi, 361)
    ax.fill(RADIUS * np.cos(t), RADIUS * np.sin(t), color=BASALT_2, zorder=0)
    for frac in (0.25, 0.5, 0.75):
        ax.plot(frac * RADIUS * np.cos(t), frac * RADIUS * np.sin(t), color=GOLD, alpha=0.18, lw=0.6, zorder=1)
    ax.plot(RADIUS * np.cos(t), RADIUS * np.sin(t), color=GOLD, lw=1.4, zorder=2)
    zero = (0 + SIGMA_SPAN) / (2 * SIGMA_SPAN) * RADIUS
    ax.plot(zero * np.cos(t), zero * np.sin(t), color=GOLD, alpha=0.45, lw=0.7, ls=(0, (2, 3)), zorder=1)
    spokes = [[(0, 0), (RADIUS * np.cos(a), RADIUS * np.sin(a))] for a in ang]
    ax.add_collection(LineCollection(spokes, colors=GOLD, alpha=0.55, lw=0.9, zorder=2))
    for k, a in enumerate(ang):
        ax.text(
            1.2 * RADIUS * np.cos(a), 1.2 * RADIUS * np.sin(a), component_label(result, k),
            ha="center", va="center", fontsize=label_size, color=BONE, zorder=5,
        )
    if cloud:
        rng = np.random.default_rng(seed)
        n = result.scores.shape[0]
        idx = rng.choice(n, size=min(cloud, n), replace=False)
        polys = [polygon(result.scores[i], ang) for i in idx]
        alpha = float(np.clip(12.0 / len(polys), 0.012, 0.25))
        ax.add_collection(PolyCollection(polys, facecolors="none", edgecolors=TEAL, alpha=alpha, lw=0.5, zorder=3))
    ax.plot(0, 0, "o", color=GOLD_BRIGHT, ms=5, zorder=6)

def _subtitle(result: PrimeResult) -> str:
    n, v = result.shape
    return (
        f"{n:,} documents x {v:,} features, {result.params.get('weighting', 'binary')} sparse matrix, density {result.density:.4f}; "
        f"{result.k} orthogonal components, max |VV'-I| {result.orthogonality:.1e}\n"
        f"spoke = component; polygon = one document's standardized scores, "
        f"center -{SIGMA_SPAN:g} sd, dashed ring 0, rim +{SIGMA_SPAN:g} sd"
    )

def render_png(
    result: PrimeResult,
    path: Path,
    picks: list[int] | None = None,
    cloud: int = 1500,
    seed: int = 0,
    dpi: int = 160,
    title: str | None = None,
) -> Path:
    picks = default_picks(result) if picks is None else picks
    ang = angles(result.k)
    fig = plt.figure(figsize=(12, 12.4), facecolor=BASALT)
    ax = fig.add_axes((0.02, 0.08, 0.96, 0.84))
    _draw_frame(ax, result, ang, cloud, seed, label_size=8)
    handles = []
    for j, i in enumerate(picks):
        color = PICK_COLORS[j % len(PICK_COLORS)]
        poly = polygon(result.scores[i], ang)
        ax.fill(poly[:, 0], poly[:, 1], color=color, alpha=0.12, zorder=4)
        closed = np.vstack([poly, poly[:1]])
        (line,) = ax.plot(closed[:, 0], closed[:, 1], color=color, lw=1.6, zorder=4, label=result.titles[i][:80])
        handles.append(line)
    fig.text(0.5, 0.975, title or f"Prime directions: {result.corpus}", ha="center", va="top", color=BONE, fontsize=15)
    fig.text(0.5, 0.945, _subtitle(result), ha="center", va="top", color=BONE_DIM, fontsize=8.5)
    if handles:
        fig.legend(
            handles=handles, loc="lower center", bbox_to_anchor=(0.5, 0.01), ncol=2, fontsize=8,
            frameon=False, labelcolor=BONE,
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=dpi, facecolor=BASALT)
    plt.close(fig)
    return path

def _ease(t: np.ndarray) -> np.ndarray:
    return 0.5 - 0.5 * np.cos(np.pi * t)

def sweep_sequence(result: PrimeResult, n_docs: int | None = None) -> list[tuple[int, int]]:
    seq = []
    for k in range(result.k):
        order = np.argsort(-result.scores[:, k])
        for i in order:
            if all(int(i) != d for d, _ in seq):
                seq.append((int(i), k))
                break
    return seq[:n_docs] if n_docs else seq

def render_mp4(
    result: PrimeResult,
    path: Path,
    frames_per_doc: int = 36,
    hold: int = 18,
    fps: int = 30,
    size_px: int = 1080,
    cloud: int = 1500,
    seed: int = 0,
    crf: int = 20,
    ffmpeg: str | None = None,
    timeout_s: float = 900.0,
) -> dict:
    ffmpeg = ffmpeg or shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg not found on PATH")
    size_px -= size_px % 2
    dpi = 120
    ang = angles(result.k)
    fig = plt.figure(figsize=(size_px / dpi, size_px / dpi), dpi=dpi, facecolor=BASALT)
    ax = fig.add_axes((0.0, 0.06, 1.0, 0.86))
    _draw_frame(ax, result, ang, cloud, seed, label_size=7)
    fig.text(0.5, 0.975, f"Prime directions: {result.corpus}", ha="center", va="top", color=BONE, fontsize=13)
    fig.text(
        0.5, 0.94, f"{result.shape[0]:,} docs x {result.shape[1]:,} terms, {result.k} orthogonal components",
        ha="center", va="top", color=BONE_DIM, fontsize=8,
    )
    canvas = fig.canvas
    canvas.draw()
    background = canvas.copy_from_bbox(fig.bbox)
    (fill,) = ax.fill([0], [0], color=GOLD_BRIGHT, alpha=0.18, zorder=7, animated=True)
    (edge,) = ax.plot([0], [0], color=GOLD_BRIGHT, lw=2.0, zorder=8, animated=True)
    (spoke,) = ax.plot([0], [0], color=GOLD_BRIGHT, lw=2.6, zorder=6, animated=True)
    caption = fig.text(0.5, 0.03, "", ha="center", va="center", color=BONE, fontsize=9, animated=True)
    seq = sweep_sequence(result)
    shapes = [polygon(result.scores[i], ang) for i, _ in seq]
    width, height = canvas.get_width_height()
    cmd = [
        ffmpeg, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba",
        "-s", f"{width}x{height}", "-r", str(fps), "-i", "-",
        "-c:v", "libx264", "-preset", "medium", "-crf", str(crf), "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(path),
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    frames = 0
    deadline = time.monotonic() + timeout_s
    try:
        for j, (doc, comp) in enumerate(seq):
            nxt = (j + 1) % len(seq)
            steps = np.concatenate([np.zeros(hold), _ease(np.linspace(0, 1, frames_per_doc, endpoint=False))])
            for t in steps:
                if time.monotonic() > deadline or proc.poll() is not None:
                    raise RuntimeError(f"ffmpeg stopped or exceeded {timeout_s:g}s after {frames} frames")
                shape = (1 - t) * shapes[j] + t * shapes[nxt]
                closed = np.vstack([shape, shape[:1]])
                fill.set_xy(closed)
                edge.set_data(closed[:, 0], closed[:, 1])
                target = comp if t < 0.5 else seq[nxt][1]
                a = ang[target]
                spoke.set_data([0, RADIUS * np.cos(a)], [0, RADIUS * np.sin(a)])
                label = result.titles[doc] if t < 0.5 else result.titles[seq[nxt][0]]
                caption.set_text(f"component {target + 1}: {label[:90]}")
                canvas.restore_region(background)
                for artist in (spoke, fill, edge, caption):
                    fig.draw_artist(artist)
                canvas.blit(fig.bbox)
                proc.stdin.write(bytes(canvas.buffer_rgba()))
                frames += 1
        proc.stdin.close()
        code = proc.wait(timeout=max(1.0, deadline - time.monotonic()))
        err = proc.stderr.read().decode("utf-8", "replace")
    except subprocess.TimeoutExpired as exc:
        proc.kill()
        proc.wait()
        raise RuntimeError(f"ffmpeg exceeded {timeout_s:g}s") from exc
    except BrokenPipeError as exc:
        proc.kill()
        proc.wait()
        err = proc.stderr.read().decode("utf-8", "replace").strip()
        raise RuntimeError(f"ffmpeg closed its input after {frames} frames: {err}") from exc
    except BaseException:
        proc.kill()
        proc.wait()
        raise
    finally:
        plt.close(fig)
    if code != 0:
        raise RuntimeError(f"ffmpeg exited {code}: {err.strip()}")
    return {"frames": frames, "fps": fps, "seconds": round(frames / fps, 2), "size": [width, height], "keyframes": len(seq)}
