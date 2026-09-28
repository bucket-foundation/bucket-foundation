from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np


def _load(path: Path) -> tuple[list[dict], list[dict]]:
    doc = json.loads(Path(path).read_text())
    nodes, edges = doc.get("nodes"), doc.get("edges")
    if not isinstance(nodes, list) or not isinstance(edges, list):
        raise TypeError("graph file needs nodes and edges lists")
    return nodes, edges


def _edge_ends(e: dict) -> tuple[str, str]:
    a = e.get("source", e.get("from", e.get("source_id")))
    b = e.get("target", e.get("to", e.get("target_id")))
    if a is None or b is None:
        raise ValueError(f"edge without source and target: {e}")
    return str(a), str(b)


def components(ids: list[str], pairs: list[tuple[str, str]]) -> list[list[str]]:
    parent = {i: i for i in ids}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b in pairs:
        parent[find(a)] = find(b)
    groups: dict[str, list[str]] = defaultdict(list)
    for i in ids:
        groups[find(i)].append(i)
    return sorted(groups.values(), key=lambda g: (-len(g), g[0]))


def layout(ids: list[str], pairs: list[tuple[str, str]], seed: int = 0, steps: int = 200) -> np.ndarray:
    n = len(ids)
    rng = np.random.default_rng(seed)
    pos = rng.normal(size=(n, 2))
    idx = {k: i for i, k in enumerate(ids)}
    E = np.array([(idx[a], idx[b]) for a, b in pairs], dtype=int).reshape(-1, 2)
    k = 1.0 / np.sqrt(max(n, 1))
    for step in range(steps):
        d = pos[:, None, :] - pos[None, :, :]
        dist = np.linalg.norm(d, axis=-1) + 1e-9
        force = (d / dist[..., None] * (k * k / dist)[..., None]).sum(axis=1)
        if len(E):
            de = pos[E[:, 0]] - pos[E[:, 1]]
            le = np.linalg.norm(de, axis=1, keepdims=True) + 1e-9
            pull = de / le * (le * le / k)
            np.add.at(force, E[:, 0], -pull)
            np.add.at(force, E[:, 1], pull)
        temp = 0.1 * (1 - step / steps) + 1e-3
        norm = np.linalg.norm(force, axis=1, keepdims=True) + 1e-9
        pos += force / norm * np.minimum(norm, temp)
    return pos


def build(args: dict, out_dir: Path) -> dict:
    nodes, edges = _load(Path(args["graph"]))
    ids = [str(n.get("id", n.get("slug"))) for n in nodes]
    known = set(ids)
    pairs = [p for p in (_edge_ends(e) for e in edges) if p[0] in known and p[1] in known]
    deg = Counter()
    for a, b in pairs:
        deg[a] += 1
        deg[b] += 1
    comps = components(ids, pairs)
    pos = layout(ids, pairs, int(args.get("seed", 0)))
    branch = {str(n.get("id", n.get("slug"))): n.get("branch") or "none" for n in nodes}
    label = {str(n.get("id", n.get("slug"))): n.get("title") or n.get("slug") or "" for n in nodes}
    summary = {
        "nodes": len(ids),
        "edges": len(pairs),
        "dropped_edges": len(edges) - len(pairs),
        "components": len(comps),
        "largest_component": len(comps[0]) if comps else 0,
        "top_degree": [{"id": i, "title": label[i], "degree": d} for i, d in deg.most_common(10)],
    }
    out = {
        "summary": summary,
        "positions": {i: [round(float(x), 5), round(float(y), 5)] for i, (x, y) in zip(ids, pos)},
        "branch": branch,
    }
    (out_dir / "network.json").write_text(json.dumps(out, indent=1, sort_keys=True))
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    branches = sorted(set(branch.values()))
    cmap = plt.get_cmap("tab10")
    fig, ax = plt.subplots(figsize=(10, 10), facecolor="#EFE8D4")
    idx = {k: i for i, k in enumerate(ids)}
    for a, b in pairs:
        ax.plot(*zip(pos[idx[a]], pos[idx[b]]), color="#8c8672", lw=0.4, alpha=0.6)
    for bi, br in enumerate(branches):
        sel = [idx[i] for i in ids if branch[i] == br]
        sizes = [8 + 6 * deg[ids[j]] for j in sel]
        ax.scatter(pos[sel, 0], pos[sel, 1], s=sizes, color=cmap(bi % 10), label=br, zorder=3)
    ax.legend(frameon=False, fontsize=8)
    ax.set_axis_off()
    fig.savefig(out_dir / "network.png", dpi=110, facecolor="#EFE8D4")
    plt.close(fig)
    return summary
