import argparse
import json
import sys
from collections import Counter
from datetime import date
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent

import atlas
import record_schema

OUTPUT = HERE.parent.parent / "src" / "lib" / "research-os" / "solvability-records-data.json"
SCHEMA = "bucket.solvability-atlas.records/v1"
NEAREST = 6
AXES = 3
REACH_QUANTILE = 0.1
CORE_RADIUS = 0.6
FRONTIER_RADIUS = 1.0
OUTER_RADIUS = 1.5
MIN_BRANCH_SOLVED = 10
DIRECTION_TOKENS = 8
ZONES = ("solved", "reachable", "beyond", "unsampled")
CODINGS = {"solved": "settled", "partial": "advanced", "open": "open"}
HAND_KEYS = ("aliases", "level", "history", "formal", "quality", "related")
HAND_WORKS = 4
HAND_PEOPLE = 3


def span(value, lo, hi):
    return 0.0 if hi == lo else min(1.0, max(0.0, (value - lo) / (hi - lo)))


def quantile(sorted_values, q):
    return sorted_values[min(len(sorted_values) - 1, max(0, int(q * len(sorted_values))))]


def hand_fields(pid):
    path = HERE / "records" / f"{pid}.json"
    if not path.exists():
        return None, ""
    rec = json.load(open(path))
    out = {k: rec[k] for k in HAND_KEYS}
    out["statement_source"] = rec["statement"]["source"]
    out["key_works"] = [{"title": w["title"], "year": w["year"], "cited_by_count": w["cited_by_count"], "role": w["role"], "doi": w["doi"]} for w in rec["key_works"][:HAND_WORKS]]
    out["people"] = [{"name": p["name"], "works": p["works"]} for p in rec["people"][:HAND_PEOPLE]]
    out["organizations"] = [{"name": o["name"], "works": o["works"]} for o in rec["organizations"][:HAND_PEOPLE]]
    out["activity_total"] = rec["activity"]["openalex_total"]
    out["quality_status"] = rec["quality"]["status"]
    return out, rec["statement"]["text"]


def zones_and_radii(nodes, reach, solved_mask):
    ids = [n["id"] for n in nodes]
    solved_reach = sorted(float(reach[i]) for i in range(len(nodes)) if solved_mask[i])
    tau = quantile(solved_reach, REACH_QUANTILE)
    per_branch = Counter(n["branch"] for n, s in zip(nodes, solved_mask) if s)
    floor = min([tau] + [float(r) for r in reach])
    out = []
    for i, n in enumerate(nodes):
        r = float(reach[i])
        if solved_mask[i]:
            zone, radius = "solved", CORE_RADIUS * (1 - span(r, solved_reach[0], 1))
        elif per_branch[n["branch"]] < MIN_BRANCH_SOLVED:
            zone, radius = "unsampled", FRONTIER_RADIUS + (OUTER_RADIUS - FRONTIER_RADIUS) * (1 - span(r, floor, 1))
        elif r >= tau:
            zone, radius = "reachable", CORE_RADIUS + (FRONTIER_RADIUS - CORE_RADIUS) * (1 - span(r, tau, 1))
        else:
            zone, radius = "beyond", FRONTIER_RADIUS + (OUTER_RADIUS - FRONTIER_RADIUS) * (1 - span(r, floor, tau))
        out.append((zone, round(radius, 3)))
    return tau, out


def nearest(sim, mask, k):
    cand = np.flatnonzero(mask)
    if not len(cand):
        return []
    top = cand[np.argsort(-sim[cand])[:k]]
    return [(int(j), round(float(sim[j]), 3)) for j in top]


def compute(nodes, emb, tokens, tok_emb):
    n = len(nodes)
    solved_mask = np.array([bool(x["solved"]) for x in nodes])
    c = emb - emb.mean(0)
    _, sv, vt = np.linalg.svd(c, full_matrices=False)
    axes = vt[:AXES]
    loadings = c @ axes.T
    explained = (sv[:AXES] ** 2 / (sv ** 2).sum()).tolist()
    tok = (tok_emb - emb.mean(0)) @ axes.T
    directions = []
    for k in range(AXES):
        order = np.argsort(tok[:, k])
        directions.append({"component": k + 1, "explained": round(explained[k], 4), "positive": [tokens[i] for i in order[::-1][:DIRECTION_TOKENS]], "negative": [tokens[i] for i in order[:DIRECTION_TOKENS]]})
    theta, _ = atlas.ranked_angles(emb)
    reach = np.zeros(n)
    near_solved, near_open = [], []
    for start in range(0, n, 512):
        block = emb[start : start + 512] @ emb.T
        for r in range(block.shape[0]):
            i = start + r
            s = block[r].copy()
            s[i] = -2
            reach[i] = s[solved_mask].max() if solved_mask.any() else 0.0
            near_solved.append(nearest(s, solved_mask, NEAREST))
            near_open.append(nearest(s, ~solved_mask, NEAREST))
    tau, zr = zones_and_radii(nodes, np.round(reach, 3), solved_mask)
    return {"tau": round(float(tau), 3), "directions": directions, "loadings": loadings, "theta": theta, "reach": reach, "zones": zr, "near_solved": near_solved, "near_open": near_open}


def row_of(node, computed, i):
    zone, radius = computed["zones"][i]
    hand, record_statement = hand_fields(node["id"])
    out = {
        "id": node["id"],
        "title": node["name"],
        "branch": node["branch"],
        "form": node.get("form", "problem"),
        "variant_of": node.get("variant_of"),
        "status": node["status"],
        "coding": CODINGS[node["status"]],
        "posed": node.get("posed"),
        "resolved": node.get("resolved"),
        "posed_evidence": node.get("posed_evidence", ""),
        "statement": node.get("statement") or record_statement,
        "source": node.get("source", "tools/solvability-atlas/problems.tsv"),
        "licence": node.get("licence", "MIT"),
        "statement_source": node.get("statement_source", ""),
        "status_source": node.get("status_source", ""),
        "keywords": list(node.get("keywords", [])),
        "market": list(node.get("market", [])),
        "zone": zone,
        "reach": round(float(computed["reach"][i]), 3),
        "radius": radius,
        "theta": round(float(computed["theta"][i]), 4),
        "pc": [round(float(x), 3) for x in computed["loadings"][i]],
        "near_solved": [[j, s] for j, s in computed["near_solved"][i]],
        "near_open": [[j, s] for j, s in computed["near_open"][i]],
    }
    if hand is not None:
        out["hand"] = hand
    return out


def build(model=None):
    from sentence_transformers import SentenceTransformer

    problems = atlas.load_problems()
    lean = atlas.load_bucketmath()
    nodes = [n for n in atlas.full_nodes(problems, lean) if n["kind"] != "lean"]
    texts = []
    for node in nodes:
        text, node["embedding_text"] = atlas.full_text(node)
        texts.append(text)
    model = model or SentenceTransformer(atlas.MODEL, revision=atlas.MODEL_REVISION)
    emb, _ = atlas.cached_encode(model, texts)
    tokens = sorted({k.lower() for n in nodes for k in n["keywords"]} | {m for n in nodes for m in n["market"]})
    tok_emb, _ = atlas.cached_encode(model, tokens)
    computed = compute(nodes, emb, tokens, tok_emb)
    rows = [row_of(node, computed, i) for i, node in enumerate(nodes)]
    return {
        "schema": SCHEMA,
        "built": date.today().isoformat(),
        "model": atlas.MODEL,
        "revision": atlas.MODEL_REVISION,
        "threshold": computed["tau"],
        "neighbours": NEAREST,
        "axes": computed["directions"],
        "rows": rows,
    }


STATEMENT_CAP = 200
PACKED_SCHEMA = "bucket.solvability-atlas.records-packed/v1"


def intern(table, index, value):
    if value not in index:
        index[value] = len(table)
        table.append(value)
    return index[value]


def pack(data):
    at = {r["id"]: i for i, r in enumerate(data["rows"])}
    tables = {"branch": [], "form": [], "status": [], "zone": [], "source": [], "text": []}
    index = {k: {} for k in tables}
    rows = []
    for r in data["rows"]:
        statement = r["statement"]
        cut = len(statement) > STATEMENT_CAP
        if cut:
            statement = statement[:STATEMENT_CAP].rsplit(" ", 1)[0] + "\u2026"
        out = {
            "id": r["id"],
            "t": r["title"],
            "b": intern(tables["branch"], index["branch"], r["branch"]),
            "f": intern(tables["form"], index["form"], r["form"]),
            "v": at[r["variant_of"]] if r["variant_of"] in at else -1,
            "s": intern(tables["status"], index["status"], r["status"]),
            "p": r["posed"],
            "r": r["resolved"],
            "pe": intern(tables["text"], index["text"], r["posed_evidence"]) if r["posed_evidence"] else -1,
            "st": statement,
            "so": intern(tables["source"], index["source"], json.dumps([r["source"], r["licence"]], ensure_ascii=False)),
            "ss": intern(tables["text"], index["text"], r["statement_source"]) if r["statement_source"] and r["statement_source"] != r["source"] else -1,
            "ts": intern(tables["text"], index["text"], r["status_source"]) if r["status_source"] else -1,
            "k": r["keywords"],
            "m": r["market"],
            "z": intern(tables["zone"], index["zone"], r["zone"]),
            "re": r["reach"],
            "ra": r["radius"],
            "th": r["theta"],
            "pc": r["pc"],
            "ns": [j * 1024 + round(v * 1000) for j, v in r["near_solved"]],
            "no": [j * 1024 + round(v * 1000) for j, v in r["near_open"]],
        }
        if cut:
            out["cut"] = 1
        if "hand" in r:
            out["h"] = r["hand"]
        rows.append(out)
    tables["source"] = [json.loads(x) for x in tables["source"]]
    return {"schema": PACKED_SCHEMA, **{k: data[k] for k in ("built", "model", "revision", "threshold", "neighbours", "axes")}, "tables": tables, "rows": rows}


def unpack(packed):
    t = packed["tables"]
    rows = []
    for r in packed["rows"]:
        source, licence = t["source"][r["so"]]
        rows.append(
            {
                "id": r["id"], "title": r["t"], "branch": t["branch"][r["b"]], "form": t["form"][r["f"]],
                "variant_of": packed["rows"][r["v"]]["id"] if r["v"] >= 0 else None, "status": t["status"][r["s"]],
                "coding": CODINGS[t["status"][r["s"]]], "posed": r["p"], "resolved": r["r"],
                "posed_evidence": t["text"][r["pe"]] if r["pe"] >= 0 else "", "statement": r["st"], "source": source,
                "licence": licence, "statement_source": t["text"][r["ss"]] if r["ss"] >= 0 else source,
                "status_source": t["text"][r["ts"]] if r["ts"] >= 0 else "", "keywords": r["k"], "market": r["m"],
                "zone": t["zone"][r["z"]], "reach": r["re"], "radius": r["ra"], "theta": r["th"], "pc": r["pc"],
                "near_solved": [[x // 1024, (x % 1024) / 1000] for x in r["ns"]], "near_open": [[x // 1024, (x % 1024) / 1000] for x in r["no"]],
                **({"hand": r["h"]} if "h" in r else {}),
            }
        )
    return {"schema": SCHEMA, **{k: packed[k] for k in ("built", "model", "revision", "threshold", "neighbours", "axes")}, "rows": rows}


def validate(data):
    errors = record_schema.row_errors(data)
    if errors:
        raise ValueError("; ".join(errors[:10]))
    return data


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(OUTPUT))
    args = parser.parse_args(argv)
    data = validate(build())
    data = pack(data)
    Path(args.out).write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf8")
    print(f"wrote {len(data['rows'])} packed records to {args.out}, {Path(args.out).stat().st_size / 1e6:.2f} MB, threshold {data['threshold']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
