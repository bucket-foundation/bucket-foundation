from __future__ import annotations

import os

import unicodedata

from common import HERE, REPORT, load, page_data

MAKEUP = os.path.join(REPORT, "makeup", "makeup.json")
FAMILIES = [
    ("formal-conjectures", "formal-conjectures", "statement (text field, or the Lean declaration when empty), status, family and declaration suffix as name", "deduped by normalised title; suffixed declarations marked as variants of their file's top-level row; keywords mined from the statement; years from the text only"),
    ("Wikipedia, unsolved problems", "Wikipedia unsolved lists", "full list item as statement, bold or linked head as name, section heading as status", "branch per page, market per list, deduped against the atlas and within the file; years from the text only"),
    ("Wikipedia, Hilbert's problems", "Hilbert's problems", "explanation cell, table status and year columns, 1900 as posed year", "partial for partial, no consensus, disputed, weaker form or partially cells; curator overrides on 14 and 18"),
    ("Wikipedia, Smale's problems", "Smale's problems", "explanation cell, table status and year columns, 1998 as posed year", "same table rule; curator overrides on 8, 14 and 17"),
    ("dated list", "dated lists (Science 2005 and 2021, DARPA, XPRIZE, neuroscience 23, Holy Grails)", "headline under 15 words as name, list year as posed year, a 2026 status check per row", "statement paraphrased in 15 to 40 words; deduped by title and at 0.85 similarity; solved rows carry the discovery year"),
    ("solved timelines", "solved timelines, Wikipedia and Kavli", "a question shown to predate its answer, the discovery or proof year, a posed-evidence quote under 12 words", "statement rewritten as the question stood before resolution; discovery rows with no prior question held back; 159 pages verified"),
    ("atlas, problems.tsv", "atlas, problems.tsv", "name, branch, level, Lean status, posed and resolved years, markets, keywords, all curated", "resolved year marks solved; embedding text is the problem record when one exists"),
]

GREEK = {"α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "ε": "epsilon", "ζ": "zeta", "η": "eta", "θ": "theta", "ι": "iota", "κ": "kappa", "λ": "lambda", "μ": "mu", "ν": "nu", "ξ": "xi", "π": "pi", "ρ": "rho", "σ": "sigma", "τ": "tau", "υ": "upsilon", "φ": "phi", "χ": "chi", "ψ": "psi", "ω": "omega", "Γ": "Gamma", "Δ": "Delta", "Θ": "Theta", "Λ": "Lambda", "Ξ": "Xi", "Π": "Pi", "Σ": "Sigma", "Φ": "Phi", "Ψ": "Psi", "Ω": "Omega"}


def ascii_safe(s: str) -> str:
    out = []
    for ch in s:
        if ch in GREEK:
            out.append(f"$\\{GREEK[ch]}$")
        elif ord(ch) < 128:
            out.append(ch)
        else:
            base = unicodedata.normalize("NFKD", ch).encode("ascii", "ignore").decode()
            out.append(base or "?")
    return "".join(out)

OUT = os.path.join(HERE, "..", "tables")
CLASSES = ["close to known results", "borderline", "needs a new idea", "unsampled"]


def esc(s: str) -> str:
    return _esc(s)


def _esc(s: str) -> str:
    s = s.replace("\\", "\\textbackslash{}").replace("&", "\\&").replace("%", "\\%").replace("_", "\\_").replace("#", "\\#").replace("$", "\\$").replace("{", "\\{").replace("}", "\\}").replace("^", "\\^{}").replace("~", "\\~{}")
    return ascii_safe(s)


def pct(x) -> str:
    return "" if x is None else f"{round(x * 100)}\\%"


def f3(x) -> str:
    return "" if x is None else f"{x:.3f}"


def pval(x):
    if x is None:
        return ""
    return "$<$0.001" if x < 0.001 else f"{x:.3f}"


def write(name: str, lines: list[str]) -> None:
    with open(os.path.join(OUT, name), "w") as f:
        f.write("\n".join(lines) + "\n")


def strata(k: dict) -> list[str]:
    rows = []
    for s in [k["all"], k["undatedRemoved"]["all"], *k["byLength"], *k["byBranch"]]:
        if s["belowFloor"]:
            rows.append(f"{esc(s['name'])} & {s['inside']} & {s['outside']} & \\multicolumn{{4}}{{l}}{{under 10 on one side}} \\\\")
        else:
            rows.append(f"{esc(s['name'])} & {s['inside']} & {s['outside']} & {pct(s['rateInside'])} & {pct(s['rateOutside'])} & {f3(s['ratio'])} & {pval(s['pValue'])} \\\\")
    return rows


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    d = page_data()
    b = d["backtest"]
    for c in b["cutoffs"]:
        for k in c["codings"]:
            write(f"backtest-{c['cutoff']}-{k['coding']}.tex", [
                "\\begin{tabular}{@{}lrrrrrr@{}}", "\\toprule",
                "Stratum & Inside & Outside & Resolved in & Resolved out & Ratio & $p$ \\\\", "\\midrule",
                *strata(k), "\\midrule",
                *[f"{esc(bd['name'])} & {bd['inside']} & {bd['outside']} & {pct(bd['rateInside'])} & {pct(bd['rateOutside'])} & {f3(bd['ratio'])} & \\\\" for bd in k["undecidedBounds"]],
                "\\bottomrule", "\\end{tabular}",
            ])
    write("frozen.tex", [
        "\\begin{tabular}{@{}llrrrrrrrr@{}}", "\\toprule",
        "Cutoff & Coding & $\\tau_c$ & Inside & Outside & Resolved in & Resolved out & Ratio & $p$ & AUC \\\\", "\\midrule",
        *[f"{c['cutoff']} & {k['coding']} & {f3(c['threshold'])} & {k['all']['inside']} & {k['all']['outside']} & {pct(k['all']['rateInside'])} & {pct(k['all']['rateOutside'])} & {f3(k['all']['ratio'])} & {pval(k['all']['pValue'])} & {f3(k['auc'])} \\\\" for c in d["frozen"] for k in c["codings"]],
        "\\bottomrule", "\\end{tabular}",
    ])
    br = sorted(d["frontier"]["branches"].items(), key=lambda kv: -kv[1]["total"])
    write("branches.tex", [
        "\\begin{tabular}{@{}lrrrrrrr@{}}", "\\toprule",
        "Branch & Total & Solved & Reachable & Beyond & Unsampled & Inside & Outside \\\\", "\\midrule",
        *[f"{esc(k)} & {v['total']} & {v['solved']} & {v['reachable']} & {v['beyond']} & {v['unsampled']} & {v['solved'] + v['reachable']} & {v['beyond'] + v['unsampled']} \\\\" for k, v in br],
        "\\bottomrule", "\\end{tabular}",
    ])
    p = load("predictions.json")
    for i, k in enumerate(CLASSES):
        rows = [r for r in p["rows"] if r["reachClass"] == k][:10]
        write(f"top-{i}.tex", [
            "\\begin{tabular}{@{}p{0.42\\linewidth}lrrp{0.3\\linewidth}@{}}", "\\toprule",
            "Problem & Branch & Reach & Growth & Nearest solved \\\\", "\\midrule",
            *[f"{esc(r['title'][:90])} & {esc(r['branch'])} & {f3(r['reach'])} & {r['growth']} & {esc(r['nearest'][0]['title'][:70]) if r['nearest'] else ''} \\\\" for r in rows],
            "\\bottomrule", "\\end{tabular}",
        ])
    atlas = sorted([r for r in p["rows"] if r["atlas"]], key=lambda r: (CLASSES.index(r["reachClass"]), -r["growth"], -r["reach"], r["id"]))
    write("atlas.tex", [
        "\\begin{longtable}{@{}p{0.3\\linewidth}llrrp{0.3\\linewidth}@{}}",
        "\\toprule Problem & Class & Branch & Reach & Growth & Nearest solved \\\\ \\midrule \\endhead",
        "\\bottomrule \\endfoot",
        *[f"{esc(r['title'][:70])} & {esc(r['reachClass'].replace('close to known results', 'reach'))} & {esc(r['branch'])} & {f3(r['reach'])} & {r['growth']} & {esc(r['nearest'][0]['title'][:60]) if r['nearest'] else ''} \\\\" for r in atlas],
        "\\end{longtable}",
    ])
    if os.path.exists(MAKEUP):
        import json
        with open(MAKEUP) as f:
            m = json.load(f)
        rows = []
        for prefix, label, taken, done in FAMILIES:
            members = {k: v for k, v in m["sources"].items() if k.startswith(prefix)}
            if not members:
                continue
            n = sum(v["rows"] for v in members.values())
            lic = {}
            for v in members.values():
                for l, c in v["licences"].items():
                    lic[l] = lic.get(l, 0) + c
            licence = "; ".join(f"{l} ({c})" if len(lic) > 1 else l for l, c in sorted(lic.items(), key=lambda x: -x[1]))
            posed = sum(v["posed"] for v in members.values())
            resolved = sum(v["resolved"] for v in members.values())
            rows.append(f"{esc(label)} & {n} & {esc(licence)} & {esc(taken)}; {posed} posed and {resolved} resolved years & {esc(done)} \\\\")
        assert sum(int(r.split(" & ")[1]) for r in rows) == m["rows"]
        write("sources.tex", [
            "\\begin{tabular}{@{}p{2.1cm}rp{2.6cm}p{4.3cm}p{4.6cm}@{}}", "\\toprule", "Source & Rows & Licence & What was taken & What was done to it \\\\", "\\midrule",
            *rows,
            "\\bottomrule", "\\end{tabular}",
        ])
    counts = p["counts"]
    write("counts.tex", [
        "\\begin{tabular}{@{}lr@{}}", "\\toprule", "Class & Open problems \\\\", "\\midrule",
        *[f"{esc(k)} & {counts[k]} \\\\" for k in CLASSES],
        "\\bottomrule", "\\end{tabular}",
    ])


if __name__ == "__main__":
    main()
