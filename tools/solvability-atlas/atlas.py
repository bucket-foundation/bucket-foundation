import csv
import hashlib
import json
import os
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import networkx as nx
import numpy as np
from networkx.algorithms import community
from sentence_transformers import SentenceTransformer

HERE = Path(__file__).parent
REPO = HERE.parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "out"
FORMAL = {"proved": 1.0, "partial": 0.6, "statement": 0.35, "none": 0.1}
BRANCHES = ["mathematics", "physics", "chemistry", "information", "biophysics", "cosmology", "mind", "bucketmath", "applied"]
COLORS = dict(zip(BRANCHES, ["#4c78a8", "#f58518", "#54a24b", "#b279a2", "#e45756", "#72b7b2", "#eeca3b", "#9d755d", "#7f7f7f"]))
K = 6
NEIGHBOURS = 50
CACHE = Path(os.environ.get("ATLAS_CACHE", Path.home() / ".cache" / "bucket-atlas"))
MODEL = "BAAI/bge-small-en-v1.5"
MODEL_REVISION = "5c38ec7c405ec4b44b94cc5a9bb96e735b38267a"


def load_problems():
    rows = list(csv.DictReader(open(HERE / "problems.tsv"), delimiter="\t"))
    for r in rows:
        r["level"] = int(r["level"])
        r["posed"] = int(r["posed"])
        r["resolved"] = int(r["resolved"]) if r["resolved"] else None
        r["keywords"] = [k.strip() for k in r["keywords"].split(",")]
        r["market"] = [m for m in r["market"].split(";") if m != "none"]
        r["solvability"] = round(0.55 * (r["resolved"] is not None) + 0.45 * FORMAL[r["lean"]], 3)
        r["kind"] = "problem"
    return rows


def load_bucketmath():
    manifest = json.load(open(REPO / "lean" / "manifest.json"))
    rows = []
    for t in manifest:
        if t["kind"] != "theorem" or t["status"] not in ("proved", "open"):
            continue
        name = t["name"].split(".")[-1].replace("_", " ")
        module = t["module"].split(".")[-1]
        rows.append({
            "id": "lean:" + t["name"], "name": t["name"], "branch": "bucketmath",
            "level": 2, "lean": "proved" if t["status"] == "proved" else "statement",
            "posed": 2026, "resolved": 2026 if t["status"] == "proved" else None,
            "market": [], "keywords": [name, module], "kind": "lean",
        })
        rows[-1]["solvability"] = 1.0 if t["status"] == "proved" else 0.35 * 0.45
    return rows


RECORDS = HERE / "records"
KEY_WORK_TITLES = 8
TEXT_VARIANTS = ("keywords", "statement", "statement_titles", "statement_titles_aliases")
DEFAULT_TEXT = "keywords"
TEXT = os.environ.get("ATLAS_TEXT", DEFAULT_TEXT)
EXPECTED_PAIRS = [("navier", "turbulence"), ("goldbach", "twinprime"), ("pnp", "bqp"), ("protein", "foldpath"), ("hubble", "darkenergy"), ("darkmatter", "darkenergy"), ("ramsey", "capset"), ("fermat", "abc"), ("riemann", "twinprime"), ("factoring", "ecc"), ("owf", "zkp"), ("halting", "busybeaver"), ("consciousness", "bindingprob"), ("mitoredox", "aging"), ("hubbard", "roomtemp")]


def load_record(pid):
    path = RECORDS / f"{pid}.json"
    return json.load(open(path)) if path.exists() else None


def keyword_text(n):
    return f"{n['name']}. {n['branch']}. " + ", ".join(n["keywords"])


def record_text(n, rec, variant="statement_titles_aliases"):
    titles = [w["title"] for w in rec["key_works"] if w.get("in_embedding")][:KEY_WORK_TITLES]
    parts = [n["name"] + "."]
    if rec["aliases"] and variant == "statement_titles_aliases":
        parts.append("Also called " + ", ".join(rec["aliases"]) + ".")
    if rec["statement"]["text"]:
        parts.append(rec["statement"]["text"])
    parts.append("Keywords: " + ", ".join(n["keywords"]) + ".")
    if titles and variant in ("statement_titles", "statement_titles_aliases"):
        parts.append("Key works: " + "; ".join(titles) + ".")
    return " ".join(parts)


def neighbours(ids, emb, k=K):
    sim = emb @ emb.T
    return {pid: {ids[j] for j in np.argsort(-sim[i])[1:k + 1]} for i, pid in enumerate(ids)}


def pair_hits(ids, emb, pairs=EXPECTED_PAIRS, k=K):
    nb = neighbours(ids, emb, k)
    hits = [(a, b) for a, b in pairs if a in nb and b in nb and (b in nb[a] or a in nb[b])]
    return {"hits": len(hits), "pairs": len(pairs), "rate": round(len(hits) / len(pairs), 3), "hit_pairs": hits, "missed": [p for p in pairs if p not in hits]}


def neighbour_shift(ids, emb_a, emb_b, k=K):
    sim_a, sim_b = emb_a @ emb_a.T, emb_b @ emb_b.T
    rows = []
    for i, pid in enumerate(ids):
        na = {ids[j] for j in np.argsort(-sim_a[i])[1:k + 1]}
        nb = {ids[j] for j in np.argsort(-sim_b[i])[1:k + 1]}
        rows.append({"id": pid, "changed": len(na - nb), "left": sorted(na - nb), "entered": sorted(nb - na), "cosine": round(float(emb_a[i] @ emb_b[i]), 4)})
    total = sum(r["changed"] for r in rows)
    return {"k": k, "problems": len(ids), "changed_edges": total, "possible_edges": len(ids) * k, "problems_with_change": sum(r["changed"] > 0 for r in rows), "rows": sorted(rows, key=lambda r: (-r["changed"], r["cosine"]))}


def load_sourced():
    rows = list(csv.DictReader(open(HERE / "problems-sourced.tsv"), delimiter="\t"))
    for r in rows:
        r["level"] = int(r["level"]) if r["level"] else 0
        r["posed"] = int(r["posed"]) if r["posed"] else None
        r["resolved"] = int(r["resolved"]) if r["resolved"] else None
        r["keywords"] = [k.strip() for k in r["keywords"].split(",") if k.strip()]
        r["market"] = [m for m in r["market"].split(";") if m and m != "none"]
        r["variant_of"] = r["variant_of"] or None
        r["kind"] = "variant" if r["variant_of"] else "sourced"
        r["solvability"] = round(0.55 * (r["status"] == "solved") + 0.45 * FORMAL[r["lean"]], 3)
    return rows


SOLVED_RULE = "A top-level row is solved when its status is solved (a resolved year for the 71 atlas problems). A variant is solved only when its own status and the status of the problem it varies are both solved; a proved special case of an open problem stays open as partial progress on it."


def mark_solved(nodes):
    status = {}
    for n in nodes:
        if n["kind"] == "problem":
            status[n["id"]] = "solved" if n["resolved"] is not None else "open"
        elif n["kind"] == "lean":
            status[n["id"]] = "solved" if n["resolved"] is not None else "open"
        else:
            status[n["id"]] = n["status"]
    for n in nodes:
        own = status[n["id"]] == "solved"
        parent = n.get("variant_of")
        n["solved"] = own and (parent is None or status.get(parent) == "solved")
        n["status"] = "solved" if n["solved"] else ("partial" if own else status[n["id"]])
    return nodes


def name_keyword_text(n):
    return f"{n['name']}. " + ", ".join(n["keywords"])


def full_text(n):
    if n.get("statement"):
        return n["statement"], "statement"
    rec = load_record(n["id"]) if n["kind"] == "problem" else None
    if rec and (rec["statement"]["text"] or rec["key_works"]):
        return record_text(n, rec), "record"
    return name_keyword_text(n), "name_keywords"


def text_key(text):
    return hashlib.sha1(f"{MODEL}@{MODEL_REVISION}\n{text}".encode()).hexdigest()


def cached_encode(model, texts, cache=CACHE, batch_size=64):
    cache.mkdir(parents=True, exist_ok=True)
    keys_path, vec_path = cache / "keys.json", cache / "vectors.npy"
    keys = json.load(open(keys_path)) if keys_path.exists() and vec_path.exists() else []
    vecs = np.load(vec_path) if keys else np.zeros((0, 0), dtype=np.float32)
    at = {k: i for i, k in enumerate(keys)}
    wanted = [text_key(t) for t in texts]
    missing = sorted({k for k in wanted if k not in at})
    if missing:
        by_key = {text_key(t): t for t in texts}
        fresh = unit(model.encode([by_key[k] for k in missing], normalize_embeddings=True, batch_size=batch_size)).astype(np.float32)
        vecs = fresh if not keys else np.vstack([vecs, fresh])
        for k in missing:
            at[k] = len(keys)
            keys.append(k)
        np.save(vec_path, vecs)
        json.dump(keys, open(keys_path, "w"))
    return vecs[[at[k] for k in wanted]].astype(np.float64), len(missing)


def neighbour_rows(nodes, emb, k=NEIGHBOURS, block=512):
    solved_idx = np.flatnonzero(np.array([n["solved"] and n["kind"] != "lean" for n in nodes]))
    rows = []
    for start in range(0, len(nodes), block):
        sim = emb[start:start + block] @ emb.T
        for r in range(sim.shape[0]):
            i = start + r
            s = sim[r].copy()
            s[i] = -2
            top = np.argpartition(-s, min(k, len(s) - 1))[:k]
            top = top[np.argsort(-s[top])]
            rows.append({"n": [int(j) for j in top], "s": [round(float(s[j]), 3) for j in top]})
            cand = solved_idx[solved_idx != i]
            if len(cand):
                j = cand[np.argmax(s[cand])]
                rows[-1]["solved_nearest"] = {"id": nodes[j]["id"], "sim": round(float(s[j]), 3)}
            else:
                rows[-1]["solved_nearest"] = None
    return rows


def neighbour_data(nodes, emb, counts, k=NEIGHBOURS):
    rows = neighbour_rows(nodes, emb, k)
    out = []
    for n, r in zip(nodes, rows):
        out.append({"id": n["id"], "title": n["name"], "branch": n["branch"], "kind": n["kind"], "form": n.get("form", "problem"), "variant_of": n.get("variant_of"), "status": n["status"], "solved": n["solved"], "resolved": n["resolved"], "theta": round(n["theta"], 5), "source": n.get("source", "tools/solvability-atlas/problems.tsv"), "licence": n.get("licence", "MIT"), "text_kind": n["embedding_text"], **r})
    return {
        "schema": "bucket.solvability-atlas.neighbors/v1",
        "model": MODEL,
        "revision": MODEL_REVISION,
        "k": k,
        "note": f"Each node lists its {k} most similar nodes by index into ids with cosine similarity to three decimals, and its nearest solved problem over the whole set (Lean theorems excluded). Growth pulls in the frontier are bounded by these {k} neighbours. Angle is the rank along the first two principal components of the problem embeddings; Lean theorems are projected on the same axes and excluded from the frontier by default. " + SOLVED_RULE,
        "solved_rule": SOLVED_RULE,
        "text_counts": counts,
        "ids": [n["id"] for n in nodes],
        "solved": [n["id"] for n in nodes if n["solved"]],
        "nodes": out,
    }


def embed_text(n, variant=None):
    variant = variant or TEXT
    if variant not in TEXT_VARIANTS:
        raise ValueError(f"unknown text variant {variant}")
    rec = load_record(n["id"]) if n["kind"] == "problem" and variant != "keywords" else None
    if rec and (rec["statement"]["text"] or rec["key_works"]):
        return record_text(n, rec, variant), variant
    return keyword_text(n), "keywords"


def unit(v):
    return v / np.linalg.norm(v, axis=1, keepdims=True)


def ranked_angles(vecs):
    c = vecs - vecs.mean(0)
    _, _, vt = np.linalg.svd(c, full_matrices=False)
    p = c @ vt[:2].T
    raw = np.arctan2(p[:, 1], p[:, 0])
    order = np.argsort(raw)
    theta = np.empty(len(vecs))
    theta[order] = np.linspace(0, 2 * np.pi, len(vecs), endpoint=False)
    return theta, c @ vt[:3].T


N_COMPONENTS = 5
DIRECTION_TOKENS = 8


def components(nodes, emb, tokens, tok_emb, n=N_COMPONENTS):
    c = emb - emb.mean(0)
    _, sv, vt = np.linalg.svd(c, full_matrices=False)
    axes = vt[:n]
    coords = c @ axes.T
    explained = (sv[:n] ** 2 / (sv ** 2).sum()).tolist()
    tok = (tok_emb - emb.mean(0)) @ axes.T
    directions = []
    for k in range(n):
        order = np.argsort(tok[:, k])
        directions.append({"component": k + 1, "explained": round(explained[k], 4), "positive": [tokens[i] for i in order[::-1][:DIRECTION_TOKENS]], "negative": [tokens[i] for i in order[:DIRECTION_TOKENS]]})
    rows = [{"id": m["id"], "name": m["name"], "branch": m["branch"], "kind": m["kind"], "solvability": m["solvability"], "resolved": m["resolved"], "solved": m.get("solved", m["resolved"] is not None), "pc": [round(float(x), 4) for x in coords[i]]} for i, m in enumerate(nodes)]
    return {"schema": "bucket.solvability-atlas.components/v1", "model": MODEL, "explained": [round(x, 4) for x in explained], "directions": directions, "nodes": rows}


def export_components(nodes, emb, tokens, tok_emb):
    data = components(nodes, emb, tokens, tok_emb)
    write_components(data, "components")
    problems = [i for i, n in enumerate(nodes) if n["kind"] == "problem"]
    only = components([nodes[i] for i in problems], emb[problems], tokens, tok_emb)
    write_components(only, "components-problems")
    return data


def write_components(data, stem, labels=None):
    json.dump(data, open(OUT / f"{stem}.json", "w"), indent=1)
    with open(OUT / f"{stem}.csv", "w") as f:
        f.write("id\tname\tbranch\tkind\tsolvability\tresolved\tsolved\t" + "\t".join(f"pc{k + 1}" for k in range(N_COMPONENTS)) + "\n")
        for r in data["nodes"]:
            f.write("\t".join([r["id"], r["name"], r["branch"], r["kind"], str(r["solvability"]), str(r["resolved"] or ""), str(int(r["solved"])), *map(str, r["pc"])]) + "\n")
    plot_components(data, OUT / f"10-{stem}.png", labels)


def plot_components(data, path, labels=None):
    fig, ax = plt.subplots(figsize=(16, 14))
    d = data["directions"]
    big = len(data["nodes"]) > 400
    for r in data["nodes"]:
        x, y = r["pc"][0], r["pc"][1]
        problem = r["kind"] == "problem"
        named = r["id"] in labels if labels is not None else problem
        open_ = r.get("solved") is False if "solved" in r else r["resolved"] is None
        size = (70 if problem else 14) if not big else (40 if named else 5)
        ax.scatter(x, y, c=COLORS[r["branch"]], s=size, marker="^" if open_ else "o", edgecolor="k" if named else "none", lw=0.4, alpha=0.95 if named else (0.45 if not big else 0.3))
        if named:
            ax.annotate(r["name"], (x, y), xytext=(4, 3), textcoords="offset points", fontsize=6.5 if not big else 5.5)
    ax.axhline(0, color="#999", lw=0.6)
    ax.axvline(0, color="#999", lw=0.6)
    ax.set_xlabel(f"component 1, {d[0]['explained'] * 100:.1f} percent of variance")
    ax.set_ylabel(f"component 2, {d[1]['explained'] * 100:.1f} percent of variance", rotation=0, ha="right", va="center", labelpad=10)
    n = len(data["nodes"])
    kinds = Counter(r["kind"] for r in data["nodes"])
    ax.set_title(f"Principal components of {n} entries ({', '.join(f'{v} {k}' for k, v in sorted(kinds.items()))}): triangles are open, dots are solved, labelled points are the atlas problems" + (" and the top outside problems by growth" if labels is not None else ""))
    notes = [f"component {k + 1} ({c['explained'] * 100:.1f} percent). Toward: {', '.join(c['positive'][:6])}. Away: {', '.join(c['negative'][:6])}." for k, c in enumerate(d)]
    fig.text(0.02, -0.02, "\n".join(notes), fontsize=8.5, va="top", family="monospace")
    legend(ax)
    fig.savefig(path, dpi=200, bbox_inches="tight")
    plt.close(fig)


def knn_graph(nodes, sim):
    g = nx.Graph()
    for n in nodes:
        g.add_node(n["id"], **{k: n[k] for k in ("name", "branch", "level", "solvability", "kind")})
    for i in range(len(nodes)):
        for j in np.argsort(-sim[i])[1:K + 1]:
            g.add_edge(nodes[i]["id"], nodes[j]["id"], weight=float(sim[i, j]))
    return g


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    problems = load_problems()
    lean = load_bucketmath()
    nodes = problems + lean
    model = SentenceTransformer(MODEL, revision=MODEL_REVISION)
    texts = []
    for n in nodes:
        text, n["embedding_text"] = embed_text(n)
        texts.append(text)
    emb = unit(model.encode(texts, normalize_embeddings=True))
    sim = emb @ emb.T

    tokens = sorted({k.lower() for n in problems for k in n["keywords"]} | {m for n in problems for m in n["market"]})
    tok_emb = unit(model.encode(tokens, normalize_embeddings=True))
    tok_sim = tok_emb @ tok_emb.T
    tok_users = defaultdict(list)
    for n in problems:
        for k in [k.lower() for k in n["keywords"]] + n["market"]:
            tok_users[k].append(n)

    theta, p3 = ranked_angles(emb)
    for n, t in zip(nodes, theta):
        n["theta"] = float(t)

    plot_token_circle(tokens, tok_emb, tok_sim, tok_users)
    plot_star_chart(problems)
    plot_star_time(problems)
    plot_helix(nodes)
    plot_sphere(nodes, emb)
    g = knn_graph(nodes, sim)
    stats = network_stats(g, nodes)
    plot_network(g, nodes)
    plot_matrices(nodes, sim, stats, problems, tokens, tok_sim)
    export_graph(g, nodes, tokens, tok_users, stats)
    export_similarity(nodes, sim)
    export_components(nodes, emb, tokens, tok_emb)
    print(json.dumps(stats["summary"], indent=1))
    full(model, problems, lean)


def full_nodes(problems, lean, sourced=None):
    sourced = load_sourced() if sourced is None else sourced
    nodes = [dict(n) for n in problems] + [dict(n) for n in sourced] + [dict(n) for n in lean]
    seen = set()
    for n in nodes:
        if n["id"] in seen:
            raise ValueError(f"duplicate id {n['id']}")
        seen.add(n["id"])
    return mark_solved(nodes)


def project_angles(problem_emb, emb):
    centre = problem_emb.mean(0)
    _, _, vt = np.linalg.svd(problem_emb - centre, full_matrices=False)
    p = (emb - centre) @ vt[:2].T
    return np.arctan2(p[:, 1], p[:, 0])


def full(model, problems, lean):
    nodes = full_nodes(problems, lean)
    texts = []
    for n in nodes:
        text, n["embedding_text"] = full_text(n)
        texts.append(text)
    t0 = time.time()
    emb, fresh = cached_encode(model, texts)
    elapsed = round(time.time() - t0, 1)
    is_problem = np.array([n["kind"] != "lean" for n in nodes])
    theta, _ = ranked_angles(emb[is_problem])
    raw = project_angles(emb[is_problem], emb)
    for i, n in enumerate(nodes):
        n["theta"] = float(raw[i]) % (2 * np.pi)
    for i, t in zip(np.flatnonzero(is_problem), theta):
        nodes[i]["theta"] = float(t)
    counts = dict(Counter(n["embedding_text"] for n in nodes))
    data = neighbour_data(nodes, emb, counts)
    data["embedding"] = {"nodes": len(nodes), "fresh": fresh, "seconds": elapsed, "cache": str(CACHE)}
    json.dump(data, open(OUT / "neighbors.json", "w"), separators=(",", ":"))
    tokens = sorted({k.lower() for n in nodes for k in n["keywords"]} | {m for n in nodes for m in n["market"]})
    tok_emb, _ = cached_encode(model, tokens)
    labels = {n["id"] for n in problems}
    write_components(components(nodes, emb, tokens, tok_emb), "components-full", labels)
    only = np.flatnonzero(is_problem)
    write_components(components([nodes[i] for i in only], emb[only], tokens, tok_emb), "components-full-problems", labels)
    print(json.dumps({"full_nodes": len(nodes), "solved": len(data["solved"]), "embedding_seconds": elapsed, "fresh_embeddings": fresh, "text_counts": counts, "branches": dict(Counter(n["branch"] for n in nodes))}, indent=1))


def relabel_components(frontier_path, top=40):
    f = json.load(open(frontier_path))
    outside = [p for p in f["points"] if p["zone"] == "beyond"]
    outside.sort(key=lambda p: (-p["growth"], p["reach"], p["id"]))
    labels = {n["id"] for n in load_problems()} | {p["id"] for p in outside[:top]}
    for stem in ("components-full", "components-full-problems"):
        data = json.load(open(OUT / f"{stem}.json"))
        plot_components(data, OUT / f"10-{stem}.png", labels)
    return labels


def plot_token_circle(tokens, tok_emb, tok_sim, users):
    theta, _ = ranked_angles(tok_emb)
    r = 0.45 + 0.55 * np.array([np.mean([u["solvability"] for u in users[t]]) for t in tokens])
    freq = np.array([len(users[t]) for t in tokens])
    fig, ax = plt.subplots(figsize=(16, 16), subplot_kw={"projection": "polar"})
    for i in range(len(tokens)):
        j = np.argsort(-tok_sim[i])[1]
        ax.plot([theta[i], theta[j]], [r[i], r[j]], color="#bbb", lw=0.4, zorder=1)
    col = [COLORS[Counter(u["branch"] for u in users[t]).most_common(1)[0][0]] for t in tokens]
    ax.scatter(theta, r, s=20 + 40 * freq, c=col, alpha=0.85, zorder=2)
    for i, t in enumerate(tokens):
        ax.annotate("", xy=(theta[i], r[i]), xytext=(theta[i], 0), arrowprops={"arrowstyle": "-", "color": col[i], "alpha": 0.25, "lw": 0.6})
        ax.text(theta[i], r[i] + 0.04, t, fontsize=6, rotation=np.degrees(theta[i]) % 180 - 90 * (np.cos(theta[i]) < 0), ha="center", va="center")
    ax.set_ylim(0, 1.12)
    ax.set_yticks([0.45, 0.725, 1.0], ["solv 0", "0.5", "1"], fontsize=7)
    ax.set_title("Token circle: angle = ranked embedding similarity, radius = mean solvability", pad=30)
    legend(ax)
    fig.savefig(OUT / "01-token-circle.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def legend(ax, loc="lower left"):
    for b in BRANCHES:
        ax.scatter([], [], c=COLORS[b], label=b)
    ax.legend(loc=loc, fontsize=8, frameon=False, bbox_to_anchor=(-0.05, -0.05))


def plot_star_chart(problems):
    fig, ax = plt.subplots(figsize=(14, 14), subplot_kw={"projection": "polar"})
    for n in problems:
        r = n["level"] / 5 * (1.05 - n["solvability"])
        mag = 40 + 160 * len(n["market"])
        ax.scatter(n["theta"], r, s=mag, c=COLORS[n["branch"]], marker="*", edgecolor="k", lw=0.3, alpha=0.9)
        ax.text(n["theta"], r + 0.03, n["name"], fontsize=6.5, ha="center")
    ax.set_title("Star chart: angle = semantic position, radius = level x unsolvedness, star size = markets touched", pad=24)
    legend(ax)
    fig.savefig(OUT / "02-star-chart.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def plot_star_time(problems):
    fig, ax = plt.subplots(figsize=(14, 14), subplot_kw={"projection": "polar"})
    t0 = 1600
    for n in problems:
        r0 = max(n["posed"], t0) - t0
        ax.scatter(n["theta"], r0, s=30 + 20 * n["level"] ** 2, c=COLORS[n["branch"]], marker="*", alpha=0.9, edgecolor="k", lw=0.3)
        if n["resolved"]:
            r1 = n["resolved"] - t0
            ax.plot([n["theta"]] * 2, [r0, r1], color=COLORS[n["branch"]], lw=1.5)
            ax.scatter(n["theta"], r1, s=25, c="k", marker="o")
        ax.text(n["theta"], r0 + 8, n["name"], fontsize=6, ha="center")
    ax.set_rticks([0, 100, 200, 300, 400])
    ax.set_yticklabels(["1600", "1700", "1800", "1900", "2000"], fontsize=7)
    ax.set_title("Star chart through time: radius = year posed, line to dot = year resolved", pad=24)
    legend(ax)
    fig.savefig(OUT / "03-star-chart-time.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def plot_helix(nodes):
    fig = plt.figure(figsize=(14, 14))
    ax = fig.add_subplot(projection="3d")
    ps = [n for n in nodes if n["kind"] == "problem"]
    s = np.linspace(0, 5, 2000)
    ax.plot(np.cos(2 * np.pi * s), np.sin(2 * np.pi * s), s + 0.5, color="#ccc", lw=0.8)
    for n in ps:
        r = 0.4 + 0.8 * n["solvability"]
        z = n["level"] + n["theta"] / (2 * np.pi) - 0.5
        ax.scatter(r * np.cos(n["theta"]), r * np.sin(n["theta"]), z, s=30 + 60 * len(n["market"]), c=COLORS[n["branch"]], edgecolor="k", lw=0.3)
        ax.text(r * np.cos(n["theta"]), r * np.sin(n["theta"]), z + 0.08, n["name"], fontsize=5.5)
    ax.set_zlabel("problem level")
    ax.set_title("Solvability helix: angle = semantic rank, height = level, radius = solvability")
    ax.view_init(elev=18, azim=-60)
    legend(ax, "upper left")
    fig.savefig(OUT / "04-helix.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def plot_sphere(nodes, emb):
    _, p3 = ranked_angles(emb)
    xyz = p3 / np.linalg.norm(p3, axis=1, keepdims=True)
    fig = plt.figure(figsize=(13, 13))
    ax = fig.add_subplot(projection="3d")
    u, v = np.mgrid[0:2 * np.pi:40j, 0:np.pi:20j]
    ax.plot_wireframe(np.cos(u) * np.sin(v), np.sin(u) * np.sin(v), np.cos(v), color="#ddd", lw=0.3)
    for n, (x, y, z) in zip(nodes, xyz):
        ax.scatter(x, y, z, c=COLORS[n["branch"]], s=60 if n["kind"] == "problem" else 12, marker="*" if n["kind"] == "problem" else "o", alpha=0.35 + 0.65 * n["solvability"])
        if n["kind"] == "problem":
            ax.text(x, y, z, n["name"], fontsize=5.5)
    ax.set_title("Sphere map: top-3 principal directions projected onto the unit sphere, opacity = solvability")
    legend(ax, "upper left")
    fig.savefig(OUT / "05-sphere.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def network_stats(g, nodes):
    comms = community.greedy_modularity_communities(g, weight="weight")
    cid = {n: i for i, c in enumerate(comms) for n in c}
    deg = nx.degree_centrality(g)
    btw = nx.betweenness_centrality(g, weight=None)
    eig = nx.eigenvector_centrality(g, weight="weight", max_iter=5000)
    pr = nx.pagerank(g, weight="weight")
    byid = {n["id"]: n for n in nodes}
    per = {i: {"community": cid[i], "degree": deg[i], "betweenness": btw[i], "eigenvector": eig[i], "pagerank": pr[i]} for i in g}
    branch_attr = nx.attribute_assortativity_coefficient(g, "branch")
    solv = {i: byid[i]["solvability"] for i in g}
    nbr_solv = np.array([np.mean([solv[j] for j in g[i]]) for i in g])
    own = np.array([solv[i] for i in g])
    rng = np.random.default_rng(0)
    null = [np.corrcoef(own, rng.permutation(nbr_solv))[0, 1] for _ in range(2000)]
    obs = float(np.corrcoef(own, nbr_solv)[0, 1])
    probs = [n for n in nodes if n["kind"] == "problem"]
    lvl = np.array([n["level"] for n in probs])
    sv = np.array([n["solvability"] for n in probs])
    mk = np.array([len(n["market"]) for n in probs])
    top = sorted(((per[n["id"]]["betweenness"], n["name"]) for n in probs), reverse=True)[:10]
    summary = {
        "nodes": g.number_of_nodes(), "edges": g.number_of_edges(), "k": K,
        "components": nx.number_connected_components(g), "density": round(nx.density(g), 4), "avg_clustering": round(nx.average_clustering(g, weight="weight"), 4),
        "communities": len(comms), "modularity": round(community.modularity(g, comms, weight="weight"), 4),
        "branch_assortativity": round(branch_attr, 4),
        "solvability_neighbor_corr": round(obs, 4),
        "solvability_neighbor_corr_perm_p": round(float(np.mean(np.abs(null) >= abs(obs))), 4),
        "spearman_level_vs_solvability": round(spearman(lvl, sv), 4),
        "spearman_markets_vs_level": round(spearman(mk, lvl), 4),
        "top_bridges_betweenness": [[name, round(b, 4)] for b, name in top],
    }
    return {"summary": summary, "per_node": per, "communities": [sorted(c) for c in comms]}


def spearman(a, b):
    ra = np.argsort(np.argsort(a))
    rb = np.argsort(np.argsort(b))
    return float(np.corrcoef(ra, rb)[0, 1])


def plot_network(g, nodes):
    pos = nx.spring_layout(g, weight="weight", seed=7, k=0.35)
    byid = {n["id"]: n for n in nodes}
    btw = nx.betweenness_centrality(g)
    fig, ax = plt.subplots(figsize=(16, 14))
    nx.draw_networkx_edges(g, pos, alpha=0.15, ax=ax)
    nx.draw_networkx_nodes(g, pos, node_color=[COLORS[byid[i]["branch"]] for i in g], node_size=[40 + 3000 * btw[i] for i in g], ax=ax, alpha=0.9)
    nx.draw_networkx_labels(g, pos, {i: byid[i]["name"] for i in g if byid[i]["kind"] == "problem"}, font_size=6, ax=ax)
    ax.set_title(f"kNN similarity network, k={K}: node size = betweenness centrality")
    ax.axis("off")
    legend(ax)
    fig.savefig(OUT / "06-network.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def plot_matrices(nodes, sim, stats, problems, tokens, tok_sim):
    per = stats["per_node"]
    idx = [i for i, n in enumerate(nodes) if n["kind"] == "problem"]
    idx.sort(key=lambda i: (per[nodes[i]["id"]]["community"], nodes[i]["branch"]))
    labels = [nodes[i]["name"] for i in idx]
    fig, ax = plt.subplots(figsize=(18, 16))
    im = ax.imshow(sim[np.ix_(idx, idx)], cmap="viridis")
    ax.set_xticks(range(len(idx)), labels, rotation=90, fontsize=6)
    ax.set_yticks(range(len(idx)), labels, fontsize=6)
    ax.set_title("Problem x problem cosine similarity, ordered by network community")
    fig.colorbar(im, shrink=0.6)
    fig.savefig(OUT / "07-similarity-matrix.png", dpi=150, bbox_inches="tight")
    plt.close(fig)

    br = [b for b in BRANCHES if any(n["branch"] == b for n in nodes)]
    bi = {b: i for i, b in enumerate(br)}
    m = np.zeros((len(br), len(br)))
    c = np.zeros_like(m)
    for i, a in enumerate(nodes):
        for j, b in enumerate(nodes):
            if i != j:
                m[bi[a["branch"]], bi[b["branch"]]] += sim[i, j]
                c[bi[a["branch"]], bi[b["branch"]]] += 1
    markets = sorted({m_ for n in problems for m_ in n["market"]})
    lv = np.zeros((5, 4))
    mb = np.zeros((len(markets), len(br)))
    for n in problems:
        lv[n["level"] - 1, ["none", "statement", "partial", "proved"].index(n["lean"])] += 1
        for m_ in n["market"]:
            mb[markets.index(m_), bi[n["branch"]]] += 1
    fig, axs = plt.subplots(1, 3, figsize=(24, 8))
    heat(axs[0], m / np.maximum(c, 1), br, br, "Branch x branch mean similarity", "{:.2f}")
    heat(axs[1], lv, ["L1", "L2", "L3", "L4", "L5"], ["none", "statement", "partial", "proved"], "Level x Lean formal status, counts", "{:.0f}")
    heat(axs[2], mb, markets, br, "Market x branch, problem counts", "{:.0f}")
    fig.tight_layout()
    fig.savefig(OUT / "08-matrices.png", dpi=150, bbox_inches="tight")
    plt.close(fig)

    order = np.argsort(ranked_angles(unit(tok_sim))[0])
    fig, ax = plt.subplots(figsize=(20, 18))
    ax.imshow(tok_sim[np.ix_(order, order)], cmap="magma")
    ax.set_xticks(range(len(order)), [tokens[i] for i in order], rotation=90, fontsize=4)
    ax.set_yticks(range(len(order)), [tokens[i] for i in order], fontsize=4)
    ax.set_title("Token x token similarity, ordered by circle rank")
    fig.savefig(OUT / "09-token-matrix.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


def heat(ax, m, rows, cols, title, fmt):
    ax.imshow(m, cmap="Blues")
    ax.set_xticks(range(len(cols)), cols, rotation=45, ha="right", fontsize=8)
    ax.set_yticks(range(len(rows)), rows, fontsize=8)
    for i in range(m.shape[0]):
        for j in range(m.shape[1]):
            ax.text(j, i, fmt.format(m[i, j]), ha="center", va="center", fontsize=7)
    ax.set_title(title)


def export_graph(g, nodes, tokens, users, stats):
    per = stats["per_node"]
    out_nodes = []
    for n in nodes:
        out_nodes.append({k: n[k] for k in ("id", "name", "branch", "level", "lean", "posed", "resolved", "market", "keywords", "solvability", "kind", "theta", "embedding_text")} | per[n["id"]])
    for t in tokens:
        out_nodes.append({"id": "token:" + t, "name": t, "kind": "token"})
    edges = [{"source": a, "target": b, "type": "SIMILAR_TO", "weight": round(d["weight"], 4)} for a, b, d in g.edges(data=True)]
    for t in tokens:
        for n in users[t]:
            edges.append({"source": n["id"], "target": "token:" + t, "type": "MARKET" if t in n["market"] else "HAS_TOKEN"})
    counts = Counter(n["embedding_text"] for n in nodes)
    json.dump({"schema": "bucket.solvability-atlas/v1", "embedding_text": {"variant": TEXT, "counts": dict(counts)}, "nodes": out_nodes, "edges": edges, "summary": stats["summary"], "communities": stats["communities"]}, open(OUT / "graph.json", "w"), indent=1)
    json.dump(stats["summary"], open(OUT / "stats.json", "w"), indent=1)
    with open(OUT / "graph.cypher", "w") as f:
        for n in out_nodes:
            f.write(f"MERGE (n:AtlasNode {{id: {json.dumps(n['id'])}}}) SET n += {cypher_map(n)};\n")
        for e in edges:
            w = f" SET r.weight = {e['weight']}" if "weight" in e else ""
            f.write(f"MATCH (a:AtlasNode {{id: {json.dumps(e['source'])}}}), (b:AtlasNode {{id: {json.dumps(e['target'])}}}) MERGE (a)-[r:{e['type']}]->(b){w};\n")


def similarity_rows(nodes, sim):
    return {"schema": "bucket.solvability-atlas.similarity/v1", "ids": [n["id"] for n in nodes], "upper": [[round(float(sim[i, j]), 3) for j in range(i + 1, len(nodes))] for i in range(len(nodes))]}


def export_similarity(nodes, sim):
    json.dump(similarity_rows(nodes, sim), open(OUT / "similarity.json", "w"), separators=(",", ":"))


def cypher_map(n):
    parts = []
    for k, v in n.items():
        if v is None:
            continue
        parts.append(f"{k}: {json.dumps(v)}")
    return "{" + ", ".join(parts) + "}"


if __name__ == "__main__":
    if len(sys.argv) > 3 and sys.argv[2] == "--relabel":
        relabel_components(sys.argv[3])
    else:
        main()
