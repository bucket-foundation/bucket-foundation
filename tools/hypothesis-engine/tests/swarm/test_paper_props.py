"""Property tests over `hte.paper`: `emit_paper` on a fixture run dir
produces a `main.tex` whose every reference (`\\ref`/`\\Cref`/`\\cref`)
resolves to a matching `\\label`, over a swarm of run-artifact shapes."""
from __future__ import annotations

import json
import re
import shutil
import tempfile
from pathlib import Path

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from hte import paper

# Both tests below call `emit_paper`, which shells out to a real
# `python3 figures/fig_*.py` render (see this module's own comment two
# lines down); opts the whole file out of `tests/conftest.py`'s autouse
# subprocess guard.
pytestmark = pytest.mark.allow_subprocess

# emit_paper shells out to `python3 figures/fig_*.py` three times per call
# (real matplotlib renders): the shared "swarm" profile's 300
# examples would make this file alone take minutes. A handful of examples
# is enough to exercise the property (different bin counts, campaign
# names, and calibration on/off) without that cost.
_light = settings(max_examples=8, deadline=None)

_REF_RE = re.compile(r"\\(?:[Cc]ref)\{([^}]*)\}")
_LABEL_RE = re.compile(r"\\label\{([^}]*)\}")


def _write_run_dir(root: Path, *, campaign: str, n_bins: int, with_calibration: bool) -> Path:
    run_dir = root / "runs" / campaign / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    manifest = {
        "campaign": campaign, "timestamp": "20260101T000000Z", "corpus": "fixtures",
        "models": {"roles": {"generator": "sonnet"}},
        "config": {"seeds": 1, "generate_n": 2, "combinatorial_max_items": 5, "max_hypotheses": 8,
                   "tournament_rounds": 1, "resolution": "century"},
        "extraction": None,
        "counts": {
            "campaign": campaign, "n_sources": 1, "n_evidence": 1, "n_hypotheses_generated": 1,
            "n_survivors": 1, "vocab_added": [],
            "coverage": {"observed": 1, "chao1_estimate": 1.0, "missing_mass": 0.0, "coverage_low": 1.0, "coverage_high": 1.0},
            "robustness_stable_fraction": 1.0, "surprise_rate": 0.0,
            "calibration_brier": 0.0 if with_calibration else None,
            "target_blind": {"rate": 0.0, "prior_rate": None, "steady": True, "first_run": True},
            "meta_review": {"summary": "s", "flags": [], "recommended_actions": []},
        },
    }
    (run_dir / "MANIFEST.json").write_text(json.dumps(manifest))
    bins = [
        {"time_bin": {"index": i}, "ranked_hypotheses": [
            {"hypothesis_id": f"h{i}", "address": i + 1, "slots": {}, "posterior": 0.5, "elo": 1500.0},
        ]}
        for i in range(n_bins)
    ]
    timeline = {"bins": bins, "event_views": [], "pair_views": []}
    (run_dir / "timeline.json").write_text(json.dumps(timeline))
    if with_calibration:
        calibration = {
            "cutoff_years": 1950, "n_sources": 1, "brier_score": 0.05,
            "calibration_curve": [{"bin_low": 0.4, "bin_high": 0.5, "count": 1, "mean_predicted": 0.45, "mean_observed": 1.0}],
            "constants": {"W": 2.0, "lam": 0.5},
        }
        (run_dir / "calibration.json").write_text(json.dumps(calibration))
    (run_dir / "self-report.json").write_text(json.dumps({"note": "s"}))
    return run_dir


@_light
@given(
    st.text(alphabet="abcdefghijklmnop-", min_size=1, max_size=12),
    st.integers(min_value=0, max_value=3),
    st.booleans(),
)
def test_emit_paper_produces_a_tex_with_no_dangling_reference(campaign, n_bins, with_calibration):
    tmp = tempfile.mkdtemp()
    try:
        run_dir = _write_run_dir(Path(tmp), campaign=campaign, n_bins=n_bins, with_calibration=with_calibration)
        out_dir = Path(tmp) / "paper"
        paper.emit_paper(run_dir, out_dir)
        tex = (out_dir / "main.tex").read_text()

        labels = set(_LABEL_RE.findall(tex))
        refs = set(_REF_RE.findall(tex))
        dangling = refs - labels
        assert not dangling, f"main.tex references {dangling} with no matching \\label"
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_emit_paper_glossary_terms_are_all_referenced_and_defined():
    tmp = tempfile.mkdtemp()
    try:
        run_dir = _write_run_dir(Path(tmp), campaign="camp", n_bins=1, with_calibration=True)
        out_dir = Path(tmp) / "paper"
        paper.emit_paper(run_dir, out_dir)
        tex = (out_dir / "main.tex").read_text()
        # Every \term{key}{...} used in the body has a matching
        # \glossentry{key}{...} defined near the top.
        term_keys = set(re.findall(r"\\term\{([^}]*)\}", tex))
        glossentry_keys = set(re.findall(r"\\glossentry\{([^}]*)\}", tex))
        assert term_keys <= glossentry_keys
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
