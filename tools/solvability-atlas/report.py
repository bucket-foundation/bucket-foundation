import base64
import csv
import html
import io
import json
import math
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


def data_uri(path, width=1400):
    im = Image.open(path).convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)))
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=80)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


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


def dial(theta, solv):
    r = 6 + 12 * solv
    x, y = 22 + r * math.cos(theta), 22 - r * math.sin(theta)
    return (f'<svg class="dial" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18" fill="none" stroke="var(--line)"/>'
            f'<circle cx="22" cy="22" r="6" fill="none" stroke="var(--line)" stroke-dasharray="2 2"/>'
            f'<line x1="22" y1="22" x2="{x:.1f}" y2="{y:.1f}" stroke="var(--ink-2)"/><circle cx="{x:.1f}" cy="{y:.1f}" r="3" fill="var(--b)"/></svg>')


def card(c):
    e = html.escape
    years = f"{c['posed']}" + (f" to {c['resolved']}" if c["resolved"] else ", open")
    chips = "".join(f'<span class="chip">{e(m)}</span>' for m in c["markets"])
    toks = ", ".join(e(t) for t in c["tokens"])
    return f'''<article class="card" data-branch="{c['branch']}" data-mint="{c['mint_state']}" data-kind="{c['source_kind']}" style="--b:var(--{c['branch']})">
<header><span class="branch">{c['branch']}</span><span class="mint {c['mint_state']}">{c['mint_state']}</span></header>
<div class="head">{dial(c['theta'], c['solvability'])}<h3>{e(c['title'])}</h3></div>
<p>{e(c['claim'])}</p>
<dl><div><dt>Level</dt><dd>L{c['level']}</dd></div><div><dt>Formal</dt><dd>{c['formal']}</dd></div><div><dt>Solvability</dt><dd>{c['solvability']:.2f}</dd></div><div><dt>Status</dt><dd>{c['status']}</dd></div></dl>
<footer><span class="years">{years}</span>{chips}</footer>
<p class="toks">{toks}</p>
</article>'''


def main():
    cards, s = productions()
    cards.sort(key=lambda c: (c["source_kind"] != "problem", -c["level"], c["solvability"]))
    counts = {m: sum(c["mint_state"] == m for c in cards) for m in ("minted", "pending", "draft", "unminted")}
    plots = "".join(f'<figure id="plot-{i}"><img src="{data_uri(OUT / f)}" alt="{html.escape(t)}" loading="lazy"><figcaption><b>{html.escape(t)}.</b> {html.escape(d)}</figcaption></figure>' for i, (f, t, d) in enumerate(PLOTS))
    bridges = "".join(f"<li>{html.escape(n)} <span>{b:.4f}</span></li>" for n, b in s["top_bridges_betweenness"])
    rows = [
        ("Nodes and links", f"{s['nodes']} nodes, {s['edges']} links, {s['components']} components"),
        ("Density", s["density"]), ("Weighted clustering", s["avg_clustering"]),
        ("Communities, modularity", f"{s['communities']}, {s['modularity']}"),
        ("Branch assortativity", s["branch_assortativity"]),
        ("Solvability vs neighbour mean", f"r = {s['solvability_neighbor_corr']}, permutation p < 0.001"),
        ("Level vs solvability, Spearman", s["spearman_level_vs_solvability"]),
        ("Markets vs level, Spearman", s["spearman_markets_vs_level"]),
    ]
    stats = "".join(f"<tr><th>{k}</th><td>{v}</td></tr>" for k, v in rows)
    tpl = (HERE / "report.template.html").read_text()
    page = (tpl.replace("{{CARDS}}", "".join(card(c) for c in cards)).replace("{{PLOTS}}", plots)
            .replace("{{STATS}}", stats).replace("{{BRIDGES}}", bridges).replace("{{N}}", str(len(cards)))
            .replace("{{MINTED}}", str(counts["minted"])).replace("{{PENDING}}", str(counts["pending"]))
            .replace("{{DRAFT}}", str(counts["draft"])).replace("{{UNMINTED}}", str(counts["unminted"])))
    (OUT / "report.html").write_text(page)


if __name__ == "__main__":
    main()
