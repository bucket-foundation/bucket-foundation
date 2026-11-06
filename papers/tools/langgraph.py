#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

SEED = 7
BLUE, GRAY, INK = "#14417a", "#9a9a9a", "#222222"
MODALITY_COLORS = {"script": "#14417a", "phonetic": "#b5562b", "meaning": "#3d7a3a"}
FAMILY_COLORS = {
    "Latin": "#14417a",
    "Cyrillic": "#b5562b",
    "Greek": "#7a5c14",
    "Arabic": "#3d7a3a",
    "Hebrew": "#6b3d7a",
    "Indic": "#a0337a",
    "Thai": "#2b8a8a",
    "CJK": "#5a5a5a",
}
SCRIPT_FAMILY = {
    **{l: "Latin" for l in ("en", "es", "fr", "it", "pt", "de", "nl", "sv", "pl", "fi", "tr", "cs", "id", "vi", "la", "ang")},
    "ru": "Cyrillic",
    "el": "Greek",
    "grc": "Greek",
    "ar": "Arabic",
    "fa": "Arabic",
    "he": "Hebrew",
    "hi": "Indic",
    "sa": "Indic",
    "ta": "Indic",
    "th": "Thai",
    "zh": "CJK",
    "ja": "CJK",
    "ko": "CJK",
}
FAMILY_ORDER = list(FAMILY_COLORS)


def seed_all(seed: int = SEED) -> None:
    random.seed(seed)
    np.random.seed(seed)
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 8, "svg.hashsalt": str(seed), "path.simplify": False})


def family(lang: str) -> str:
    return SCRIPT_FAMILY.get(lang, "Latin")


def order_by_family(langs):
    return sorted(langs, key=lambda l: (FAMILY_ORDER.index(family(l)), l))


def save(fig, path: str) -> str:
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    fig.savefig(path, dpi=200, metadata={"Software": None})
    plt.close(fig)
    return path


def family_handles(fams):
    return [plt.Line2D([0], [0], marker="s", linestyle="", color=FAMILY_COLORS[f], label=f) for f in FAMILY_ORDER if f in fams]


def family_legend(ax, fams, loc="upper left", ncol=4):
    ax.legend(handles=family_handles(fams), fontsize=6.5, frameon=False, loc=loc, ncol=ncol)


def figure_legend(fig, fams):
    fig.legend(handles=family_handles(fams), fontsize=6.5, frameon=False, loc="lower center", ncol=len(fams))


def spread(values: list, gap: float, lo: float, hi: float) -> list:
    order = sorted(range(len(values)), key=lambda i: (values[i], i))
    ys = [values[i] for i in order]
    for i in range(1, len(ys)):
        ys[i] = max(ys[i], ys[i - 1] + gap)
    if ys and ys[-1] > hi:
        ys[-1] = hi
        for i in range(len(ys) - 2, -1, -1):
            ys[i] = min(ys[i], ys[i + 1] - gap)
    out = [0.0] * len(values)
    for i, y in zip(order, ys):
        out[i] = max(y, lo) if len(ys) * gap <= hi - lo else y
    return out


def metric_bars(values: dict, path: str, ylabel: str, baseline: dict | None = None, ylim=(0, 100)) -> str:
    seed_all()
    langs = order_by_family(values)
    fig, ax = plt.subplots(figsize=(7.2, 2.8))
    x = np.arange(len(langs))
    colors = [FAMILY_COLORS[family(l)] for l in langs]
    ax.bar(x, [values[l] for l in langs], 0.7, color=colors)
    if baseline:
        ax.scatter(x, [baseline[l] for l in langs], marker="_", s=80, color=INK, linewidths=1.2, zorder=3, label="before")
    groups = {}
    for i, l in enumerate(langs):
        groups.setdefault(family(l), []).append(i)
    for f, idx in groups.items():
        if idx[0] > 0:
            ax.axvline(idx[0] - 0.5, color=GRAY, linewidth=0.5)
    ax.set_xticks(x)
    ax.set_xticklabels(langs, fontsize=7)
    ax.set_ylabel(ylabel)
    ax.set_ylim(*ylim)
    ax.spines[["top", "right"]].set_visible(False)
    family_legend(ax, set(groups))
    fig.tight_layout()
    return save(fig, path)


def slope_chart(panels: list, path: str, ylabel: str, labels=("before", "after"), ylim=(0, 100)) -> str:
    seed_all()
    fig, axes = plt.subplots(1, len(panels), figsize=(3.4 * len(panels), 3.6), sharey=True, squeeze=False)
    for ax, (title, before, after) in zip(axes[0], panels):
        langs = order_by_family(before)
        for l in langs:
            c = FAMILY_COLORS[family(l)]
            ax.plot([0, 1], [before[l], after[l]], color=c, linewidth=0.9, marker="o", markersize=2.5)
        ys = spread([after[l] for l in langs], 1.9, ylim[0], ylim[1])
        for l, y in zip(langs, ys):
            ax.text(1.04, y, l, fontsize=5.5, va="center", color=FAMILY_COLORS[family(l)])
        mb, ma = float(np.mean([before[l] for l in langs])), float(np.mean([after[l] for l in langs]))
        ax.plot([0, 1], [mb, ma], color=INK, linewidth=2.2, linestyle="--")
        ax.set_xticks([0, 1])
        ax.set_xticklabels(labels)
        ax.set_xlim(-0.15, 1.3)
        ax.set_ylim(*ylim)
        ax.set_title(f"{title}, mean {mb:.1f} to {ma:.1f}", fontsize=8)
        ax.spines[["top", "right"]].set_visible(False)
    axes[0][0].set_ylabel(ylabel)
    figure_legend(fig, {family(l) for p in panels for l in p[1]})
    fig.tight_layout(rect=(0, 0.07, 1, 1))
    return save(fig, path)


def circle_layout(langs):
    n = len(langs)
    return {l: (math.cos(2 * math.pi * i / n + math.pi / 2), math.sin(2 * math.pi * i / n + math.pi / 2)) for i, l in enumerate(langs)}


def top_edges(langs, sim, k: int):
    idx = {l: i for i, l in enumerate(langs)}
    edges = set()
    for a in langs:
        others = sorted((l for l in langs if l != a), key=lambda b: (-sim[idx[a]][idx[b]], b))
        for b in others[:k]:
            edges.add(tuple(sorted((a, b))))
    return sorted(edges, key=lambda e: (sim[idx[e[0]]][idx[e[1]]], e))


def language_network(graph: dict, path: str, k: int = 2, modalities=("script", "phonetic", "meaning")) -> str:
    seed_all()
    langs = graph["langs"]
    order = order_by_family(langs)
    pos = circle_layout(order)
    idx = {l: i for i, l in enumerate(langs)}
    fig, axes = plt.subplots(1, len(modalities), figsize=(3.0 * len(modalities), 3.6))
    for ax, m in zip(np.atleast_1d(axes), modalities):
        sim = graph["sim"][m]
        edges = top_edges(langs, sim, k)
        vals = [sim[idx[a]][idx[b]] for a, b in edges]
        lo, hi = min(vals), max(vals)
        for (a, b), v in zip(edges, vals):
            t = 0.0 if hi == lo else (v - lo) / (hi - lo)
            ax.plot([pos[a][0], pos[b][0]], [pos[a][1], pos[b][1]], color=MODALITY_COLORS.get(m, BLUE), alpha=0.25 + 0.65 * t, linewidth=0.4 + 2.2 * t, zorder=1)
        for l in order:
            x, y = pos[l]
            ax.scatter([x], [y], s=26, color=FAMILY_COLORS[family(l)], zorder=2, edgecolors="white", linewidths=0.5)
            ax.text(1.16 * x, 1.16 * y, l, fontsize=6, ha="center", va="center")
        ax.set_title(f"{m}, top {k} per language, cos {lo:.2f} to {hi:.2f}", fontsize=7.5)
        ax.set_xlim(-1.35, 1.35)
        ax.set_ylim(-1.35, 1.35)
        ax.set_aspect("equal")
        ax.axis("off")
    figure_legend(fig, {family(l) for l in langs})
    fig.subplots_adjust(left=0.01, right=0.99, top=0.9, bottom=0.1, wspace=0.04)
    return save(fig, path)


def neighbor_graph(nb: dict, path: str) -> str:
    seed_all()
    center = nb["word"]
    groups = nb["groups"]
    fig, ax = plt.subplots(figsize=(6.4, 4.0))
    ax.scatter([0], [0], s=900, color=INK, zorder=3)
    ax.text(0, 0, center, color="white", ha="center", va="center", fontsize=8, fontweight="bold", zorder=4)
    spans = {"phonetic": (110, 250), "script": (-70, 70), "char": (290, 430)}
    for name, items in groups.items():
        a0, a1 = spans.get(name, (0, 360))
        n = len(items)
        for i, it in enumerate(items):
            ang = math.radians(a0 + (a1 - a0) * i / max(1, n - 1))
            r = 0.9 + 2.5 * max(0.0, 1 - it["cos"])
            x, y = r * math.cos(ang), r * math.sin(ang)
            col = MODALITY_COLORS.get(name, GRAY)
            ax.plot([0, x], [0, y], color=col, linewidth=0.6 + 2.0 * max(0.0, it["cos"]), alpha=0.7, zorder=1)
            ax.scatter([x], [y], s=60, color=col, zorder=2)
            lx, ly = (r + 0.18) * math.cos(ang), (r + 0.18) * math.sin(ang)
            ax.text(lx, ly, f"{it['word']} {it['cos']:.2f}", ha="left" if math.cos(ang) >= 0 else "right", va="center", fontsize=7)
    handles = [plt.Line2D([0], [0], color=MODALITY_COLORS.get(g, GRAY), linewidth=2, label=f"{g} neighbours") for g in groups]
    ax.legend(handles=handles, fontsize=7, frameon=False, loc="lower center", ncol=len(handles))
    ax.set_xlim(-2.6, 2.6)
    ax.set_ylim(-1.85, 1.8)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title(f"{nb['lang']} {center}: nearest words by sound and by rendered script", fontsize=8)
    fig.tight_layout()
    return save(fig, path)


def read_words(root: str, lang: str):
    with open(os.path.join(root, lang, "words.txt"), encoding="utf-8") as f:
        return f.read().split("\n")


def load_matrix(root: str, lang: str, modality: str):
    return np.load(os.path.join(root, lang, f"{modality}.npy"), mmap_mode="r")


def first_targets(root: str, lang: str) -> dict:
    import pandas as pd

    d = pd.read_parquet(os.path.join(root, lang, "pairs.parquet"), columns=["word", "english", "direction", "new_rank"])
    d = d[(d.direction == "en>xx") & (d.new_rank == 0)].sort_values(["english", "word"])
    return dict(zip(d.english, d.word))


def derive_graph(root: str, langs=None, modalities=("script", "phonetic", "meaning"), min_langs: int = 20, max_anchors: int = 600) -> dict:
    root = os.path.expanduser(root)
    if langs is None:
        langs = sorted(l for l in os.listdir(root) if os.path.isfile(os.path.join(root, l, "pairs.parquet")))
    targets = {l: first_targets(root, l) for l in langs}
    counts = {}
    for l in langs:
        for e in targets[l]:
            counts[e] = counts.get(e, 0) + 1
    eligible = sorted(e for e, c in counts.items() if c >= min_langs)
    anchors = eligible[:max_anchors]
    rows = {}
    for l in langs:
        words = read_words(root, l)
        where = {w: i for i, w in enumerate(words)}
        rows[l] = {e: where[targets[l][e]] for e in anchors if e in targets[l] and targets[l][e] in where}
    sims = {}
    for m in modalities:
        mats = {l: load_matrix(root, l, m) for l in langs}
        vec = {l: {e: np.asarray(mats[l][i], dtype=np.float64) for e, i in rows[l].items()} for l in langs}
        s = np.zeros((len(langs), len(langs)))
        for i, a in enumerate(langs):
            for j, b in enumerate(langs):
                if j < i:
                    s[i][j] = s[j][i]
                    continue
                shared = [e for e in anchors if e in vec[a] and e in vec[b]]
                s[i][j] = float(np.mean([vec[a][e] @ vec[b][e] for e in shared])) if shared else 0.0
        sims[m] = [[round(float(x), 4) for x in r] for r in s]
    return {"langs": list(langs), "anchors": len(anchors), "eligible": len(eligible), "min_langs": min_langs, "families": {l: family(l) for l in langs}, "sim": sims}


def derive_neighbors(root: str, lang: str, word: str, k: int = 6, modalities=("phonetic", "script")) -> dict:
    root = os.path.expanduser(root)
    words = read_words(root, lang)
    i = words.index(word)
    out = {"lang": lang, "word": word, "groups": {}}
    for m in modalities:
        mat = np.asarray(load_matrix(root, lang, m), dtype=np.float32)
        cos = mat @ mat[i]
        cand = np.lexsort((np.arange(len(cos)), -np.round(cos, 5)))
        picked = []
        for j in cand:
            w = words[j]
            if j == i or not w or w.lower() == word.lower():
                continue
            picked.append({"word": w, "cos": round(float(cos[j]), 4)})
            if len(picked) == k:
                break
        out["groups"][m] = picked
    return out


def write_json(obj, path: str) -> str:
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False, sort_keys=True)
        f.write("\n")
    return path


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="langgraph.py")
    sub = p.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("derive")
    d.add_argument("--root", required=True)
    d.add_argument("--out", required=True)
    d.add_argument("--min-langs", type=int, default=20)
    d.add_argument("--max-anchors", type=int, default=600)
    n = sub.add_parser("neighbors")
    n.add_argument("--root", required=True)
    n.add_argument("--lang", required=True)
    n.add_argument("--word", required=True)
    n.add_argument("--k", type=int, default=6)
    n.add_argument("--out", required=True)
    for name in ("network", "neighbor-graph"):
        q = sub.add_parser(name)
        q.add_argument("--in", dest="inp", required=True)
        q.add_argument("--out", required=True)
    for name in ("bars", "slope"):
        q = sub.add_parser(name)
        q.add_argument("--in", dest="inp", required=True)
        q.add_argument("--out", required=True)
        q.add_argument("--ylabel", default="percent")
    a = p.parse_args(argv)
    if a.cmd == "derive":
        print(write_json(derive_graph(a.root, min_langs=a.min_langs, max_anchors=a.max_anchors), a.out))
    elif a.cmd == "neighbors":
        print(write_json(derive_neighbors(a.root, a.lang, a.word, a.k), a.out))
    else:
        data = json.load(open(a.inp, encoding="utf-8"))
        if a.cmd == "network":
            print(language_network(data, a.out))
        elif a.cmd == "neighbor-graph":
            print(neighbor_graph(data, a.out))
        elif a.cmd == "bars":
            print(metric_bars(data["values"], a.out, a.ylabel, data.get("baseline")))
        else:
            print(slope_chart([(x["title"], x["before"], x["after"]) for x in data["panels"]], a.out, a.ylabel))
    return 0


if __name__ == "__main__":
    sys.exit(main())
