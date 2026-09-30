import json, numpy as np
from sentence_transformers import SentenceTransformer
rows = [json.loads(l) for l in open("problem_map.jsonl") if l.strip()]
rows = [r for r in rows if len(r["text"]) > 30]
m = SentenceTransformer("all-MiniLM-L6-v2")
E = m.encode([r["text"] for r in rows], normalize_embeddings=True, batch_size=64)
op = [i for i,r in enumerate(rows) if r["status"]=="open"]
so = np.array([i for i,r in enumerate(rows) if r["status"]=="solved"])
S = E[op] @ E[so].T
out = []
for k,i in enumerate(op):
    j = S[k].argsort()[::-1][:3]
    out.append({"open": rows[i]["id"], "text": rows[i]["text"][:300], "score": float(S[k][j[0]]),
      "nearest_solved": [{"id": rows[so[x]]["id"], "sim": round(float(S[k][x]),3), "lean_proof": rows[so[x]]["lean_proof"]} for x in j]})
out.sort(key=lambda o: -o["score"])
json.dump(out, open("candidates.json","w"), indent=1)
with open("CANDIDATES.md","w") as f:
    f.write("# Gap Candidates\n\nOpen problems ranked by cosine similarity to the nearest solved problem. Model all-MiniLM-L6-v2 on docstrings.\n\n| Rank | Sim | Open | Nearest solved |\n|---|---|---|---|\n")
    for n,o in enumerate(out[:50],1):
        f.write(f"| {n} | {o['score']:.3f} | `{o['open']}` | `{o['nearest_solved'][0]['id']}` |\n")
print(len(out), [round(o["score"],3) for o in out[:5]])
