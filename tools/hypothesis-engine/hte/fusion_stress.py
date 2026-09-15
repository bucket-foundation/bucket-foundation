"""Fusion stress-test: adversarial evidence sets fed to `hte.belief`'s
pooled-weight and opinion-fusion step.

PLAN.md section 10 item 5 (Yager 1987, doi:10.1016/0020-0255(87)90007-7):
a combination rule that reads soundly on ordinary inputs can still
misbehave once the evidence set turns adversarial: unbounded confidence
from a single strong source, artificial corroboration from a duplicate
report, or a silent default on no evidence at all. Four cases, the ones
the review names, each run against `hte.belief.pooled_weight`/`score` and
checked against this package's own documented behavior for that shape of
input (`hte.belief`'s own docstrings are cited by name below; nothing
here invents a fresh contract the module does not already state):

- `contradictory_sources`: near-equal supporting and refuting weight on
  one address. `hte.belief.Constants`'s own `mu` docstring: the opinion
  model absorbs contradiction directly rather than through a separate
  penalty, so a contested claim reads as substantial belief AND
  substantial disbelief at once, with low uncertainty, `Opinion.b` and
  `Opinion.d` landing close together rather than one swinging over the
  other unmarked.
- `duplicate_sources_different_dates`: two evidence items whose sources
  share a stemma edge (`Source.stemma_parents`) despite carrying
  different `Source.date` values, the shape a re-published duplicate or
  an ingestion bug produces. `hte.belief.effective_count` collapses them
  to one connected component (`def:stemma`), so `D(n_eff)` discounts the
  pair the same way it would discount one item alone; their pooled
  weight comes out strictly below what two independent sources of the
  same kind and tier would give.
- `single_high_weight_outlier`: one T1 item stands alone against a
  growing swarm of T6 items on the other side. `edge_strength`'s own
  0.99 cap bounds the outlier's own pooled weight at a fixed value
  regardless of how many opposing items exist; enough independent weak
  evidence still overtakes it, Yager 1987's own point that no single
  source, however confident, holds a permanent veto over a combination
  rule.
- `empty_evidence`: no evidence at all. `Opinion.from_evidence`'s own
  `u_eq_one_of_no_evidence` docstring: `u == 1.0` and `project() == a`
  exactly, the fully flagged "nobody has examined this" state.

`run_stress_suite` runs all four against one fixture campaign (`hte.
corpus.fixtures.build`, the same small, readable, real-vocabulary corpus
`hte.runner`'s own tests use) and returns one `StressCaseResult` per
case. `hte-fusion-stress run` (`pyproject.toml`'s own console script, a
standalone command rather than an `hte` subcommand, `hte/cli.py` left
untouched for a concurrent PR's own edits there) is the CLI entry point;
`render_report`/`write_report` render the same results to the markdown
report under `tools/hypothesis-engine/docs/`.
"""
from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from .address import CONCEPT_SLOT_ORDER
from .belief import Constants, D, Opinion, cluster_weight, pooled_weight, score, sigmoid
from .corpus import Corpus
from .corpus import fixtures as fixtures_corpus
from .evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Tier, TIER_WEIGHT
from .hypothesis import Hypothesis, Placement
from .timeline import Interval

DOCS_DIR = Path(__file__).parent.parent / "docs"

_EPS = 1e-9


def _close(a: float, b: float, eps: float = _EPS) -> bool:
    """A floating-point-safe equality check for this module's own case
    assertions: two pooled weights computed through independent call
    paths (different item counts, different `D(n)` arguments) are not
    guaranteed bit-identical even when the formula says they must match,
    so every "these must come out equal" check below goes through this
    rather than a bare `==`."""
    return abs(a - b) < eps


def _span(tag: str) -> EvidenceSpan:
    quote = f"synthetic adversarial evidence ({tag})"
    return EvidenceSpan(doc_id=f"fusion-stress-{tag}", locator="fusion-stress", quote=quote, char_start=0, char_end=len(quote), doc_length=len(quote))


def sample_hypothesis(corpus: Corpus) -> Hypothesis:
    """One real, addressable hypothesis over `corpus.vocab`: the first
    concept each of the five concept-bearing slots lists
    (`hte.address.CONCEPT_SLOT_ORDER`), at a fixed year-0 interval. Every
    stress case below scores adversarial evidence against this one
    hypothesis's own address, so the suite runs against a hypothesis that
    exists in a real fixture campaign's own vocabulary rather than an
    address chosen at random."""
    values = {slot.value: corpus.vocab.concepts(slot)[0].id for slot in CONCEPT_SLOT_ORDER}
    placement = Placement(interval=Interval(start=0, end=0), **values)
    return Hypothesis.from_placement(placement, corpus.vocab)


@dataclass(frozen=True)
class StressCaseResult:
    """One adversarial case's own outcome: whether the fusion step's
    documented behavior held (`passed`), a one-line explanation, and the
    raw numbers a reader can check the explanation against."""
    name: str
    description: str
    passed: bool
    detail: str
    measurements: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name, "description": self.description,
            "passed": self.passed, "detail": self.detail, "measurements": self.measurements,
        }


# --------------------------------------------------------------------------
# Case 1: contradictory sources
# --------------------------------------------------------------------------


def _case_contradictory_sources(hyp: Hypothesis, constants: Constants) -> StressCaseResult:
    addr = hyp.address
    support = [
        EvidenceItem(id=f"contra-s{i}", kind=EvidenceKind.TEXTUAL, tier=Tier.T2,
                     source_id=f"contra-src-s{i}", span=_span(f"support-{i}"),
                     provenance="fusion-stress", supports=[addr])
        for i in range(3)
    ]
    refute = [
        EvidenceItem(id=f"contra-r{i}", kind=EvidenceKind.TEXTUAL, tier=Tier.T2,
                     source_id=f"contra-src-r{i}", span=_span(f"refute-{i}"),
                     provenance="fusion-stress", refutes=[addr])
        for i in range(3)
    ]
    r, s = pooled_weight(support + refute, addr, constants=constants)
    op = Opinion.from_evidence(r, s, constants.W, a=0.5)
    # `b`/`d` are independent of the base rate `a` (`Opinion.from_evidence`'s
    # own formula): symmetric support and refute weight must land them
    # close together and `u` low, regardless of what hypothesis this runs
    # against.
    symmetric = abs(op.b - op.d) < 1e-9
    contested = op.u < 0.3 and op.b > 0.3
    passed = symmetric and contested
    return StressCaseResult(
        name="contradictory_sources",
        description=(
            "Three supporting and three refuting T2 items on one address: "
            "the opinion model must read this as contested (substantial "
            "belief and disbelief together, low uncertainty), never as a "
            "silent, unmarked swing to either side."
        ),
        passed=passed,
        detail=(
            f"b={op.b:.4f} d={op.d:.4f} u={op.u:.4f}; symmetric={symmetric}, "
            f"contested (u<0.3 and b>0.3)={contested}"
        ),
        measurements={"r": r, "s": s, "b": op.b, "d": op.d, "u": op.u},
    )


# --------------------------------------------------------------------------
# Case 2: duplicate sources with different dates
# --------------------------------------------------------------------------


def _case_duplicate_sources_different_dates(hyp: Hypothesis, constants: Constants) -> StressCaseResult:
    addr = hyp.address
    original = Source(id="dup-original", kind=EvidenceKind.MATERIAL, date="1950", stemma_parents=[])
    duplicate = Source(id="dup-republished", kind=EvidenceKind.MATERIAL, date="2010", stemma_parents=["dup-original"])
    independent = Source(id="dup-independent", kind=EvidenceKind.MATERIAL, date="1955", stemma_parents=[])

    item_original = EvidenceItem(id="dup-i-original", kind=EvidenceKind.MATERIAL, tier=Tier.T2,
                                  source_id="dup-original", span=_span("dup-original"),
                                  provenance="fusion-stress", supports=[addr])
    item_duplicate = EvidenceItem(id="dup-i-republished", kind=EvidenceKind.MATERIAL, tier=Tier.T2,
                                   source_id="dup-republished", span=_span("dup-republished"),
                                   provenance="fusion-stress", supports=[addr])
    item_independent = EvidenceItem(id="dup-i-independent", kind=EvidenceKind.MATERIAL, tier=Tier.T2,
                                     source_id="dup-independent", span=_span("dup-independent"),
                                     provenance="fusion-stress", supports=[addr])

    r_single, _ = pooled_weight([item_original], addr, sources={"dup-original": original}, constants=constants)
    r_duplicate, _ = pooled_weight(
        [item_original, item_duplicate], addr,
        sources={"dup-original": original, "dup-republished": duplicate}, constants=constants,
    )
    r_independent, _ = pooled_weight(
        [item_original, item_independent], addr,
        sources={"dup-original": original, "dup-independent": independent}, constants=constants,
    )

    # A duplicate-sourced pair reads at exactly the single-item weight
    # scaled by the SAME kind-count sum (`def:stemma`'s own point: the
    # stemma collapses them to one effective source, reading `D(1)` for
    # the pair), strictly below what two independent sources give.
    no_inflation = _close(r_duplicate, r_single * 2)
    down_weighted_vs_independent = r_duplicate < r_independent
    passed = no_inflation and down_weighted_vs_independent
    return StressCaseResult(
        name="duplicate_sources_different_dates",
        description=(
            "Two evidence items whose sources share a stemma edge despite "
            "carrying different Source.date values: the pooled weight must "
            "read as one corroborating source, strictly below two "
            "independent sources of the same kind and tier."
        ),
        passed=passed,
        detail=(
            f"r_single={r_single:.4f} r_duplicate={r_duplicate:.4f} "
            f"r_independent={r_independent:.4f}; no_inflation "
            f"(r_duplicate == 2*r_single)={no_inflation}, "
            f"down_weighted_vs_independent={down_weighted_vs_independent}"
        ),
        measurements={"r_single": r_single, "r_duplicate": r_duplicate, "r_independent": r_independent},
    )


# --------------------------------------------------------------------------
# Case 3: a single high-weight outlier
# --------------------------------------------------------------------------


def _case_single_high_weight_outlier(hyp: Hypothesis, constants: Constants) -> StressCaseResult:
    addr = hyp.address
    outlier = EvidenceItem(id="outlier", kind=EvidenceKind.MATERIAL, tier=Tier.T1,
                            source_id="outlier-src", span=_span("outlier"),
                            provenance="fusion-stress", supports=[addr], views={"blended_a": 5.0})

    def opposing(n: int) -> list[EvidenceItem]:
        return [
            EvidenceItem(id=f"weak-{i}", kind=EvidenceKind.MATERIAL, tier=Tier.T6,
                         source_id=f"weak-src-{i}", span=_span(f"weak-{i}"),
                         provenance="fusion-stress", refutes=[addr])
            for i in range(n)
        ]

    r_thin, s_thin = pooled_weight([outlier] + opposing(2), addr, constants=constants)
    r_wide, s_wide = pooled_weight([outlier] + opposing(15), addr, constants=constants)

    expected_r = TIER_WEIGHT[Tier.T1] * 0.99 * D(1, constants.lam)
    bounded = _close(r_thin, expected_r) and _close(r_wide, expected_r) and _close(r_thin, cluster_weight(outlier) * D(1, constants.lam))
    dominates_thin_swarm = r_thin > s_thin
    overtaken_by_wide_swarm = s_wide > r_wide
    passed = bounded and dominates_thin_swarm and overtaken_by_wide_swarm
    return StressCaseResult(
        name="single_high_weight_outlier",
        description=(
            "One T1 item (edge_strength clamped to 0.99) against a growing "
            "swarm of T6 items on the other side: the outlier's own pooled "
            "weight must stay fixed and bounded by its own tier ceiling "
            "regardless of swarm size, and a wide enough swarm of "
            "independent weak evidence must still overtake it."
        ),
        passed=passed,
        detail=(
            f"r (fixed)={r_thin:.4f} == {expected_r:.4f} (tier cap * D(1)); "
            f"thin swarm (n=2) s={s_thin:.4f} (r dominates); wide swarm "
            f"(n=15) s={s_wide:.4f} (swarm overtakes r)"
        ),
        measurements={"r": r_thin, "s_thin": s_thin, "s_wide": s_wide, "expected_r": expected_r},
    )


# --------------------------------------------------------------------------
# Case 4: empty evidence
# --------------------------------------------------------------------------


def _case_empty_evidence(hyp: Hypothesis, vocab, constants: Constants) -> StressCaseResult:
    op = score(hyp, [], vocab, constants=constants)
    a = sigmoid(hyp.prior_logit(vocab))
    fully_uncertain = op.u == 1.0
    reads_at_prior = op.project() == a
    passed = fully_uncertain and reads_at_prior
    return StressCaseResult(
        name="empty_evidence",
        description=(
            "No evidence at all: the fused opinion must read at exactly "
            "u=1.0 and project to exactly the hypothesis's own prior, the "
            "flagged 'nobody has examined this' state, never a silent "
            "default to some other value."
        ),
        passed=passed,
        detail=f"u={op.u}, project()={op.project()}, prior a={a}",
        measurements={"u": op.u, "project": op.project(), "prior": a},
    )


# --------------------------------------------------------------------------
# Suite
# --------------------------------------------------------------------------

CASE_NAMES: tuple[str, ...] = (
    "contradictory_sources",
    "duplicate_sources_different_dates",
    "single_high_weight_outlier",
    "empty_evidence",
)


def run_stress_suite(corpus: Corpus | None = None, *, constants: Constants | None = None) -> list[StressCaseResult]:
    """Runs all four adversarial cases against `corpus` (default: `hte.
    corpus.fixtures.build()`, a fixture campaign) and `constants` (default:
    `Constants()`, the bare documented defaults, kept independent of `hte.
    belief.load_constants('fitted')`: this suite checks the fusion
    formula's own shape, unaffected by whatever this repo's current
    pooled fit happens to be)."""
    corpus = corpus if corpus is not None else fixtures_corpus.build()
    constants = constants if constants is not None else Constants()
    hyp = sample_hypothesis(corpus)
    return [
        _case_contradictory_sources(hyp, constants),
        _case_duplicate_sources_different_dates(hyp, constants),
        _case_single_high_weight_outlier(hyp, constants),
        _case_empty_evidence(hyp, corpus.vocab, constants),
    ]


# --------------------------------------------------------------------------
# Report rendering
# --------------------------------------------------------------------------


def render_report(results: list[StressCaseResult], *, corpus_name: str = "fixtures") -> str:
    n_passed = sum(1 for r in results if r.passed)
    lines = [
        "# Fusion stress-test",
        "",
        f"Generated by `hte-fusion-stress run --corpus {corpus_name}`, "
        f"{datetime.now(timezone.utc).strftime('%Y-%m-%d')}. PLAN.md section "
        "10 item 5 (Yager 1987, doi:10.1016/0020-0255(87)90007-7): four "
        "adversarial evidence sets fed to `hte.belief`'s pooled-weight and "
        "opinion-fusion step, each checked against that module's own "
        "documented behavior. `tools/hypothesis-engine/hte/fusion_stress.py` "
        "is the source of every case and every assertion below.",
        "",
        f"**Result: {n_passed}/{len(results)} cases passed.**",
        "",
        "| Case | Passed | Detail |",
        "|---|---|---|",
    ]
    for r in results:
        lines.append(f"| `{r.name}` | {'PASS' if r.passed else 'FAIL'} | {r.detail} |")
    lines.append("")
    lines.append("## Case descriptions")
    lines.append("")
    for r in results:
        lines.append(f"### `{r.name}`")
        lines.append("")
        lines.append(r.description)
        lines.append("")
        lines.append(f"Measurements: `{r.measurements}`")
        lines.append("")
    return "\n".join(lines)


def write_report(results: list[StressCaseResult], out_path: str | Path, *, corpus_name: str = "fixtures") -> Path:
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(render_report(results, corpus_name=corpus_name), encoding="utf-8")
    return out_path


# --------------------------------------------------------------------------
# `hte-fusion-stress` console script
# --------------------------------------------------------------------------
#
# A standalone script (`pyproject.toml`'s own `[project.scripts]`,
# matching `hte-synth`/`hte-serve`'s existing precedent), kept outside
# `hte/cli.py`'s own subcommand set: this branch leaves that file
# untouched, free for a concurrent PR's own edits there.

_KNOWN_CORPORA: tuple[str, ...] = ("fixtures", "quantum-history", "sacred-history")


def _corpus_loaders() -> dict[str, Callable[[], Corpus]]:
    """A small, local corpus-name registry, deliberately not `hte.cli.
    _CORPUS_LOADERS`: importing that module here would couple this script
    to `hte/cli.py`, a file this branch leaves untouched for a concurrent
    PR's own edits there."""
    from .corpus import fixtures as _fixtures
    from .corpus import quantum_history as _quantum_history
    from .corpus import sacred_history as _sacred_history
    return {
        "fixtures": _fixtures.build,
        "quantum-history": _quantum_history.ingest,
        "sacred-history": _sacred_history.ingest,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="hte-fusion-stress", description="fusion stress-test (PLAN.md section 10 item 5)")
    sub = parser.add_subparsers(dest="command", required=True)

    run_p = sub.add_parser("run", help="run the four adversarial cases against one fixture campaign")
    run_p.add_argument("--corpus", default="fixtures", choices=_KNOWN_CORPORA)
    run_p.add_argument("--write-doc", default=None, help="also render the markdown report to this path")
    run_p.set_defaults(func=_cmd_run)

    return parser


def _cmd_run(args: argparse.Namespace) -> int:
    corpus = _corpus_loaders()[args.corpus]()
    results = run_stress_suite(corpus)
    print(json.dumps([r.to_dict() for r in results], indent=2))
    if args.write_doc:
        path = write_report(results, args.write_doc, corpus_name=args.corpus)
        print(f"report written to {path}")
    n_failed = sum(1 for r in results if not r.passed)
    return 1 if n_failed else 0


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


__all__ = [
    "StressCaseResult",
    "CASE_NAMES",
    "sample_hypothesis",
    "run_stress_suite",
    "render_report",
    "write_report",
    "main",
]


if __name__ == "__main__":
    raise SystemExit(main())
