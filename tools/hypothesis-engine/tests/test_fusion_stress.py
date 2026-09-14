"""`hte.fusion_stress`: the fusion stress-test (PLAN.md section 10 item 5,
Yager 1987, doi:10.1016/0020-0255(87)90007-7)."""
from __future__ import annotations

import json

import pytest

from hte.belief import Constants
from hte.corpus import fixtures as fixtures_corpus
from hte.fusion_stress import (
    CASE_NAMES,
    StressCaseResult,
    main,
    render_report,
    run_stress_suite,
    sample_hypothesis,
    write_report,
)


@pytest.fixture(scope="module")
def corpus():
    return fixtures_corpus.build()


@pytest.fixture(scope="module")
def results(corpus):
    return run_stress_suite(corpus, constants=Constants())


def test_sample_hypothesis_is_addressable(corpus):
    hyp = sample_hypothesis(corpus)
    assert hyp.address > 0
    assert not hyp.is_sequence


def test_run_stress_suite_returns_one_result_per_case(results):
    assert [r.name for r in results] == list(CASE_NAMES)
    assert all(isinstance(r, StressCaseResult) for r in results)


def test_all_four_cases_pass_against_the_fixture_campaign(results):
    # The point of this suite: the documented behavior the review asks
    # for holds against a real (if small) fixture campaign, beyond one
    # hand-picked number.
    failed = [r.name for r in results if not r.passed]
    assert failed == [], f"fusion stress cases failed: {failed}"


def test_run_stress_suite_default_corpus_is_fixtures():
    # No corpus argument at all: the documented default.
    results = run_stress_suite()
    assert len(results) == 4


# --------------------------------------------------------------------------
# Case 1: contradictory sources
# --------------------------------------------------------------------------


def test_contradictory_sources_reads_as_contested(results):
    r = next(x for x in results if x.name == "contradictory_sources")
    assert r.measurements["b"] == pytest.approx(r.measurements["d"])
    assert r.measurements["u"] < 0.3
    assert r.measurements["b"] > 0.3


# --------------------------------------------------------------------------
# Case 2: duplicate sources with different dates
# --------------------------------------------------------------------------


def test_duplicate_sources_do_not_inflate_past_one_source(results):
    r = next(x for x in results if x.name == "duplicate_sources_different_dates")
    m = r.measurements
    assert m["r_duplicate"] == pytest.approx(2 * m["r_single"])
    assert m["r_duplicate"] < m["r_independent"]


# --------------------------------------------------------------------------
# Case 3: single high-weight outlier
# --------------------------------------------------------------------------


def test_single_outlier_is_bounded_and_overtaken_by_a_wide_swarm(results):
    r = next(x for x in results if x.name == "single_high_weight_outlier")
    m = r.measurements
    assert m["r"] == pytest.approx(m["expected_r"])
    assert m["s_thin"] < m["r"]  # a thin swarm does not overtake the outlier
    assert m["s_wide"] > m["r"]  # a wide enough swarm does


# --------------------------------------------------------------------------
# Case 4: empty evidence
# --------------------------------------------------------------------------


def test_empty_evidence_reads_at_exactly_the_prior(results):
    r = next(x for x in results if x.name == "empty_evidence")
    assert r.measurements["u"] == 1.0
    assert r.measurements["project"] == pytest.approx(r.measurements["prior"])


# --------------------------------------------------------------------------
# Report rendering
# --------------------------------------------------------------------------


def test_render_report_names_every_case(results):
    text = render_report(results)
    assert "Fusion stress-test" in text
    for name in CASE_NAMES:
        assert f"`{name}`" in text
    assert "4/4 cases passed" in text


def test_write_report_writes_a_file(tmp_path, results):
    out = tmp_path / "FUSION-STRESS-test.md"
    written = write_report(results, out)
    assert written == out
    assert out.is_file()
    assert "Fusion stress-test" in out.read_text()


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------


def test_cli_run_prints_json_and_exits_zero_on_all_pass(capsys):
    rc = main(["run", "--corpus", "fixtures"])
    assert rc == 0
    out = json.loads(capsys.readouterr().out)
    assert len(out) == 4
    assert all(row["passed"] for row in out)


def test_cli_run_write_doc_writes_the_report(tmp_path, capsys):
    out_path = tmp_path / "report.md"
    rc = main(["run", "--corpus", "fixtures", "--write-doc", str(out_path)])
    assert rc == 0
    assert out_path.is_file()
    stdout = capsys.readouterr().out
    assert "report written to" in stdout
