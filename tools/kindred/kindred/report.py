import re
from collections import defaultdict

import numpy as np

TAU = 0.781
CORPUS = "Wright corpus"


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def md_cell(text):
    return clean(text).replace("|", "/")


def source_line(rank, hit):
    s = hit["source"]
    who = s["authors"] or "unknown"
    ref = f"[{s['url']}]({s['url']})" if s["url"] else "no link"
    return f"{rank}. {who} ({s['year'] or 'n.d.'}). *{clean(s['title'])}*. {ref}. Similarity {hit['sim']:.3f}.\n   > \"{clean(hit['quote'])}\" (sentence similarity {hit['quote_sim']:.3f})"


def first_author(authors):
    return authors.split(",")[0].replace(" et al.", "").strip() or "unknown"


def ranking(results, key):
    tally = defaultdict(lambda: {"claims": set(), "best": 0.0, "titles": set()})
    for r in results:
        for h in r[key]:
            who = first_author(h["source"]["authors"])
            if who == "unknown":
                continue
            t = tally[who]
            t["claims"].add(r["claim"]["id"])
            t["best"] = max(t["best"], h["sim"])
            t["titles"].add(clean(h["source"]["title"]))
    return sorted(tally.items(), key=lambda kv: (-len(kv[1]["claims"]), -kv[1]["best"], kv[0]))


def ranking_table(results, key, label):
    out = [f"| Rank | {label} | Claims in its top five | Best similarity | Nearest work |", "|---|---|---|---|---|"]
    for i, (who, t) in enumerate(ranking(results, key)[:10], 1):
        out.append(f"| {i} | {md_cell(who)} | {len(t['claims'])} ({', '.join(sorted(t['claims'], key=lambda c: int(c[1:])))}) | {t['best']:.3f} | {md_cell(sorted(t['titles'])[0])} |")
    return out


def header(makeup):
    lines = [
        "## Corpus makeup",
        "",
        "| Source set | Items | How it was chosen |",
        "|---|---|---|",
        f"| Robert Wright corpus | {makeup['passages']} passages | A local source the founder chose: Wright's newsletter, legacy essays and public Nonzero video transcripts. It is a single author's body of work, not a sample of the literature. |",
        f"| Crossref works | {makeup['crossref']} works with abstracts | {makeup['queries']} keyword queries, 25 results each, ranked by Crossref relevance. |",
        f"| OpenAlex works | {makeup['openalex']} works | Planned as the main literature index. The daily OpenAlex quota was spent before the run (HTTP 429, reset in about 20 hours), so none returned data. |",
        "",
        "The private call transcript with John Horgan is not used. Embeddings: BAAI/bge-small-en-v1.5, the model of the solvability atlas. Rankings below are kept per source set: a Wright passage ranking first says what Wright wrote, and says nothing about the literature.",
    ]
    if makeup["notes"]:
        lines += ["", " ".join(makeup["notes"])]
    return lines


def render(results, makeup, tau=TAU):
    out = ["<!-- voice-ignore-file -->", "# Kindred thinkers for the frontier thesis", ""]
    out += header(makeup)
    out += ["", "## Highest similarity in the literature works", ""]
    out += ranking_table(results, "lit", "First author")
    out += ["", "## Highest similarity in the Wright corpus", ""]
    out += ranking_table(results, "corpus", "Author")
    out.append("")
    out.append("## Claims and nearest sources")
    for r in results:
        c = r["claim"]
        out += ["", f"### {c['id']} {c['short']}", "", f"> {c['quote']}", f"> (founder voice notes, line {c['line']})", "", f"Claim as embedded: {c['claim']}", ""]
        out += ["Literature works:", ""]
        out += [source_line(i, h) for i, h in enumerate(r["lit"], 1)]
        out += ["", "Wright corpus passages:", ""]
        out += [source_line(i, h) for i, h in enumerate(r["corpus"], 1)]
    out += ["", "## Best similarity per claim", ""]
    out.append(f"For orientation only, the table gives each best similarity as a share of τ = {tau}, the 10th percentile of solved problems' reach in the atlas frontier run. That is a convenience scale and not a validated threshold: the atlas compares problem statements with problem statements, while these are claims against abstracts and talk passages, and no calibration links the two.")
    out += ["", "| Claim | Best literature work | Share of τ | Best Wright passage | Share of τ |", "|---|---|---|---|---|"]
    lit, cor = [], []
    for r in results:
        lit.append(r["best_lit"])
        cor.append(r["best_corpus"])
        out.append(f"| {r['claim']['id']} {md_cell(r['claim']['short'])} | {r['best_lit']:.3f} | {r['best_lit'] / tau:.2f} | {r['best_corpus']:.3f} | {r['best_corpus'] / tau:.2f} |")
    out.append("")
    for name, vals in (("Literature works", lit), ("Wright corpus", cor)):
        arr = np.array(vals)
        q = np.quantile(arr, [0, 0.25, 0.5, 0.75, 1])
        out.append(f"{name}, best similarity over {len(arr)} claims: min {q[0]:.3f}, quartiles {q[1]:.3f} / {q[2]:.3f} / {q[3]:.3f}, max {q[4]:.3f}.")
    out += ["", "![Kindred map](kindred-map.svg)", ""]
    return "\n".join(out)
