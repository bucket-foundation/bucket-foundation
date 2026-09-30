import json, sys, numpy as np
from sentence_transformers import SentenceTransformer

MODEL = "all-MiniLM-L6-v2"
rows_all = [json.loads(l) for l in open("problem_map.jsonl") if l.strip()]
rows = [r for r in rows_all if len(r["text"]) > 30]
print(f"dropped {len(rows_all) - len(rows)} rows with docstrings of 30 characters or fewer", file=sys.stderr)
E = SentenceTransformer(MODEL).encode([r["text"] for r in rows], normalize_embeddings=True, batch_size=64)
fileof = lambda r: r["id"].split("::")[0]
op = [i for i, r in enumerate(rows) if r["status"] == "open"]
so = np.array([i for i, r in enumerate(rows) if r["status"] == "solved"])
S = E[op] @ E[so].T
out = []
for k, i in enumerate(op):
    same = np.array([fileof(rows[j]) == fileof(rows[i]) for j in so])
    cross = np.where(same, -1.0, S[k])
    j = cross.argsort()[::-1][:3]
    js = S[k].argmax()
    out.append({"open": rows[i]["id"], "text": rows[i]["text"], "score": float(cross[j[0]]),
        "same_file_best": {"id": rows[so[js]]["id"], "sim": round(float(S[k][js]), 3)} if same[js] else None,
        "nearest_solved": [{"id": rows[so[x]]["id"], "sim": round(float(S[k][x]), 3), "lean_proof": rows[so[x]]["lean_proof"]} for x in j]})
out.sort(key=lambda o: -o["score"])
json.dump(out, open("candidates.json", "w"), indent=1)
sc = np.array([o["score"] for o in out])
rng = np.random.default_rng(0)
base = np.array([float(E[i] @ E[rng.choice(so)]) for i in op])
stats = {"open_ranked": len(out), "at_0_9": int((sc >= 0.9).sum()), "at_0_8": int((sc >= 0.8).sum()), "median": round(float(np.median(sc)), 3),
         "same_file_best": sum(o["same_file_best"] is not None for o in out), "random_pair_median": round(float(np.median(base)), 3)}
json.dump(stats, open("stats.json", "w"), indent=1)
with open("CANDIDATES.md", "w") as f:
    f.write(f"# Gap Candidates\n\nOpen problems ranked by cosine similarity to the nearest solved problem in a different file, so variants of one problem never pair. Model {MODEL} on docstrings. {stats['same_file_best']} of {stats['open_ranked']} open problems have their closest solved match in their own file; those matches are excluded. A random open and solved pair has median similarity {stats['random_pair_median']}, against {stats['median']} for the nearest cross-file match.\n\n| Rank | Sim | Open | Nearest solved |\n|---|---|---|---|\n")
    for n, o in enumerate(out[:50], 1):
        f.write(f"| {n} | {o['score']:.3f} | `{o['open']}` | `{o['nearest_solved'][0]['id']}` |\n")
print(json.dumps(stats))
