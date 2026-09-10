"""`hte.corpus.production`: the K-12 research-production adapter, exercised
against the 12 shipped fixtures under `hte/data/production-fixtures/` and,
for `load_supabase`, against a monkeypatched `urllib.request.urlopen`
returning those same fixtures as REST rows. No network.
"""
from __future__ import annotations

import json

import pytest

from hte.concepts import Slot
from hte.corpus import production
from hte.evidence import Stance


@pytest.fixture
def corpus():
    return production.load()


# --------------------------------------------------------------------------
# raw fixtures
# --------------------------------------------------------------------------


def test_load_raw_reads_all_twelve_fixtures():
    productions = production.load_raw()
    assert len(productions) == 12
    assert len({p.id for p in productions}) == 12


def test_fixtures_cover_at_least_four_of_the_seven_runnable_questions():
    productions = production.load_raw()
    covered = {p.research_question.split(":")[0] for p in productions}
    runnable = {f"RQ{n}" for n in (19, 21, 22, 24, 25, 26, 27)}
    assert len(covered & runnable) >= 4
    # the fixture set as shipped exercises every one of the seven
    assert covered == runnable


def test_fixtures_span_three_grade_bands_and_two_districts():
    productions = production.load_raw()
    assert {p.grade_band for p in productions} == {"6-8", "9-10", "11-12"}
    assert {p.school_or_district_id for p in productions} == {"district-a", "district-b"}


def test_fixtures_cover_every_author_role_and_review_status():
    productions = production.load_raw()
    assert {p.author_role for p in productions} == {"student", "teacher", "researcher", "agent"}
    assert {p.review.status for p in productions} == {"draft", "peer-reviewed", "teacher-reviewed", "accepted", "retracted"}


# --------------------------------------------------------------------------
# corpus shape
# --------------------------------------------------------------------------


def test_load_default_status_min_counts(corpus):
    # 12 productions minus the one draft (prod-008) excluded by the default
    # status_min="peer-reviewed" leaves 11 contributing evidence.
    contributing_ids = {e.id.rsplit("-c", 1)[0] for e in corpus.evidence}
    assert "prod-008" not in contributing_ids
    assert len(contributing_ids) == 11
    # every production still gets a Source, including the filtered-out draft
    assert "prod-008" in corpus.sources
    assert len(corpus.evidence) > 0
    assert len(corpus.ground_truth) > 0


def test_status_min_draft_includes_the_draft_production():
    permissive = production.load(status_min="draft")
    contributing_ids = {e.id.rsplit("-c", 1)[0] for e in permissive.evidence}
    assert "prod-008" in contributing_ids


def test_status_min_accepted_only_still_carries_retracted_evidence():
    strict = production.load(status_min="accepted")
    contributing_ids = {e.id.rsplit("-c", 1)[0] for e in strict.evidence}
    # accepted-only excludes teacher-reviewed/peer-reviewed/draft productions...
    assert "prod-003" not in contributing_ids  # teacher-reviewed
    assert "prod-006" not in contributing_ids  # peer-reviewed
    assert "prod-008" not in contributing_ids  # draft
    # ...but a retraction always bypasses status_min
    assert "prod-010" in contributing_ids


def test_invalid_status_min_raises():
    with pytest.raises(ValueError):
        production.load(status_min="retracted")
    with pytest.raises(ValueError):
        production.load(status_min="not-a-status")


# --------------------------------------------------------------------------
# slot validity
# --------------------------------------------------------------------------


def test_every_evidence_item_slot_resolves_in_the_vocabulary(corpus):
    vocab = production.load_vocab()
    slot_by_field = {"actor": Slot.ACTOR, "action": Slot.ACTION, "object": Slot.OBJECT, "place": Slot.PLACE, "mechanism": Slot.MECHANISM}
    for item in corpus.evidence:
        for field_name, slot in slot_by_field.items():
            value = getattr(item, field_name)
            if value is not None:
                assert vocab.get(slot, value) is not None, f"{item.id}: {field_name}={value!r} not in vocab"


def test_five_non_consensus_actors_kept():
    vocab = production.load_vocab()
    from hte.concepts import ConsensusStatus
    non_consensus = [c for c in vocab.concepts(Slot.ACTOR) if c.consensus_status not in (ConsensusStatus.CONSENSUS, ConsensusStatus.OTHER)]
    assert len(non_consensus) == 5


# --------------------------------------------------------------------------
# stemma: citation chain of depth 2
# --------------------------------------------------------------------------


def test_stemma_citation_chain_depth_two(corpus):
    # prod-011 cites prod-005's claim; prod-005 cites prod-001's claim.
    assert corpus.sources["prod-011"].stemma_parents == ["prod-005"]
    assert corpus.sources["prod-005"].stemma_parents == ["prod-001"]
    assert corpus.sources["prod-001"].stemma_parents == []


def test_cited_production_evidence_item_points_at_the_production_source(corpus):
    cited = next(e for e in corpus.evidence if e.id == "prod-011-c0-e0")
    assert cited.source_id == "prod-005"
    assert cited.source_id in corpus.sources


# --------------------------------------------------------------------------
# retraction excluded from ground truth
# --------------------------------------------------------------------------


def test_retracted_claim_excluded_from_ground_truth(corpus):
    gt_ids = {g.id for g in corpus.ground_truth}
    assert "prod-010-c0-e0" not in gt_ids


def test_retracted_claim_still_present_as_downgraded_evidence(corpus):
    item = next(e for e in corpus.evidence if e.id == "prod-010-c0-e0")
    assert item.is_absence is True
    assert item.stance == Stance.NEGATIVE


def test_non_accepted_but_included_status_excluded_from_ground_truth(corpus):
    # prod-003 (teacher-reviewed) and prod-006 (peer-reviewed) both pass the
    # default status_min and contribute evidence, but neither is "accepted"
    # so neither contributes a ground-truth event.
    gt_ids = {g.id for g in corpus.ground_truth}
    assert not any(gid.startswith("prod-003") for gid in gt_ids)
    assert not any(gid.startswith("prod-006") for gid in gt_ids)
    assert any(e.id.startswith("prod-003") for e in corpus.evidence)
    assert any(e.id.startswith("prod-006") for e in corpus.evidence)


def test_ground_truth_discovery_year_is_the_acceptance_year(corpus):
    event = next(g for g in corpus.ground_truth if g.id == "prod-001-c0-e0")
    assert event.discovery_year == 2026  # prod-001 accepted 2026-03-02
    assert event.year == 2026


# --------------------------------------------------------------------------
# load_supabase
# --------------------------------------------------------------------------


def test_load_supabase_raises_without_env(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_KEY", raising=False)
    with pytest.raises(RuntimeError, match="SUPABASE_URL"):
        production.load_supabase()


def test_load_supabase_reads_rows_over_monkeypatched_urllib(monkeypatch):
    rows = [p.to_dict() for p in production.load_raw()]

    class FakeResponse:
        def __init__(self, payload: list[dict]) -> None:
            self._payload = payload

        def read(self) -> bytes:
            return json.dumps(self._payload).encode("utf-8")

        def __enter__(self) -> "FakeResponse":
            return self

        def __exit__(self, *exc_info: object) -> bool:
            return False

    captured: dict[str, object] = {}

    def fake_urlopen(request, timeout=30):  # noqa: ANN001 - matches urllib's own signature
        captured["url"] = request.full_url
        captured["headers"] = dict(request.header_items())
        return FakeResponse(rows)

    monkeypatch.setattr(production.urllib.request, "urlopen", fake_urlopen)

    result = production.load_supabase(url="https://example.supabase.co", key="service-key-should-not-leak", table="productions")

    assert captured["url"] == "https://example.supabase.co/rest/v1/productions?select=*"
    assert "service-key-should-not-leak" not in captured["url"]
    assert len(result.evidence) == len(production.load().evidence)
    assert len(result.ground_truth) == len(production.load().ground_truth)


def test_load_supabase_uses_env_vars_when_args_omitted(monkeypatch):
    rows = [p.to_dict() for p in production.load_raw()]

    class FakeResponse:
        def __init__(self, payload: list[dict]) -> None:
            self._payload = payload

        def read(self) -> bytes:
            return json.dumps(self._payload).encode("utf-8")

        def __enter__(self) -> "FakeResponse":
            return self

        def __exit__(self, *exc_info: object) -> bool:
            return False

    monkeypatch.setenv("SUPABASE_URL", "https://env.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "env-key")
    monkeypatch.setattr(production.urllib.request, "urlopen", lambda request, timeout=30: FakeResponse(rows))

    result = production.load_supabase()
    assert len(result.evidence) > 0
