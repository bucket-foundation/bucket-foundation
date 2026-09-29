import csv
import json
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "out"
MINT = {"proved": "minted", "partial": "pending", "statement": "draft", "none": "unminted"}
STATUS = {"minted": "accepted", "pending": "submitted", "draft": "draft", "unminted": "draft"}
PLOTS = [
    ("01-token-circle.png", "Token circle", "Every keyword and market token sits on the circle in the order of its embedding similarity. Distance from the centre is the mean solvability of the problems that use it."),
    ("02-star-chart.png", "Star chart", "Angle is semantic position. Radius grows with level and with distance from a solution. Star size counts the markets a problem touches."),
    ("03-star-chart-time.png", "Star chart through time", "Radius is the year a problem was posed. A line runs out to a black dot at the year it was resolved."),
    ("04-helix.png", "Solvability helix", "One turn per level. Angle is semantic rank, radius is solvability."),
    ("05-sphere.png", "Sphere map", "The top three principal directions of the embeddings, projected onto the unit sphere. Opacity is solvability."),
    ("06-network.png", "Similarity network", "Each node links to its six most similar nodes. Node size is betweenness centrality."),
    ("07-similarity-matrix.png", "Problem similarity matrix", "Cosine similarity between problems, ordered by network community."),
    ("08-matrices.png", "Branch, status and market matrices", "Branch against branch mean similarity, level against formal status, and market against branch."),
    ("09-token-matrix.png", "Token similarity matrix", "Cosine similarity between tokens, ordered by their position on the circle."),
]


def productions():
    g = json.load(open(OUT / "graph.json"))
    desc = {r["id"]: r["description"] for r in csv.DictReader(open(HERE / "descriptions.tsv"), delimiter="\t")}
    cards = []
    for n in g["nodes"]:
        if n["kind"] == "token":
            continue
        mint = MINT[n["lean"]]
        if n["kind"] == "lean":
            d = f"BucketMath theorem in module {n['keywords'][1]}, {'proved in Lean' if mint == 'minted' else 'stated in Lean with the proof open'}."
        else:
            d = desc[n["id"]]
        cards.append({
            "id": n["id"], "kind": "production", "title": n["name"], "claim": d,
            "branch": n["branch"], "level": n["level"], "formal": n["lean"],
            "mint_state": mint, "status": STATUS[mint],
            "posed": n["posed"], "resolved": n["resolved"], "markets": n["market"], "tokens": n["keywords"],
            "solvability": n["solvability"], "theta": round(n["theta"], 4),
            "community": n["community"], "betweenness": round(n["betweenness"], 5),
            "pagerank": round(n["pagerank"], 5),
            "sources": [{"label": "Wikipedia", "url": "https://en.wikipedia.org/wiki/Special:Search?search=" + n["name"].replace(" ", "+")}] if n["kind"] == "problem" else [{"label": "lean/manifest.json"}],
            "source_kind": n["kind"],
        })
    json.dump({"schema": "bucket.solvability-atlas.productions/v1", "productions": cards}, open(OUT / "productions.json", "w"), indent=1)
    return cards, g["summary"]


def site(repo):
    pub = repo / "public" / "atlas"
    pub.mkdir(parents=True, exist_ok=True)
    for f, _, _ in PLOTS:
        im = Image.open(OUT / f).convert("RGB")
        if im.width > 1600:
            im = im.resize((1600, round(im.height * 1600 / im.width)))
        im.save(pub / f.replace(".png", ".webp"), "WEBP", quality=82)
    cards, s = productions()
    lib = repo / "src" / "lib" / "research-os"
    lib.mkdir(parents=True, exist_ok=True)
    plots = [{"src": "/atlas/" + f.replace(".png", ".webp"), "title": t, "caption": d} for f, t, d in PLOTS]
    json.dump({"producer": "bucket.foundation", "generator": "tools/solvability-atlas", "productions": cards, "summary": s, "plots": plots}, open(lib / "solvability-atlas-data.json", "w"), indent=1)


if __name__ == "__main__":
    site(HERE.parent.parent)
