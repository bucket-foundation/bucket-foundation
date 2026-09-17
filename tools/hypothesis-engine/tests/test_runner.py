import json
from dataclasses import replace
from pathlib import Path

import pytest
from hypothesis import given
from hypothesis import strategies as st

from hte import llm, roles, runner
from hte.belief import Opinion
from hte.corpus import Corpus, GroundTruthEvent, education_atlas, production
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Tier
from hte.timeline import Interval

# Small knobs so a fake-mode campaign runs in about a second; `resolution`
# pinned so time binning stays fixed across corpora, and the flat
# combinatorial draw kept so the pool composition these tests count on
# does not move with the vocabulary's status labels.
FIXTURE_CONFIG = {
    "campaign": "fixture-seed",
    "corpus": "fixtures",
    "seeds": 1,
    "generate_n": 2,
    "tournament_rounds": 1,
    "max_hypotheses": 8,
    "combinatorial_max_items": 5,
    "combinatorial_status_balanced": False,
    "resolution": "century",
}


def _fake_mode_cfg(tmp_path, monkeypatch, **overrides):
    """`FIXTURE_CONFIG` run through `HTE_LLM_MODE=fake` with a scratch cache."""
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    return {**FIXTURE_CONFIG, "cache_dir": str(tmp_path / "cache"), "replay_only": False,
            "out_dir": str(tmp_path), **overrides}


@pytest.fixture(autouse=True)
def _no_ambient_llm_mode(monkeypatch):
    """`HTE_LLM_MODE` unset for every test here unless the test sets it:
    a `fake` value leaking from another test file turns a
    `replay_only=True` cache-miss test into a full fake-mode campaign,
    which on `education-atlas` runs a k-fold calibration for minutes
    (the 2026-09-15 hang at `test_campaign_run_replay_only_fails_only_on_
    cache_miss[education-atlas]`)."""
    monkeypatch.delenv("HTE_LLM_MODE", raising=False)


def test_run_campaign_end_to_end_in_fake_mode(tmp_path, monkeypatch):
    # `corpus="production"` overrides `FIXTURE_CONFIG`'s own "fixtures"
    # here: `hte.fakellm`'s critic stand-in rejects every unlinked
    # hypothesis outright (stricter than the real model,
    # `docs/YOUNGER-DRYAS.md`'s own critic quote keeps one), and the
    # tiny "fixtures" corpus links nothing under fake mode at any cap,
    # `combinatorial_status_balanced` either way (confirmed against
    # this branch's own unmodified base commit too, so this predates
    # this bead). "production" survives fine.
    cfg = _fake_mode_cfg(
        tmp_path, monkeypatch, corpus="production", max_hypotheses=20,
        combinatorial_max_items=1, max_time_bins=2, run_extraction=False,
    )
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
    assert manifest["corpus"] == "production"
    # Fake mode accepts `cache_dir` but never writes to it (`hte.llm.
    # complete`'s own fake-mode contract), so this run's own `llm_stats`
    # carries the call count instead of `cache["files"]`.
    assert manifest["llm_stats"]

    # `hte.generate.stratified_sample`'s own frame
    # (`STATISTICAL-AUDIT-2026-09-15.md` item 1), folded into
    # `MANIFEST.json["counts"]["sampling"]` verbatim: `generated` sums to
    # every distinct address this run built, `kept` to the population
    # the critic saw (`n_survivors` is the critic-filtered subset of
    # that, always `<=`).
    sampling = manifest["counts"]["sampling"]
    assert sampling["cap"] == cfg["max_hypotheses"]
    assert sum(s["generated"] for s in sampling["strata"].values()) == manifest["counts"]["n_hypotheses_generated"]
    assert sum(s["kept"] for s in sampling["strata"].values()) >= manifest["counts"]["n_survivors"]
    assert sum(s["kept"] for s in sampling["strata"].values()) <= cfg["max_hypotheses"]
    assert manifest["seeds"] == [0]
    assert "git_sha" in manifest

    log_text = (artifacts.run_dir / "run.log").read_text()
    assert "campaign 'fixture-seed' starting" in log_text
    assert "run complete" in log_text


def test_run_campaign_replay_only_raises_on_true_cache_miss(tmp_path, monkeypatch):
    monkeypatch.delenv("HTE_LLM_MODE", raising=False)
    cfg = {**FIXTURE_CONFIG, "out_dir": str(tmp_path), "cache_dir": str(tmp_path / "empty-cache"), "replay_only": True}
    with pytest.raises(llm.LLMCacheMissError):
        runner.run_campaign(cfg)


def test_run_campaign_is_deterministic_across_runs(tmp_path, monkeypatch):
    cfg1 = _fake_mode_cfg(tmp_path, monkeypatch, out_dir=str(tmp_path / "run1"))
    cfg2 = _fake_mode_cfg(tmp_path, monkeypatch, out_dir=str(tmp_path / "run2"))
    a1 = runner.run_campaign(cfg1)
    a2 = runner.run_campaign(cfg2)
    assert {h.address for h in a1.hypotheses} == {h.address for h in a2.hypotheses}
    assert a1.self_report == a2.self_report
    assert a1.coverage == a2.coverage


def test_manifest_carries_llm_stats(tmp_path, monkeypatch):
    cfg = _fake_mode_cfg(tmp_path, monkeypatch)
    artifacts = runner.run_campaign(cfg)
    manifest = json.loads((artifacts.run_dir / "MANIFEST.json").read_text())
    assert "llm_stats" in manifest
    assert manifest["llm_stats"]
    assert all(row["calls"] > 0 for row in manifest["llm_stats"].values())


def test_judge_disagreement_count_excludes_draws_and_ties(monkeypatch):
    """`bkt-hte-blind-roles`: the exact logic behind `MANIFEST.json`
    `counts.judge_disagreement`, two judged pairs (one agrees with the
    opinion's own P-ordering, one disagrees) plus a draw."""
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    opinions = {
        1: Opinion(b=0.9, d=0.0, u=0.1, a=0.5),  # high P
        2: Opinion(b=0.0, d=0.9, u=0.1, a=0.5),  # low P
        3: Opinion(b=0.5, d=0.0, u=0.5, a=0.5),
    }
    triples = [
        (1, 2, 0.0),  # opinion favors 1; score favors 2 -> disagreement
        (1, 2, 1.0),  # opinion favors 1; score favors 1 -> agreement
        (1, 3, 0.5),  # a draw score, excluded regardless of opinion
    ]
    assert runner._judge_disagreement_count(triples, opinions) == 1


# --------------------------------------------------------------------------
# Preregistration hash (item 5): MANIFEST.json["prereg"].
# --------------------------------------------------------------------------


def test_manifest_prereg_hash_is_stable_across_two_runs_with_the_same_config(tmp_path, monkeypatch):
    cfg1 = _fake_mode_cfg(tmp_path, monkeypatch, out_dir=str(tmp_path / "run1"))
    cfg2 = _fake_mode_cfg(tmp_path, monkeypatch, out_dir=str(tmp_path / "run2"))
    a1 = runner.run_campaign(cfg1)
    a2 = runner.run_campaign(cfg2)
    manifest1 = json.loads((a1.run_dir / "MANIFEST.json").read_text())
    manifest2 = json.loads((a2.run_dir / "MANIFEST.json").read_text())
    assert manifest1["prereg"]["sha256"] == manifest2["prereg"]["sha256"]
    assert manifest1["prereg"]["criteria"] == manifest2["prereg"]["criteria"]


def test_manifest_prereg_hash_changes_when_lift_floor_changes(tmp_path, monkeypatch):
    cfg1 = _fake_mode_cfg(tmp_path, monkeypatch, out_dir=str(tmp_path / "run1"))
    cfg2 = _fake_mode_cfg(tmp_path, monkeypatch, out_dir=str(tmp_path / "run2"), lift_floor=0.4)
    a1 = runner.run_campaign(cfg1)
    a2 = runner.run_campaign(cfg2)
    manifest1 = json.loads((a1.run_dir / "MANIFEST.json").read_text())
    manifest2 = json.loads((a2.run_dir / "MANIFEST.json").read_text())
    assert manifest1["prereg"]["sha256"] != manifest2["prereg"]["sha256"]
    assert manifest1["prereg"]["criteria"]["lift_floor"] == 0.25  # DEFAULT_CONFIG's own default
    assert manifest2["prereg"]["criteria"]["lift_floor"] == 0.4


def test_prereg_is_computed_before_survivors_json_is_written(tmp_path, monkeypatch):
    """Spies on both call sites to check the real runtime order in one
    fake-mode run, rather than trusting the source layout alone."""
    events: list[str] = []
    real_prereg = runner._prereg_manifest

    def spy_prereg(cfg):
        events.append("prereg")
        return real_prereg(cfg)

    monkeypatch.setattr(runner, "_prereg_manifest", spy_prereg)

    real_write_text = Path.write_text

    def spy_write_text(self, data, *args, **kwargs):
        if self.name == "survivors.json":
            events.append("survivors.json")
        return real_write_text(self, data, *args, **kwargs)

    monkeypatch.setattr(Path, "write_text", spy_write_text)

    cfg = _fake_mode_cfg(tmp_path, monkeypatch)
    runner.run_campaign(cfg)

    assert "prereg" in events and "survivors.json" in events
    assert events.index("prereg") < events.index("survivors.json")


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
        # `max_hypotheses: 5` (this test's own value before `hte.generate.
        # stratified_sample` replaced the address-sorted cap) kept the
        # production corpus's own lowest-address actor every run, which
        # happened to carry linked evidence; a stratified sample spreads
        # those 5 across every actor stratum, most with no evidence
        # linked at this cap's own floor, so the critic call finds zero
        # survivors and there is nothing left for `judge` to ever see. 30
        # keeps enough of every stratum for at least one survivor pair.
        "generate_n": 1, "combinatorial_max_items": 1, "max_hypotheses": 30,
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
    captured: dict = {}
    real_load_constants = runner.load_constants

    def spy(source):
        captured["source"] = source
        return real_load_constants(source)

    monkeypatch.setattr(runner, "load_constants", spy)
    cfg = _fake_mode_cfg(tmp_path, monkeypatch, constants="default")
    runner.run_campaign(cfg)
    assert captured["source"] == "default"


def test_run_campaign_with_no_constants_key_falls_back_to_the_default_config(tmp_path, monkeypatch):
    captured: dict = {}
    real_load_constants = runner.load_constants

    def spy(source):
        captured["source"] = source
        return real_load_constants(source)

    monkeypatch.setattr(runner, "load_constants", spy)
    cfg = {k: v for k, v in _fake_mode_cfg(tmp_path, monkeypatch).items() if k != "constants"}
    runner.run_campaign(cfg)
    assert captured["source"] == "fitted"  # DEFAULT_CONFIG's own default, no override given


# --------------------------------------------------------------------------
# survivors.json (`bkt-hte-survivors-artifact`): every survivor's own full
# opinion, Elo, preservation critique, and robustness dict, persisted next
# to `timeline.json`'s pruned `posterior`/`elo` pair and `MANIFEST.json`'s
# aggregate `robustness_stable_fraction`.
# --------------------------------------------------------------------------


def test_survivors_artifact_has_one_entry_per_survivor_with_full_opinion_and_robustness(tmp_path, monkeypatch):
    # `production` over `fixtures`: this exact config's own critic pass
    # (`hte.fakellm._critic`'s "at least one linked evidence item"
    # rule) keeps 4 of `production`'s hypotheses and zero of `fixtures`'
    # own, confirmed empirically and deterministically against both
    # corpora (`hte.link.link_evidence`'s own threshold match runs
    # independent of fakellm's own hash, a real property of each
    # corpus's own evidence). A survivors count of zero would let
    # every assertion in the loop below pass vacuously.
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    cfg = {
        "campaign": "production", "corpus": "production", "out_dir": str(tmp_path),
        "cache_dir": str(tmp_path / "cache"), "replay_only": False, "seeds": 1,
        "generate_n": 1, "combinatorial_max_items": 1, "max_hypotheses": 5,
        "tournament_rounds": 1, "max_time_bins": 2, "run_extraction": False,
    }
    artifacts = runner.run_campaign(cfg)
    assert artifacts.hypotheses  # see the config comment above: must be non-empty for this test to mean anything

    survivors_path = artifacts.run_dir / "survivors.json"
    assert survivors_path.is_file()
    data = json.loads(survivors_path.read_text())
    assert data["campaign"] == "production"
    assert data["corpus"] == "production"
    assert data["artifact_version"]

    entries = data["survivors"]
    assert len(entries) == len(artifacts.hypotheses)
    assert {e["hypothesis_id"] for e in entries} == {h.short_id for h in artifacts.hypotheses}

    elos_in_order = [e["elo"] for e in entries]
    assert elos_in_order == sorted(elos_in_order, reverse=True)

    for entry in entries:
        opinion = entry["opinion"]
        assert opinion["P"] == pytest.approx(opinion["b"] + opinion["a"] * opinion["u"], abs=1e-9)
        # `max_lift`: the top-level mirror of `opinion["lift"]`, named to
        # match `hte.cli._per_actor_summary`'s own per-actor rollup.
        assert entry["max_lift"] == pytest.approx(opinion["lift"])
        assert opinion["lift"] == pytest.approx(opinion["b"] - opinion["d"])
        assert set(entry["robustness"]["projections"]) == {"consensus", "skeptic", "fringe", "uniform"}
        assert entry["preservation"] is not None
        assert isinstance(entry["slots"], dict)
        assert "ACTOR" in entry["slots"] or "RELATION" in entry["slots"]  # placement vs. sequence shape


def test_survivors_carry_the_critic_likelihood_ratios(tmp_path, monkeypatch):
    cfg = _fake_mode_cfg(
        tmp_path, monkeypatch, corpus="production", max_hypotheses=20,
        combinatorial_max_items=1, max_time_bins=2, run_extraction=False,
    )
    artifacts = runner.run_campaign(cfg)
    entries = json.loads((artifacts.run_dir / "survivors.json").read_text())["survivors"]
    assert entries
    rated = [e for e in entries if e["likelihood_ratios"]]
    assert rated, "the fake critic rates every listed item, so a bound survivor carries ratios"
    assert all(v in (10.0, 3.0, 1.5, 1.0) for e in rated for v in e["likelihood_ratios"].values())


def test_stance_audit_counts_items_per_actor_by_stance():
    from hte.corpus import vindication_fixture
    audit = runner.stance_audit(vindication_fixture.build().evidence)
    assert audit == {"unverified-observer": {"positive": 5, "negative": 1}}


def test_manifest_carries_the_stance_audit(tmp_path, monkeypatch):
    cfg = _fake_mode_cfg(
        tmp_path, monkeypatch, corpus="production", max_hypotheses=20, combinatorial_max_items=1,
        max_time_bins=2, run_extraction=False,
    )
    artifacts = runner.run_campaign(cfg)
    manifest = json.loads((artifacts.run_dir / "MANIFEST.json").read_text())
    stance = manifest["counts"]["stance"]
    assert stance and all(set(row) == {"positive", "negative"} for row in stance.values())
    assert sum(row["positive"] + row["negative"] for row in stance.values()) == manifest["counts"]["n_evidence"]
    assert "stance audit:" in (artifacts.run_dir / "run.log").read_text()
