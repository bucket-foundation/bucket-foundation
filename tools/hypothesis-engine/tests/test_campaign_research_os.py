"""`scripts/campaign_research_os.py` (ros-12 item 3, the campaign-run
caller). `run()` against `hte.corpus.production.load()` (the package's own
14 shipped production fixtures, `docs/PRODUCTION-SCHEMA-ALIGNMENT.md`),
`HTE_LLM_MODE=fake` so no `claude -p` call or API key is ever touched,
matching `tests/test_api.py`'s own `_FAST_CONFIG` pattern for a small,
fast, deterministic fake-mode campaign over this exact corpus. Registering
a corpus loader into `hte.runner._CORPUS_LOADERS` at test time mirrors
`tests/test_runner.py`'s own `test_education_atlas_binning_covers_an_
evidence_interval_before_ground_truth`. No Supabase access: this file
never calls `main()` or anything in `hte.corpus.research_os_outbox`.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from hte import runner  # noqa: E402
from hte.corpus import production  # noqa: E402

import campaign_research_os as cro  # noqa: E402

# Small enough to run fast in fake mode over the 14-fixture corpus, the
# same sizing rationale as tests/test_api.py's own _FAST_CONFIG (~26
# sources, ~16 evidence items). `resolution` is left unset (auto-select,
# hte.timeline.auto_resolution) on purpose: pinning "year" against this
# corpus's own wide date span overflows Python's default integer-string
# conversion limit inside hte.address.short_id, a pre-existing engine
# issue this script's own tests route around rather than fix (out of
# ros-12's own scope).
FAST_CONFIG = {
    "seeds": 1,
    "generate_n": 1,
    "combinatorial_max_items": 5,
    "max_hypotheses": 10,
    "tournament_rounds": 1,
    "max_time_bins": 3,
}


@pytest.fixture(autouse=True)
def _fake_llm_mode(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")


@pytest.fixture(autouse=True)
def _restore_corpus_loaders():
    """`_register_corpus` mutates `hte.runner._CORPUS_LOADERS` in place;
    restore it after every test so a stray `"research-os"`/`"_test-*"` key
    never leaks into a later, unrelated test."""
    before = dict(runner._CORPUS_LOADERS)
    yield
    runner._CORPUS_LOADERS.clear()
    runner._CORPUS_LOADERS.update(before)


def _run(tmp_path, **overrides):
    cfg = {**FAST_CONFIG, "out_dir": str(tmp_path), "cache_dir": str(tmp_path / "cache"), **overrides}
    corpus = production.load()
    return cro.run(corpus, config_overrides=cfg)


def test_register_corpus_makes_run_campaign_resolve_an_arbitrary_name():
    corpus = production.load()
    cro._register_corpus("_test-campaign-research-os-registration", corpus)
    assert runner._CORPUS_LOADERS["_test-campaign-research-os-registration"]() is corpus


def test_run_produces_the_export_shape(tmp_path):
    payload = _run(tmp_path)

    assert payload["engine"] == "hte"
    assert payload["campaign"] == cro.DEFAULT_CAMPAIGN
    assert payload["branch"] == cro.DEFAULT_BRANCH
    assert payload["runId"]
    assert isinstance(payload["accepted"], list)
    assert isinstance(payload["gaps"], list)


def test_run_registers_under_the_given_campaign_name(tmp_path):
    payload = cro.run(
        production.load(),
        campaign="research-os-test",
        config_overrides={**FAST_CONFIG, "out_dir": str(tmp_path), "cache_dir": str(tmp_path / "cache")},
    )
    assert payload["campaign"] == "research-os-test"
    assert "research-os-test" in runner._CORPUS_LOADERS


def test_accepted_hypotheses_carry_every_engine_hypothesis_input_field(tmp_path):
    payload = _run(tmp_path)
    assert payload["accepted"], "the 14-fixture production corpus should survive at least one hypothesis under this config"
    for entry in payload["accepted"]:
        assert entry["engine"] == "hte"
        assert entry["runId"] == payload["runId"]
        assert entry["campaign"] == payload["campaign"]
        assert entry["hypothesisId"]
        assert entry["branch"] == cro.DEFAULT_BRANCH
        assert entry["title"] and isinstance(entry["title"], str)
        assert entry["posterior"] is None or 0.0 <= entry["posterior"] <= 1.0
        assert set(entry["slots"].keys()) <= {"actor", "action", "object", "place", "mechanism"}
        assert isinstance(entry["evidenceRefs"], list)
        assert entry["derivesFromSlugs"] == []


def test_gap_nodes_cover_the_unresolved_slot_evidence(tmp_path):
    # The two research-os-shaped fixtures inside hte.corpus.production's own
    # 14-fixture set normalize every one of the five engine slots to None
    # (normalize_research_os_record's own documented default), so this
    # corpus always carries at least one unresolved-slot gap.
    payload = _run(tmp_path)
    assert payload["gaps"], "expected at least one unresolved-slot gap from the research-os-shaped fixtures"
    for gap in payload["gaps"]:
        assert gap["kind"] == "unresolved-slot"
        assert gap["gapId"].startswith("gap-")
        assert gap["valueOfInformation"] >= 0.0
        assert isinstance(gap["concernsHypothesisIds"], list)


def test_gap_limit_caps_the_export(tmp_path):
    payload = cro.run(
        production.load(),
        gap_limit=1,
        config_overrides={**FAST_CONFIG, "out_dir": str(tmp_path), "cache_dir": str(tmp_path / "cache")},
    )
    assert len(payload["gaps"]) <= 1


def test_hypothesis_title_falls_back_when_every_slot_is_empty():
    assert cro._hypothesis_title({}, "h-abcd") == "Hypothesis h-abcd"
    assert cro._hypothesis_title({"actor": "Farmers", "action": None}, "h-abcd") == "Farmers"
