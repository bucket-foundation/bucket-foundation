import re
from collections import defaultdict

import numpy as np

from .rank import verdict

TAU = 0.781


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def md_cell(text):
    return clean(text).replace("|", "/")


def source_line(rank, hit):
    s = hit["source"]
    who = s["authors"] or "unknown"
    ref = f"[{s['url']}]({s['url']})" if s["url"] else "no link"
    return f"{rank}. {who} ({s['year'] or 'n.d.'}). *{clean(s['title'])}*. {ref}. Similarity {hit['sim']:.3f} ({s['origin']}).\n   > \"{clean(hit['quote'])}\" (sentence similarity {hit['quote_sim']:.3f})"


def first_author(authors):
    return authors.split(",")[0].replace(" et al.", "").strip() or "unknown"


def people_ranking(results, live_only=False):
    tally = defaultdict(lambda: {"claims": set(), "best": 0.0, "titles": set()})
    for r in results:
        for h in r["hits"]:
            if live_only and h["source"]["origin"] == "Wright corpus":
                continue
            who = first_author(h["source"]["authors"])
            if who == "unknown":
                continue
            t = tally[who]
            t["claims"].add(r["claim"]["id"])
            t["best"] = max(t["best"], h["sim"])
            t["titles"].add(clean(h["source"]["title"]))
    rows = sorted(tally.items(), key=lambda kv: (-len(kv[1]["claims"]), -kv[1]["best"], kv[0]))
    return rows


def render(results, tau=TAU, sources_note=""):
    out = ["<!-- voice-ignore-file -->", "# Kindred thinkers for the frontier thesis", ""]
    out.append(sources_note)
    out.append("")
    for heading, live in (("Closest people overall", False), ("Closest people in the live sources", True)):
        out += [f"## {heading}", "", "| Rank | Person | Claims in their top five | Best similarity | Nearest work |", "|---|---|---|---|---|"]
        for i, (who, t) in enumerate(people_ranking(results, live)[:10], 1):
            out.append(f"| {i} | {md_cell(who)} | {len(t['claims'])} ({', '.join(sorted(t['claims'], key=lambda c: int(c[1:])))}) | {t['best']:.3f} | {md_cell(sorted(t['titles'])[0])} |")
        out.append("")
    out.append("## Claims and nearest sources")
    for r in results:
        c = r["claim"]
        out += ["", f"### {c['id']} {c['short']}", "", f"> {c['quote']}", f"> (founder voice notes, line {c['line']})", "", f"Claim as embedded: {c['claim']}", ""]
        for i, h in enumerate(r["hits"], 1):
            out.append(source_line(i, h))
    out += ["", "## Is the thesis unusual", ""]
    out.append(f"The atlas scale: an open problem counts as close to solved work when its best cosine similarity to a solved problem reaches τ = {tau}, the 10th percentile of solved problems' reach in the frontier run. A claim's best similarity to any source is read on that scale. Claims are compared with abstracts and talk passages, which are looser matches than problem statements against problem statements, so a ratio under 1 is expected for ideas that are well covered in other words.")
    out += ["", "| Claim | Best overall | Ratio to τ | Best live source | Best Wright corpus | Reading |", "|---|---|---|---|---|---|"]
    bests = []
    for r in results:
        b = r["best"]
        bests.append(b)
        out.append(f"| {r['claim']['id']} {md_cell(r['claim']['short'])} | {b:.3f} | {b / tau:.2f} | {r['best_live']:.3f} | {r['best_corpus']:.3f} | {verdict(b, tau)} |")
    arr = np.array(bests)
    q = np.quantile(arr, [0, 0.25, 0.5, 0.75, 1])
    out += ["", f"Distribution of best similarities over {len(arr)} claims: min {q[0]:.3f}, quartiles {q[1]:.3f} / {q[2]:.3f} / {q[3]:.3f}, max {q[4]:.3f}. Share of τ: median {np.median(arr) / tau:.2f}, highest {arr.max() / tau:.2f}, lowest {arr.min() / tau:.2f}.", ""]
    counts = defaultdict(int)
    for b in bests:
        counts[verdict(b, tau)] += 1
    out.append("Readings: " + "; ".join(f"{k} {v}" for k, v in sorted(counts.items(), key=lambda kv: -kv[1])) + ". Cutoffs: at or above τ near existing work, 0.9 to 1.0 of τ close, 0.8 to 0.9 partly covered, below 0.8 unusual.")
    out += ["", "![Kindred map](kindred-map.svg)", ""]
    return "\n".join(out)
