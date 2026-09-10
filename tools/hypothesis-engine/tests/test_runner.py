import json
from dataclasses import replace
from pathlib import Path

import pytest
from hypothesis import given
from hypothesis import strategies as st

from hte import llm, roles, runner
from hte.corpus import Corpus, GroundTruthEvent, education_atlas, production
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Tier
from hte.timeline import Interval

FIXTURE_CACHE = str(Path(__file__).parent / "fixtures" / "llm-cache")

# Every field below must match the config used to seed `tests/fixtures/
# llm-cache/`: the cache key is a hash of (model, prompt), and several
# prompts this campaign builds (`generate_n`, `combinatorial_max_items`,
# and the campaign name itself, embedded in the self-report's own prompt)
# change the prompt text, and so the cache key, if changed here without
# re-seeding the cache. `resolution` is pinned to `"century"` for the
# same reason: left unset, `hte.runner.run_campaign` would auto-select a
# rung from this corpus's own ground-truth span (`hte.timeline.
# auto_resolution`), which would shift every combinatorial hypothesis's
# own TIME_BIN axis away from `hte.address`'s original fixed 20,000-
# year/century span this cache was seeded under. Pinning `"century"`
# reuses that original span exactly (`hte.runner._resolve_time_binning`'s
# own documented behavior for a pinned resolution).
FIXTURE_CONFIG = {
    "campaign": "fixture-seed",
    "corpus": "fixtures",
    "cache_dir": FIXTURE_CACHE,
    "replay_only": True,
    "seeds": 1,
    "generate_n": 2,
    "tournament_rounds": 1,
    "max_hypotheses": 8,
    "combinatorial_max_items": 5,
    "resolution": "century",
}


def test_run_campaign_end_to_end_replay_only(tmp_path):
    cfg = {**FIXTURE_CONFIG, "out_dir": str(tmp_path)}
    artifacts = runner.run_campaign(cfg)

    assert artifacts.run_dir.is_dir()
    assert (artifacts.run_dir / "MANIFEST.json").is_file()
    assert (artifacts.run_dir / "run.log").is_file()
    assert (artifacts.run_dir / "self-report.json").is_file()
    assert (artifacts.run_dir / "TIMELINE.md").is_file()
    assert (artifacts.run_dir / "timeline.json").is_file()
    assert (artifacts.run_dir / "CALIBRATION.md").is_file()

    assert len(artifacts.hypotheses) > 0
    assert artifacts.opinions
    assert all(0.0 <= op.project() <= 1.0 for op in artifacts.opinions.values())
    assert artifacts.elos
    assert artifacts.self_report["missing_mass_estimate"] is not None
    assert isinstance(artifacts.self_report["target_blind_steady"], bool)

    manifest = json.loads((artifacts.run_dir / "MANIFEST.json").read_text())
    assert manifest["campaign"] == "fixture-seed"
    assert manifest["corpus"] == "fixtures"
    assert manifest["cache"]["files"] > 0
    assert manifest["seeds"] == [0]
    assert "git_sha" in manifest

    log_text = (artifacts.run_dir / "run.log").read_text()
    assert "campaign 'fixture-seed' starting" in log_text
    assert "run complete" in log_text


def test_run_campaign_replay_only_raises_on_true_cache_miss(tmp_path):
    cfg = {**FIXTURE_CONFIG, "out_dir": str(tmp_path), "cache_dir": str(tmp_path / "empty-cache")}
    with pytest.raises(llm.LLMCacheMissError):
        runner.run_campaign(cfg)


def test_run_campaign_replay_only_makes_no_subprocess_call(tmp_path, monkeypatch):
    def explode(*args, **kwargs):
        raise AssertionError("replay_only run must never shell out to claude -p")

    monkeypatch.setattr(llm, "subprocess", type("S", (), {"run": staticmethod(explode)}))
    cfg = {**FIXTURE_CONFIG, "out_dir": str(tmp_path)}
    runner.run_campaign(cfg)  # would raise via `explode` above on any cache miss


def test_run_campaign_is_deterministic_across_runs(tmp_path):
    cfg1 = {**FIXTURE_CONFIG, "out_dir": str(tmp_path / "run1")}
    cfg2 = {**FIXTURE_CONFIG, "out_dir": str(tmp_path / "run2")}
    a1 = runner.run_campaign(cfg1)
    a2 = runner.run_campaign(cfg2)
    assert {h.address for h in a1.hypotheses} == {h.address for h in a2.hypotheses}
    assert a1.self_report == a2.self_report
    assert a1.coverage == a2.coverage


def test_manifest_carries_llm_stats(tmp_path):
    cfg = {**FIXTURE_CONFIG, "out_dir": str(tmp_path)}
    artifacts = runner.run_campaign(cfg)
    manifest = json.loads((artifacts.run_dir / "MANIFEST.json").read_text())
    assert "llm_stats" in manifest
    # Every role this replay-only fixture campaign calls read entirely
    # from cache, so every counted call is a cache hit and none of them
    # shelled out to `claude -p`.
    assert manifest["llm_stats"]
    assert all(row["calls"] == row["cache_hits"] for row in manifest["llm_stats"].values())


# --------------------------------------------------------------------------
# Corpus registration (`bkt-hte-corpus-registration`): education-atlas and
# production, alongside quantum-history and fixtures, in `_CORPUS_LOADERS`.
# --------------------------------------------------------------------------


def test_education_atlas_and_production_are_registered_corpus_loaders():
    assert "education-atlas" in runner._CORPUS_LOADERS
    assert runner._CORPUS_LOADERS["education-atlas"] is education_atlas.load
    assert "production" in runner._CORPUS_LOADERS
    assert runner._CORPUS_LOADERS["production"] is production.load


@pytest.mark.parametrize("corpus_name", ["education-atlas", "production"])
def test_campaign_run_replay_only_fails_only_on_cache_miss(tmp_path, corpus_name):
    """No cache has ever been seeded for these two corpora
    (`bkt-hte-corpus-registration`); a `replay_only=True` run must reach
    all the way to the first uncached LLM call and fail there with
    `hte.llm.LLMCacheMissError`, the first LLM call sitting earlier in
    the pipeline than any corpus-loading or generation bug would."""
    cfg = {
        "campaign": corpus_name, "corpus": corpus_name, "out_dir": str(tmp_path),
        "cache_dir": str(tmp_path / "empty-cache"), "replay_only": True, "seeds": 1,
        "generate_n": 1, "combinatorial_max_items": 1, "max_hypotheses": 5,
        "tournament_rounds": 1, "max_time_bins": 2, "run_extraction": False,
    }
    with pytest.raises(llm.LLMCacheMissError):
        runner.run_campaign(cfg)


def test_production_campaign_run_completes_end_to_end_in_fake_mode(tmp_path, monkeypatch):
    # `production.load()`'s own fixture set is small (20 sources, 12
    # evidence items, 8 ground-truth events) end to end, no trimming
    # needed to keep this fast.
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    cfg = {
        "campaign": "production", "corpus": "production", "out_dir": str(tmp_path),
        "cache_dir": str(tmp_path / "cache"), "replay_only": False, "seeds": 1,
        "generate_n": 1, "combinatorial_max_items": 1, "max_hypotheses": 5,
        "tournament_rounds": 1, "max_time_bins": 2, "run_extraction": False,
    }
    artifacts = runner.run_campaign(cfg)
    assert artifacts.run_dir.is_dir()
    assert (artifacts.run_dir / "MANIFEST.json").is_file()
    assert (artifacts.run_dir / "CALIBRATION.md").is_file()
    manifest = json.loads((artifacts.run_dir / "MANIFEST.json").read_text())
    assert manifest["corpus"] == "production"


def test_generator_proposed_year_before_the_run_span_is_clamped_and_recorded(tmp_path, monkeypatch):
    """Silent-failures review finding 2, reproduced end to end: a
    generator-role proposal names a year that predates this run's own
    TIME_BIN span (a hallucination, the exact case `hte.timeline.
    time_bin_index`'s own clamp-to-bin-0 docstring names as its target;
    the `production` corpus's own real span is 2025-2026). The campaign
    must complete, and the clamp must be visible in `MANIFEST.
    json['clamped_years']`, `run.log`, and `self_report['assumptions']`,
    not only a stdlib `logging.warning` line no CLI entry point in this
    package ever attaches a handler for."""
    monkeypatch.setenv("HTE_LLM_MODE", "fake")

    def _fake_generate(context, *, cache_dir, replay_only=False):
        return {
            "proposals": [{
                "actor": "hallucinated-actor", "action": "hallucinated-action",
                "object": "hallucinated-object", "place": "hallucinated-place",
                "mechanism": "hallucinated-mechanism",
                "time_hint": "1900",  # well before the production corpus's own 2025-2026 span
                "supporting_evidence_ids": [],
            }]
        }

    monkeypatch.setattr(roles, "generate", _fake_generate)
    cfg = {
        "campaign": "production", "corpus": "production", "out_dir": str(tmp_path),
        "cache_dir": str(tmp_path / "cache"), "replay_only": False, "seeds": 1,
        "generate_n": 1, "combinatorial_max_items": 1, "max_hypotheses": 5,
        "tournament_rounds": 1, "max_time_bins": 2, "run_extraction": False,
    }
    artifacts = runner.run_campaign(cfg)

    manifest = json.loads((artifacts.run_dir / "MANIFEST.json").read_text())
    span_start = manifest["time_binning"]["span_start"]
    assert manifest["clamped_years"] == [{"year": 1900, "span_start": span_start}]
    log_text = (artifacts.run_dir / "run.log").read_text()
    assert f"time-bin clamp: year=1900 span_start={span_start}" in log_text
    assert "clamped_years: 1 year(s) clamped to bin 0 this run" in log_text
    assert any("clamped to bin 0" in a for a in artifacts.self_report.get("assumptions", []))


@pytest.mark.skipif(
    education_atlas.DEFAULT_SAMPLE_DIR is None,
    reason="education-atlas checkout not found; set EDUCATION_ATLAS_DIR",
)
def test_education_atlas_campaign_run_completes_end_to_end_in_fake_mode(tmp_path, monkeypatch):
    # `education_atlas.load()`'s own shipped sample is real-corpus-sized
    # (84 sources, 4655 evidence items): `hte.generate.from_evidence`'s
    # claim-gap generator sweeps every slot for every evidence item
    # against this module's own full vocabulary (84+ concepts on some
    # slots), a pre-existing cost this test does not own or need to pay
    # to prove corpus registration and the fake-mode path both work; a
    # loader trimmed to a handful of evidence items exercises the exact
    # same registration and campaign wiring at pytest-suite speed.
    monkeypatch.setenv("HTE_LLM_MODE", "fake")

    def _small_education_atlas():
        corpus = education_atlas.load()
        corpus.evidence = corpus.evidence[:12]
        return corpus

    runner._CORPUS_LOADERS["_test-education-atlas-small"] = _small_education_atlas
    try:
        cfg = {
            "campaign": "education-atlas", "corpus": "_test-education-atlas-small", "out_dir": str(tmp_path),
            "cache_dir": str(tmp_path / "cache"), "replay_only": False, "seeds": 1,
            "generate_n": 1, "combinatorial_max_items": 1, "max_hypotheses": 5,
            "tournament_rounds": 1, "max_time_bins": 2, "run_extraction": False,
        }
        artifacts = runner.run_campaign(cfg)
    finally:
        runner._CORPUS_LOADERS.pop("_test-education-atlas-small", None)
    assert artifacts.run_dir.is_dir()
    assert (artifacts.run_dir / "MANIFEST.json").is_file()
    assert (artifacts.run_dir / "CALIBRATION.md").is_file()


# --------------------------------------------------------------------------
# Refusal handling end to end (`bkt-hte-refusal-handling`, 2026-09-10): one
# critic call refuses (the production incident this fix responds to,
# `claude -p exited 1: {"...","stop_reason":"refusal","session_id":...}`);
# the campaign must complete anyway.
# --------------------------------------------------------------------------


def _fake_invoke_cli_delegating_to_fakellm(*, refuse_role, refuse_schema, refuse_at, truncate=False):
    """A `hte.llm._invoke_cli` stand-in: every call delegates to `hte.
    fakellm.complete` for its answer (the same deterministic per-role
    stand-ins `HTE_LLM_MODE=fake` already exercises elsewhere in this
    file), wrapped as a `structured_output` envelope, except the
    `refuse_at`-th call whose own `role` equals `refuse_role` AND whose
    own `schema` is (by identity) `refuse_schema` -- so a same-role batch
    call carrying a different schema object is left alone -- which
    raises `hte.llm.ModelRefusal`/`ModelTruncation` instead, carrying a
    `session_id` this test asserts never reaches any artifact on disk.

    Monkeypatching `_invoke_cli` rather than `subprocess.run` directly
    skips having to hand-build a `subprocess.run` stand-in that also
    knows every role's own JSON schema shape; `tests/test_llm.py`'s own
    suite already proves `_invoke_cli` classifies a raw `subprocess.run`-
    level refusal envelope into `ModelRefusal` (session id
    stripped, no corrective retry) at that lower layer. This test proves
    the layer above it: what a live `hte.runner.run_campaign` call does
    with one."""
    from hte import fakellm

    state = {"count": 0}

    def fake_invoke_cli(prompt, model, schema, timeout, *, role):
        if role == refuse_role and schema is refuse_schema:
            state["count"] += 1
            if state["count"] == refuse_at:
                envelope = {
                    "stop_reason": "max_tokens" if truncate else "refusal",
                    "session_id": "should-never-leak-9f3a", "uuid": "should-never-leak-uuid",
                    "total_cost_usd": 0.0123,
                }
                kwargs = dict(role=role, prompt_sha256=llm._prompt_sha256(prompt), cost_usd=0.0123, envelope=envelope)
                if truncate:
                    raise llm.ModelTruncation(reason="max_tokens", **kwargs)
                raise llm.ModelRefusal(**kwargs)
        return {"structured_output": fakellm.complete(prompt, role=role, schema=schema)}

    return fake_invoke_cli


def test_production_campaign_survives_one_refused_critic_call(tmp_path, monkeypatch):
    """The production incident this fix responds to, reproduced end to
    end: one critic call among the campaign's own hypotheses refuses;
    the campaign completes anyway, MANIFEST.json counts the refusal and
    names the affected hypothesis, self-report.json's own assumptions
    mention it, run.log carries one line for it, and no artifact this
    run writes carries the refusal's own session id."""
    fake_invoke_cli = _fake_invoke_cli_delegating_to_fakellm(
        refuse_role="critic", refuse_schema=roles.CRITIQUE_SCHEMA, refuse_at=2,
    )
    monkeypatch.setattr(llm, "_invoke_cli", fake_invoke_cli)
    cfg = {
        "campaign": "production", "corpus": "production", "out_dir": str(tmp_path),
        "cache_dir": str(tmp_path / "cache"), "replay_only": False, "seeds": 1,
        "generate_n": 1, "combinatorial_max_items": 1, "max_hypotheses": 5,
        "tournament_rounds": 1, "max_time_bins": 2, "run_extraction": False,
        "critic_batch_size": 1, "llm_workers": 1,
    }
    artifacts = runner.run_campaign(cfg)

    manifest = json.loads((artifacts.run_dir / "MANIFEST.json").read_text())
    assert manifest["llm_stats"]["critic"]["refusals"] == 1
    assert len(manifest["refusals"]["critic"]) == 1

    self_report_data = json.loads((artifacts.run_dir / "self-report.json").read_text())
    assert any("refusal" in a for a in self_report_data["assumptions"])

    run_log = (artifacts.run_dir / "run.log").read_text()
    assert "refusal: role=critic" in run_log

    for f in artifacts.run_dir.rglob("*"):
        if f.is_file():
            text = f.read_text(errors="ignore")
            assert "should-never-leak" not in text, f"{f} leaked a session identifier"


def test_production_campaign_survives_one_truncated_judge_call(tmp_path, monkeypatch):
    """The same contract for a `judge` truncation (`stop_reason=
    "max_tokens"`) instead of a critic refusal."""
    fake_invoke_cli = _fake_invoke_cli_delegating_to_fakellm(
        refuse_role="judge", refuse_schema=roles.JUDGE_SCHEMA, refuse_at=1, truncate=True,
    )
    monkeypatch.setattr(llm, "_invoke_cli", fake_invoke_cli)
    cfg = {
        "campaign": "production", "corpus": "production", "out_dir": str(tmp_path),
        "cache_dir": str(tmp_path / "cache"), "replay_only": False, "seeds": 1,
        "generate_n": 1, "combinatorial_max_items": 1, "max_hypotheses": 5,
        "tournament_rounds": 1, "max_time_bins": 2, "run_extraction": False,
        "judge_batch_size": 1, "llm_workers": 1,
    }
    artifacts = runner.run_campaign(cfg)

    manifest = json.loads((artifacts.run_dir / "MANIFEST.json").read_text())
    assert manifest["llm_stats"]["judge"]["truncations"] == 1
    assert len(manifest["refusals"].get("judge", [])) == 1
    for f in artifacts.run_dir.rglob("*"):
        if f.is_file():
            assert "should-never-leak" not in f.read_text(errors="ignore"), f"{f} leaked a session identifier"


# --------------------------------------------------------------------------
# Time-binning span coverage (`bkt-hte-binning-span-coverage`, 2026-09-10):
# a live `education-atlas` campaign died right after "time binning:
# resolution='year' span_start=2002 bin_width=1" with `ValueError: year
# 2000 sits before the span start 2002` -- `_resolve_time_binning`'s prior
# span was built from ground-truth years alone, and never covered a year
# an evidence item's own extracted interval carried.
# --------------------------------------------------------------------------


@pytest.mark.skipif(
    education_atlas.DEFAULT_SAMPLE_DIR is None,
    reason="education-atlas checkout not found; set EDUCATION_ATLAS_DIR",
)
def test_education_atlas_binning_covers_an_evidence_interval_before_ground_truth(tmp_path, monkeypatch):
    """Reproduces the incident directly: a trimmed `education-atlas`
    corpus with one evidence item's interval spliced to predate its own
    ground truth's earliest year (the incident's own shape, an evidence
    item's year the prior ground-truth-only span never covered), run end
    to end in fake mode. Must complete without raising."""
    monkeypatch.setenv("HTE_LLM_MODE", "fake")

    def _small_education_atlas_with_early_evidence():
        corpus = education_atlas.load()
        corpus.evidence = corpus.evidence[:12]
        earliest_ground_truth = min(g.year for g in corpus.ground_truth)
        early_item = replace(
            corpus.evidence[0],
            id="_test-early-evidence",
            interval=Interval(start=earliest_ground_truth - 2, end=earliest_ground_truth - 2),
        )
        corpus.evidence = corpus.evidence + [early_item]
        return corpus

    runner._CORPUS_LOADERS["_test-education-atlas-early-evidence"] = _small_education_atlas_with_early_evidence
    try:
        cfg = {
            "campaign": "education-atlas", "corpus": "_test-education-atlas-early-evidence", "out_dir": str(tmp_path),
            "cache_dir": str(tmp_path / "cache"), "replay_only": False, "seeds": 1,
            "generate_n": 1, "combinatorial_max_items": 1, "max_hypotheses": 5,
            "tournament_rounds": 1, "max_time_bins": 2, "run_extraction": False,
        }
        artifacts = runner.run_campaign(cfg)
    finally:
        runner._CORPUS_LOADERS.pop("_test-education-atlas-early-evidence", None)
    assert artifacts.run_dir.is_dir()
    assert (artifacts.run_dir / "MANIFEST.json").is_file()


def _corpus_with_years(gt_years: list[int], evidence_years: list[int]) -> Corpus:
    """A minimal `Corpus` carrying exactly the given ground-truth event
    years and evidence-interval years, everything else at its own
    default, for `_resolve_time_binning`'s own property test below."""
    ground_truth = [
        GroundTruthEvent(id=f"gt-{i}", label=f"event {i}", year=y, doc_id="doc", discovery_year=y)
        for i, y in enumerate(gt_years)
    ]
    evidence = [
        EvidenceItem(
            id=f"ev-{i}", kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="doc",
            span=EvidenceSpan(doc_id="doc", locator=f"p{i}", quote="x", char_start=0, char_end=1),
            provenance="test", interval=Interval(start=y, end=y),
        )
        for i, y in enumerate(evidence_years)
    ]
    return Corpus(evidence=evidence, ground_truth=ground_truth)


@given(
    gt_years=st.lists(st.integers(min_value=-5000, max_value=5000), min_size=0, max_size=10),
    evidence_years=st.lists(st.integers(min_value=-5000, max_value=5000), min_size=0, max_size=10),
)
def test_resolve_time_binning_span_covers_every_known_year(gt_years, evidence_years):
    """`_resolve_time_binning`'s own span must cover the union of every
    ground-truth event's year and every evidence item's own extracted
    interval: no year a corpus already carries at binning time should
    ever need `hte.timeline.time_bin_index`'s own clamp-to-bin-0
    fallback, which exists for a year no corpus data named at all (a
    generator role's own hallucinated `time_hint`); the miss is elsewhere when this
    function had the hint on hand and failed to cover it."""
    if not gt_years and not evidence_years:
        return  # `_resolve_time_binning`'s own documented no-data default; nothing to cover
    corpus = _corpus_with_years(gt_years, evidence_years)
    _resolution, span_start, _bin_width = runner._resolve_time_binning({"resolution": None}, corpus)
    for year in gt_years + evidence_years:
        assert year >= span_start, f"year {year} falls outside computed span_start {span_start}"


# --------------------------------------------------------------------------
# constants loading (docs/CALIBRATION-FIT-2026-09-10.md, hte.belief.load_constants)
# --------------------------------------------------------------------------


def test_default_config_defaults_constants_to_fitted():
    assert runner.DEFAULT_CONFIG["constants"] == "fitted"


def test_run_campaign_honors_an_explicit_constants_default(tmp_path, monkeypatch):
    from hte.belief import Constants

    captured: dict = {}
    real_load_constants = runner.load_constants

    def spy(source):
        captured["source"] = source
        return real_load_constants(source)

    monkeypatch.setattr(runner, "load_constants", spy)
    cfg = {**FIXTURE_CONFIG, "out_dir": str(tmp_path), "constants": "default"}
    runner.run_campaign(cfg)
    assert captured["source"] == "default"


def test_run_campaign_with_no_constants_key_falls_back_to_the_default_config(tmp_path, monkeypatch):
    captured: dict = {}
    real_load_constants = runner.load_constants

    def spy(source):
        captured["source"] = source
        return real_load_constants(source)

    monkeypatch.setattr(runner, "load_constants", spy)
    cfg = {k: v for k, v in FIXTURE_CONFIG.items() if k != "constants"}
    cfg["out_dir"] = str(tmp_path)
    runner.run_campaign(cfg)
    assert captured["source"] == "fitted"  # DEFAULT_CONFIG's own default, no override given
