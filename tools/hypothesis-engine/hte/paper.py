"""`emit_paper`: a LaTeX paper built from one run's own artifacts.

Reads `MANIFEST.json`, `timeline.json`, `calibration.json` (when the run
executed one), and `self-report.json` from a run directory
(`hte.runner.run_campaign`'s own layout) and writes a paper into
`out_dir` that follows `papers/PAPER-STANDARDS.md`: `papers/template/`'s
`main.tex`/`bucket.sty`/`Makefile` copied as the starting point, a
paper-local `refs.bib` citing the design paper
(`papers/history-hypothesis-engine/main.tex`) and Josang's subjective-
logic monograph, and three deterministic matplotlib figure scripts under
`out_dir/figures/`.

Every number the body states is read out of the run's own artifact files
at emit time; nothing here is typed as a literal. Two figures the task
asks for, a per-hypothesis robustness table and a surprise-event list,
have no persisted per-item form in this package's current artifacts
(`hte.runner.run_campaign` keeps `robustness_results` and
`surprise_items` in memory and writes only their aggregate
`robustness_stable_fraction` and `surprise_rate` into `MANIFEST.json`);
this module states that gap in the Limitations section rather than
inventing rows no file backs, and renders the two aggregates it does
have.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from .artifacts import (
    CalibrationArtifact,
    ManifestArtifact,
    RunCounts,
    RunData,
    SelfReportArtifact,
    TimelineArtifact,
    load_run,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
TEMPLATE_DIR = REPO_ROOT / "papers" / "template"
COMMON_BIB = REPO_ROOT / "papers" / "bib" / "common.bib"
DESIGN_PAPER_TEX = REPO_ROOT / "papers" / "history-hypothesis-engine" / "main.tex"

_TEX_SPECIAL = {
    "&": r"\&", "%": r"\%", "$": r"\$", "#": r"\#", "_": r"\_",
    "{": r"\{", "}": r"\}", "~": r"\textasciitilde{}", "^": r"\textasciicircum{}",
    "\\": r"\textbackslash{}",
}


def tex_escape(value: Any) -> str:
    """Every LaTeX special character in `str(value)` escaped, so a
    hypothesis id, a slot label, or a campaign name lifted straight out
    of an artifact file never breaks the build."""
    return "".join(_TEX_SPECIAL.get(ch, ch) for ch in str(value))


def _fmt(value: Any, nd: int = 3) -> str:
    """A LaTeX-safe rendering of one artifact value: `None` (`hte.
    artifacts`'s own fallback for a field a run's own artifact files
    left out, module docstring) reads `not recorded`, a bool reads
    `true`/`false`, a float rounds to `nd` places, everything else is
    escaped and stringified."""
    if value is None:
        return "not recorded"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float):
        return f"{value:.{nd}f}"
    if isinstance(value, int):
        return str(value)
    return tex_escape(value)


def _run_date(timestamp: str) -> str:
    """`"20260910T001819Z"` (`hte.runner.run_campaign`'s own timestamp
    format) as `"2026-09-10"`, or `"2026"` when `timestamp` is too short
    to hold a full date (an empty or malformed manifest field)."""
    if len(timestamp) < 8:
        return "2026"
    return f"{timestamp[0:4]}-{timestamp[4:6]}-{timestamp[6:8]}"


def _title_case(campaign: str) -> str:
    words = [w for w in re.split(r"[-_]+", campaign) if w]
    return " ".join(w if w.isupper() else w.capitalize() for w in words)


# `RunData`/`load_run` are `hte.artifacts`'s own contract, re-exported
# here (rather than redefined) so every number this module prints reads
# through the one loader `hte.runner.run_campaign` writes against
# (`hte.artifacts`'s own module docstring names the drift this closes:
# `hte.paper` used to carry its own copy of this dataclass and a direct
# `data.calibration['n_sources']` index that crashed the moment `hte.
# calibrate`'s own output shape moved out from under it, with nothing
# catching the two falling out of sync). `hte/paper.py`'s public API
# keeps both names so `from hte import paper; paper.load_run(...)` and
# `paper.RunData(...)` still work for every existing caller and test.


# --------------------------------------------------------------------------
# Data digests shared between the LaTeX body and the figure scripts
# --------------------------------------------------------------------------


def _deduped_posteriors(timeline: TimelineArtifact) -> dict[str, float]:
    """Every distinct hypothesis id's own posterior, read off
    `timeline.bins[*]["ranked_hypotheses"]` (the only place a run's
    per-hypothesis posterior survives to disk), first occurrence wins.
    The same hypothesis can appear in more than one bin's top-`k` list
    only if its own interval spans that bin's own start, which none of
    this package's shipped generators produce; de-duplication is kept
    here anyway, as a documented defensive read rather than an assumed
    invariant."""
    out: dict[str, float] = {}
    for b in timeline.bins:
        for entry in b.get("ranked_hypotheses", []):
            posterior = entry.get("posterior")
            hid = entry.get("hypothesis_id")
            if hid is not None and posterior is not None and hid not in out:
                out[hid] = posterior
    return out


def _bin_rows(timeline: TimelineArtifact) -> list[dict[str, Any]]:
    rows = []
    for b in timeline.bins:
        ranked = b.get("ranked_hypotheses", [])
        top = ranked[0] if ranked else None
        rows.append({
            "index": b["time_bin"]["index"],
            "n": len(ranked),
            "top_id": top["hypothesis_id"] if top else None,
            "top_posterior": top["posterior"] if top else None,
            "top_elo": top["elo"] if top else None,
        })
    return rows


# --------------------------------------------------------------------------
# Figure scripts (written into out_dir/figures/, run once at emit time and
# again by `make figures`)
# --------------------------------------------------------------------------

_FIG_HEADER = '''"""Deterministic figure for {label}, generated from `{source}`.

Part of the Bucket Foundation Figures rule (`papers/PAPER-STANDARDS.md`):
every figure is a script under this paper's own `figures/` directory,
rebuilt by `make figures`, and takes no random seed it does not fix. This
script's one input is the run directory this paper reports on, baked in
below as `RUN_DIR`: the paper is a report on that one run, so the figure
has no meaning re-pointed at a different run without regenerating the
whole paper alongside it.

Run:
    python3 figures/{stem}.py
Writes:
    figures/{stem}.png
"""
from __future__ import annotations

import json
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "{stem}.png")
RUN_DIR = {run_dir!r}
'''


def _fig_opinion_histogram_script(run_dir: Path) -> str:
    body = _FIG_HEADER.format(
        label="the survivor opinion distribution", source="timeline.json",
        stem="fig_opinion_histogram", run_dir=str(run_dir.resolve()),
    ) + '''

def main() -> None:
    timeline = json.loads(open(os.path.join(RUN_DIR, "timeline.json")).read())
    seen = {}
    for b in timeline.get("bins", []):
        for entry in b.get("ranked_hypotheses", []):
            hid, posterior = entry.get("hypothesis_id"), entry.get("posterior")
            if hid is not None and posterior is not None and hid not in seen:
                seen[hid] = posterior
    values = list(seen.values())

    fig, ax = plt.subplots(figsize=(4.6, 3.0), dpi=200)
    if values:
        ax.hist(values, bins=min(10, max(1, len(set(values)))), color="#14417a", edgecolor="white")
    ax.set_xlabel("projected posterior $P(h)$")
    ax.set_ylabel("survivor count")
    ax.set_title(f"opinion distribution ({len(values)} survivors)")
    ax.set_xlim(0.0, 1.0)
    fig.tight_layout()
    fig.savefig(OUT)
    plt.close(fig)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
'''
    return body


def _fig_bin_topk_script(run_dir: Path) -> str:
    body = _FIG_HEADER.format(
        label="the top-ranked hypotheses per time bin", source="timeline.json",
        stem="fig_bin_topk", run_dir=str(run_dir.resolve()),
    ) + '''

def main() -> None:
    timeline = json.loads(open(os.path.join(RUN_DIR, "timeline.json")).read())
    bins = timeline.get("bins", [])

    fig, axes = plt.subplots(1, max(1, len(bins)), figsize=(4.2 * max(1, len(bins)), 3.0), dpi=200, squeeze=False)
    for ax, b in zip(axes[0], bins or [{"time_bin": {"index": "n/a"}, "ranked_hypotheses": []}]):
        ranked = b.get("ranked_hypotheses", [])
        labels = [r["hypothesis_id"][:8] for r in ranked]
        values = [r.get("posterior") or 0.0 for r in ranked]
        ax.bar(range(len(values)), values, color="#14417a")
        ax.set_xticks(range(len(labels)))
        ax.set_xticklabels(labels, rotation=60, ha="right", fontsize=6)
        ax.set_ylim(0.0, 1.0)
        ax.set_title(f"bin {b['time_bin']['index']}")
        ax.set_ylabel("posterior")
    fig.tight_layout()
    fig.savefig(OUT)
    plt.close(fig)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
'''
    return body


def _fig_calibration_curve_script(run_dir: Path) -> str:
    body = _FIG_HEADER.format(
        label="the discovery-date holdout calibration curve", source="calibration.json",
        stem="fig_calibration_curve", run_dir=str(run_dir.resolve()),
    ) + '''

def main() -> None:
    path = os.path.join(RUN_DIR, "calibration.json")
    fig, ax = plt.subplots(figsize=(4.2, 4.0), dpi=200)
    ax.plot([0, 1], [0, 1], color="#5f5f5f", linewidth=0.8, linestyle="--", label="perfect calibration")

    if os.path.isfile(path):
        calibration = json.loads(open(path).read())
        curve = [b for b in calibration.get("calibration_curve", []) if b.get("count", 0) > 0]
        xs = [b["mean_predicted"] for b in curve]
        ys = [b["mean_observed"] for b in curve]
        sizes = [20 + 15 * b["count"] for b in curve]
        ax.scatter(xs, ys, s=sizes, color="#14417a", zorder=3, label="observed bins")
        title = f"calibration curve (brier={calibration.get('brier_score')})"
    else:
        title = "calibration curve (no calibration.json for this run)"

    ax.set_xlabel("mean predicted probability")
    ax.set_ylabel("mean observed outcome")
    ax.set_xlim(-0.02, 1.02)
    ax.set_ylim(-0.02, 1.02)
    ax.set_title(title, fontsize=9)
    ax.legend(fontsize=7, loc="upper left")
    fig.tight_layout()
    fig.savefig(OUT)
    plt.close(fig)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
'''
    return body


def _write_figures(out_dir: Path, run_dir: Path) -> list[str]:
    figures_dir = out_dir / "figures"
    figures_dir.mkdir(parents=True, exist_ok=True)
    scripts = {
        "fig_opinion_histogram.py": _fig_opinion_histogram_script(run_dir),
        "fig_bin_topk.py": _fig_bin_topk_script(run_dir),
        "fig_calibration_curve.py": _fig_calibration_curve_script(run_dir),
    }
    for name, content in scripts.items():
        (figures_dir / name).write_text(content)
    return sorted(scripts)


def run_figure_scripts(out_dir: Path) -> None:
    """Runs every `figures/fig_*.py` script under `out_dir`, in name
    order, the same work `make figures` does (`papers/template/
    Makefile`'s own `figures` target, one `python3` invocation per
    script)."""
    figures_dir = out_dir / "figures"
    for script in sorted(figures_dir.glob("fig_*.py")):
        # `script` is resolved to an absolute path before the subprocess
        # call: a relative `script` combined with `cwd=out_dir` would be
        # re-resolved against `out_dir` a second time (out_dir was
        # already folded into `script` by the glob above), pointing at a
        # path that does not exist.
        subprocess.run(
            ["python3", str(script.resolve())], cwd=out_dir, check=True, capture_output=True, text=True,
        )


# --------------------------------------------------------------------------
# refs.bib, bucket.sty, Makefile
# --------------------------------------------------------------------------

_REFS_BIB = '''% refs.bib: paper-specific references for this generated campaign report.
%
% bkthte2026design is Bucket Foundation's own companion technical report,
% held in this repository at papers/history-hypothesis-engine/main.tex, not
% indexed anywhere a DOI or arXiv lookup would find it. PAPER-STANDARDS.md's
% "every entry carries a DOI or an arXiv id" rule is written for external
% literature checked against doi.org, arxiv.org, or Crossref; an internal
% companion report has no such external record to check against, and its
% accuracy is verified the way any file in this repository is, by reading
% it directly, rather than by an index lookup. Documented here the same way
% papers/bib/common.bib documents its own dropped entries and why
% (PAPER-STANDARDS.md, "Bibliography verification"). `hte.referee`'s own
% citation check treats an entry carrying a `note` field naming "unpublished
% manuscript" as this documented, disclosed exception rather than a silent
% violation.
@unpublished{bkthte2026design,
  author = {{Bucket Foundation}},
  title  = {A Hypothesis Engine over History},
  note   = {Unpublished manuscript, Bucket Foundation. Held in this repository at papers/history-hypothesis-engine/main.tex; internal companion report, no DOI or arXiv id, see this file's own header comment.},
  year   = {2026},
}
'''


def _write_refs_bib(out_dir: Path) -> None:
    (out_dir / "refs.bib").write_text(_REFS_BIB)


def _write_bucket_sty(out_dir: Path) -> None:
    shutil.copyfile(TEMPLATE_DIR / "bucket.sty", out_dir / "bucket.sty")


_MAKEFILE = '''# Makefile: generated campaign-report paper, copied from
# papers/template/Makefile (see papers/PAPER-STANDARDS.md). Only PAPER and
# the figures target's script list differ from the template's own file.

PAPER   := main
PYTHON  := python3

.PHONY: pdf figures lint clean

pdf: figures
\tpdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex
\tbiber $(PAPER)
\tpdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex
\tpdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex

figures:
\t$(PYTHON) figures/fig_opinion_histogram.py
\t$(PYTHON) figures/fig_bin_topk.py
\t$(PYTHON) figures/fig_calibration_curve.py

lint:
\t@tmp=.lint-tmp.md; \\
\tcp $(PAPER).tex "$$tmp"; \\
\tstatus=0; \\
\tagf-lint-voice check "$$tmp" || status=$$?; \\
\trm -f "$$tmp"; \\
\texit $$status

clean:
\trm -f $(PAPER).aux $(PAPER).bbl $(PAPER).bcf $(PAPER).blg $(PAPER).log \\
\t      $(PAPER).out $(PAPER).run.xml $(PAPER).synctex.gz $(PAPER).toc \\
\t      $(PAPER).pdf
\trm -f figures/*.png
'''


def _write_makefile(out_dir: Path) -> None:
    (out_dir / "Makefile").write_text(_MAKEFILE)


# --------------------------------------------------------------------------
# main.tex body
# --------------------------------------------------------------------------


def _glossary_entries() -> str:
    entries = [
        ("opinion", "opinion", "hte/belief.py", "A subjective-logic opinion $(b, d, u, a)$: belief, disbelief, uncertainty mass, and base rate, fused from pooled supporting and refuting evidence weight against a total-ignorance constant $W$."),
        ("posterior", "projected posterior", "hte/belief.py", "$P(h) = b(h) + a(h) \\cdot u(h)$, an opinion's single-number projection, used to rank hypotheses within a time bin."),
        ("missingmass", "missing mass", "hte/unknowns.py", "The Good-Turing estimate of the address-space share made of hypotheses observed exactly once across a campaign's generation seeds."),
        ("targetblind", "target-blind", "hte/runner.py", "A generation or judging pass that applies the identical standard regardless of whether the reading under test is the consensus or a fringe one; tracked run over run as the non-consensus actor/mechanism proposal rate."),
        ("coverageinterval", "coverage interval", "hte/unknowns.py", "A Chao1-based 95\\% band on how much of the address space this campaign's generation seeds have observed, \\texttt{hte.unknowns.coverage\\_interval}."),
    ]
    out = []
    for key, term, path, definition in entries:
        url = f"https://github.com/AGFarms/bucket-foundation/blob/master/tools/hypothesis-engine/{path}"
        out.append(f"\\glossentry{{{key}}}{{{term}}}%\n  {{{url}}}%\n  {{{definition}}}")
    return "\n\n".join(out)


def _abstract(data: RunData) -> str:
    counts = data.counts
    coverage = counts.coverage
    target_blind = counts.target_blind
    cal = data.calibration
    calibration_line = (
        f"A {'discovery-date' if cal.mode in (None, 'discovery_date') else 'k-fold'} holdout over "
        f"{_fmt(cal.n_holdout_events)} held-out ground-truth events ({_fmt(cal.n_covered_events)} covered "
        f"by this run's own pre-holdout evidence) scored a Brier score of {_fmt(cal.brier_score)}."
        if cal else
        "This run executed no discovery-date or k-fold holdout (this corpus's own ground truth offered "
        "nothing to hold out, or calibration was disabled)."
    )
    return (
        f"We report one automated run of the Bucket Foundation history hypothesis engine "
        f"\\autocite{{bkthte2026design}} over the {tex_escape(_title_case(data.campaign))} corpus, "
        f"with no human editing any hypothesis, evidence item, or score. From "
        f"{_fmt(counts.n_sources)} sources and {_fmt(counts.n_evidence)} evidence items, "
        f"the engine generated {_fmt(counts.n_hypotheses_generated)} distinct hypothesis addresses "
        f"and carried {_fmt(counts.n_survivors)} past its critic filter to scoring and the ranking "
        f"tournament. A Chao1 coverage estimate over the generation seeds put the observed share of the "
        f"address space at {_fmt(coverage.coverage_low)} to {_fmt(coverage.coverage_high)}, "
        f"with a Good-Turing missing-mass estimate of {_fmt(coverage.missing_mass)}. "
        f"{_fmt(round((counts.robustness_stable_fraction or 0.0) * 100, 1))}\\% of survivors held a "
        f"stable projected probability across the four prior-belief profiles this package ships. "
        f"{calibration_line} The generator's own target-blind check reported a non-consensus actor or "
        f"mechanism proposal rate of {_fmt(target_blind.rate)} "
        f"({'its first run for this campaign, so nothing to compare against yet' if target_blind.first_run else 'steady against the previous run' if target_blind.steady else 'not steady against the previous run'}). "
        f"We state every number in this report from the run's own persisted artifacts, and list where those "
        f"artifacts stop short of a full per-hypothesis accounting in \\Cref{{sec:limitations}}."
    )


def _method(data: RunData) -> str:
    cfg = data.manifest.config
    extraction = data.manifest.extraction
    extraction_line = (
        f"An extraction ensemble of three independent passes ran once over this corpus's first document "
        f"(\\texttt{{{tex_escape(extraction.get('doc_id'))}}}), producing {_fmt(extraction.get('items'))} evidence "
        f"items at an agreement score of {_fmt(extraction.get('agreement'))}"
        f"{' after escalating to the ensemble adjudicator' if extraction.get('escalated') else ''}."
        if extraction else
        "This run's config disabled the extraction ensemble, or the corpus offered no document for it to run over."
    )
    return (
        "This report's own campaign follows the engine loop the design paper diagrams "
        f"\\autocite{{bkthte2026design}}: corpus ingestion, an optional extraction-ensemble pass, "
        "vocabulary growth from the unknown-unknown role, a combinatorial-plus-evidence-driven generation "
        "pass repeated across a fixed number of seeds, an LLM critic filter, a preservation critique against "
        "the shipped detectability table, subjective-logic belief scoring \\autocite{josang2016subjective}, "
        "a Swiss-style ranking tournament, robustness and surprise measurement across four prior-belief "
        "profiles, a Chao1 coverage estimate over the generation seeds, an optional discovery-date holdout "
        "calibration, and a self-report closing the run.\n\n"
        f"{extraction_line}\n\n"
        f"This run used {_fmt(cfg.get('seeds'))} generation seeds, {_fmt(cfg.get('generate_n'))} "
        f"LLM-proposed placements per seed, a combinatorial sweep capped at {_fmt(cfg.get('combinatorial_max_items'))} "
        f"items per seed, a {_fmt(cfg.get('max_hypotheses'))}-hypothesis cap into scoring, "
        f"{_fmt(cfg.get('tournament_rounds'))} tournament rounds, and {_fmt(cfg.get('resolution'))}-level time "
        f"resolution. \\Cref{{tab:models}} lists which model backed each engine-loop role for this run."
    )


def _models_table(data: RunData) -> str:
    models = data.manifest.models.get("roles", {})
    rows = "\n    ".join(
        f"{tex_escape(role)} & \\texttt{{{tex_escape(model)}}} \\\\" for role, model in sorted(models.items())
    )
    return rows


def _bins_table_rows(data: RunData) -> str:
    rows = _bin_rows(data.timeline)
    if not rows:
        return "\\multicolumn{4}{c}{no bins were populated this run} \\\\"
    lines = []
    for r in rows:
        top_id = f"\\texttt{{{tex_escape(r['top_id'])}}}" if r["top_id"] else "n/a"
        lines.append(f"{r['index']} & {r['n']} & {top_id} & {_fmt(r['top_posterior'])} \\\\")
    return "\n    ".join(lines)


def _results(data: RunData) -> str:
    counts = data.counts
    coverage = counts.coverage
    n_events = len(data.timeline.event_views)
    n_pairs = len(data.timeline.pair_views)
    vocab_added = counts.vocab_added
    by_slot: dict[str, int] = {}
    for v in vocab_added:
        by_slot[v.get("slot", "unknown")] = by_slot.get(v.get("slot", "unknown"), 0) + 1
    vocab_line = ", ".join(f"{n} {slot}" for slot, n in sorted(by_slot.items())) or "none"

    meta_review = counts.meta_review
    meta_review_block = (
        (meta_review.get("summary", "") or "").strip() + "\n\nFlags:\n" +
        "\n".join(f"- {f}" for f in meta_review.get("flags", [])) +
        "\n\nRecommended actions:\n" +
        "\n".join(f"- {a}" for a in meta_review.get("recommended_actions", []))
    ) if meta_review else "(this run's meta-review returned nothing)"

    return (
        f"\\Cref{{tab:bins}} lists, for every time bin this run scored, how many placement hypotheses ranked "
        f"into it and the highest-posterior survivor found there. \\Cref{{fig:bin-topk}} plots the full "
        f"top-$k$ posterior ranking per bin, and \\Cref{{fig:opinion-hist}} plots the projected-posterior "
        f"distribution across every distinct survivor these bins name. Beyond the per-bin view, this run's "
        f"survivors resolved into {_fmt(n_events)} competing-placement event groups (hypotheses sharing an "
        f"object and place) and {_fmt(n_pairs)} competing-sequence pair groups.\n\n"
        f"The unknown-unknown role grew the vocabulary by {_fmt(len(vocab_added))} concepts this run "
        f"({tex_escape(vocab_line)}). The Chao1 coverage estimate over this run's generation seeds put the "
        f"observed hypothesis count at {_fmt(coverage.observed)} against a Chao1 estimate of "
        f"{_fmt(coverage.chao1_estimate, nd=1)}, a missing-mass estimate of "
        f"{_fmt(coverage.missing_mass)}, and a 95\\% coverage band of "
        f"[{_fmt(coverage.coverage_low)}, {_fmt(coverage.coverage_high)}].\n\n"
        f"\\Cref{{tab:robustness}} summarizes robustness across the four prior-belief profiles "
        f"(\\texttt{{consensus}}, \\texttt{{skeptic}}, \\texttt{{fringe}}, \\texttt{{uniform}}); the underlying "
        f"per-hypothesis projections are not themselves persisted by this run (\\Cref{{sec:limitations}}), so "
        f"only the aggregate stable/unstable split is reported. The surprise rate, evidence naming no address "
        f"any survivor materialized, was {_fmt(counts.surprise_rate)} "
        f"({_fmt(round((counts.surprise_rate or 0.0) * (counts.n_evidence or 0)))} of "
        f"{_fmt(counts.n_evidence)} evidence items, by the same reasoning).\n\n"
        f"The evolver's meta-review pass, reading this run's whole survivor population and its opinions at "
        f"once, reported the following. This is the role's own output, quoted verbatim: paraphrasing a "
        f"model's structural read of its own run risks losing the detail a meta-review pass exists to "
        f"surface.\n"
        f"% voice-ignore-next 40\n"
        f"\\begin{{quote}}\\small\n\\begin{{verbatim}}\n{meta_review_block}\n\\end{{verbatim}}\n\\end{{quote}}"
    )


def _robustness_rows(data: RunData) -> str:
    counts = data.counts
    n = counts.n_survivors or 0
    fraction = counts.robustness_stable_fraction
    if fraction is None or not n:
        return "Stable & n/a \\\\\n    Unstable & n/a \\\\\n    Total & " + _fmt(n) + " \\\\"
    stable = round(fraction * n)
    unstable = n - stable
    return f"Stable & {stable} \\\\\n    Unstable & {unstable} \\\\\n    Total & {n} \\\\"


def _calibration(data: RunData) -> str:
    if not data.calibration:
        return (
            "This run executed no discovery-date or k-fold holdout: either this corpus's own ground truth "
            "offered nothing to hold out (\\texttt{hte.calibrate.choose\\_holdout\\_mode}), or the run's own "
            "config disabled calibration outright. \\Cref{fig:calibration-curve} still renders, with a plain "
            "diagonal reference line and no observed points, so a reader comparing several run reports side "
            "by side sees the same figure slot either way."
        )
    cal = data.calibration
    rows = []
    for b in cal.calibration_curve:
        if b.get("count", 0) == 0:
            continue
        # The bin label is wrapped in a brace group: a bare `[` right
        # after a table row's own `\\` parses as that command's optional
        # `\\[<dimension>]` row-spacing argument instead of table text,
        # which is exactly what happened here before this fix (a
        # "Runaway argument" fatal error from `pdflatex`).
        rows.append(
            f"{{[}}{b['bin_low']:.1f}, {b['bin_high']:.1f}{{)}} & {b['count']} & {_fmt(b['mean_predicted'])} & {_fmt(b['mean_observed'])} \\\\"
        )
    rows_text = "\n    ".join(rows) if rows else "\\multicolumn{4}{c}{no non-empty calibration bins} \\\\"
    constants = cal.constants
    # `cal.mode` reads `None` for a run written before `hte.calibrate`'s
    # own `bkt-hte-calibration-redesign` (`hte.artifacts`'s own module
    # docstring), every one of which ran discovery-date holdout, the only
    # mode that predates the field; `"discovery_date"` and `None` are
    # read the same way here for that reason.
    mode_line = (
        f"This run held out sources by discovery date at a cutoff of {_fmt(cal.cutoff_years)}"
        if cal.mode in (None, "discovery_date") else
        f"This run held out evidence via {_fmt(cal.k)}-fold cross-validation (seed {_fmt(cal.seed)})"
    )
    return (
        f"{mode_line}, scoring {_fmt(cal.n_holdout_events)} held-out ground-truth events "
        f"({_fmt(cal.n_covered_events)} covered by this run's own pre-holdout evidence) under belief "
        f"constants $W={_fmt(constants.get('W'), nd=1)}$, $\\lambda={_fmt(constants.get('lam'), nd=2)}$. "
        f"The resulting Brier score was {_fmt(cal.brier_score)}. "
        f"\\Cref{{tab:calibration}} lists every non-empty reliability bin; \\Cref{{fig:calibration-curve}} plots "
        f"the same bins against the diagonal a perfectly calibrated run would sit on.\n\n"
        f"\\begin{{table}}[htbp]\n  \\centering\n  \\caption{{Discovery-date/k-fold holdout reliability bins.}}\n"
        f"  \\label{{tab:calibration}}\n  \\begin{{tabular}}{{@{{}}lccc@{{}}}}\n    \\toprule\n"
        f"    Predicted bin & Count & Mean predicted & Mean observed \\\\\n    \\midrule\n    {rows_text}\n"
        f"    \\bottomrule\n  \\end{{tabular}}\n\\end{{table}}"
    )


def _limitations(data: RunData) -> str:
    sr_block = json.dumps(asdict(data.self_report), indent=2)
    return (
        "Two of this run's own aggregates, robustness and surprise, are reported here only as the single "
        "scalar `MANIFEST.json` carries (\\texttt{robustness\\_stable\\_fraction}, \\texttt{surprise\\_rate}); "
        "the per-hypothesis projections and the per-item surprise list that produced those scalars live only "
        "in the process's own memory during a run and are not written to any file this paper can read. A "
        "future run that persists them would let a later paper over this same campaign carry both as real "
        "tables instead.\n\n"
        "The run's own self-report follows, quoted verbatim, exactly as the self-report role returned it: "
        "its assumptions, which slot vocabularies it judged incomplete, its missing-mass estimate, its "
        "calibration summary, and its target-blind check.\n"
        f"% voice-ignore-next 60\n"
        f"\\begin{{quote}}\\small\n\\begin{{verbatim}}\n{sr_block}\n\\end{{verbatim}}\n\\end{{quote}}"
    )


_MAIN_TEX = r"""% main.tex: generated campaign report, {campaign}, run {run_id}.
%
% Written by hte.paper.emit_paper from this run's own artifacts
% (MANIFEST.json, timeline.json, calibration.json, self-report.json under
% {run_dir}). Load order, biblatex then hyperref then bucket.sty, and every
% other convention here follow papers/PAPER-STANDARDS.md; papers/template/
% is this file's own starting point.
\documentclass[11pt]{{article}}

\usepackage[margin=1in]{{geometry}}
\usepackage[T1]{{fontenc}}
\usepackage{{csquotes}}

\usepackage[backend=biber,style=numeric,sorting=none,maxnames=3,minnames=1]{{biblatex}}
\addbibresource{{refs.bib}}
\addbibresource{{{common_bib}}}

\usepackage{{hyperref}}

\usepackage{{bucket}}

\hypersetup{{
  colorlinks = true,
  linkcolor  = bucketblue,
  citecolor  = bucketblue,
  urlcolor   = bucketblue,
}}

{glossary_entries}

\title{{{title}}}
\author{{Bucket Foundation}}
\date{{{date}}}

\begin{{document}}
\maketitle

\begin{{abstract}}
{abstract}
\end{{abstract}}

\section{{Introduction}}
\label{{sec:intro}}

One run of the Bucket Foundation history hypothesis engine produced
every result below, campaign \texttt{{{campaign_escaped}}}, run id
\texttt{{{run_id}}}, with no step in the run editing a hypothesis,
evidence item, or score by hand. \Cref{{sec:method}} names the
engine-loop stages this run executed and their config; \Cref{{sec:results}}
and \Cref{{sec:calibration}} state every quantitative outcome;
\Cref{{sec:limitations}} names what this run's own artifacts do not
carry.

\section{{Related work}}
\label{{sec:related}}

The design and every definition this report depends on, the address
space, the subjective-logic belief model, structural unknowns, and the
engine loop itself, are stated and proved once, in the companion
design paper \autocite{{bkthte2026design}}; this report adds no new
definition of its own. The belief model's own subjective-logic
foundation is Josang's \autocite{{josang2016subjective}}.

\section{{Preliminaries}}
\label{{sec:prelim}}

Every term below is defined in full in the design paper's own
Preliminaries and proved in its Lean listings; this section links each
one to the module that implements it rather than restating the
definition. An \term{{opinion}}{{opinion}} $(b, d, u, a)$ projects to a
single \term{{posterior}}{{posterior}} $P(h) = b + a u$. A campaign's
\term{{missingmass}}{{missing mass}} and \term{{coverageinterval}}{{coverage
interval}} come from a Chao1 estimate over its generation seeds. A
\term{{targetblind}}{{target-blind}} check compares this run's own
non-consensus proposal rate against the run before it.

\section{{Method}}
\label{{sec:method}}

{method}

\begin{{table}}[htbp]
  \centering
  \caption{{Model backing each engine-loop role for this run.}}
  \label{{tab:models}}
  \begin{{tabular}}{{@{{}}ll@{{}}}}
    \toprule
    Role & Model \\
    \midrule
    {models_rows}
    \bottomrule
  \end{{tabular}}
\end{{table}}

\section{{Results}}
\label{{sec:results}}

{results}

\begin{{table}}[htbp]
  \centering
  \caption{{Per-bin hypothesis counts and the top-ranked survivor in each.}}
  \label{{tab:bins}}
  \begin{{tabular}}{{@{{}}lccc@{{}}}}
    \toprule
    Time bin & Ranked hypotheses & Top hypothesis & Top posterior \\
    \midrule
    {bins_rows}
    \bottomrule
  \end{{tabular}}
\end{{table}}

\begin{{table}}[htbp]
  \centering
  \caption{{Robustness across the four prior-belief profiles (aggregate only, see \Cref{{sec:limitations}}).}}
  \label{{tab:robustness}}
  \begin{{tabular}}{{@{{}}lc@{{}}}}
    \toprule
    Outcome & Count \\
    \midrule
    {robustness_rows}
    \bottomrule
  \end{{tabular}}
\end{{table}}

\begin{{figure}}[htbp]
  \centering
  \includegraphics[width=0.62\linewidth]{{figures/fig_opinion_histogram.png}}
  \caption{{Projected-posterior distribution across every distinct survivor named in \Cref{{tab:bins}}, generated by \texttt{{figures/fig\_opinion\_histogram.py}}.}}
  \label{{fig:opinion-hist}}
\end{{figure}}

\begin{{figure}}[htbp]
  \centering
  \includegraphics[width=0.92\linewidth]{{figures/fig_bin_topk.png}}
  \caption{{Top-$k$ posterior ranking per time bin, generated by \texttt{{figures/fig\_bin\_topk.py}}.}}
  \label{{fig:bin-topk}}
\end{{figure}}

\section{{Calibration}}
\label{{sec:calibration}}

{calibration}

\begin{{figure}}[htbp]
  \centering
  \includegraphics[width=0.55\linewidth]{{figures/fig_calibration_curve.png}}
  \caption{{Discovery-date holdout reliability curve, generated by \texttt{{figures/fig\_calibration\_curve.py}}.}}
  \label{{fig:calibration-curve}}
\end{{figure}}

\section{{Limitations}}
\label{{sec:limitations}}

{limitations}

\printbibliography

\appendix

\section{{Glossary}}
\label{{app:glossary}}

\printglossaryentry{{opinion}}
\printglossaryentry{{posterior}}
\printglossaryentry{{missingmass}}
\printglossaryentry{{targetblind}}
\printglossaryentry{{coverageinterval}}

\end{{document}}
"""


def _render_main_tex(data: RunData, run_id: str) -> str:
    return _MAIN_TEX.format(
        campaign=data.campaign,
        run_id=run_id,
        run_dir=str(data.run_dir),
        common_bib=str(COMMON_BIB),
        glossary_entries=_glossary_entries(),
        title=tex_escape(f"{_title_case(data.campaign)}: An Automated Hypothesis-Engine Campaign"),
        date=_run_date(data.manifest.timestamp or ""),
        abstract=_abstract(data),
        campaign_escaped=tex_escape(data.campaign),
        method=_method(data),
        models_rows=_models_table(data),
        results=_results(data),
        bins_rows=_bins_table_rows(data),
        robustness_rows=_robustness_rows(data),
        calibration=_calibration(data),
        limitations=_limitations(data),
    )


def emit_paper(run_dir: str | Path, out_dir: str | Path) -> dict[str, Any]:
    """Writes a full paper directory at `out_dir` from `run_dir`'s own
    artifacts: `main.tex`, `bucket.sty` (copied from `papers/template/`),
    a paper-local `refs.bib`, a `Makefile` copied from the template
    pattern, and three figure scripts under `out_dir/figures/`, then runs
    those figure scripts once so `out_dir` is ready for `make pdf`
    (`hte.paper.build_pdf` runs that build; `hte.referee.referee` is the
    caller that owns the rebuild loop).

    Returns `{"paper_dir", "run_id", "campaign", "figures"}`.
    """
    run_dir = Path(run_dir)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    data = load_run(run_dir)
    run_id = run_dir.name

    (out_dir / "main.tex").write_text(_render_main_tex(data, run_id))
    _write_bucket_sty(out_dir)
    _write_refs_bib(out_dir)
    _write_makefile(out_dir)
    figures = _write_figures(out_dir, run_dir)
    run_figure_scripts(out_dir)

    return {
        "paper_dir": str(out_dir),
        "run_id": run_id,
        "campaign": data.campaign,
        "figures": figures,
    }


# --------------------------------------------------------------------------
# PDF build, shared with hte.referee's own rebuild loop
# --------------------------------------------------------------------------

_PAGE_COUNT_RE = re.compile(r"Output written on \S+\.pdf \((\d+) pages?")


@dataclass
class BuildResult:
    """One `make pdf` invocation's outcome."""
    ok: bool
    page_count: int | None
    log: str
    returncode: int


def build_pdf(paper_dir: str | Path) -> BuildResult:
    """Runs `make pdf` in `paper_dir` (the `pdflatex`/`biber`/`pdflatex`/
    `pdflatex` sequence `papers/template/Makefile` documents; `latexmk`
    is not installed on this toolchain, see `papers/PAPER-STANDARDS.md`'s
    Toolchain notes). Returns a `BuildResult` whose `page_count` is read
    from the final `pdflatex` pass's own `main.log` ("Output written on
    main.pdf (N pages...)"), `None` when the build failed before writing
    that line."""
    paper_dir = Path(paper_dir)
    proc = subprocess.run(
        ["make", "pdf"], cwd=paper_dir, capture_output=True, text=True, timeout=300,
        encoding="utf-8", errors="replace",
    )
    log_text = proc.stdout + "\n" + proc.stderr
    log_path = paper_dir / "main.log"
    if log_path.is_file():
        log_text += "\n" + log_path.read_text(errors="replace")
    match = None
    for match in _PAGE_COUNT_RE.finditer(log_text):
        pass  # the last match is the final pdflatex pass's own count
    page_count = int(match.group(1)) if match else None
    return BuildResult(ok=(proc.returncode == 0), page_count=page_count, log=log_text, returncode=proc.returncode)


__all__ = ["emit_paper", "load_run", "RunData", "build_pdf", "BuildResult", "tex_escape", "run_figure_scripts"]
