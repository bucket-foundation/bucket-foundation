import argparse
import csv
import datetime as dt
import json
import re
import shutil
from collections import Counter, OrderedDict
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image

HERE = Path(__file__).parent
REPO = HERE.parent.parent
REPORT = REPO / "output" / "solvability-frontier" / "report"
NEIGHBORS = REPO / "src" / "lib" / "research-os" / "solvability-neighbors-data.json"
OPENALEX = HERE / "openalex-sourced.json"
SCHEMA = "bucket.solvability-atlas.makeup/v1"
PAPER = "#f7f3ea"
INK = "#1c2b2d"
MUTED = "#3f4a46"
GREY = "#8f8f88"
BAR = "#1f6f78"
FONT = "Liberation Serif"
BRANCH_COLOR = OrderedDict([("mathematics", "#1f6f78"), ("physics", "#8a5fb0"), ("chemistry", "#c9833f"), ("information", "#2f5fa8"), ("biophysics", "#4d9a6a"), ("cosmology", "#b0486b"), ("mind", "#a3923a"), ("applied", "#6b6b6b")])
STATUS_COLOR = {"solved": "#1f6f78", "partial": "#c9833f", "open": "#b0486b"}
WORKS_BANDS = [("0", 0, 0), ("1 to 9", 1, 9), ("10 to 99", 10, 99), ("100 to 999", 100, 999), ("1,000 to 9,999", 1000, 9999), ("10,000 and up", 10000, None)]
WIKI_LIST = re.compile(r"List_of_unsolved_problems_in_(\w+)")
LABELS = OrderedDict([
    ("branch", "Branch"),
    ("status", "Status"),
    ("form", "Form"),
    ("source", "Source"),
    ("licence", "Licence"),
    ("resolved_kind", "Resolved kind"),
    ("posed_present", "Posed year"),
    ("posed_decade", "Posed year by decade, where present"),
    ("resolved_decade", "Resolved year by decade, where present"),
    ("zone", "Zone"),
    ("prediction_class", "Prediction class"),
    ("level", "Variant or top-level"),
    ("text_kind", "Embedding text kind"),
    ("length_band", "Statement length band"),
])


def load_atlas_rows():
    rows = []
    for r in csv.DictReader(open(HERE / "problems.tsv"), delimiter="\t"):
        rows.append({"id": r["id"], "name": r["name"], "branch": r["branch"], "form": "problem", "variant_of": "", "posed": r["posed"], "resolved": r["resolved"], "status": "solved" if r["resolved"] else "open", "source": "tools/solvability-atlas/problems.tsv", "licence": "MIT", "origin": "atlas"})
    return rows


def load_sourced_rows():
    rows = []
    for r in csv.DictReader(open(HERE / "problems-sourced.tsv"), delimiter="\t"):
        rows.append({**r, "origin": "sourced"})
    return rows


def mark_solved(rows):
    status = {r["id"]: r["status"] for r in rows}
    for r in rows:
        own = status[r["id"]] == "solved"
        parent = r["variant_of"] or None
        r["solved"] = own and (parent is None or status.get(parent) == "solved")
        r["status_marked"] = "solved" if r["solved"] else ("partial" if own else status[r["id"]])
    return rows


def source_label(r):
    if r["origin"] == "atlas":
        return "atlas, problems.tsv"
    pid, url = r["id"], r["source"]
    if pid.startswith("fc-"):
        family = pid.split("-")[1]
        names = {"erdosproblems": "Erdős problems", "wikipedia": "Wikipedia conjectures", "oeis": "OEIS", "greensopenproblems": "Green open problems", "paper": "papers", "books": "books", "mathoverflow": "MathOverflow", "millennium": "Millennium", "arxiv": "arXiv", "writtenonthewallii": "Written on the Wall II", "openquantumproblems": "open quantum problems", "kourovka": "Kourovka Notebook", "hilbertproblems": "Hilbert problems", "optimizationconstants": "optimization constants", "littproblems": "Litt problems", "other": "other"}
        return f"formal-conjectures, {names.get(family, family)}"
    if pid.startswith("hilbert-"):
        return "Wikipedia, Hilbert's problems"
    if pid.startswith("smale-"):
        return "Wikipedia, Smale's problems"
    if pid.startswith("dl-"):
        names = {"science-2005": "Science 2005, 125 questions", "science-2021": "Science and SJTU 2021, 125 questions", "darpa": "DARPA prize competitions", "xprize": "XPRIZE and Longitude Prize", "neuro-23": "23 Problems in Systems Neuroscience", "holy-grails": "Holy Grails in Chemistry"}
        key = "-".join(pid.split("-")[1:3]) if pid.startswith("dl-science") or pid.startswith("dl-holy") or pid.startswith("dl-neuro") else pid.split("-")[1]
        return f"dated list, {names.get(key, key)}"
    if pid.startswith("sd-"):
        return "solved timelines, Wikipedia and Kavli"
    m = WIKI_LIST.search(url)
    if m:
        return f"Wikipedia, unsolved problems in {m.group(1).replace('_', ' ')}"
    if "wikipedia.org" in url:
        return "Wikipedia, other pages"
    return url.split("/")[2] if "://" in url else url


def licence_label(r):
    s = r["licence"]
    if s.startswith("AAAS"):
        return "AAAS copyright, headline cited, statement paraphrased"
    if s.startswith("ACS"):
        return "ACS copyright, title cited, statement paraphrased"
    if s.startswith("Library of Congress"):
        return "Library of Congress record, chapter titles cited"
    return s.replace(";", " and ")


def resolved_kind(r):
    if r["status_marked"] != "solved":
        return "not solved"
    pid = r["id"]
    if r["origin"] == "atlas":
        return "curated, resolved year in problems.tsv"
    if pid.startswith("sd-"):
        return "posed question, curated timeline row"
    if pid.startswith("dl-"):
        return "dated list, 2026 status check"
    if pid.startswith("fc-"):
        return "formal-conjectures status field"
    return "Wikipedia status column or solved section"


def decade(year):
    if not year:
        return None
    y = int(year)
    if y < 1800:
        return "before 1800"
    return f"{y // 10 * 10}s"


def length_band(words):
    if words < 20:
        return "under 20 words"
    if words <= 40:
        return "20 to 40 words"
    return "over 40 words"


def works_band(total):
    if total is None:
        return "no result"
    for name, lo, hi in WORKS_BANDS:
        if total >= lo and (hi is None or total <= hi):
            return name
    return "no result"


def label_rows(rows, frontier, predictions, neighbors, openalex):
    zone = {p["id"]: p["zone"] for p in frontier["points"]}
    cls = {p["id"]: p["reachClass"] for p in predictions["rows"]}
    nb = {n["id"]: n for n in neighbors["nodes"]}
    oa = openalex["rows"] if openalex else {}
    for r in rows:
        node = nb.get(r["id"])
        r["labels"] = {
            "branch": r["branch"],
            "status": r["status_marked"],
            "form": r["form"] or "problem",
            "source": source_label(r),
            "licence": licence_label(r),
            "resolved_kind": resolved_kind(r),
            "posed_present": "posed year present" if r["posed"] else "posed year absent",
            "posed_decade": decade(r["posed"]),
            "resolved_decade": decade(r["resolved"]),
            "zone": zone.get(r["id"], "not in frontier"),
            "prediction_class": cls.get(r["id"], "solved" if r["status_marked"] == "solved" else ("variant" if r["variant_of"] else "not classed")),
            "level": "variant" if r["variant_of"] else "top-level",
            "text_kind": node["text_kind"] if node else "not embedded",
            "length_band": length_band(node["words"]) if node else "not embedded",
        }
        r["works_total"] = oa.get(r["id"], {}).get("works_total") if r["id"] in oa else None
        r["works_band"] = works_band(r["works_total"]) if r["id"] in oa else "not queried"


def ordered_counts(values, order=None):
    c = Counter(v for v in values if v is not None)
    if order:
        keys = [k for k in order if k in c] + sorted(k for k in c if k not in order)
    else:
        keys = [k for k, _ in c.most_common()]
    return OrderedDict((k, c[k]) for k in keys)


def decade_order(keys):
    return sorted(keys, key=lambda k: (-1 if k == "before 1800" else int(k[:4])))


ORDERS = {
    "branch": list(BRANCH_COLOR),
    "status": ["solved", "partial", "open"],
    "posed_present": ["posed year present", "posed year absent"],
    "zone": ["solved", "reachable", "beyond", "unsampled", "not in frontier"],
    "prediction_class": ["close to known results", "borderline", "needs a new idea", "unsampled", "solved", "variant", "not classed"],
    "level": ["top-level", "variant"],
    "length_band": ["under 20 words", "20 to 40 words", "over 40 words", "not embedded"],
}


def build(rows, frontier, predictions, neighbors, openalex):
    label_rows(rows, frontier, predictions, neighbors, openalex)
    total = len(rows)
    labels = OrderedDict()
    for key, title in LABELS.items():
        values = [r["labels"][key] for r in rows]
        if key.endswith("_decade"):
            counts = ordered_counts(values)
            counts = OrderedDict((k, counts[k]) for k in decade_order(counts))
        else:
            counts = ordered_counts(values, ORDERS.get(key))
        present = sum(counts.values())
        labels[key] = {"title": title, "counts": counts, "present": present, "absent": total - present}
    status_by_branch = OrderedDict()
    for b in BRANCH_COLOR:
        sub = [r for r in rows if r["branch"] == b]
        if sub:
            status_by_branch[b] = OrderedDict((s, sum(1 for r in sub if r["status_marked"] == s)) for s in ORDERS["status"])
    works_by_branch = OrderedDict()
    queried = [r for r in rows if r["works_band"] != "not queried"]
    if queried:
        bands = [b[0] for b in WORKS_BANDS] + ["no result"]
        for b in BRANCH_COLOR:
            sub = [r for r in queried if r["branch"] == b]
            if sub:
                works_by_branch[b] = OrderedDict((band, sum(1 for r in sub if r["works_band"] == band)) for band in bands)
    sources = OrderedDict()
    for r in rows:
        s = sources.setdefault(r["labels"]["source"], {"rows": 0, "licences": Counter(), "status": Counter(), "posed": 0, "resolved": 0, "statement": 0})
        s["rows"] += 1
        s["licences"][r["labels"]["licence"]] += 1
        s["status"][r["status_marked"]] += 1
        s["posed"] += bool(r["posed"])
        s["resolved"] += bool(r["resolved"])
        s["statement"] += bool(r.get("statement"))
    for s in sources.values():
        s["licences"] = dict(s["licences"])
        s["status"] = dict(s["status"])
    return {
        "schema": SCHEMA,
        "built": dt.date.today().isoformat(),
        "rows": total,
        "atlas_rows": sum(1 for r in rows if r["origin"] == "atlas"),
        "sourced_rows": sum(1 for r in rows if r["origin"] == "sourced"),
        "threshold": frontier["threshold"],
        "labels": labels,
        "status_by_branch": status_by_branch,
        "openalex": {"queried": len(queried), "with_works": sum(1 for r in queried if r["works_total"]), "median_works_by_branch": medians(queried), "works_by_branch": works_by_branch, "retrieved": openalex.get("retrieved") if openalex else None} if queried else None,
        "sources": sources,
    }


def medians(rows):
    out = OrderedDict()
    for b in BRANCH_COLOR:
        vals = sorted(r["works_total"] for r in rows if r["branch"] == b and r["works_total"] is not None)
        if vals:
            mid = len(vals) // 2
            out[b] = vals[mid] if len(vals) % 2 else (vals[mid - 1] + vals[mid]) / 2
    return out


def style(ax):
    ax.set_facecolor(PAPER)
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(MUTED)
    ax.tick_params(axis="x", colors=MUTED, labelsize=8)
    ax.tick_params(axis="y", colors=INK, labelsize=9, length=0)
    ax.xaxis.grid(True, color="#d9d2c3", linewidth=0.6)
    ax.set_axisbelow(True)


def bar_chart(ax, counts, total, title, colors=None, show_total=True):
    keys = list(counts)[::-1]
    vals = [counts[k] for k in keys]
    cols = [colors.get(k, BAR) for k in keys] if colors else BAR
    ax.barh(range(len(keys)), vals, color=cols, height=0.62, edgecolor=INK, linewidth=0.4)
    ax.set_yticks(range(len(keys)), keys)
    xmax = max(vals) if vals else 1
    for i, v in enumerate(vals):
        ax.text(v + xmax * 0.012, i, f"{v:,} ({v / total * 100:.1f}%)", va="center", ha="left", fontsize=8, color=INK)
    ax.set_xlim(0, xmax * 1.32)
    sub = f", {sum(vals):,} of {total:,} rows" if show_total and sum(vals) != total else f", {total:,} rows"
    ax.set_title(title + sub, loc="left", fontsize=10.5, color=INK)
    style(ax)


def stacked_chart(ax, table, title, colors, total):
    rows = list(table)[::-1]
    segments = list(next(iter(table.values())))
    left = [0] * len(rows)
    for seg in segments:
        vals = [table[r][seg] for r in rows]
        ax.barh(range(len(rows)), vals, left=left, color=colors.get(seg, GREY), height=0.62, edgecolor=INK, linewidth=0.4, label=seg)
        for i, (v, l) in enumerate(zip(vals, left)):
            if v and v / total >= 0.015:
                ax.text(l + v / 2, i, f"{v:,}", va="center", ha="center", fontsize=7.5, color="white" if seg in ("solved", "open") else INK)
        left = [a + b for a, b in zip(left, vals)]
    xmax = max(left) if left else 1
    for i, row in enumerate(rows):
        n = sum(table[row].values())
        ax.text(left[i] + xmax * 0.012, i, f"{n:,} ({n / total * 100:.1f}%)", va="center", ha="left", fontsize=8, color=INK)
    ax.set_yticks(range(len(rows)), rows)
    ax.set_xlim(0, xmax * 1.32)
    ax.set_title(f"{title}, {total:,} rows", loc="left", fontsize=10.5, color=INK)
    ax.legend(loc="lower right", fontsize=8, frameon=False, ncol=len(segments))
    style(ax)


def figure(height):
    fig = plt.figure(figsize=(8.4, height), facecolor=PAPER)
    return fig


def save(fig, path):
    fig.savefig(path, dpi=180, facecolor=PAPER, bbox_inches="tight", metadata={"CreationDate": None, "Producer": None, "Creator": None} if str(path).endswith(".pdf") else None)
    plt.close(fig)


def draw_all(data, out):
    plt.rcParams["font.family"] = FONT
    plt.rcParams["text.color"] = INK
    out.mkdir(parents=True, exist_ok=True)
    files = []
    total = data["rows"]
    for key, lab in data["labels"].items():
        fig = figure(1.2 + 0.36 * len(lab["counts"]))
        ax = fig.add_subplot(111)
        colors = BRANCH_COLOR if key == "branch" else STATUS_COLOR if key == "status" else None
        bar_chart(ax, lab["counts"], total, lab["title"], colors)
        files.append(out / f"{key}.png")
        save(fig, files[-1])
    fig = figure(1.2 + 0.4 * len(data["status_by_branch"]))
    stacked_chart(fig.add_subplot(111), data["status_by_branch"], "Status by branch", STATUS_COLOR, total)
    files.append(out / "status_by_branch.png")
    save(fig, files[-1])
    if data["openalex"]:
        oa = data["openalex"]
        band_colors = dict(zip([b[0] for b in WORKS_BANDS] + ["no result"], ["#d9d2c3", "#a3923a", "#4d9a6a", "#1f6f78", "#2f5fa8", "#8a5fb0", GREY]))
        fig = figure(1.4 + 0.4 * len(oa["works_by_branch"]))
        ax = fig.add_subplot(111)
        stacked_chart(ax, oa["works_by_branch"], f"OpenAlex works per problem by branch, {oa['with_works']:,} of {oa['queried']:,} queried rows with any work", band_colors, oa["queried"])
        ax.legend(loc="lower right", fontsize=7, frameon=False, ncol=4, title="works matching the query", title_fontsize=7)
        files.append(out / "openalex_works_by_branch.png")
        save(fig, files[-1])
    return files


def compact(counts, keep=10, label="other sources"):
    if len(counts) <= keep:
        return counts
    items = list(counts.items())
    out = OrderedDict(items[:keep])
    out[f"{label} ({len(items) - keep})"] = sum(v for _, v in items[keep:])
    return out


def coarse_decades(counts):
    out = OrderedDict()
    for k, v in counts.items():
        key = k if k != "before 1800" and int(k[:4]) >= 1900 else "before 1900"
        out[key] = out.get(key, 0) + v
    return out


def draw_combined(data, path):
    plt.rcParams["font.family"] = FONT
    keys = ["branch", "status", "form", "source", "licence", "resolved_kind", "posed_present", "posed_decade", "resolved_decade", "zone", "prediction_class", "level", "text_kind", "length_band"]
    total = data["rows"]
    fig = plt.figure(figsize=(14, 26), facecolor=PAPER)
    gs = fig.add_gridspec(8, 2, height_ratios=[1.1, 1.0, 1.4, 1.2, 1.3, 1.0, 1.0, 1.1], hspace=0.55, wspace=0.9)
    for i, key in enumerate(keys):
        ax = fig.add_subplot(gs[i // 2, i % 2])
        lab = data["labels"][key]
        counts = compact(lab["counts"]) if key == "source" else coarse_decades(lab["counts"]) if key.endswith("_decade") else lab["counts"]
        colors = BRANCH_COLOR if key == "branch" else STATUS_COLOR if key == "status" else None
        bar_chart(ax, counts, total, lab["title"], colors)
    ax = fig.add_subplot(gs[7, :])
    stacked_chart(ax, data["status_by_branch"], "Status by branch", STATUS_COLOR, total)
    fig.suptitle(f"Make-up of the {total:,} rows behind the solvability frontier, built {data['built']}", fontsize=13, color=INK, y=0.905)
    save(fig, path)


def to_webp(files, dest):
    dest.mkdir(parents=True, exist_ok=True)
    for f in files:
        Image.open(f).convert("RGB").save(dest / (f.stem + ".webp"), "WEBP", quality=88)


def load_json(path):
    return json.load(open(path))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default=str(HERE / "out"))
    ap.add_argument("--frontier", default=str(REPORT / "frontier.json"))
    ap.add_argument("--predictions", default=str(REPORT / "predictions.json"))
    ap.add_argument("--neighbors", default=str(NEIGHBORS))
    ap.add_argument("--openalex", default=str(OPENALEX))
    ap.add_argument("--publish", action="store_true")
    args = ap.parse_args()
    rows = mark_solved(load_atlas_rows() + load_sourced_rows())
    openalex = load_json(args.openalex) if Path(args.openalex).exists() else None
    if openalex:
        openalex["retrieved"] = max((r["retrieved"] for r in openalex["rows"].values()), default=None)
    data = build(rows, load_json(args.frontier), load_json(args.predictions), load_json(args.neighbors), openalex)
    out = Path(args.out) / "makeup"
    files = draw_all(data, out)
    draw_combined(data, out / "makeup-combined.png")
    json.dump(data, open(out / "makeup.json", "w"), indent=1, ensure_ascii=False)
    if args.publish:
        report = REPORT / "makeup"
        report.mkdir(parents=True, exist_ok=True)
        for f in list(out.glob("*.png")) + [out / "makeup.json"]:
            shutil.copy(f, report / f.name)
        to_webp(files, REPO / "public" / "atlas" / "makeup")
        draw_combined(data, REPO / "papers" / "solvability-frontier" / "figures" / "fig_makeup.pdf")
        json.dump(data, open(REPO / "src" / "lib" / "research-os" / "solvability-makeup-data.json", "w"), indent=1, ensure_ascii=False)
    print(json.dumps({"rows": data["rows"], "charts": len(files) + 1, "out": str(out), "openalex": data["openalex"] and {k: data["openalex"][k] for k in ("queried", "with_works", "median_works_by_branch")}}, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
