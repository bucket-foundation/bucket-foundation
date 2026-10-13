import argparse
import json
import os
import resource
import sys
import time
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
DEFAULT_MODEL = "BAAI/bge-small-en-v1.5"
MODELS = (
    {"name": DEFAULT_MODEL, "revision": "5c38ec7c405ec4b44b94cc5a9bb96e735b38267a", "label": "bge-small-en-v1.5"},
    {
        "name": "google/embeddinggemma-2", "revision": "914f7f89142e33e77833254d9c9b90c3cef7303b", "label": "embeddinggemma-2", "prompt_name": "Clustering",
        "config_kwargs": {"vision_config": None, "audio_config": None}, "dtype": "float32", "dims": (768, 256), "batch_size": 16, "optional": True,
    },
)
BENCH_ROWS = 500


def spec_of(label):
    for spec in MODELS:
        if spec["label"] == label:
            return spec
    raise SystemExit(f"unknown model {label}; known: {', '.join(s['label'] for s in MODELS)}")


def base_data():
    return json.loads(NEIGHBORS.read_text())


def data_for(nodes, emb, committed, model, revision):
    rows = atlas.neighbour_rows(nodes, emb)
    words = {n["id"]: n["words"] for n in committed["nodes"]}
    theta = {n["id"]: n["theta"] for n in committed["nodes"]}
    out = []
    for n, r in zip(nodes, rows):
        out.append({"id": n["id"], "title": n["name"], "branch": n["branch"], "kind": n["kind"], "variant_of": n.get("variant_of"), "status": n["status"], "solved": n["solved"], "resolved": n["resolved"],
                    "posed": n.get("posed"), "words": words[n["id"]], "theta": theta[n["id"]], "source": n.get("source", "tools/solvability-atlas/problems.tsv"), **r})
    return {"model": model, "revision": revision, "k": atlas.NEIGHBOURS, "ids": [n["id"] for n in nodes], "nodes": out}


class Prompted:
    def __init__(self, model, prompt_name):
        self.model, self.prompt_name = model, prompt_name

    def encode(self, texts, **kwargs):
        return self.model.encode(texts, prompt_name=self.prompt_name, **kwargs)


def load(spec):
    import torch
    from sentence_transformers import SentenceTransformer

    kwargs = {"revision": spec["revision"], "local_files_only": True, "device": "cpu"}
    if spec.get("config_kwargs"):
        kwargs["config_kwargs"] = spec["config_kwargs"]
    if spec.get("dtype"):
        kwargs["model_kwargs"] = {"torch_dtype": getattr(torch, spec["dtype"])}
    model = SentenceTransformer(spec["name"], **kwargs)
    return Prompted(model, spec["prompt_name"]) if spec.get("prompt_name") else model


def cache_of(spec):
    return atlas.CACHE if spec["name"] == DEFAULT_MODEL else atlas.CACHE / spec["label"]


def encode(spec, model, texts):
    atlas.MODEL, atlas.MODEL_REVISION = spec["name"] + ("#" + spec["prompt_name"] if spec.get("prompt_name") else ""), spec["revision"]
    try:
        return atlas.cached_encode(model, texts, cache=cache_of(spec), batch_size=spec.get("batch_size", 64))
    finally:
        atlas.MODEL, atlas.MODEL_REVISION = MODELS[0]["name"], MODELS[0]["revision"]


def truncated(emb, dim):
    if dim is None or dim == emb.shape[1]:
        return emb
    return atlas.unit(emb[:, :dim])


def label_at(spec, dim):
    return spec["label"] if dim is None or dim == max(spec.get("dims", (dim,))) else f"{spec['label']}@{dim}"


def full_nodes(committed):
    nodes = atlas.full_nodes(atlas.load_problems(), atlas.load_bucketmath())
    if [n["id"] for n in nodes] != committed["ids"]:
        raise SystemExit("node order differs from the committed neighbour data")
    return nodes


def run(permutations=scoring.PERMUTATIONS, labels=None):
    committed = base_data()
    status = {n["id"]: {"status": n["status"], "solved": n["solved"], "resolved": n["resolved"]} for n in committed["nodes"]}
    results = []
    for spec in MODELS:
        if labels is not None and spec["label"] not in labels:
            continue
        try:
            model = load(spec)
        except OSError:
            if spec.get("optional"):
                print(f"{spec['label']} is not in the local Hugging Face cache; skipped", file=sys.stderr)
                continue
            raise
        for variant in embed_inputs.VARIANTS:
            nodes = full_nodes(committed)
            texts = [embed_inputs.text_for(n, variant) for n in nodes]
            t0 = time.time()
            emb, fresh = encode(spec, model, texts)
            seconds = round(time.time() - t0, 1)
            for dim in spec.get("dims", (None,)):
                f = forecast.forecast(data_for(nodes, truncated(emb, dim), committed, spec["name"], spec["revision"]), CUTOFF, built="2026-10-08")
                scored = scoring.score_forecast(f, status, permutations)
                results.append({"model": spec["name"] if spec["name"] == DEFAULT_MODEL else label_at(spec, dim), "variant": variant, "words_mean": round(float(np.mean([len(t.split()) for t in texts])), 1), "fresh_embeddings": fresh, "threshold": f["threshold"], "score": scored})
                print(results[-1]["model"], variant, scored["auc"], scored["undatedRemoved"]["auc"], fresh, seconds, file=sys.stderr, flush=True)
    return results


def pick(results):
    return max((r for r in results if r["variant"] != "current" and r["model"] == DEFAULT_MODEL), key=lambda r: (r["score"]["auc"] or 0, r["score"]["undatedRemoved"]["auc"] or 0))


def table(results):
    lines = ["| model | input | mean words | threshold | AUC | AUC, undated solved removed | inside / outside | settled inside | settled outside | p |", "|---|---|---|---|---|---|---|---|---|---|"]
    for r in results:
        s, a = r["score"], r["score"]["all"]
        lines.append(f"| {r['model'].split('/')[-1]} | `{r['variant']}` | {r['words_mean']} | {r['threshold']:.3f} | {s['auc']} | {s['undatedRemoved']['auc']} | {a['inside']} / {a['outside']} | {a['resolvedInside']} ({a['rateInside']}) | {a['resolvedOutside']} ({a['rateOutside']}) | {a['pValue']} |")
    return "\n".join(lines) + "\n"


def cgroup_peak():
    try:
        group = Path("/proc/self/cgroup").read_text().strip().split("::", 1)[1]
        return int((Path("/sys/fs/cgroup") / group.lstrip("/") / "memory.peak").read_text())
    except (OSError, IndexError, ValueError):
        return None


def bench(label, rows=BENCH_ROWS):
    import torch

    spec = spec_of(label)
    committed = base_data()
    nodes = [n for n in full_nodes(committed) if n.get("statement")][:rows]
    texts = [embed_inputs.text_for(n, "current") for n in nodes]
    t0 = time.time()
    model = load(spec)
    loaded = time.time() - t0
    model.encode(texts[:8], normalize_embeddings=True, batch_size=8)
    t0 = time.time()
    emb = model.encode(texts, normalize_embeddings=True, batch_size=spec.get("batch_size", 64))
    seconds = time.time() - t0
    words = sum(len(t.split()) for t in texts)
    peak = cgroup_peak()
    inner = getattr(model, "model", model)
    parameters = sum(p.numel() for p in inner.parameters())
    return {
        "model": spec["name"], "revision": spec["revision"], "label": label, "device": "cpu", "threads": torch.get_num_threads(), "dtype": spec.get("dtype", "float32"),
        "parameters": int(parameters), "rows": len(texts), "mean_words": round(words / len(texts), 1), "batch_size": spec.get("batch_size", 64), "load_seconds": round(loaded, 1), "encode_seconds": round(seconds, 2),
        "rows_per_second": round(len(texts) / seconds, 1), "words_per_second": round(words / seconds), "dimensions": int(np.asarray(emb).shape[1]), "finite": bool(np.isfinite(np.asarray(emb)).all()),
        "peak_rss_mib": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024), "cgroup_peak_mib": None if peak is None else round(peak / 2 ** 20),
    }


def main(argv=()):
    parser = argparse.ArgumentParser()
    parser.add_argument("--bench")
    parser.add_argument("--models", nargs="*")
    parser.add_argument("--no-freeze", action="store_true")
    args = parser.parse_args(list(argv))
    if args.bench:
        print(json.dumps(bench(args.bench)))
        return
    results = run(labels=args.models)
    best = pick(results) if any(r["model"] == DEFAULT_MODEL for r in results) else None
    payload = {"cutoff": CUTOFF, "coding": "settled", "permutations": scoring.PERMUTATIONS, "seed": scoring.SEED, "chosen": best["variant"] if best else None, "results": results}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "ablation-2021.json").write_text(json.dumps(payload, indent=1) + "\n")
    if not args.no_freeze and args.models is None:
        FROZEN.write_text(json.dumps(payload, indent=1) + "\n")
    (OUT / "ablation-2021.md").write_text(table(results))
    print(table(results))
    print("chosen:", best["variant"] if best else None)


if __name__ == "__main__":
    main(sys.argv[1:])
