import json
import os
import sys
from pathlib import Path

import numpy as np

import atlas
import embed_inputs
import forecast
import scoring

HERE = Path(__file__).parent
REPO = HERE.parent.parent
NEIGHBORS = REPO / "src" / "lib" / "research-os" / "solvability-neighbors-data.json"
CUTOFF = 2021
OUT = Path(os.environ.get("ABLATION_OUT", HERE / "out"))
FROZEN = HERE / "ablation" / "ablation-2021.json"
MODELS = (("BAAI/bge-small-en-v1.5", "5c38ec7c405ec4b44b94cc5a9bb96e735b38267a"),)


def base_data():
    return json.loads(NEIGHBORS.read_text())


def data_for(nodes, emb, committed, model, revision):
    rows = atlas.neighbour_rows(nodes, emb)
    words = {n["id"]: n["words"] for n in committed["nodes"]}
    out = []
    for n, r in zip(nodes, rows):
        out.append({"id": n["id"], "title": n["name"], "branch": n["branch"], "kind": n["kind"], "status": n["status"], "solved": n["solved"], "resolved": n["resolved"],
                    "posed": n.get("posed"), "words": words[n["id"]], **r})
    return {"model": model, "revision": revision, "k": atlas.NEIGHBOURS, "ids": [n["id"] for n in nodes], "nodes": out}


def run(permutations=scoring.PERMUTATIONS):
    from sentence_transformers import SentenceTransformer

    committed = base_data()
    status = {n["id"]: {"status": n["status"], "solved": n["solved"], "resolved": n["resolved"]} for n in committed["nodes"]}
    results = []
    for model_name, revision in MODELS:
        model = SentenceTransformer(model_name, revision=revision)
        for variant in embed_inputs.VARIANTS:
            nodes = atlas.full_nodes(atlas.load_problems(), atlas.load_bucketmath())
            if [n["id"] for n in nodes] != committed["ids"]:
                raise SystemExit("node order differs from the committed neighbour data")
            texts = [embed_inputs.text_for(n, variant) for n in nodes]
            atlas.MODEL, atlas.MODEL_REVISION = model_name, revision
            emb, fresh = atlas.cached_encode(model, texts)
            f = forecast.forecast(data_for(nodes, emb, committed, model_name, revision), CUTOFF, built="2026-10-08")
            scored = scoring.score_forecast(f, status, permutations)
            results.append({"model": model_name, "variant": variant, "words_mean": round(float(np.mean([len(t.split()) for t in texts])), 1), "fresh_embeddings": fresh, "threshold": f["threshold"], "score": scored})
            print(variant, scored["auc"], scored["undatedRemoved"]["auc"], file=sys.stderr, flush=True)
    return results


def pick(results):
    return max((r for r in results if r["variant"] != "current"), key=lambda r: (r["score"]["auc"] or 0, r["score"]["undatedRemoved"]["auc"] or 0))


def table(results):
    lines = ["| model | input | mean words | threshold | AUC | AUC, undated solved removed | inside / outside | settled inside | settled outside | p |", "|---|---|---|---|---|---|---|---|---|---|"]
    for r in results:
        s, a = r["score"], r["score"]["all"]
        lines.append(f"| {r['model'].split('/')[-1]} | `{r['variant']}` | {r['words_mean']} | {r['threshold']:.3f} | {s['auc']} | {s['undatedRemoved']['auc']} | {a['inside']} / {a['outside']} | {a['resolvedInside']} ({a['rateInside']}) | {a['resolvedOutside']} ({a['rateOutside']}) | {a['pValue']} |")
    return "\n".join(lines) + "\n"


def main():
    results = run()
    best = pick(results)
    payload = {"cutoff": CUTOFF, "coding": "settled", "permutations": scoring.PERMUTATIONS, "seed": scoring.SEED, "chosen": best["variant"], "results": results}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "ablation-2021.json").write_text(json.dumps(payload, indent=1) + "\n")
    FROZEN.write_text(json.dumps(payload, indent=1) + "\n")
    (OUT / "ablation-2021.md").write_text(table(results))
    print(table(results))
    print("chosen:", best["variant"])


if __name__ == "__main__":
    main()
