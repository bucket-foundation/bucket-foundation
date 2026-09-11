"""Property/behavior tests for `hte.bridge_export`, this package's own
Research OS bridge-export producer. No prior test file is dedicated to
this module by name: three assertions already live inside `tests/
test_canon_writeback.py` (`test_bridge_export_marks_accepted_by_the_
given_floors`, `..._carries_full_opinion_and_never_tier_assigned`,
`..._slots_are_id_and_label_objects`), reused here via its own
`linking_run` fixture and `_linking_corpus`/`_hypothesis` helpers rather
than rebuilt from scratch (the same qualified-import pattern `tests/
swarm-20260910/test_runner_props.py` already uses against `tests.swarm.
conftest`). New here, beyond those three: `write_bridge_
export`'s own file-write side effect, `_source_tier`'s empty-evidence
and multi-tier-picks-the-best branches, `model` reading `MANIFEST.
json["models"]["roles"]["generator"]` when that path is present versus
absent, and `evidenceCitations`'s own per-field mapping.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pytest

from hte import bridge_export, canon_writeback
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Tier
from tests.test_canon_writeback import BIN_INTERVAL, TBIN, BIN_START, _hypothesis, _linking_corpus, linking_run  # noqa: F401

# --------------------------------------------------------------------------
# export_for_bridge, over the shared `linking_run` fixture
# --------------------------------------------------------------------------


def test_export_for_bridge_returns_one_item_per_survivor(linking_run):
    run_dir, h_supported, h_refuted = linking_run
    items = bridge_export.export_for_bridge(run_dir, branch="02-physics")
    assert len(items) == 2
    ids = {item["hypothesisId"] for item in items}
    assert ids == {h_supported.short_id, h_refuted.short_id}


def test_contract_pinned_fields_hold_for_every_item(linking_run):
    """`tierAssigned`, `derivesFromSlugs`, `kind`, `origin`, and
    `canon_tier` are documented, always-fixed values (this module's own
    top docstring, "`tierAssigned` is deliberately left `None`" and the
    additive-fields section): a regression here means one of those
    contracts silently started varying."""
    run_dir, _, _ = linking_run
    items = bridge_export.export_for_bridge(run_dir, branch="02-physics")
    assert len(items) >= 1
    for item in items:
        assert item["tierAssigned"] is None
        assert item["derivesFromSlugs"] == []
        assert item["kind"] == "derivation"
        assert item["origin"] == "engine"
        assert item["canon_tier"] == canon_writeback.CANON_TIER
        assert item["summary"] is None
        assert item["engine"] == "hte"


def test_branch_is_passed_through_verbatim(linking_run):
    run_dir, _, _ = linking_run
    items = bridge_export.export_for_bridge(run_dir, branch="05-biophysics")
    for item in items:
        assert item["branch"] == "05-biophysics"
    empty_branch_items = bridge_export.export_for_bridge(run_dir)
    for item in empty_branch_items:
        assert item["branch"] == ""


def test_evidence_citations_mirror_the_linked_evidence_items(linking_run):
    run_dir, h_supported, h_refuted = linking_run
    items = bridge_export.export_for_bridge(run_dir, branch="02-physics")
    by_id = {item["hypothesisId"]: item for item in items}

    supported_citations = by_id[h_supported.short_id]["evidenceCitations"]
    assert len(supported_citations) == 1
    citation = supported_citations[0]
    assert citation["ref"] == "ev-1"
    assert citation["sourceId"] == "src-1"
    assert citation["citation"] == "l1"
    assert citation["quote"] == "the alpha team sighted comet Q"
    # `evidenceRefs` stays the bare-id list, never the richer citation shape
    assert by_id[h_supported.short_id]["evidenceRefs"] == ["ev-1"]

    refuted_citations = by_id[h_refuted.short_id]["evidenceCitations"]
    assert len(refuted_citations) == 1
    assert refuted_citations[0]["ref"] == "ev-2"
    assert refuted_citations[0]["sourceId"] == "src-1"
    assert refuted_citations[0]["citation"] == "l2"


def test_model_reads_the_generator_role_from_manifest(linking_run):
    # `linking_run`'s own MANIFEST.json carries {"roles": {"generator": "sonnet"}}
    run_dir, _, _ = linking_run
    items = bridge_export.export_for_bridge(run_dir, branch="02-physics")
    assert all(item["model"] == "sonnet" for item in items)


def test_model_is_none_when_manifest_carries_no_models_key(tmp_path, monkeypatch):
    from hte import runner as runner_mod

    corpus = _linking_corpus()
    monkeypatch.setitem(runner_mod._CORPUS_LOADERS, "swarm-no-models-corpus", lambda: _linking_corpus())
    h = _hypothesis("alpha-team", "sighted", "comet-q", "alpha-observatory", "transit-timing-method", corpus.vocab)

    run_dir = tmp_path / "runs" / "camp" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    manifest = {
        "campaign": "camp", "timestamp": "20260101T000000Z", "corpus": "swarm-no-models-corpus",
        "run_artifact_version": "1.0.0",
        # no "models" key at all
        "config": {"link_threshold": 0.6},
        "counts": {"vocab_added": []},
    }
    (run_dir / "MANIFEST.json").write_text(json.dumps(manifest))
    timeline = {
        "bins": [{"time_bin": {"index": TBIN, "label": f"{BIN_START}s"}, "ranked_hypotheses": [
            {"hypothesis_id": h.short_id, "address": h.address, "slots": {"ACTOR": "alpha-team", "ACTION": "sighted", "OBJECT": "comet-q", "PLACE": "alpha-observatory", "MECHANISM": "transit-timing-method"}, "posterior": None, "elo": 1550.0},
        ]}],
        "event_views": [], "pair_views": [],
    }
    (run_dir / "timeline.json").write_text(json.dumps(timeline))

    items = bridge_export.export_for_bridge(run_dir, branch="02-physics")
    assert len(items) == 1
    assert items[0]["model"] is None


# --------------------------------------------------------------------------
# _source_tier: empty-evidence and best-of-multiple-tiers branches, not
# reachable through `linking_run`'s own single-tier-per-hypothesis fixture
# --------------------------------------------------------------------------


def _fake_evidence(tier: Tier) -> EvidenceItem:
    return EvidenceItem(
        id=f"ev-{tier.value}", kind=EvidenceKind.TEXTUAL, tier=tier, source_id="src-x",
        span=EvidenceSpan(doc_id="doc-x", locator="lx", quote="q", char_start=0, char_end=1),
        provenance="swarm-fixture",
    )


def test_source_tier_is_none_with_no_linked_evidence():
    fake_candidate = SimpleNamespace(supports=[], refutes=[])
    assert bridge_export._source_tier(fake_candidate) is None


@pytest.mark.parametrize(
    "supports_tiers,refutes_tiers,expected",
    [
        ([Tier.T4, Tier.T1, Tier.T3], [], "T1"),
        ([], [Tier.T5, Tier.T2], "T2"),
        ([Tier.T6], [Tier.T1], "T1"),
        ([Tier.T3], [], "T3"),
    ],
)
def test_source_tier_picks_the_lowest_numbered_tier_across_supports_and_refutes(supports_tiers, refutes_tiers, expected):
    fake_candidate = SimpleNamespace(
        supports=[_fake_evidence(t) for t in supports_tiers],
        refutes=[_fake_evidence(t) for t in refutes_tiers],
    )
    assert bridge_export._source_tier(fake_candidate) == expected


def test_source_tier_surfaces_in_export_for_bridge(linking_run):
    run_dir, h_supported, h_refuted = linking_run
    items = bridge_export.export_for_bridge(run_dir, branch="02-physics")
    by_id = {item["hypothesisId"]: item for item in items}
    assert by_id[h_supported.short_id]["source_tier"] == "T2"
    assert by_id[h_refuted.short_id]["source_tier"] == "T3"


# --------------------------------------------------------------------------
# write_bridge_export: the actual file-write side effect
# --------------------------------------------------------------------------


def test_write_bridge_export_writes_a_bridge_json_file_matching_export_for_bridge(tmp_path, linking_run):
    run_dir, _, _ = linking_run
    envelope_path = tmp_path / "out" / "run-123.json"
    out_path = bridge_export.write_bridge_export(run_dir, envelope_path=envelope_path, branch="02-physics")

    assert out_path == envelope_path.with_name("run-123.bridge.json")
    assert out_path.is_file()

    written = json.loads(out_path.read_text(encoding="utf-8"))
    expected = bridge_export.export_for_bridge(run_dir, branch="02-physics")
    assert written == expected


def test_write_bridge_export_creates_missing_parent_directories(tmp_path, linking_run):
    run_dir, _, _ = linking_run
    envelope_path = tmp_path / "a" / "b" / "c" / "run-1.json"
    assert not envelope_path.parent.is_dir()

    out_path = bridge_export.write_bridge_export(run_dir, envelope_path=envelope_path, branch="")

    assert out_path.parent.is_dir()
    assert out_path.is_file()


def test_write_bridge_export_honors_custom_floors(tmp_path, linking_run):
    run_dir, _, _ = linking_run
    envelope_path = tmp_path / "run-9.json"
    out_path = bridge_export.write_bridge_export(
        run_dir, envelope_path=envelope_path, floor_P=0.99, floor_u_max=0.01, branch="02-physics",
    )
    written = json.loads(out_path.read_text(encoding="utf-8"))
    # An impossibly strict floor accepts nothing, matching
    # `test_bridge_export_marks_accepted_by_the_given_floors`'s own
    # existing assertion in `tests/test_canon_writeback.py`.
    assert all(item["accepted"] is False for item in written)
