import json
from pathlib import Path

import pytest

from hte import llm, runner
from hte.corpus import education_atlas, production

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
