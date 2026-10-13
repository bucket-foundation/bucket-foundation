import argparse
import json
import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from kindred import crossref, corpus, openalex, rank, report
from kindred.claims import load_claims, verify_quotes
from kindred.embed import Encoder
from kindred.mapsvg import kindred_svg

HERE = Path(__file__).resolve().parent
DEFAULT_INTAKE = Path.home() / "agfarms" / "bucket-foundation"


def gather(claims, client, origin, notes):
    works = {}
    try:
        for c in claims:
            for q in c["queries"]:
                for w in client.search(q):
                    if w["abstract"] and w["id"] not in works:
                        works[w["id"]] = dict(w, origin=origin)
    except (RuntimeError, OSError) as err:
        notes.append(f"{origin} stopped early: {err}.")
    return list(works.values())


def source_rows(works, passages):
    rows = []
    for w in works:
        rows.append({"authors": w["authors"], "year": w["year"], "title": w["title"], "url": w["url"], "text": f"{w['title']}. {w['abstract']}", "quote_text": w["abstract"], "origin": w["origin"], "key": re.sub(r"[^a-z0-9]+", " ", w["title"].lower()).strip()})
    for p in passages:
        rows.append({"authors": p["author"], "year": p["year"], "title": p["title"], "url": p["url"], "text": p["text"], "quote_text": p["text"], "origin": "Wright corpus", "key": p["title"]})
    return rows


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--intake", type=Path, default=DEFAULT_INTAKE)
    ap.add_argument("--out", type=Path, default=HERE / "out")
    ap.add_argument("--cache", type=Path, default=HERE / "cache")
    ap.add_argument("--skip-openalex", default="")
    ap.add_argument("--budget", type=int, default=openalex.MAX_REQUESTS)
    args = ap.parse_args(argv)

    claims, source = load_claims(HERE / "claims.json")
    thesis = args.intake / source
    if thesis.exists():
        bad = verify_quotes(claims, thesis.read_text(encoding="utf-8"))
        if bad:
            raise SystemExit(f"quotes not found verbatim: {bad}")
    client = openalex.Client(args.cache / "openalex", budget=args.budget)
    notes = []
    crossref_client = crossref.Client(args.cache / "crossref")
    if args.skip_openalex:
        notes.append(f"OpenAlex was not queried: {args.skip_openalex}.")
        works = []
    else:
        works = gather(claims, client, "OpenAlex", notes)
    works += gather(claims, crossref_client, "Crossref", notes)
    passages = corpus.load_wright(args.intake)
    rows = source_rows(works, passages)
    enc = Encoder(args.cache / "embeddings")
    cvecs = enc([c["claim"] for c in claims])
    svecs = enc([r["text"] for r in rows])

    sims = rank.unit(cvecs) @ rank.unit(svecs).T
    is_corpus = np.array([r["origin"] == "Wright corpus" for r in rows])

    def top_hits(i, mask, k=5):
        picked = {}
        for j in np.argsort(-sims[i], kind="stable"):
            if not mask[j] or rows[j]["key"] in picked:
                continue
            picked[rows[j]["key"]] = int(j)
            if len(picked) >= k:
                break
        out = []
        for j in picked.values():
            quote, qsim = rank.best_span(cvecs[i], rows[j]["quote_text"], enc)
            out.append({"source": rows[j], "sim": float(sims[i, j]), "quote": quote, "quote_sim": qsim, "index": j})
        return sorted(out, key=lambda h: -h["sim"])

    results = []
    for i, c in enumerate(claims):
        lit, cor = top_hits(i, ~is_corpus), top_hits(i, is_corpus)
        results.append({"claim": c, "lit": lit, "corpus": cor, "best_lit": lit[0]["sim"] if lit else 0.0, "best_corpus": cor[0]["sim"] if cor else 0.0})

    counts = {o: sum(1 for w in works if w["origin"] == o) for o in ("OpenAlex", "Crossref")}
    makeup = {"openalex": counts["OpenAlex"], "crossref": counts["Crossref"], "passages": len(passages), "queries": sum(len(c["queries"]) for c in claims), "notes": notes,
              "requests": {"OpenAlex": client.spent, "Crossref": crossref_client.spent}}
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "KINDRED.md").write_text(report.render(results, makeup), encoding="utf-8")

    shown = [(r, r["lit"][:3] + r["corpus"][:2]) for r in results]
    chosen = sorted({h["index"] for _, hs in shown for h in hs})
    pts = pca_points(cvecs, svecs, chosen)
    claim_xy, src_xy = pts[: len(claims)], pts[len(claims):]
    pos = {j: src_xy[k] for k, j in enumerate(chosen)}
    sources = []
    for r, hs in shown:
        for h in hs:
            who = report.first_author(h["source"]["authors"]).split()[-1] if h["source"]["authors"] else "unknown"
            sources.append({"claim": r["claim"]["id"], "xy": tuple(pos[h["index"]]), "label": f"{who} {h['source']['year'] or ''}".strip()})
    (args.out / "kindred-map.svg").write_text(kindred_svg(claims, [tuple(p) for p in claim_xy], sources), encoding="utf-8")
    print(json.dumps({"openalex_requests": client.spent, "crossref_requests": crossref_client.spent, "notes": notes, "works": len(works), "passages": len(passages)}))


def pca_points(cvecs, svecs, chosen):
    matrix = np.vstack([cvecs, svecs[chosen]])
    return rank.pca2(matrix)


if __name__ == "__main__":
    main()
