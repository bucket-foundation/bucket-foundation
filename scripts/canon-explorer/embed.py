import argparse
import datetime
import hashlib
import inspect
import json
import pathlib

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
MODEL_ID = "BAAI/bge-small-en-v1.5"
MODEL_REVISION = "5c38ec7c405ec4b44b94cc5a9bb96e735b38267a"
RANK_VERSION = "nn-chain-pc1/v2"
SCHEMA = "bucket.canon-embeddings/v1"
OUT_JSON = ROOT / "src/data/canon-embeddings.json"
OUT_BIN = ROOT / "src/data/canon-embeddings.bin"
SOURCES = ["src/data/canon-timeline.json", "src/data/canon-sites.json", "canon-figures/figures.json"]


def branch_slug(b):
    return b.split("-", 1)[1] if b[:2].isdigit() else b


def load_items():
    items = []
    timeline = json.loads((ROOT / SOURCES[0]).read_text())
    for e in timeline["events"]:
        items.append({
            "id": e["id"], "kind": "event", "title": e["title"], "branch": e["branch"], "year": e["year"],
            "text": f"{e['title']}. {e['kind'].replace('-', ' ')} in {e['branch'].replace('-', ' ')}, year {e['year']}.",
        })
    event_ids = {i["id"] for i in items}
    sites = json.loads((ROOT / SOURCES[1]).read_text())
    for s in sites["sites"]:
        items.append({
            "id": f"site:{s['id']}" if s["id"] in event_ids else s["id"], "kind": "site", "title": s["title"], "branch": s["branch"], "year": s["year"],
            "text": f"{s['title']}. Archaeological site, {s.get('civilization') or ''}, year {s['year']}.",
        })
    figures = json.loads((ROOT / SOURCES[2]).read_text())
    for f in figures["figures"]:
        works = "; ".join(w.get("title", "") for w in f.get("primary_works", []))
        items.append({
            "id": f"figure:{f['id']}", "kind": "figure", "title": f["name"],
            "branch": branch_slug(f["branches"][0]) if f.get("branches") else "",
            "year": None,
            "text": f"{f['name']}. {f.get('tradition', '')}, {f.get('era', '')}, {f.get('region', '')}. "
                    f"Works: {works}. Tags: {', '.join(f.get('tags', []))}.",
        })
    ids = [i["id"] for i in items]
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate ids in canon inputs")
    return items


def rank_order(vecs):
    n = len(vecs)
    centered = vecs - vecs.mean(axis=0)
    _, _, vt = np.linalg.svd(centered, full_matrices=False)
    pc1 = centered @ vt[0]
    if pc1[np.argmax(np.abs(pc1))] < 0:
        pc1 = -pc1
    sim = vecs @ vecs.T
    start = int(np.argmin(pc1))
    order = [start]
    seen = np.zeros(n, dtype=bool)
    seen[start] = True
    for _ in range(n - 1):
        row = np.where(seen, -np.inf, sim[order[-1]])
        nxt = int(np.argmax(row))
        order.append(nxt)
        seen[nxt] = True
    return order


def rank_source_sha():
    src = "".join(inspect.getsource(f) for f in (rank_order, load_vectors))
    return hashlib.sha256(src.encode()).hexdigest()


def load_vectors(manifest):
    blob = (OUT_BIN.parent / manifest["bin"]).read_bytes()
    return np.frombuffer(blob, dtype="<f4").reshape(manifest["n"], manifest["dim"])


def input_sha(items):
    return hashlib.sha256("\n".join(f"{i['id']}\t{i['text']}" for i in items).encode()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    items = load_items()
    digest = input_sha(items)
    prev = json.loads(OUT_JSON.read_text()) if OUT_JSON.exists() else None
    if args.check:
        if not prev or prev["inputSha256"] != digest or prev["n"] != len(items):
            raise SystemExit("canon-embeddings is stale: run python3 scripts/canon-explorer/embed.py")
        if prev.get("rankSourceSha256") != rank_source_sha() and prev.get("rank_version") == RANK_VERSION:
            raise SystemExit("rank_order changed: bump RANK_VERSION and regenerate")
        if prev.get("rank_version") != RANK_VERSION or prev.get("rankSourceSha256") != rank_source_sha():
            raise SystemExit("rank_version is stale: regenerate")
        print(f"canon-embeddings up to date, n={prev['n']}")
        return

    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(MODEL_ID, revision=MODEL_REVISION, device="cpu")
    vecs = np.asarray(model.encode([i["text"] for i in items], normalize_embeddings=True, batch_size=64), dtype=np.float32)
    order = rank_order(vecs.astype(np.float64))
    n = len(items)
    rank = [0] * n
    for r, idx in enumerate(order):
        rank[idx] = r
    blob = vecs.astype("<f4").tobytes()
    same = prev and prev.get("inputSha256") == digest and prev.get("revision") == MODEL_REVISION
    generated_at = prev["generatedAt"] if same else datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    manifest = {
        "schema": SCHEMA,
        "model": MODEL_ID,
        "revision": MODEL_REVISION,
        "dim": int(vecs.shape[1]),
        "n": n,
        "dtype": "float32-le",
        "normalized": True,
        "rank_version": RANK_VERSION,
        "rankSourceSha256": rank_source_sha(),
        "generatedAt": generated_at,
        "inputSha256": digest,
        "bin": "canon-embeddings.bin",
        "sources": SOURCES,
        "items": [
            {"id": it["id"], "kind": it["kind"], "title": it["title"], "branch": it["branch"], "year": it["year"],
             "rank": rank[i], "theta": round(2 * np.pi * rank[i] / n, 6)}
            for i, it in enumerate(items)
        ],
    }
    OUT_JSON.write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n")
    OUT_BIN.write_bytes(blob)
    print(f"wrote {n} items, dim {vecs.shape[1]}")


if __name__ == "__main__":
    main()
