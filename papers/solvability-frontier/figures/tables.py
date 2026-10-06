from __future__ import annotations

import os

import unicodedata

from common import HERE, load, page_data

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
CLASSES = ["AI can reach with known results", "borderline", "needs a new idea", "unsampled"]


def esc(s: str) -> str:
    return _esc(s)


def _esc(s: str) -> str:
    s = s.replace("\\", "\\textbackslash{}").replace("&", "\\&").replace("%", "\\%").replace("_", "\\_").replace("#", "\\#").replace("$", "\\$").replace("{", "\\{").replace("}", "\\}").replace("^", "\\^{}").replace("~", "\\~{}")
    return ascii_safe(s)


def pct(x) -> str:
    return "" if x is None else f"{round(x * 100)}\\%"


def f3(x) -> str:
    return "" if x is None else f"{x:.3f}"


def write(name: str, lines: list[str]) -> None:
    with open(os.path.join(OUT, name), "w") as f:
        f.write("\n".join(lines) + "\n")


def strata(c: dict) -> list[str]:
    rows = []
    for s in [c["all"], *c["byLength"], *c["byBranch"]]:
        if s["belowFloor"]:
            rows.append(f"{esc(s['name'])} & {s['inside']} & {s['outside']} & \\multicolumn{{4}}{{l}}{{under 10 on one side}} \\\\")
        else:
            rows.append(f"{esc(s['name'])} & {s['inside']} & {s['outside']} & {pct(s['rateInside'])} & {pct(s['rateOutside'])} & {f3(s['ratio'])} & {f3(s['pValue'])} \\\\")
    return rows


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    d = page_data()
    b = d["backtest"]
    for c in b["cutoffs"]:
        write(f"backtest-{c['cutoff']}.tex", [
            "\\begin{tabular}{@{}lrrrrrr@{}}", "\\toprule",
            "Stratum & Inside & Outside & Resolved in & Resolved out & Ratio & $p$ \\\\", "\\midrule",
            *strata(c), "\\bottomrule", "\\end{tabular}",
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
        *[f"{esc(r['title'][:70])} & {esc(r['reachClass'].replace('AI can reach with known results', 'reach'))} & {esc(r['branch'])} & {f3(r['reach'])} & {r['growth']} & {esc(r['nearest'][0]['title'][:60]) if r['nearest'] else ''} \\\\" for r in atlas],
        "\\end{longtable}",
    ])
    counts = p["counts"]
    write("counts.tex", [
        "\\begin{tabular}{@{}lr@{}}", "\\toprule", "Class & Open problems \\\\", "\\midrule",
        *[f"{esc(k)} & {counts[k]} \\\\" for k in CLASSES],
        "\\bottomrule", "\\end{tabular}",
    ])


if __name__ == "__main__":
    main()
