"""`hte.corpus.production`: the K-12 research-production adapter, exercised
against the 14 shipped fixtures under `hte/data/production-fixtures/`
(the 12 original `PRODUCTION-SCHEMA.md`-shaped fixtures, `prod-001.json`
through `prod-012.json`, plus `research-os-sky-blue.json`, two `graph.
productions`-shaped rows converted from the founder's own Research OS seed,
`bucket-foundation` PR #6's `supabase/seed/research-os-sky-blue.json`) and,
for `load_supabase`, against a monkeypatched `urllib.request.urlopen`
returning those same fixtures as REST rows. No network.

The Research OS shape gets its own test class below
(`TestResearchOSNativeShape`); every test above it exercises the original
12-fixture set's own invariants, now against a 14-fixture directory, so
several counts below were widened from exact equality to containment where
the Research OS conversion's own values (a `research_question` with no
`RQ##:` prefix, a `school_or_district_id` outside the two original pilot
districts) legitimately extend rather than replace the original set.
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


def test_load_raw_reads_all_fourteen_fixtures():
    productions = production.load_raw()
    assert len(productions) == 14
    assert len({p.id for p in productions}) == 14


def test_fixtures_cover_at_least_four_of_the_seven_runnable_questions():
    productions = production.load_raw()
    covered = {p.research_question.split(":")[0] for p in productions}
    runnable = {f"RQ{n}" for n in (19, 21, 22, 24, 25, 26, 27)}
    assert len(covered & runnable) >= 4
    # the original 12-fixture set exercises exactly the seven runnable
    # questions; the two Research OS conversions add an eighth,
    # non-"RQ##:"-prefixed research_question, so containment replaces the
    # original set's exact equality.
    assert runnable.issubset(covered)


def test_fixtures_span_three_grade_bands_and_two_districts():
    productions = production.load_raw()
    # the two Research OS conversions add their own grade band(s) (derived
    # from the target node's tier) and the fixed "research-os-phase-0"
    # sentinel (Phase 0 has no roster or district concept), so both checks
    # became containment once research-os-sky-blue.json landed.
    assert {"6-8", "9-10", "11-12"}.issubset({p.grade_band for p in productions})
    assert {"district-a", "district-b"}.issubset({p.school_or_district_id for p in productions})


def test_fixtures_cover_every_author_role_and_review_status():
    productions = production.load_raw()
    assert {p.author_role for p in productions} == {"student", "teacher", "researcher", "agent"}
    assert {p.review.status for p in productions} == {"draft", "peer-reviewed", "teacher-reviewed", "accepted", "retracted"}


# --------------------------------------------------------------------------
# corpus shape
# --------------------------------------------------------------------------


def test_load_default_status_min_counts(corpus):
    # 14 productions minus the two mapped to "draft" (prod-008, and
    # ros-sky-blue-001 whose Research OS status "submitted" maps to
    # "draft", RESEARCH_OS_STATUS_MAP) excluded by the default
    # status_min="peer-reviewed" leaves 12 contributing evidence.
    contributing_ids = {e.id.rsplit("-c", 1)[0] for e in corpus.evidence}
    assert "prod-008" not in contributing_ids
    assert "ros-sky-blue-001" not in contributing_ids
    assert len(contributing_ids) == 12
    # every production still gets a Source, including the filtered-out drafts
    assert "prod-008" in corpus.sources
    assert "ros-sky-blue-001" in corpus.sources
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


# --------------------------------------------------------------------------
# Research OS native shape (bkt-hte, docs/PRODUCTION-SCHEMA-ALIGNMENT.md):
# `graph.productions` rows, auto-detected and normalized onto this module's
# own PRODUCTION-SCHEMA.md shape by `Production.from_dict`. The older
# fixture shape's own tests above keep passing unchanged, since
# `is_research_os_record` returns `False` for anything carrying `claims`.
# --------------------------------------------------------------------------


def _research_os_row(**overrides):
    row = {
        "id": "ros-test-1",
        "learner_id": "33333333-3333-4333-8333-333333333333",
        "target_node_id": "why-the-sky-is-blue",
        "claim": "Blue scatters more than red.",
        "evidence": [{"node_id": "rayleigh-scattering-law", "quote": "steeply on the wavelength of the light", "locator": "graph.nodes.summary"}],
        "sources": [{"label": "Rayleigh 1871", "doi": "10.1080/14786447108640507"}],
        "transfer_proof": {},
        "status": "submitted",
        "created_at": "2026-09-01T00:00:00Z",
        "updated_at": "2026-09-02T00:00:00Z",
    }
    row.update(overrides)
    return row


def test_is_research_os_record_detects_graph_productions_shape():
    assert production.is_research_os_record(_research_os_row()) is True
    assert production.is_research_os_record(production.load_raw()[0].to_dict()) is False
    assert production.is_research_os_record({"not": "a dict with target_node_id"}) is False


def test_normalize_drops_learner_id_entirely():
    normalized = production.normalize_research_os_record(_research_os_row())
    assert "learner_id" not in normalized
    assert "33333333-3333-4333-8333-333333333333" not in json.dumps(normalized)


@pytest.mark.parametrize(
    "research_os_status,expected",
    [("draft", "draft"), ("submitted", "draft"), ("accepted", "accepted"), ("returned", "draft")],
)
def test_normalize_maps_every_research_os_status(research_os_status, expected):
    normalized = production.normalize_research_os_record(_research_os_row(status=research_os_status))
    assert normalized["review"]["status"] == expected
    assert normalized["review"]["history"][-1]["status"] == expected


@pytest.mark.parametrize(
    "tier,expected_band",
    [(3, "3-5"), (5, "3-5"), (6, "6-8"), (8, "6-8"), (9, "9-10"), (10, "9-10"), (11, "11-12"), (90, "canon")],
)
def test_normalize_buckets_tier_into_a_grade_band(tier, expected_band):
    row = _research_os_row(_target_node={"slug": "x", "title": "X", "tier": tier, "branch": "02-physics"})
    normalized = production.normalize_research_os_record(row)
    assert normalized["grade_band"] == expected_band


def test_normalize_grade_band_is_unknown_without_a_target_node_join():
    normalized = production.normalize_research_os_record(_research_os_row())
    assert normalized["grade_band"] == "unknown"


def test_normalize_claim_gets_supports_stance_and_all_null_slots():
    normalized = production.normalize_research_os_record(_research_os_row())
    claim = normalized["claims"][0]
    assert claim["stance"] == "supports"
    assert claim["slots"] == {"actor": None, "action": None, "object": None, "place": None, "mechanism": None}
    assert claim["interval"] is None


def test_normalize_evidence_entries_carry_the_full_source_citation_set():
    normalized = production.normalize_research_os_record(_research_os_row())
    entry = normalized["claims"][0]["evidence"][0]
    assert entry["source_id"] == "rayleigh-scattering-law"
    assert entry["tier"] == "T2"  # a doi-bearing source
    assert entry["citations"] == [{"type": "doi", "value": "10.1080/14786447108640507"}]


def test_normalize_citation_only_source_with_no_evidence_span_synthesizes_one_entry_per_source():
    row = _research_os_row(evidence=[], sources=[{"label": "NASA Space Place", "url": "https://spaceplace.nasa.gov/blue-sky/en/"}])
    normalized = production.normalize_research_os_record(row)
    entries = normalized["claims"][0]["evidence"]
    assert len(entries) == 1
    assert entries[0]["tier"] == "T4"  # no doi, url-only source
    assert entries[0]["citations"] == [{"type": "url", "value": "https://spaceplace.nasa.gov/blue-sky/en/"}]
    assert "citation only" in entries[0]["quote"]


def test_normalize_empty_row_yields_no_claims():
    row = _research_os_row(claim=None, evidence=[], sources=[])
    normalized = production.normalize_research_os_record(row)
    assert normalized["claims"] == []


def test_normalize_raises_without_id_or_target_node_id():
    with pytest.raises(ValueError, match="id"):
        production.normalize_research_os_record({"target_node_id": "x"})
    with pytest.raises(ValueError, match="target_node_id"):
        production.normalize_research_os_record({"id": "x"})


def test_production_from_dict_auto_normalizes_a_research_os_row():
    p = production.Production.from_dict(_research_os_row())
    assert p.id == "ros-test-1"
    assert p.review.status == "draft"  # "submitted" mapped down
    assert len(p.claims) == 1


def test_research_os_sky_blue_fixture_loads_and_contributes_a_source():
    productions = production.load_raw()
    ros = {p.id: p for p in productions if p.id.startswith("ros-sky-blue-")}
    assert set(ros) == {"ros-sky-blue-001", "ros-sky-blue-002"}
    assert ros["ros-sky-blue-001"].review.status == "draft"  # "submitted" mapped down
    assert ros["ros-sky-blue-002"].review.status == "accepted"

    corpus = production.load()  # default status_min="peer-reviewed"
    assert "ros-sky-blue-002" in {e.id.rsplit("-c", 1)[0] for e in corpus.evidence}
    # a physics claim carries no dated interval, so it never contributes
    # ground truth even once accepted (normalize_research_os_record's own
    # documented gap)
    assert not any(g.id.startswith("ros-sky-blue") for g in corpus.ground_truth)
