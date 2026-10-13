import argparse
import datetime as dt
import json
import math
import shutil
import subprocess
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy import stats

HERE = Path(__file__).parent
REPO = HERE.parent.parent.parent
TABLE = REPO / "tools" / "solvability-atlas" / "surface" / "table.csv"
SOURCE_URL = "https://github.com/bucket-foundation/bucket-foundation/blob/dev/tools/solvability-atlas/surface/table.csv"
SEED = 124
MU0 = 50.0
ALPHA = 0.05
CUTOFF = 50
EVENT_BRANCH = "physics"
BIN_WIDTH = 40
PREDICT_X = 1950
IDENTIFIED = "fermat"
SAMPLE_N = 50
SIM_GROUPS = 500
SIM_SIZES = (5, 50)
ORIGINAL_COLUMNS = ["id", "title", "branch", "kind", "status", "formal", "posed", "resolved", "years_to_resolve", "licence"]
X, Y, CAT1, CAT2 = "posed", "years_to_resolve", "branch", "formal"
INK = "#0b0b0b"
BLUE = "#2a5ea6"
ORANGE = "#eb6834"
GREY = "#6b6f76"
SLICES = ("#0f2c56", "#2a5ea6", "#6e9bd8", "#c9d9f2", "#eb6834", "#f2a57e", "#6b6f76", "#c4c7cc")


def r2(x):
    return f"{x:.2f}"


def r4(x):
    return f"{x:.4f}"


def pct(x):
    return f"{100 * x:.2f}\\%"


def pv(x):
    return "< 0.0001" if x < 0.00005 else f"= {x:.4f}"


def tex(s):
    s = str(s)
    for a, b in (("\\", r"\textbackslash{}"), ("&", r"\&"), ("%", r"\%"), ("_", r"\_"), ("#", r"\#"), ("$", r"\$"), ("{", r"\{"), ("}", r"\}")):
        s = s.replace(a, b)
    return s.encode("ascii", "ignore").decode()


def load_original():
    table = pd.read_csv(TABLE, keep_default_na=False, na_values=[""])
    return table[ORIGINAL_COLUMNS].copy()


def clean(original):
    rules = [
        ("R1 posed year missing", original[X].isna()),
        ("R2 resolved year missing", original["resolved"].isna()),
        ("R3 status other than solved", original["status"] != "solved"),
        ("R4 variant of another row", original["kind"] == "variant"),
        ("R5 resolved year before posed year", original["resolved"] < original[X]),
        ("R6 branch or formal status missing", original[CAT1].isna() | original[CAT2].isna()),
        ("R7 duplicate id", original["id"].duplicated()),
    ]
    reason = pd.Series("", index=original.index)
    counts = []
    for name, mask in rules:
        hit = mask & (reason == "")
        reason[hit] = name
        counts.append((name, int(hit.sum())))
    cleaned = original[reason == ""].copy()
    cleaned[X] = cleaned[X].astype(int)
    cleaned[Y] = cleaned[Y].astype(int)
    cleaned["resolved"] = cleaned["resolved"].astype(int)
    excluded = original.loc[reason != "", ["id"]].assign(rule=reason[reason != ""])
    return cleaned.reset_index(drop=True), excluded, counts


def frequency(series):
    counts = series.value_counts()
    return pd.DataFrame({"count": counts, "relative": counts / counts.sum()})


def grouped(y, width=BIN_WIDTH):
    edges = np.arange(0, (int(y.max()) // width + 1) * width + 1, width)
    counts, _ = np.histogram(y, bins=edges)
    out = pd.DataFrame({"lower": edges[:-1], "upper": edges[1:], "midpoint": (edges[:-1] + edges[1:]) / 2, "count": counts})
    out["relative"] = out["count"] / len(y)
    out["cumulative"] = out["count"].cumsum()
    out["cumulative_relative"] = out["cumulative"] / len(y)
    return out, edges


def summaries(cleaned):
    y = cleaned[Y].to_numpy(dtype=float)
    n = len(y)
    mean, sd = y.mean(), y.std(ddof=1)
    q1, med, q3, p90 = np.percentile(y, [25, 50, 75, 90])
    counts = cleaned[Y].value_counts()
    modes = sorted(counts[counts == counts.max()].index.tolist())
    iqr = q3 - q1
    low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    flagged = cleaned[(cleaned[Y] < low) | (cleaned[Y] > high)]
    kept = cleaned[(cleaned[Y] >= low) & (cleaned[Y] <= high)][Y].to_numpy(dtype=float)
    within = {k: float((np.abs(y - mean) <= k * sd).mean()) for k in (1, 2, 3)}
    row = cleaned[cleaned["id"] == IDENTIFIED].iloc[0]
    return {
        "n": n, "mean": mean, "median": med, "modes": modes, "mode_count": int(counts.max()), "variance": y.var(ddof=1), "sd": sd,
        "min": y.min(), "q1": q1, "q3": q3, "max": y.max(), "range": y.max() - y.min(), "iqr": iqr, "p90": p90,
        "fence_low": low, "fence_high": high, "flagged_ids": flagged["id"].tolist(), "flagged_values": flagged[Y].tolist(),
        "mean_without": kept.mean(), "sd_without": kept.std(ddof=1), "n_without": len(kept),
        "within": within, "chebyshev_2": 0.75, "skew": float(stats.skew(y)),
        "z_id": row["id"], "z_title": row["title"], "z_value": float(row[Y]), "z": float((row[Y] - mean) / sd),
    }


def grouped_estimates(table, n):
    mean = float((table["midpoint"] * table["count"]).sum() / n)
    var = float((table["count"] * (table["midpoint"] - mean) ** 2).sum() / (n - 1))
    return mean, math.sqrt(var)


def regression(cleaned):
    x, y = cleaned[X].to_numpy(dtype=float), cleaned[Y].to_numpy(dtype=float)
    fit = stats.linregress(x, y)
    fitted = fit.intercept + fit.slope * x
    resid = y - fitted
    i = int(cleaned.index[cleaned["id"] == IDENTIFIED][0])
    return {
        "n": len(x), "r": fit.rvalue, "slope": fit.slope, "intercept": fit.intercept, "r_squared": fit.rvalue ** 2, "sse": float((resid ** 2).sum()),
        "predict_x": PREDICT_X, "predict_y": fit.intercept + fit.slope * PREDICT_X, "x_min": x.min(), "x_max": x.max(),
        "row_id": cleaned.loc[i, "id"], "row_title": cleaned.loc[i, "title"], "row_x": x[i], "row_y": y[i], "row_fitted": fitted[i], "row_resid": resid[i],
        "fitted": fitted, "resid": resid,
    }


def probability(cleaned):
    a = (cleaned[Y] >= CUTOFF).to_numpy()
    b = (cleaned[CAT1] == EVENT_BRANCH).to_numpy()
    n = len(cleaned)
    cells = {"ab": int((a & b).sum()), "a_notb": int((a & ~b).sum()), "nota_b": int((~a & b).sum()), "nota_notb": int((~a & ~b).sum())}
    pa, pb = a.sum() / n, b.sum() / n
    return {"n": n, "a": int(a.sum()), "b": int(b.sum()), **cells, "p_a": pa, "p_b": pb, "p_ab": cells["ab"] / n, "p_a_or_b": int((a | b).sum()) / n, "a_or_b": int((a | b).sum()), "p_a_given_b": cells["ab"] / b.sum(), "p_a_p_b": pa * pb, "c_10_3": math.comb(10, 3)}


def models(cleaned, p):
    y = cleaned[Y].to_numpy(dtype=float)
    mu, sigma = y.mean(), y.std(ddof=0)
    return {
        "p": p, "binom_k3": stats.binom.pmf(3, 10, p), "binom_ge1": 1 - (1 - p) ** 10, "binom_mean": 10 * p, "binom_sd": math.sqrt(10 * p * (1 - p)),
        "mu": mu, "sigma": sigma, "normal_tail": stats.norm.sf(CUTOFF, mu, sigma), "normal_p90": stats.norm.ppf(0.9, mu, sigma),
        "observed_tail": float((y >= CUTOFF).mean()), "observed_p90": float(np.percentile(y, 90)), "normal_below_zero": stats.norm.cdf(0, mu, sigma),
    }


def draw_sample(cleaned, seed=SEED):
    rng = np.random.default_rng(seed)
    position = rng.integers(1, len(cleaned) + 1, SAMPLE_N)
    picked = cleaned.iloc[position - 1]
    return pd.DataFrame({"draw": np.arange(1, SAMPLE_N + 1), "position": position, "id": picked["id"].to_numpy(), Y: picked[Y].to_numpy()})


def simulate(cleaned, seed=SEED):
    y = cleaned[Y].to_numpy(dtype=float)
    ids = cleaned["id"].to_numpy()
    draws, means = [], []
    for k, size in enumerate(SIM_SIZES):
        rng = np.random.default_rng(seed + 1 + k)
        position = rng.integers(1, len(y) + 1, (SIM_GROUPS, size))
        group_means = y[position - 1].mean(1)
        for g in range(SIM_GROUPS):
            means.append({"size": size, "group": g + 1, "mean": group_means[g]})
        flat = position.ravel()
        draws.append(pd.DataFrame({"size": size, "group": np.repeat(np.arange(1, SIM_GROUPS + 1), size), "position": flat, "id": ids[flat - 1], Y: y[flat - 1].astype(int)}))
    return pd.concat(draws, ignore_index=True), pd.DataFrame(means)


def inference(sample, mu_full):
    y = sample[Y].to_numpy(dtype=float)
    n, mean, sd = len(y), y.mean(), y.std(ddof=1)
    se = sd / math.sqrt(n)
    df = n - 1
    crit = stats.t.ppf(1 - ALPHA / 2, df)
    t = (mean - MU0) / se
    p = 2 * stats.t.sf(abs(t), df)
    lo, hi = mean - crit * se, mean + crit * se
    return {"n": n, "mean": mean, "sd": sd, "se": se, "df": df, "t_crit": crit, "margin": crit * se, "low": lo, "high": hi, "contains_full_mean": bool(lo <= mu_full <= hi), "t": t, "p": p, "reject": bool(p < ALPHA), "mu0_in_interval": bool(lo <= MU0 <= hi), "difference": mean - MU0, "sample_max": y.max(), "sample_median": float(np.median(y)), "repeats": int(n - sample["position"].nunique())}


def style(ax):
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.tick_params(colors=INK)
    ax.grid(axis="y", color="#e3e5e8", lw=0.6)
    ax.set_axisbelow(True)


def save(fig, folder, name):
    fig.savefig(folder / f"{name}.pdf", bbox_inches="tight")
    fig.savefig(folder / f"{name}.png", dpi=140, bbox_inches="tight")
    plt.close(fig)


def stem_lines(values):
    values = sorted(int(v) for v in values)
    out = []
    for stem in range(0, values[-1] // 10 + 1):
        leaves = "".join(str(v % 10) for v in values if v // 10 == stem)
        out.append(f"{stem:>3} | {leaves}")
    return out


def figures(cleaned, table, edges, s, reg, sim_means, m, folder):
    y = cleaned[Y].to_numpy(dtype=float)
    unit = "years from posed to resolved"
    branch = cleaned[CAT1].value_counts()

    fig, ax = plt.subplots(figsize=(7, 4))
    ax.bar(branch.index, branch.values, color=BLUE, width=0.7)
    for i, v in enumerate(branch.values):
        ax.text(i, v + 0.6, str(v), ha="center", fontsize=9, color=INK)
    ax.set_ylabel("problems, count")
    ax.set_xlabel("branch")
    ax.set_title("Graph 1. Bar chart of branch: problems per branch, largest first", loc="left", fontsize=10)
    plt.setp(ax.get_xticklabels(), rotation=30, ha="right")
    style(ax)
    save(fig, folder, "01-bar")

    fig, ax = plt.subplots(figsize=(6, 5))
    ax.pie(branch.values, labels=[f"{b} {v / branch.sum():.1%}" for b, v in branch.items()], colors=SLICES[: len(branch)], startangle=90, counterclock=False, wedgeprops={"edgecolor": "white", "linewidth": 2}, textprops={"color": INK, "fontsize": 9})
    ax.set_title("Graph 2. Pie chart of branch: share of problems per branch", loc="left", fontsize=10)
    save(fig, folder, "02-pie")

    fig, ax = plt.subplots(figsize=(7, 4))
    ax.hist(y, bins=edges, color=BLUE, edgecolor="white", linewidth=2)
    ax.set_xticks(edges)
    ax.set_xlabel(f"{unit}, classes of {BIN_WIDTH} years")
    ax.set_ylabel("problems, count")
    ax.set_title("Graph 3. Histogram of years to resolve", loc="left", fontsize=10)
    style(ax)
    save(fig, folder, "03-histogram")

    fig, ax = plt.subplots(figsize=(9, 4.2))
    values, counts = np.unique(y, return_counts=True)
    for v, c in zip(values, counts):
        ax.scatter(np.full(c, v), np.arange(1, c + 1), s=9, color=BLUE, linewidths=0)
    ax.set_xlabel(unit)
    ax.set_ylabel("problems stacked at each value, count")
    ax.set_title(f"Graph 4. Dotplot of years to resolve, one dot per problem, n = {len(y)}", loc="left", fontsize=10)
    style(ax)
    save(fig, folder, "04-dotplot")

    fig, ax = plt.subplots(figsize=(7, 4))
    mids = np.concatenate([[table["midpoint"].iloc[0] - BIN_WIDTH], table["midpoint"], [table["midpoint"].iloc[-1] + BIN_WIDTH]])
    freq = np.concatenate([[0], table["count"], [0]])
    ax.plot(mids, freq, color=BLUE, lw=2, marker="o", ms=6)
    ax.set_xticks(mids)
    ax.set_xlabel(f"class midpoint, {unit}")
    ax.set_ylabel("problems, count")
    ax.set_title("Graph 6. Frequency polygon of years to resolve", loc="left", fontsize=10)
    style(ax)
    save(fig, folder, "06-polygon")

    fig, ax = plt.subplots(figsize=(7, 4))
    ax.plot(edges, np.concatenate([[0], table["cumulative_relative"]]), color=BLUE, lw=2, marker="o", ms=6)
    ax.set_xticks(edges)
    ax.set_ylim(0, 1.03)
    ax.set_xlabel(f"upper class boundary, {unit}")
    ax.set_ylabel("cumulative proportion of problems")
    ax.set_title("Graph 7. Ogive of years to resolve", loc="left", fontsize=10)
    style(ax)
    save(fig, folder, "07-ogive")

    fig, ax = plt.subplots(figsize=(8, 2.8))
    ax.boxplot(y, orientation="horizontal", widths=0.5, patch_artist=True, boxprops={"facecolor": "#c9d9f2", "edgecolor": INK}, medianprops={"color": ORANGE, "lw": 2}, flierprops={"marker": "o", "markersize": 5, "markerfacecolor": "white", "markeredgecolor": INK})
    ax.set_yticks([])
    ax.set_xlabel(unit)
    ax.set_title(f"Graph 8. Boxplot of years to resolve: median {s['median']:.0f}, quartiles {s['q1']:.0f} and {s['q3']:.0f}, {len(s['flagged_ids'])} outliers", loc="left", fontsize=10)
    style(ax)
    save(fig, folder, "08-boxplot")

    x = cleaned[X].to_numpy(dtype=float)
    fig, ax = plt.subplots(figsize=(7, 4.4))
    ax.scatter(x, y, s=18, color=BLUE, edgecolors="white", linewidths=0.6)
    line = np.array([x.min(), x.max()])
    ax.plot(line, reg["intercept"] + reg["slope"] * line, color=ORANGE, lw=2)
    ax.text(line[0] + 5, reg["intercept"] + reg["slope"] * line[0] + 12, f"y = {reg['intercept']:.2f} + ({reg['slope']:.2f})x", color=INK, fontsize=9)
    ax.set_xlabel("year posed, calendar year")
    ax.set_ylabel(unit)
    ax.set_title("Graph 9. Scatterplot of year posed against years to resolve, with the fitted line", loc="left", fontsize=10)
    style(ax)
    save(fig, folder, "09-scatter")

    fig, ax = plt.subplots(figsize=(7, 4.4))
    ax.scatter(reg["fitted"], reg["resid"], s=18, color=BLUE, edgecolors="white", linewidths=0.6)
    ax.axhline(0, color=INK, lw=1)
    ax.set_xlabel("fitted years to resolve, years")
    ax.set_ylabel("residual, observed minus fitted, years")
    ax.set_title("Graph 10. Residuals against fitted years to resolve", loc="left", fontsize=10)
    style(ax)
    save(fig, folder, "10-residuals")

    floor = int(branch.min()) - 2
    for name, base, title in (("11-misleading", floor, f"Graph 11. Misleading bar chart of branch. Distortion: the count axis starts at {floor}"), ("12-corrected", 0, "Graph 12. Corrected bar chart of branch: the count axis starts at 0")):
        fig, ax = plt.subplots(figsize=(7, 4))
        ax.bar(branch.index, branch.values - base, bottom=base, color=BLUE, width=0.7)
        ax.set_ylim(base, branch.max() * 1.05)
        ax.set_ylabel("problems, count")
        ax.set_xlabel("branch")
        ax.set_title(title, loc="left", fontsize=10)
        if base:
            ax.text(0.98, 0.95, f"DISTORTION: axis truncated at {base}", transform=ax.transAxes, ha="right", va="top", fontsize=9, color=INK, bbox={"facecolor": "white", "edgecolor": ORANGE})
        plt.setp(ax.get_xticklabels(), rotation=30, ha="right")
        style(ax)
        save(fig, folder, name)

    fig, axes = plt.subplots(1, 2, figsize=(10, 3.8), sharex=True, sharey=True)
    bins = np.linspace(sim_means["mean"].min(), sim_means["mean"].max(), 31)
    for ax, size in zip(axes, SIM_SIZES):
        ax.hist(sim_means[sim_means["size"] == size]["mean"], bins=bins, color=BLUE, edgecolor="white", linewidth=1)
        ax.axvline(m["mu"], color=ORANGE, lw=2)
        ax.set_title(f"{SIM_GROUPS} sample means of years to resolve, n = {size}", loc="left", fontsize=10)
        ax.set_xlabel("sample mean, years")
        style(ax)
    axes[0].set_ylabel("samples, count")
    save(fig, folder, "13-sampling")


def tabular(frame, formats, header):
    cols = "l" + "r" * (len(header) - 1)
    lines = [r"\begin{tabular}{" + cols + "}", r"\toprule", " & ".join(header) + r" \\", r"\midrule"]
    for row in frame.itertuples(index=False):
        lines.append(" & ".join(f(v) for f, v in zip(formats, row)) + r" \\")
    lines += [r"\bottomrule", r"\end{tabular}"]
    return "\n".join(lines)


def fig(name, sentence):
    return "\\begin{center}\\includegraphics[width=0.82\\linewidth]{figures/" + name + ".pdf}\\end{center}\n\\noindent " + sentence + "\n"


def draft(title, words, body):
    return f"\\section*{{{title}}}\n\\noindent\\fbox{{\\parbox{{0.97\\linewidth}}{{\\textbf{{DRAFT for Gianangelo to rewrite in his own words. Target {words} words.}}}}}}\n\n\\medskip\n{body}\n"


def report(c):
    s, reg, pr, m, inf, sim = c["summary"], c["regression"], c["probability"], c["models"], c["inference"], c["simulation"]
    cleaned, table = c["cleaned"], c["grouped"]
    n = s["n"]
    decision = "reject" if inf["reject"] else "fail to reject"
    evidence = "provides" if inf["reject"] else "does not provide"
    agree = "agrees" if inf["reject"] != inf["mu0_in_interval"] else "disagrees"
    contains = "contains" if inf["contains_full_mean"] else "misses"
    out = [r"""\documentclass[11pt]{article}
\usepackage[margin=1in]{geometry}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{lmodern,booktabs,graphicx,longtable,amsmath,hyperref,parskip}
\hypersetup{colorlinks=true,urlcolor=blue}
\title{Years From Posed To Resolved: The Solvability Atlas\\\large MAT 124 Statistics Project}
\author{Gianangelo Dichio}
\date{""" + c["date"] + r"""}
\begin{document}
\maketitle
"""]
    out.append(draft("Abstract", "100 to 150", f"Objective: estimate the mean number of years a research problem stays open, from the year it was posed to the year it was resolved, for the solved problems in the Solvability Atlas. The data are {n} cleaned rows from the atlas problem table built on {c['date']}, one row per solved problem with both years recorded. Descriptive work used all {n} rows; inference used a sample of {SAMPLE_N} rows drawn with replacement from the cleaned records under seed {SEED}. The full-data mean is {r2(s['mean'])} years and the median is {r2(s['median'])} years. Year posed and years to resolve have $r = {r2(reg['r'])}$ and $R^2 = {r2(reg['r_squared'])}$. The 95\\% t interval from the sample is {r2(inf['low'])} to {r2(inf['high'])} years. The two-sided test of $\\mu = {MU0:.0f}$ gives $t = {r2(inf['t'])}$ and $p {pv(inf['p'])}$, so the sample {evidence} evidence against the benchmark at $\\alpha = 0.05$."))

    out.append(r"\section{Data Form}")
    out.append(r"\textbf{Approval.} The assignment lists approved public sources. This dataset is the author's own and sits outside that list, so the instructor's approval of the source is pending. Assignment 1 asks for three dataset choices; this form covers the first choice, and the second and third choices are still to be added.")
    out.append(r"\textbf{Source line.} Solvability Atlas problem table, Bucket Foundation; code MIT, each row under the licence in its \texttt{licence} column (CC BY-SA 4.0 for Wikipedia rows, Apache-2.0 for formal-conjectures rows, MIT for atlas rows, and four rows that cite an AAAS headline); download: \url{" + SOURCE_URL + "}.")
    out.append(f"\\textbf{{Source.}} Title: Solvability Atlas problem table. Creator: Bucket Foundation, Gianangelo Dichio. Accessed {c['date']}. Data period: problems posed from {int(cleaned[X].min())} to {int(cleaned[X].max())} and resolved from {int(cleaned['resolved'].min())} to {int(cleaned['resolved'].max())}. Files attached: \\texttt{{data/original.csv}} and \\texttt{{data/cleaned.csv}}.")
    out.append(f"\\textbf{{Population.}} Solved research problems recorded in the atlas with a posed year and a resolved year. One row is one problem. The file holds {c['original_rows']} problems, open and solved, compiled from public problem lists.")
    out.append(r"\textbf{Collection.} Observational. The rows were compiled from public lists: Wikipedia problem lists, science timelines and prize competition pages, the formal-conjectures repository and the atlas's own 71 curated problems. The sampling method of those lists is not reported. Limits on representation: a list favours well-known problems, and a problem enters this study only when both of its years were recorded, which leaves out most rows.")
    out.append(f"\\textbf{{Variables.}} X: year posed, calendar year, quantitative, interval level. Y: years from posed to resolved, in years, quantitative, ratio level. Category 1: branch, with labels {', '.join(sorted(cleaned[CAT1].unique()))}; categorical, nominal. Category 2: formal status, the state of a machine-checked proof, with labels {', '.join(sorted(cleaned[CAT2].unique()))}; categorical, ordinal.")
    out.append(f"\\textbf{{Feasibility.}} Total rows: {c['original_rows']}. Rows complete on the four variables after the filters: {n}. Filters and missing-value rules are the seven cleaning rules in the Data Check. No category is derived.")
    out.append(f"\\textbf{{Question.}} For solved research problems in the cleaned atlas table, is the mean time from posed to resolved equal to {MU0:.0f} years? Expected relationship: problems posed later have fewer years to resolve, because a recently posed problem that is already solved cannot have been open for long.")
    out.append(f"\\textbf{{Hypotheses.}} $H_0: \\mu = {MU0:.0f}$ years. $H_1: \\mu \\ne {MU0:.0f}$ years. The benchmark of {MU0:.0f} years is hypothetical. It was fixed in the code before the sample was drawn, and it stands for two research generations of 25 years each.")

    out.append(r"\section{Descriptive Statistics}")
    out.append(r"\subsection{Data Check}")
    out.append(f"Original rows: {c['original_rows']}. Removed: {c['original_rows'] - n}. Retained: {n}. Row IDs are the atlas \\texttt{{id}} values and are kept in every file. Rules apply in order, and a row is counted under the first rule it meets. The excluded row IDs, one per line with the rule, are in \\texttt{{data/excluded\\_rows.csv}}.")
    rules = pd.DataFrame(c["rule_counts"], columns=["rule", "rows"])
    out.append(r"\begin{center}" + tabular(rules, [tex, str], ["Cleaning rule", "Rows removed"]) + r"\end{center}")
    out.append("Missing values: a row missing either year is removed under R1 or R2, and no value is imputed. Duplicate records: no ID repeats, and a variant row that restates part of another problem is removed under R4. Implausible values: a resolved year earlier than the posed year would be removed under R5, and no row met that rule.")

    out.append(r"\subsection{Tables}")
    for cat, name in ((CAT1, "branch"), (CAT2, "formal status")):
        f = frequency(cleaned[cat]).reset_index()
        f.loc[len(f)] = ["Total", f["count"].sum(), f["relative"].sum()]
        out.append(f"Counts and relative frequencies of {name}, denominator {n} problems.")
        out.append(r"\begin{center}" + tabular(f, [tex, lambda v: str(int(v)), r4], [name.capitalize(), "Count", "Relative frequency"]) + r"\end{center}")
    cross = pd.crosstab(cleaned[CAT1], cleaned[CAT2])
    labels = list(cross.columns)
    rows = []
    for b, r in cross.iterrows():
        rows.append([b] + [f"{int(v)} ({v / r.sum():.4f})" for v in r] + [str(int(r.sum()))])
    rows.append(["Column total"] + [str(int(cross[l].sum())) for l in labels] + [str(int(cross.values.sum()))])
    out.append("Branch by formal status. Each cell holds the count and, in parentheses, the conditional row proportion; the denominator is the row total for that branch.")
    out.append(r"\begin{center}" + tabular(pd.DataFrame(rows), [tex] + [str] * (len(labels) + 1), ["Branch"] + [tex(l) for l in labels] + ["Row total"]) + r"\end{center}")
    out.append(f"Grouped Y. Classes are $[\\text{{lower}}, \\text{{upper}})$ in years. Sturges' rule gives $1 + \\log_2 {n} = {1 + math.log2(n):.2f}$, about nine classes; the range of {s['range']:.0f} years over nine classes is {s['range'] / 9:.2f} years, rounded to a width of {BIN_WIDTH} years so that boundaries fall on multiples of {BIN_WIDTH}.")
    g = table.copy()
    g.insert(0, "class", [f"{int(a)} to under {int(b)}" for a, b in zip(g["lower"], g["upper"])])
    g = g.drop(columns=["lower", "upper"])
    out.append(r"\begin{center}" + tabular(g, [str, lambda v: f"{v:.0f}", lambda v: str(int(v)), r4, lambda v: str(int(v)), r4], ["Class, years", "Midpoint", "Count", "Rel. freq.", "Cum. count", "Cum. rel. freq."]) + r"\end{center}")

    out.append(r"\subsection{Summaries}")
    summary = pd.DataFrame([["n", str(n)], ["Mean", r2(s["mean"])], ["Median", r2(s["median"])], ["Mode", ", ".join(str(v) for v in s["modes"]) + f" ({s['mode_count']} rows each)"], ["Sample variance", r2(s["variance"])], ["Sample standard deviation", r2(s["sd"])], ["Minimum", r2(s["min"])], ["Q1", r2(s["q1"])], ["Median", r2(s["median"])], ["Q3", r2(s["q3"])], ["Maximum", r2(s["max"])], ["Range", r2(s["range"])], ["IQR", r2(s["iqr"])], ["90th percentile", r2(s["p90"])]])
    out.append("Y is years from posed to resolved. Variance uses the $n - 1$ denominator. Quartiles and the percentile follow QUARTILE.INC and PERCENTILE.INC, which is linear interpolation in \\texttt{numpy.percentile}.")
    out.append(r"\begin{center}" + tabular(summary, [str, str], ["Statistic", "Value, years"]) + r"\end{center}")
    out.append(f"Fences: lower $= Q1 - 1.5 \\times IQR = {r2(s['q1'])} - 1.5({r2(s['iqr'])}) = {r2(s['fence_low'])}$; upper $= Q3 + 1.5 \\times IQR = {r2(s['q3'])} + 1.5({r2(s['iqr'])}) = {r2(s['fence_high'])}$. Flagged outliers: {len(s['flagged_ids'])}. Row IDs with their values: " + ", ".join(f"\\texttt{{{tex(i)}}} ({v})" for i, v in zip(s["flagged_ids"], s["flagged_values"])) + ".")
    out.append(f"With the flagged rows: mean {r2(s['mean'])}, sample SD {r2(s['sd'])}, n = {n}. Without them: mean {r2(s['mean_without'])}, sample SD {r2(s['sd_without'])}, n = {s['n_without']}. Both results are kept, and every later calculation uses all {n} rows.")
    out.append(f"z-score for \\texttt{{{tex(s['z_id'])}}} ({tex(s['z_title'])}): $z = ({s['z_value']:.0f} - {r2(s['mean'])}) / {r2(s['sd'])} = {r2(s['z'])}$. This problem stayed open {r2(abs(s['z']))} sample standard deviations {'above' if s['z'] > 0 else 'below'} the mean.")
    out.append(f"Within 1, 2 and 3 sample SDs of the mean: {r4(s['within'][1])}, {r4(s['within'][2])} and {r4(s['within'][3])} of rows as proportions. The histogram is right-skewed with skewness {r2(s['skew'])}, and the mean minus one SD is negative while Y has a floor of zero, so a bell-shaped model fits poorly; the proportions sit well above 0.68 at 1 SD and below 0.997 at 3 SDs. Chebyshev's theorem guarantees at least 75\\% within 2 SDs for any distribution, and the data show {r4(s['within'][2])}.")
    out.append(f"From class midpoints: mean {r2(c['grouped_mean'])} and sample SD {r2(c['grouped_sd'])}, against {r2(s['mean'])} and {r2(s['sd'])} from the raw data. The differences are ${r2(c['grouped_mean'] - s['mean'])}$ and ${r2(c['grouped_sd'] - s['sd'])}$ years.")
    means = cleaned.groupby(CAT1)[Y].agg(["count", "mean"]).reset_index()
    weighted = float((means["count"] * means["mean"]).sum() / means["count"].sum())
    out.append(r"\begin{center}" + tabular(means, [tex, lambda v: str(int(v)), r2], ["Branch", "Count", "Mean Y, years"]) + r"\end{center}")
    out.append("Weighted mean of the branch means: $" + " + ".join(f"{int(k)}({r2(v)})" for k, v in zip(means["count"], means["mean"])) + f"$, divided by {n}, equals {r2(weighted)}. The overall mean is {r2(s['mean'])}, so the two agree.")

    out.append(r"\subsection{Relationships}")
    out.append(f"Paired count: {reg['n']}. $r = {r2(reg['r'])}$. Regression equation: $\\hat y = {r2(reg['intercept'])} + ({r2(reg['slope'])})x$, with x the year posed and $\\hat y$ the years to resolve. $R^2 = {r2(reg['r_squared'])}$. Sum of squared residuals: {r2(reg['sse'])}.")
    out.append(f"Slope: each later posed year goes with {r2(abs(reg['slope']))} fewer years to resolve on average. Intercept: {r2(reg['intercept'])} years is the fitted value at year 0, far outside the observed years {reg['x_min']:.0f} to {reg['x_max']:.0f}, so it has no practical reading. $R^2$: year posed accounts for {pct(reg['r_squared'])} of the variation in years to resolve. The relationship is negative, roughly linear at the old end and weak to moderate in strength. The residuals fan out: they are wide for problems posed before 1900 and narrow for recent ones, and they are bounded below because Y cannot be negative.")
    out.append(f"Prediction at x = {PREDICT_X}, inside the observed range: $\\hat y = {r2(reg['intercept'])} + ({r2(reg['slope'])})({PREDICT_X}) = {r2(reg['predict_y'])}$ years. For \\texttt{{{tex(reg['row_id'])}}} ({tex(reg['row_title'])}): x = {reg['row_x']:.0f}, observed y = {reg['row_y']:.0f}, fitted {r2(reg['row_fitted'])}, residual {r2(reg['row_resid'])} years.")
    out.append(f"Extrapolation: the line gives negative years for posed years after {-reg['intercept'] / reg['slope']:.0f}, so it cannot be used beyond the data. Possible confounder: branch, since older rows come from mathematics and physics. Causal limit: the data are observational and hold solved problems only. A problem posed in 2010 can appear here with at most 16 years, so part of the negative slope comes from which rows can be in the table, and no causal claim follows.")

    out.append(r"\subsection{Graphs And Interpretation}")
    top = cleaned[CAT1].value_counts()
    out.append(fig("01-bar", f"Graph 1: {top.index[0]} has the most problems, {top.iloc[0]}, and {top.index[-1]} the fewest, {top.iloc[-1]}."))
    out.append(fig("02-pie", f"Graph 2: the two largest branches, {top.index[0]} and {top.index[1]}, hold {pct(top.iloc[:2].sum() / n)} of the problems."))
    out.append(fig("03-histogram", f"Graph 3: {table['count'].iloc[0]} of {n} problems fall in the first class, and counts drop off to a long right tail."))
    out.append(fig("04-dotplot", f"Graph 4: the dots pile up from 0 to about {s['q3']:.0f} years, thin out by 100, and leave gaps before the largest values."))
    out.append("\\noindent Graph 5. Stem plot of years to resolve. Key: \\texttt{12 | 3} means 123 years; the stem is tens of years and each leaf is one problem.\n\\begin{footnotesize}\\begin{verbatim}\n" + "\n".join(c["stem"]) + "\n\\end{verbatim}\\end{footnotesize}\n\\noindent " + f"Graph 5: {c['stem_low']} of {n} leaves sit on stems 0 to 9, and stems 20 to 32 are empty.")
    out.append(fig("06-polygon", f"Graph 6: the polygon peaks at the first midpoint, {table['midpoint'].iloc[0]:.0f} years, and falls steeply."))
    out.append(fig("07-ogive", f"Graph 7: a proportion of {r4(table['cumulative_relative'].iloc[0])} of problems resolved in under {BIN_WIDTH} years and {r4(table['cumulative_relative'].iloc[1])} in under {2 * BIN_WIDTH}."))
    out.append(fig("08-boxplot", f"Graph 8: the box runs from {s['q1']:.0f} to {s['q3']:.0f} years with the median at {s['median']:.0f}, and {len(s['flagged_ids'])} points sit beyond the upper fence of {r2(s['fence_high'])}."))
    out.append(fig("09-scatter", f"Graph 9: years to resolve fall as the posed year rises, $r = {r2(reg['r'])}$."))
    out.append(fig("10-residuals", "Graph 10: the residuals spread wider at large fitted values and have a hard lower edge, so the linear model's equal-spread assumption fails."))
    out.append(fig("11-misleading", "Graph 11: with the axis cut, the smallest branch looks close to empty and differences between branches look larger than they are."))
    out.append(fig("12-corrected", "Graph 12: from a zero baseline the bar heights are proportional to the counts."))
    out.append(f"Shape: one cluster near zero, strong right skew, gaps above 200 years and {len(s['flagged_ids'])} flagged values. The median, {r2(s['median'])} years, is the main measure of centre, because the long right tail pulls the mean up to {r2(s['mean'])}.")

    out.append(r"\section{Inferential Statistics}")
    out.append(r"\subsection{Probability}")
    out.append(f"Cutoff c = {CUTOFF} years. A: a problem took at least {CUTOFF} years. B: the problem is in {EVENT_BRANCH}.")
    two = pd.DataFrame([["B", pr["ab"], pr["nota_b"], pr["b"]], ["not B", pr["a_notb"], pr["nota_notb"], pr["n"] - pr["b"]], ["Total", pr["a"], pr["n"] - pr["a"], pr["n"]]])
    out.append(r"\begin{center}" + tabular(two, [str, str, str, str], ["", "A", "not A", "Total"]) + r"\end{center}")
    out.append(f"$P(A) = {pr['a']}/{pr['n']} = {r4(pr['p_a'])}$. $P(B) = {pr['b']}/{pr['n']} = {r4(pr['p_b'])}$. $P(A \\text{{ and }} B) = {pr['ab']}/{pr['n']} = {r4(pr['p_ab'])}$. $P(A \\text{{ or }} B) = {pr['a_or_b']}/{pr['n']} = {r4(pr['p_a_or_b'])}$. $P(A \\mid B) = {pr['ab']}/{pr['b']} = {r4(pr['p_a_given_b'])}$. $P(A)P(B) = {r4(pr['p_a_p_b'])}$, against $P(A \\text{{ and }} B) = {r4(pr['p_ab'])}$: the two differ by {r4(abs(pr['p_ab'] - pr['p_a_p_b']))}, so A and B are {'close to independent' if abs(pr['p_ab'] - pr['p_a_p_b']) < 0.01 else 'dependent'} in these data. $C(10,3) = {pr['c_10_3']}$ counts the ways to choose which 3 of 10 draws are the successes.")
    out.append(r"\subsection{Models}")
    out.append(f"Binomial. K counts A-successes in 10 uniform draws with replacement, p = {r4(m['p'])}. Conditions: a fixed number of 10 trials; two outcomes, A or not A; a constant p because draws are with replacement; independent draws. $P(K = 3) = C(10,3)\\,p^3(1-p)^7 = {r4(m['binom_k3'])}$. $P(K \\ge 1) = 1 - (1-p)^{{10}} = {r4(m['binom_ge1'])}$. Mean $= 10p = {r2(m['binom_mean'])}$. SD $= \\sqrt{{10p(1-p)}} = {r2(m['binom_sd'])}$.")
    out.append(f"Normal. Full-data mean $\\mu = {r2(m['mu'])}$ and population SD $\\sigma = {r2(m['sigma'])}$ years. $P(Y \\ge {CUTOFF}) = {r4(m['normal_tail'])}$ under the model, against the observed proportion {r4(m['observed_tail'])}. Modelled 90th percentile: {r2(m['normal_p90'])} years, against {r2(m['observed_p90'])} observed. The histogram is right-skewed and the model puts probability {r4(m['normal_below_zero'])} below zero years, so the fit is weak and these two results are model exercises.")
    out.append(r"\subsection{Sampling}")
    out.append(f"Reference population: all N = {n} cleaned rows, $\\mu = {r2(m['mu'])}$ and $\\sigma = {r2(m['sigma'])}$ years. Method: \\texttt{{numpy.random.default\\_rng({SEED}).integers(1, N + 1, {SAMPLE_N})}} draws {SAMPLE_N} independent uniform positions with replacement. Draws that repeat an earlier row: {inf['repeats']}. Positions, row IDs and values are saved in \\texttt{{sample\\_50.csv}}.")
    rows = [[f"n = {k}", r2(v["mean"]), r2(v["sd"]), r2(m["mu"]), r2(m["sigma"] / math.sqrt(k))] for k, v in sim.items()]
    out.append(f"Simulation: {SIM_GROUPS} samples of size 5 under seed {SEED + 1} and {SIM_GROUPS} of size 50 under seed {SEED + 2}, separate from the saved sample. Every draw ID is in \\texttt{{simulation\\_draws.csv}} and all 1,000 means are in \\texttt{{simulation\\_means.csv}}.")
    out.append(r"\begin{center}" + tabular(pd.DataFrame(rows), [str] * 5, ["Sample size", "Mean of means", "SD of means", r"$\mu$", r"$\sigma/\sqrt{n}$"]) + r"\end{center}")
    out.append(fig("13-sampling", f"Both histograms centre near $\\mu$, marked by the line. The spread shrinks from {r2(sim[5]['sd'])} at n = 5 to {r2(sim[50]['sd'])} at n = 50, close to $\\sigma/\\sqrt{{n}}$. At n = 5 the means keep the right skew of Y; at n = 50 the shape is closer to symmetric, as the central limit theorem predicts."))
    out.append(r"\subsection{Confidence Interval}")
    out.append(f"From the saved sample: n = {inf['n']}, $\\bar x = {r2(inf['mean'])}$, s = {r2(inf['sd'])}, SE $= {r2(inf['sd'])}/\\sqrt{{{inf['n']}}} = {r2(inf['se'])}$, df = {inf['df']}, $t^* = {r2(inf['t_crit'])}$, margin $= {r2(inf['t_crit'])} \\times {r2(inf['se'])} = {r2(inf['margin'])}$. Interval: ${r2(inf['mean'])} \\pm {r2(inf['margin'])}$, from {r2(inf['low'])} to {r2(inf['high'])} years.")
    out.append(f"Checks: the draws are independent by design. The sample is right-skewed, with median {r2(inf['sample_median'])} and maximum {inf['sample_max']:.0f} years, and n = 50 is large enough for the t procedure to be approximate; outliers widen the interval. Interpretation: we are 95\\% confident that the mean time from posed to resolved for the {n} cleaned atlas problems is between {r2(inf['low'])} and {r2(inf['high'])} years. Across repeated samples of 50 drawn this way, about 95\\% of the intervals built by this method would contain the reference mean. This interval {contains} the full-data mean of {r2(m['mu'])} years. The sample is kept as drawn.")
    out.append(r"\subsection{Hypothesis Test}")
    out.append(f"$H_0: \\mu = {MU0:.0f}$, $H_1: \\mu \\ne {MU0:.0f}$, $\\alpha = 0.05$. The benchmark of {MU0:.0f} years is hypothetical. $t = ({r2(inf['mean'])} - {MU0:.0f})/{r2(inf['se'])} = {r2(inf['t'])}$, df = {inf['df']}, p-value ${pv(inf['p'])}$. Decision: {decision} $H_0$. Conclusion: the sample {evidence} evidence that the mean time to resolve differs from {MU0:.0f} years.")
    out.append(f"The decision {agree} with the interval: {MU0:.0f} is {'inside' if inf['mu0_in_interval'] else 'outside'} {r2(inf['low'])} to {r2(inf['high'])}. The p-value is the probability, when the mean is {MU0:.0f} years, of a sample mean at least this far from {MU0:.0f} in either direction. A Type I error would be concluding the mean differs from {MU0:.0f} years when it equals {MU0:.0f}. A Type II error would be keeping {MU0:.0f} years when the mean differs. The sample mean minus the benchmark is ${r2(inf['difference'])}$ years, {pct(abs(inf['difference']) / MU0)} of the benchmark.")

    out.append(draft("Analysis", "150 to 200", f"Years from posed to resolved are right-skewed. Most solved problems in the atlas closed within a few decades: the median is {r2(s['median'])} years and the third quartile is {r2(s['q3'])}, while the mean is {r2(s['mean'])} because {len(s['flagged_ids'])} problems sit beyond the upper fence of {r2(s['fence_high'])} years. The median is the better centre. Year posed and years to resolve move in opposite directions, with $r = {r2(reg['r'])}$ and $R^2 = {r2(reg['r_squared'])}$; part of that slope comes from the table holding solved problems only, since a recent problem that is already solved has a short time by construction. The saved sample of {SAMPLE_N} rows has mean {r2(inf['mean'])} years, and its 95\\% interval, {r2(inf['low'])} to {r2(inf['high'])}, {contains} the full-data mean of {r2(m['mu'])}. The test of the {MU0:.0f}-year benchmark gives $p {pv(inf['p'])}$, so the sample leads us to {decision} $H_0$. The sample mean differs from the full-data mean by ${r2(inf['mean'] - m['mu'])}$ years, or {r2(abs(inf['mean'] - m['mu']) / inf['se'])} standard errors of {r2(inf['se'])}."))
    out.append(draft("Conclusion", "100 to 150", f"The research question asks whether solved atlas problems took {MU0:.0f} years on average. The sample {evidence} evidence against $H_0$: $t = {r2(inf['t'])}$, $p {pv(inf['p'])}$, and the interval runs from {r2(inf['low'])} to {r2(inf['high'])} years. Two limits apply. The table holds solved problems with both years recorded, so long-open problems that are still unsolved are missing and the mean understates how long problems stay open. The rows come from public lists that favour famous problems. One improvement: record a posed year for every row in the atlas, open or solved, so that open problems can enter as still running. The claim covers the {n} cleaned rows and no wider population of research problems."))

    out.append(r"\section*{References}")
    out.append(f"Bucket Foundation, Dichio, G. (2026). \\emph{{Solvability Atlas problem table}}, version of {c['date']}. \\url{{{SOURCE_URL}}}. Accessed {c['date']}.\n\nWikipedia contributors. Problem lists, science timelines and prize competition pages. CC BY-SA 4.0. The URL for each row is in \\texttt{{problems-sourced.tsv}} in the atlas folder.\n\nGoogle DeepMind. \\emph{{formal-conjectures}}. Apache-2.0. \\url{{https://github.com/google-deepmind/formal-conjectures}}.\n\nBenchmark: $\\mu_0 = {MU0:.0f}$ years is hypothetical and has no outside source.\n\nSoftware: Python with numpy, pandas, scipy and matplotlib; \\texttt{{stats\\_project.py}} reproduces every number under seed {SEED}.")
    out.append(r"\end{document}")
    return "\n\n".join(out)


def new_folder(root, date):
    k = 1
    while True:
        folder = root / (date if k == 1 else f"{date}-{k}")
        if not folder.exists():
            folder.mkdir(parents=True)
            return folder
        k += 1


def plain(value):
    if isinstance(value, dict):
        return {str(k): plain(v) for k, v in value.items() if not isinstance(v, (np.ndarray, pd.DataFrame))}
    if isinstance(value, (list, tuple)):
        return [plain(v) for v in value]
    if isinstance(value, (np.floating, np.integer)):
        return value.item()
    if isinstance(value, np.bool_):
        return bool(value)
    return value


def build(root=HERE, date=None, pdf=True):
    date = date or dt.date.today().isoformat()
    folder = new_folder(root, date)
    (folder / "data").mkdir()
    (folder / "figures").mkdir()
    original = load_original()
    cleaned, excluded, rule_counts = clean(original)
    if len(cleaned) < 100:
        raise ValueError(f"only {len(cleaned)} complete rows; the assignment needs 100")
    original.to_csv(folder / "data" / "original.csv", index=False)
    cleaned.to_csv(folder / "data" / "cleaned.csv", index=False)
    excluded.to_csv(folder / "data" / "excluded_rows.csv", index=False)
    table, edges = grouped(cleaned[Y].to_numpy(dtype=float))
    s = summaries(cleaned)
    gmean, gsd = grouped_estimates(table, s["n"])
    reg = regression(cleaned)
    pr = probability(cleaned)
    m = models(cleaned, pr["p_a"])
    sample = draw_sample(cleaned)
    sample.to_csv(folder / "sample_50.csv", index=False)
    draws, means = simulate(cleaned)
    draws.to_csv(folder / "simulation_draws.csv", index=False)
    means.to_csv(folder / "simulation_means.csv", index=False)
    sim = {size: {"mean": float(g["mean"].mean()), "sd": float(g["mean"].std(ddof=1))} for size, g in means.groupby("size")}
    inf = inference(sample, m["mu"])
    figures(cleaned, table, edges, s, reg, means, m, folder / "figures")
    stem = stem_lines(cleaned[Y])
    (folder / "figures" / "05-stem.txt").write_text("Graph 5. Stem plot of years to resolve. Key: 12 | 3 means 123 years.\n" + "\n".join(stem) + "\n")
    c = {"date": date, "seed": SEED, "mu0": MU0, "original_rows": len(original), "rule_counts": rule_counts, "cleaned": cleaned, "grouped": table, "summary": s, "grouped_mean": gmean, "grouped_sd": gsd, "regression": reg, "probability": pr, "models": m, "simulation": sim, "inference": inf, "stem": stem, "stem_low": int((cleaned[Y] < 100).sum())}
    calc = plain({k: v for k, v in c.items() if k not in ("cleaned", "grouped", "stem", "stem_low")})
    calc["grouped_table"] = table.to_dict(orient="records")
    (folder / "calculations.json").write_text(json.dumps(calc, indent=1) + "\n")
    (folder / "report.tex").write_text(report(c))
    shutil.copy(Path(__file__), folder / "stats_project.py")
    if pdf:
        for _ in range(2):
            subprocess.run(["pdflatex", "-interaction=nonstopmode", "-halt-on-error", "report.tex"], cwd=folder, check=True, capture_output=True)
        for ext in ("aux", "log", "out"):
            (folder / f"report.{ext}").unlink(missing_ok=True)
    return folder, c


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--no-pdf", action="store_true")
    args = parser.parse_args()
    folder, c = build(date=args.date, pdf=not args.no_pdf)
    print(folder)
    print(json.dumps(plain({"n": c["summary"]["n"], "mean": c["summary"]["mean"], "inference": c["inference"]}), indent=1))


if __name__ == "__main__":
    main()
