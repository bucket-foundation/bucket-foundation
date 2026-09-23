from __future__ import annotations

import json

import pytest

from hte import belief
from hte.concepts import Slot
from hte.corpus import production
from hte.evidence import Stance

@pytest.fixture
def corpus():
    return production.load()

def test_load_raw_reads_all_thirty_six_fixtures():
    productions = production.load_raw()
    assert len(productions) == 36
    assert len({p.id for p in productions}) == 36

def test_fixtures_cover_at_least_four_of_the_seven_runnable_questions():
    productions = production.load_raw()
    covered = {p.research_question.split(":")[0] for p in productions}
    runnable = {f"RQ{n}" for n in (19, 21, 22, 24, 25, 26, 27)}
    assert len(covered & runnable) >= 4
    assert runnable.issubset(covered)

def test_fixtures_span_three_grade_bands_and_two_districts():
    productions = production.load_raw()
    assert {"6-8", "9-10", "11-12"}.issubset({p.grade_band for p in productions})
    assert {"district-a", "district-b"}.issubset({p.school_or_district_id for p in productions})

def test_fixtures_cover_every_author_role_and_review_status():
    productions = production.load_raw()
    assert {p.author_role for p in productions} == {"student", "teacher", "researcher", "agent"}
    assert {p.review.status for p in productions} == {"draft", "peer-reviewed", "teacher-reviewed", "accepted", "retracted"}

def test_load_default_status_min_counts(corpus):
    contributing_ids = {e.id.rsplit("-c", 1)[0] for e in corpus.evidence}
    assert "prod-008" not in contributing_ids
    assert "ros-sky-blue-001" not in contributing_ids
    assert len(contributing_ids) == 34
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
    assert "prod-003" not in contributing_ids
    assert "prod-006" not in contributing_ids
    assert "prod-008" not in contributing_ids
    assert "prod-010" in contributing_ids

def test_invalid_status_min_raises():
    with pytest.raises(ValueError):
        production.load(status_min="retracted")
    with pytest.raises(ValueError):
        production.load(status_min="not-a-status")

def test_every_evidence_item_slot_resolves_in_the_vocabulary(corpus):
    vocab = corpus.vocab
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

def test_stemma_citation_chain_depth_two(corpus):
    assert corpus.sources["prod-011"].stemma_parents == ["prod-005"]
    assert corpus.sources["prod-005"].stemma_parents == ["prod-001"]
    assert corpus.sources["prod-001"].stemma_parents == []

def test_cited_production_evidence_item_points_at_the_production_source(corpus):
    cited = next(e for e in corpus.evidence if e.id == "prod-011-c0-e0")
    assert cited.source_id == "prod-005"
    assert cited.source_id in corpus.sources

def test_retracted_claim_excluded_from_ground_truth(corpus):
    gt_ids = {g.id for g in corpus.ground_truth}
    assert "prod-010-c0-e0" not in gt_ids

def test_retracted_claim_still_present_as_downgraded_evidence(corpus):
    item = next(e for e in corpus.evidence if e.id == "prod-010-c0-e0")
    assert item.is_absence is True
    assert item.stance == Stance.NEGATIVE

def test_non_accepted_but_included_status_excluded_from_ground_truth(corpus):
    gt_ids = {g.id for g in corpus.ground_truth}
    assert not any(gid.startswith("prod-003") for gid in gt_ids)
    assert not any(gid.startswith("prod-006") for gid in gt_ids)
    assert any(e.id.startswith("prod-003") for e in corpus.evidence)
    assert any(e.id.startswith("prod-006") for e in corpus.evidence)

def test_ground_truth_discovery_year_is_the_acceptance_year(corpus):
    event = next(g for g in corpus.ground_truth if g.id == "prod-001-c0-e0")
    assert event.discovery_year == 2026
    assert event.year == 2026

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

def test_normalize_claim_gets_supports_stance_object_slot_and_created_at_interval():
    normalized = production.normalize_research_os_record(_research_os_row())
    claim = normalized["claims"][0]
    assert claim["stance"] == "supports"
    assert claim["slots"] == {
        "actor": None, "action": None, "object": "why-the-sky-is-blue", "place": None, "mechanism": None,
    }
    assert claim["interval"] == {"start": 2026, "end": 2026}

def test_normalize_evidence_entries_carry_the_full_source_citation_set():
    normalized = production.normalize_research_os_record(_research_os_row())
    entry = normalized["claims"][0]["evidence"][0]
    assert entry["source_id"] == "rayleigh-scattering-law"
    assert entry["tier"] == "T2"
    assert entry["citations"] == [{"type": "doi", "value": "10.1080/14786447108640507"}]

def test_normalize_citation_only_source_with_no_evidence_span_synthesizes_one_entry_per_source():
    row = _research_os_row(evidence=[], sources=[{"label": "NASA Space Place", "url": "https://spaceplace.nasa.gov/blue-sky/en/"}])
    normalized = production.normalize_research_os_record(row)
    entries = normalized["claims"][0]["evidence"]
    assert len(entries) == 1
    assert entries[0]["tier"] == "T4"
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
    assert p.review.status == "draft"
    assert len(p.claims) == 1

def test_research_os_sky_blue_fixture_loads_and_contributes_a_source():
    productions = production.load_raw()
    ros = {p.id: p for p in productions if p.id.startswith("ros-sky-blue-")}
    assert set(ros) == {"ros-sky-blue-001", "ros-sky-blue-002"}
    assert ros["ros-sky-blue-001"].review.status == "draft"
    assert ros["ros-sky-blue-002"].review.status == "accepted"

    corpus = production.load()
    assert "ros-sky-blue-002" in {e.id.rsplit("-c", 1)[0] for e in corpus.evidence}
    ros_002_evidence = next(e for e in corpus.evidence if e.id.startswith("ros-sky-blue-002"))
    assert ros_002_evidence.object == "light-can-scatter-off-small-things"
    assert corpus.vocab.get(Slot.OBJECT, "light-can-scatter-off-small-things") is not None
    gt_ids = {g.id for g in corpus.ground_truth}
    assert any(gid.startswith("ros-sky-blue-002") for gid in gt_ids)
    assert not any(gid.startswith("ros-sky-blue-001") for gid in gt_ids)

def test_normalize_accepts_the_real_production_form_string_shape():
    row = _research_os_row(
        evidence=["Rayleigh scattering bends blue light more than red.", "  ", ""],
        sources=["10.1080/14786447108640507"],
    )
    normalized = production.normalize_research_os_record(row)
    entries = normalized["claims"][0]["evidence"]
    evidence_entries = [e for e in entries if e["locator"] == "(uncited)"]
    assert len(evidence_entries) == 1
    assert evidence_entries[0]["quote"] == "Rayleigh scattering bends blue light more than red."
    assert evidence_entries[0]["tier"] == "T4"
    assert evidence_entries[0]["citations"] == [], "an evidence line and a sources line are unpaired, never fused"

@pytest.mark.parametrize(
    "source_line,expected_type,expected_tier",
    [
        ("10.1080/14786447108640507", "doi", "T2"),
        ("doi:10.1080/14786447108640507", "doi", "T2"),
        ("https://spaceplace.nasa.gov/blue-sky/en/", "url", "T4"),
        ("NASA Space Place", "url", "T4"),
    ],
)
def test_normalize_string_source_lines_parse_by_shape(source_line, expected_type, expected_tier):
    row = _research_os_row(evidence=[], sources=[source_line])
    normalized = production.normalize_research_os_record(row)
    entries = normalized["claims"][0]["evidence"]
    assert len(entries) == 1
    assert entries[0]["tier"] == expected_tier
    assert entries[0]["citations"][0]["type"] == expected_type
    assert "citation only" in entries[0]["quote"]

def test_normalize_string_evidence_lines_get_per_production_scoped_source_ids():
    row_a = _research_os_row(id="ros-scope-a", evidence=["line a"], sources=[])
    row_b = _research_os_row(id="ros-scope-b", evidence=["line b"], sources=[])
    a = production.Production.from_dict(row_a)
    b = production.Production.from_dict(row_b)
    id_a = a.claims[0].evidence[0].source_id
    id_b = b.claims[0].evidence[0].source_id
    assert id_a != id_b
    assert "ros-scope-a" in id_a
    assert "ros-scope-b" in id_b

def test_normalize_mixed_dict_and_string_evidence_both_land():
    row = _research_os_row(
        evidence=[
            {"node_id": "rayleigh-scattering-law", "quote": "steeply on the wavelength", "locator": "graph.nodes.summary"},
            "a plain evidence line",
        ],
        sources=[{"label": "Rayleigh 1871", "doi": "10.1080/14786447108640507"}],
    )
    normalized = production.normalize_research_os_record(row)
    entries = normalized["claims"][0]["evidence"]
    quotes = {e["quote"] for e in entries}
    assert "steeply on the wavelength" in quotes
    assert "a plain evidence line" in quotes
    dict_entry = next(e for e in entries if e["quote"] == "steeply on the wavelength")
    string_entry = next(e for e in entries if e["quote"] == "a plain evidence line")
    assert dict_entry["citations"], "the dict-shaped branch still attaches its own closed citation set"
    assert string_entry["citations"] == [], "the string-shaped branch never fuses in the dict-shaped sources"

def test_production_from_dict_with_string_shape_builds_a_corpus_with_no_attribute_error():
    row = _research_os_row(evidence=["a line of evidence"], sources=["https://example.edu/x"])
    p = production.Production.from_dict(row)
    corpus = production._build_corpus(
        [p], status_min="draft", retrieval_run_id="test", source_path_for=lambda prod: f"test:{prod.id}",
    )
    assert len(corpus.evidence) == 2
    assert len(corpus.sources) == 3

def test_normalize_counter_evidence_dict_shape_gets_refutes_stance_and_none_citation():
    row = _research_os_row(counter_evidence=[{"text": "The scattering angle reverses at UV wavelengths."}])
    normalized = production.normalize_research_os_record(row)
    entries = normalized["claims"][0]["evidence"]
    counter = next(e for e in entries if e["quote"] == "The scattering angle reverses at UV wavelengths.")
    assert counter["stance"] == "refutes"
    assert counter["citations"] == [{"type": "none", "value": "uncited"}]
    assert counter["locator"] == "(uncited)"

def test_normalize_counter_evidence_string_shape_gets_refutes_stance():
    row = _research_os_row(counter_evidence=["A competing paper reports the opposite direction."])
    normalized = production.normalize_research_os_record(row)
    entries = normalized["claims"][0]["evidence"]
    counter = next(e for e in entries if e["quote"] == "A competing paper reports the opposite direction.")
    assert counter["stance"] == "refutes"
    assert counter["citations"] == [{"type": "none", "value": "uncited"}]

def test_normalize_counter_evidence_blank_entries_dropped():
    row = _research_os_row(evidence=[], sources=[], counter_evidence=["", "   ", {"text": ""}, {"text": "  "}, {}, 5])
    normalized = production.normalize_research_os_record(row)
    assert normalized["claims"][0]["evidence"] == []

def test_normalize_ordinary_evidence_entries_carry_no_stance_override():
    normalized = production.normalize_research_os_record(_research_os_row())
    entries = normalized["claims"][0]["evidence"]
    assert all("stance" not in e for e in entries)

def test_build_corpus_counter_evidence_item_gets_negative_stance_same_address_as_evidence():
    row = _research_os_row(
        evidence=[{"node_id": "rayleigh-scattering-law", "quote": "steeply on the wavelength", "locator": "graph.nodes.summary"}],
        counter_evidence=["A competing paper reports the opposite direction."],
        status="accepted",
    )
    p = production.Production.from_dict(row)
    corpus = production._build_corpus([p], status_min="draft", retrieval_run_id="t", source_path_for=lambda prod: f"t:{prod.id}")
    items = [e for e in corpus.evidence if e.id.startswith(f"{p.id}-c0-")]
    assert len(items) == 2
    positive = next(e for e in items if e.stance == Stance.POSITIVE)
    negative = next(e for e in items if e.stance == Stance.NEGATIVE)
    assert positive.object == negative.object == "why-the-sky-is-blue"
    assert negative.span.quote == "A competing paper reports the opposite direction."

def test_counter_evidence_and_evidence_together_yield_an_opinion_with_positive_disbelief():
    row = _research_os_row(
        evidence=[{"node_id": "rayleigh-scattering-law", "quote": "steeply on the wavelength", "locator": "graph.nodes.summary"}],
        counter_evidence=["A competing paper reports the opposite direction."],
        status="accepted",
    )
    p = production.Production.from_dict(row)
    corpus = production._build_corpus([p], status_min="draft", retrieval_run_id="t", source_path_for=lambda prod: f"t:{prod.id}")
    items = [e for e in corpus.evidence if e.id.startswith(f"{p.id}-c0-")]
    address = 1
    for item in items:
        (item.supports if item.stance == Stance.POSITIVE else item.refutes).append(address)

    r, s = belief.pooled_weight(items, address)
    assert r > 0
    assert s > 0

    opinion = belief.Opinion.from_evidence(r, s, belief.Constants().W, a=0.5)
    assert opinion.d > 0

def test_normalize_duplicate_of_reads_bare_field():
    row = _research_os_row(duplicate_of="ros-original-1")
    normalized = production.normalize_research_os_record(row)
    assert normalized["duplicate_of"] == "ros-original-1"

def test_normalize_duplicate_of_reads_duplicate_flag_match_id():
    row = _research_os_row(duplicate_flag={"matchId": "ros-original-1", "matchOrigin": "own_prior", "score": 0.82})
    normalized = production.normalize_research_os_record(row)
    assert normalized["duplicate_of"] == "ros-original-1"

def test_normalize_no_duplicate_flag_or_field_is_none():
    normalized = production.normalize_research_os_record(_research_os_row())
    assert normalized["duplicate_of"] is None

def test_normalize_null_duplicate_flag_is_none():
    normalized = production.normalize_research_os_record(_research_os_row(duplicate_flag=None))
    assert normalized["duplicate_of"] is None

def test_build_corpus_duplicate_gets_a_stemma_edge_to_the_original():
    original = _research_os_row(id="dup-original", target_node_id="why-the-sky-is-blue")
    dup = _research_os_row(
        id="dup-copy", target_node_id="why-the-sky-is-blue",
        duplicate_flag={"matchId": "dup-original", "matchOrigin": "own_prior", "score": 0.9},
    )
    productions = [production.Production.from_dict(original), production.Production.from_dict(dup)]
    corpus = production._build_corpus(productions, status_min="draft", retrieval_run_id="t", source_path_for=lambda p: f"t:{p.id}")
    assert corpus.sources["dup-copy"].stemma_parents == ["dup-original"]
    assert corpus.sources["dup-original"].stemma_parents == []

def test_duplicate_of_outside_batch_adds_no_edge_but_row_is_kept():
    row = _research_os_row(
        id="dup-orphan",
        duplicate_flag={"matchId": "some-canon-claim-not-in-batch", "matchOrigin": "canon", "score": 0.75},
    )
    p = production.Production.from_dict(row)
    corpus = production._build_corpus([p], status_min="draft", retrieval_run_id="t", source_path_for=lambda prod: f"t:{prod.id}")
    assert corpus.sources["dup-orphan"].stemma_parents == []
    assert any(e.id.startswith("dup-orphan-c") for e in corpus.evidence)

def test_two_duplicates_of_one_production_discount_effective_count_below_two():
    original = _research_os_row(id="trio-original", target_node_id="why-the-sky-is-blue")
    dup1 = _research_os_row(
        id="trio-dup-1", target_node_id="why-the-sky-is-blue",
        duplicate_flag={"matchId": "trio-original", "matchOrigin": "class_peer", "score": 0.88},
    )
    dup2 = _research_os_row(
        id="trio-dup-2", target_node_id="why-the-sky-is-blue",
        duplicate_flag={"matchId": "trio-original", "matchOrigin": "class_peer", "score": 0.91},
    )
    productions = [production.Production.from_dict(r) for r in (original, dup1, dup2)]
    corpus = production._build_corpus(productions, status_min="draft", retrieval_run_id="t", source_path_for=lambda p: f"t:{p.id}")
    cluster = [corpus.sources["trio-original"], corpus.sources["trio-dup-1"], corpus.sources["trio-dup-2"]]
    n_eff = belief.effective_count(cluster)
    assert n_eff < 2
