from __future__ import annotations

import json
import logging
import urllib.error
from pathlib import Path

import pytest

from hte.concepts import ConsensusStatus, Slot, other_id
from hte.corpus import literature
from hte.evidence import EvidenceKind, Tier

FIXTURES_DIR = literature.DEFAULT_FIXTURES_DIR
FIXTURES_DIR_BATCH_TWO = literature.DEFAULT_FIXTURES_DIR_BATCH_TWO

@pytest.fixture(scope="module")
def cards():
    return literature.load_raw(FIXTURES_DIR)

@pytest.fixture(scope="module")
def corpus():
    return literature.load(FIXTURES_DIR)

@pytest.fixture(scope="module")
def cards_batch_two():
    return literature.load_raw(FIXTURES_DIR_BATCH_TWO)

@pytest.fixture(scope="module")
def cards_both():
    return literature.load_raw([FIXTURES_DIR, FIXTURES_DIR_BATCH_TWO])

@pytest.fixture(scope="module")
def corpus_both():
    return literature.load(literature.DEFAULT_CARDS_DIRS)

def _card(cards_, needle: str):
    return next(c for c in cards_ if needle in c.relative_path)

def test_load_raw_reads_all_six_fixtures(cards):
    assert len(cards) == 6
    assert len({c.doi for c in cards}) == 6

def test_fixtures_span_three_branches(cards):
    branches = {c.relative_path.split("/", 1)[0] for c in cards}
    assert branches == {"educational-methods", "hci-human-ai-collaboration", "ai-and-researchers"}

def test_frontmatter_fields_parsed(cards):
    bloom = _card(cards, "bloom-1984")
    assert bloom.doi == "10.3102/0013189x013006004"
    assert bloom.year == 1984
    assert bloom.authors == ("Bloom, Benjamin S.",)
    assert bloom.first_author_surname == "Bloom"
    assert "two-standard-deviation" in bloom.why_it_matters
    assert len(bloom.key_claims) == 3
    assert len(bloom.research_questions) == 2

def test_card_doc_length_matches_its_own_raw_file(cards):
    bloom = _card(cards, "bloom-1984")
    raw = (FIXTURES_DIR / bloom.relative_path).read_text()
    assert bloom.doc_length == len(raw)

def test_evidence_item_spans_carry_the_card_doc_length(corpus):
    for item in corpus.evidence:
        assert item.span.doc_length is not None
        assert item.span.char_end <= item.span.doc_length

def test_quoted_title_with_embedded_quotes_is_unescaped():
    raw = (
        '---\n'
        'title: "The \\"What\\" and \\"Why\\" of Goal Pursuits"\n'
        'authors:\n'
        '  - "Deci, Edward L."\n'
        'year: 2000\n'
        'venue: "Psychological Inquiry"\n'
        'doi: "10.1207/s15327965pli1104_01"\n'
        'url: "https://doi.org/10.1207/s15327965pli1104_01"\n'
        'openalex_id: null\n'
        'branch: "educational-methods"\n'
        'tier: "canon"\n'
        'why_it_matters: >\n'
        '  A theory paper.\n'
        'key_claims:\n'
        '  - "Autonomy, competence, and relatedness are the three needs."\n'
        'research_questions_it_leaves_open:\n'
        '  - "An open question."\n'
        'how_it_bears_on_research_os: >\n'
        '  It bears directly.\n'
        '---\n\n# Title\n'
    )
    card = literature._parse_frontmatter(raw, "educational-methods/deci-ryan-2000.md")
    assert card.title == 'The "What" and "Why" of Goal Pursuits'

def test_parse_frontmatter_skips_a_leading_voice_ignore_file_comment_and_keeps_spans_correct():
    # tripped: a card opens with a `voice-ignore-file` HTML comment line
    raw = (
        '<!-- voice-ignore-file: verbatim copy of a founder-authored literature card -->\n'
        '---\n'
        'title: "A Card With A Header"\n'
        'authors:\n'
        '  - "Author, A."\n'
        'year: 2021\n'
        'venue: "Some Journal"\n'
        'doi: "10.1000/header-card"\n'
        'url: "https://doi.org/10.1000/header-card"\n'
        'openalex_id: null\n'
        'branch: "educational-methods"\n'
        'tier: "canon"\n'
        'why_it_matters: >\n'
        '  It has a header.\n'
        'key_claims:\n'
        '  - "The header does not corrupt the span."\n'
        'research_questions_it_leaves_open:\n'
        '  - "An open question."\n'
        'how_it_bears_on_research_os: >\n'
        '  It bears directly.\n'
        '---\n\n# Title\n'
    )
    card = literature._parse_frontmatter(raw, "educational-methods/header-card.md")
    assert card.title == "A Card With A Header"
    assert len(card.key_claims) == 1
    claim = card.key_claims[0]
    assert raw[claim.char_start:claim.char_end] == claim.text == "The header does not corrupt the span."
    lines = raw.splitlines()
    located = "\n".join(lines[claim.line_start - 1:claim.line_end])
    assert claim.text in located
    header_free_raw = raw.split("\n", 1)[1]
    header_free_claim = literature._parse_frontmatter(header_free_raw, "x.md").key_claims[0]
    assert claim.line_start == header_free_claim.line_start + 1

def test_parse_frontmatter_still_raises_on_a_real_missing_opener():
    with pytest.raises(ValueError, match="has no frontmatter opening"):
        literature._parse_frontmatter("title: not frontmatter at all\n", "bad.md")

def test_parse_frontmatter_missing_required_field_names_the_file():
    raw = (
        '---\n'
        'title: "A Card Missing Authors"\n'
        'year: 2021\n'
        'venue: "Some Journal"\n'
        'doi: "10.1000/missing-authors"\n'
        'url: "https://doi.org/10.1000/missing-authors"\n'
        'openalex_id: null\n'
        'branch: "educational-methods"\n'
        'tier: "canon"\n'
        'why_it_matters: >\n'
        '  It has no authors field.\n'
        'key_claims:\n'
        '  - "A claim."\n'
        'research_questions_it_leaves_open:\n'
        '  - "An open question."\n'
        'how_it_bears_on_research_os: >\n'
        '  It bears directly.\n'
        '---\n\n# Title\n'
    )
    with pytest.raises(ValueError, match=r"missing-authors\.md carries no 'authors' field"):
        literature._parse_frontmatter(raw, "educational-methods/missing-authors.md")

def test_parse_frontmatter_non_numeric_year_names_the_file():
    raw = (
        '---\n'
        'title: "A Card With A Bad Year"\n'
        'authors:\n'
        '  - "Author, A."\n'
        'year: not-a-number\n'
        'venue: "Some Journal"\n'
        'doi: "10.1000/bad-year"\n'
        'url: "https://doi.org/10.1000/bad-year"\n'
        'openalex_id: null\n'
        'branch: "educational-methods"\n'
        'tier: "canon"\n'
        'why_it_matters: >\n'
        '  It has a bad year.\n'
        'key_claims:\n'
        '  - "A claim."\n'
        'research_questions_it_leaves_open:\n'
        '  - "An open question."\n'
        'how_it_bears_on_research_os: >\n'
        '  It bears directly.\n'
        '---\n\n# Title\n'
    )
    with pytest.raises(ValueError, match=r"bad-year\.md: invalid literal for int\(\)"):
        literature._parse_frontmatter(raw, "educational-methods/bad-year.md")

_MULTILINE_CLAIMS_CARD = (
    '---\n'
    'title: "A Card With Wrapped Claims"\n'
    'authors:\n'
    '  - "Author, A."\n'
    'year: 2025\n'
    'venue: "Some Press"\n'
    'doi: "10.1000/wrapped"\n'
    'branch: "educational-methods"\n'
    'tier: "canon"\n'
    'why_it_matters: >\n'
    '  It wraps.\n'
    'key_claims:\n'
    '  - "The first claim wraps across two\n'
    '    physical lines before its own closing quote."\n'
    '  - "The second claim fits on one line."\n'
    'research_questions_it_leaves_open:\n'
    '  - "An open question."\n'
    'how_it_bears_on_research_os: >\n'
    '  It bears directly.\n'
    '---\n\n# Title\n'
)

def test_a_wrapped_key_claim_is_read_not_silently_dropped():
    card = literature._parse_frontmatter(_MULTILINE_CLAIMS_CARD, "educational-methods/wrapped.md")
    assert len(card.key_claims) == 2
    assert card.key_claims[0].text == (
        "The first claim wraps across two\n    physical lines before its own closing quote."
    )
    assert card.key_claims[1].text == "The second claim fits on one line."

def test_a_wrapped_key_claims_char_offsets_still_locate_the_exact_quote():
    card = literature._parse_frontmatter(_MULTILINE_CLAIMS_CARD, "educational-methods/wrapped.md")
    wrapped = card.key_claims[0]
    assert _MULTILINE_CLAIMS_CARD[wrapped.char_start:wrapped.char_end] == wrapped.text
    assert wrapped.line_start != wrapped.line_end

def test_a_wrapped_key_claims_line_range_spans_every_physical_line_it_covers():
    card = literature._parse_frontmatter(_MULTILINE_CLAIMS_CARD, "educational-methods/wrapped.md")
    wrapped = card.key_claims[0]
    lines = _MULTILINE_CLAIMS_CARD.splitlines()
    located = "\n".join(lines[wrapped.line_start - 1:wrapped.line_end])
    assert wrapped.text in located

def test_card_whose_only_claim_wraps_is_not_read_as_having_no_key_claims():
    only_wrapped = _MULTILINE_CLAIMS_CARD.replace('  - "The second claim fits on one line."\n', '')
    card = literature._parse_frontmatter(only_wrapped, "educational-methods/wrapped-only.md")
    assert len(card.key_claims) == 1

def test_load_reads_a_real_card_whose_key_claims_wrap(tmp_path):
    root = tmp_path / "wrapped-root" / "educational-methods"
    root.mkdir(parents=True)
    (root / "wrapped.md").write_text(_MULTILINE_CLAIMS_CARD)

    corpus = literature.load(tmp_path / "wrapped-root")

    assert len(corpus.sources) == 1
    items = [item for item in corpus.evidence if item.source_id == "10.1000/wrapped"]
    assert len(items) == 2

def test_wrapped_authors_entry_is_also_folded_correctly():
    raw = _MULTILINE_CLAIMS_CARD.replace(
        '  - "Author, A."\n', '  - "Author, A. and an Additional\n    Long Coauthor Name, B."\n',
    )
    card = literature._parse_frontmatter(raw, "educational-methods/wrapped-author.md")
    assert card.authors == ("Author, A. and an Additional\n    Long Coauthor Name, B.",)

def test_unterminated_quoted_claim_is_skipped_not_crashed():
    raw = _MULTILINE_CLAIMS_CARD.replace(
        '  - "The first claim wraps across two\n'
        '    physical lines before its own closing quote."\n'
        '  - "The second claim fits on one line."\n',
        '  - "This claim never closes\n'
        '    even across several lines\n',
    )
    with pytest.raises(ValueError, match="carries no key_claims"):
        literature._parse_frontmatter(raw, "educational-methods/unterminated.md")

_DOI_NULL_CARD = (
    '---\n'
    'title: "A Card With No DOI"\n'
    'authors:\n'
    '  - "Author, A."\n'
    'year: 2001\n'
    'venue: "Some Press"\n'
    'doi: null\n'
    'isbn: "978-0-0000-0000-0"\n'
    'branch: "educational-methods"\n'
    'tier: "canon"\n'
    'why_it_matters: >\n'
    '  It has no doi.\n'
    'key_claims:\n'
    '  - "A claim."\n'
    'research_questions_it_leaves_open:\n'
    '  - "An open question."\n'
    'how_it_bears_on_research_os: >\n'
    '  It bears directly.\n'
    '---\n\n# Title\n'
)

def test_doi_null_card_gets_a_stable_nodoi_fallback_id_instead_of_raising():
    card = literature._parse_frontmatter(_DOI_NULL_CARD, "educational-methods/no-doi.md")
    assert card.doi_missing is True
    assert card.doi.startswith("nodoi:")

def test_fallback_doi_is_stable_across_repeat_parses_of_the_same_card():
    first = literature._parse_frontmatter(_DOI_NULL_CARD, "educational-methods/no-doi.md")
    second = literature._parse_frontmatter(_DOI_NULL_CARD, "educational-methods/no-doi.md")
    assert first.doi == second.doi

def test_a_totally_absent_doi_field_degrades_the_same_way_as_an_explicit_null():
    raw = _DOI_NULL_CARD.replace('doi: null\n', '')
    card = literature._parse_frontmatter(raw, "educational-methods/no-doi-field.md")
    assert card.doi_missing is True
    assert card.doi.startswith("nodoi:")

def test_doi_missing_card_still_raises_on_no_key_claims():
    raw = _DOI_NULL_CARD.replace('  - "A claim."\n', '')
    with pytest.raises(ValueError, match="carries no key_claims"):
        literature._parse_frontmatter(raw, "educational-methods/no-doi-no-claims.md")

def test_doi_missing_card_tier_is_capped_at_t4_regardless_of_venue():
    card = literature._parse_frontmatter(_DOI_NULL_CARD, "educational-methods/no-doi.md")
    assert literature._evidence_tier(card) == Tier.T4

def test_doi_missing_card_is_loaded_not_dropped_and_its_evidence_carries_the_view(tmp_path):
    root = tmp_path / "no-doi-root" / "educational-methods"
    root.mkdir(parents=True)
    (root / "no-doi.md").write_text(_DOI_NULL_CARD)

    corpus = literature.load(tmp_path / "no-doi-root")

    assert len(corpus.sources) == 1
    source_id = next(iter(corpus.sources))
    assert source_id.startswith("nodoi:")
    items = [item for item in corpus.evidence if item.source_id == source_id]
    assert len(items) == 1
    assert all(item.tier == Tier.T4 for item in items)
    assert all(item.views.get("doi_missing") is True for item in items)

def test_load_raw_logs_a_skipped_or_degraded_summary_naming_the_doi_missing_card(tmp_path, caplog):
    root = tmp_path / "no-doi-root" / "educational-methods"
    root.mkdir(parents=True)
    (root / "no-doi.md").write_text(_DOI_NULL_CARD)

    with caplog.at_level(logging.WARNING, logger="hte.corpus.literature"):
        literature.load_raw(tmp_path / "no-doi-root")

    assert "skipped_or_degraded" in caplog.text
    assert "1 of 1" in caplog.text
    assert "educational-methods/no-doi.md" in caplog.text

def test_load_raw_logs_nothing_when_every_card_carries_a_real_doi(caplog):
    with caplog.at_level(logging.WARNING, logger="hte.corpus.literature"):
        literature.load_raw(FIXTURES_DIR)
    assert "skipped_or_degraded" not in caplog.text

@pytest.mark.parametrize(
    "needle,expected_tier",
    [
        ("bloom-1984", Tier.T2),
        ("kulik-kulik", Tier.T2),
        ("roediger-karpicke", Tier.T2),
        ("kestin-et-al", Tier.T2),
        ("si-yang-hashimoto", Tier.T3),
        ("unesco-2025", Tier.T3),
    ],
)
def test_evidence_tier_by_venue_and_doi(cards, needle, expected_tier):
    card = _card(cards, needle)
    assert literature._evidence_tier(card) == expected_tier

def test_nature_news_doi_prefix_reads_as_commentary():
    card = literature.Card(
        doi="10.1038/d41586-023-00107-z", title="t", authors=("A, B",), year=2023,
        venue="Nature", relative_path="x.md", why_it_matters="w",
        key_claims=(literature.Claim(text="c", line_start=1, line_end=1, char_start=0, char_end=1),),
        research_questions=(), how_it_bears_on_research_os="h",
    )
    assert literature._evidence_tier(card) == Tier.T4

@pytest.mark.parametrize(
    "needle,expected_method,expected_kind",
    [
        ("kulik-kulik", "meta-analysis", EvidenceKind.MODEL_PRIOR),
        ("kestin-et-al", "rct", EvidenceKind.MODEL_PRIOR),
        ("unesco-2025", "survey", EvidenceKind.TEXTUAL),
        ("bloom-1984", "theory", EvidenceKind.TEXTUAL),
    ],
)
def test_method_and_kind_classification(cards, needle, expected_method, expected_kind):
    card = _card(cards, needle)
    text = literature._extraction_text(card)
    method = literature._classify_method(text)
    assert method == expected_method
    assert literature._evidence_kind(method) == expected_kind

def test_only_the_meta_analysis_becomes_ground_truth(corpus):
    assert len(corpus.ground_truth) == 1
    event = corpus.ground_truth[0]
    assert event.doc_id == "10.3102/00346543060002265"
    assert event.year == 1990
    assert event.discovery_year == 1990

def test_bloom_itself_is_not_ground_truth_despite_mentioning_replication(corpus):
    bloom_doi = "10.3102/0013189x013006004"
    assert not any(g.doc_id == bloom_doi for g in corpus.ground_truth)

@pytest.mark.parametrize(
    "text,expected",
    [
        ("a replication effect size of 0.5 standard deviations", True),
        ("roughly 36 percent of direct replications succeeded", True),
        ("a large-sample replication check with a 95% confidence interval", True),
        ("the replication crisis in psychology, no number given here", False),
        ("no digit anywhere, but this names an effect size by name", False),
    ],
)
def test_has_effect_size(text, expected):
    assert literature._has_effect_size(text) is expected

def test_bare_replication_mention_with_no_effect_size_is_not_ground_truth():
    method = "theory"
    text = "This finding sits inside the replication crisis literature, unquantified here."
    assert not literature._is_ground_truth(method, text)

def _synthetic_card(doi, first_author_surname, why_it_matters, key_claim_text="c"):
    return literature.Card(
        doi=doi, title="t", authors=(f"{first_author_surname}, A.",), year=2020,
        venue="v", relative_path=f"{doi}.md", why_it_matters=why_it_matters,
        key_claims=(literature.Claim(text=key_claim_text, line_start=1, line_end=1, char_start=0, char_end=1),),
        research_questions=(), how_it_bears_on_research_os="h",
    )

def test_corroborated_dois_needs_two_distinct_first_authors_sharing_mechanism_and_object():
    a = _synthetic_card("doi-a", "Alpha", "Retrieval practice raised test scores in this cohort.")
    b = _synthetic_card("doi-b", "Beta", "Retrieval practice raised test scores in a second, independent cohort.")
    assert literature._corroborated_dois([a, b]) == {"doi-a", "doi-b"}

def test_corroborated_dois_excludes_a_single_author_repeating_itself():
    a = _synthetic_card("doi-a", "Alpha", "Retrieval practice raised test scores in this cohort.")
    b = _synthetic_card("doi-b", "Alpha", "Retrieval practice raised test scores in a follow-up by the same team.")
    assert literature._corroborated_dois([a, b]) == set()

def test_corroborated_dois_excludes_a_shared_other_object_even_with_two_authors():
    a = _synthetic_card("doi-a", "Alpha", "Something happens here that names no outcome this lexicon resolves.")
    b = _synthetic_card("doi-b", "Beta", "Something else happens here that also names no outcome this lexicon resolves.")
    assert literature._detect_object(literature._extraction_text(a)) == other_id(Slot.OBJECT)
    assert literature._corroborated_dois([a, b]) == set()

def test_widened_rule_finds_six_ground_truth_events_across_both_batches(corpus_both):
    expected_dois = {
        "10.3102/00346543060002265",
        "10.1037/0033-2909.125.6.627",
        "10.1207/s15327965pli1104_01",
        "10.1109/TEVC.2006.890271",
        "10.1002/sce.20303",
        "10.12698/cpre.2009.rr63",
    }
    assert {g.doc_id for g in corpus_both.ground_truth} == expected_dois
    assert len(corpus_both.ground_truth) == 6

def test_kulik_cites_bloom_as_a_stemma_parent(corpus):
    bloom_doi = "10.3102/0013189x013006004"
    kulik_doi = "10.3102/00346543060002265"
    assert corpus.sources[kulik_doi].stemma_parents == [bloom_doi]

def test_bloom_carries_no_stemma_parents_despite_being_named_forward(corpus):
    bloom_doi = "10.3102/0013189x013006004"
    assert corpus.sources[bloom_doi].stemma_parents == []

def test_cards_with_no_cross_reference_carry_no_stemma_parents(corpus):
    for doi in ("10.48550/arxiv.2409.04109", "10.1111/j.1745-6916.2006.00012.x", "10.1038/s41598-025-97652-6", "10.54676/sidm1046"):
        assert corpus.sources[doi].stemma_parents == []

def test_evidence_item_count_is_three_per_card(corpus):
    assert len(corpus.evidence) == 18

def test_source_keyed_by_doi(corpus, cards):
    assert set(corpus.sources) == {c.doi for c in cards}
    for item in corpus.evidence:
        assert item.source_id in corpus.sources

def test_evidence_item_id_shape(corpus):
    bloom_doi = "10.3102/0013189x013006004"
    ids = {e.id for e in corpus.evidence if e.source_id == bloom_doi}
    assert ids == {f"{bloom_doi}-c0", f"{bloom_doi}-c1", f"{bloom_doi}-c2"}

def test_span_locator_carries_file_and_line_range(corpus):
    item = next(e for e in corpus.evidence if e.source_id == "10.3102/0013189x013006004")
    assert item.span.locator.startswith("educational-methods/bloom-1984-two-sigma-problem.md:key_claims[")
    assert "(lines " in item.span.locator

def test_span_char_offsets_locate_the_exact_quote_in_the_real_file(cards):
    bloom = _card(cards, "bloom-1984")
    raw = (FIXTURES_DIR / bloom.relative_path).read_text()
    for claim in bloom.key_claims:
        assert raw[claim.char_start:claim.char_end] == claim.text
        lines = raw.splitlines()
        located = "\n".join(lines[claim.line_start - 1:claim.line_end])
        assert claim.text in located

def test_interval_is_a_point_at_the_publication_year(corpus):
    bloom_item = next(e for e in corpus.evidence if e.source_id == "10.3102/0013189x013006004")
    assert bloom_item.interval is not None
    assert bloom_item.interval.start == 1984
    assert bloom_item.interval.end == 1984

def test_every_evidence_item_slot_resolves_in_the_vocabulary(corpus):
    vocab = literature.load_vocab()
    slot_by_field = {"actor": Slot.ACTOR, "action": Slot.ACTION, "object": Slot.OBJECT, "place": Slot.PLACE, "mechanism": Slot.MECHANISM}
    for item in corpus.evidence:
        for field_name, slot in slot_by_field.items():
            value = getattr(item, field_name)
            if value is not None:
                assert vocab.get(slot, value) is not None, f"{item.id}: {field_name}={value!r} not in vocab"

def test_five_non_consensus_actors_kept():
    vocab = literature.load_vocab()
    non_consensus = [c for c in vocab.concepts(Slot.ACTOR) if c.consensus_status not in (ConsensusStatus.CONSENSUS, ConsensusStatus.OTHER)]
    assert len(non_consensus) == 5

def test_named_mechanisms_the_cards_actually_name(corpus):
    mechanisms = {e.mechanism for e in corpus.evidence if e.mechanism is not None}
    assert "mastery-learning" in mechanisms
    assert "retrieval-practice" in mechanisms
    assert "intelligent-tutoring" in mechanisms
    assert "research-idea-generation" in mechanisms

def test_actor_detection_finds_all_four_named_roles(corpus):
    actors = {e.actor for e in corpus.evidence if e.actor is not None}
    assert "tutor" in actors
    assert "learner" in actors
    assert "system" in actors

def test_unnamed_actor_reads_as_other():
    from hte.concepts import other_id
    text = "A paper about nothing in particular's own effect on something else."
    assert literature._detect_actor(text) == other_id(Slot.ACTOR)

def test_action_worsened_keyword_excludes_the_low_resource_compound():
    assert literature._classify_action("Conducted in lower-resource school systems.") == "no-effect"
    assert literature._classify_action("Students showed lower motivation.") == "worsened"

def test_action_mixed_when_both_directions_present():
    assert literature._classify_action("The effect improved on one measure and was worse on another.") == "mixed"

def test_corpus_json_round_trips(corpus):
    from hte.corpus import Corpus
    d = corpus.to_dict()
    json.dumps(d)
    restored = Corpus.from_dict(d)
    assert len(restored.evidence) == len(corpus.evidence)
    assert len(restored.sources) == len(corpus.sources)
    assert len(restored.ground_truth) == len(corpus.ground_truth)

def test_load_raw_reads_all_eleven_batch_two_fixtures(cards_batch_two):
    assert len(cards_batch_two) == 11
    assert len({c.doi for c in cards_batch_two}) == 11

def test_batch_two_fixtures_span_five_branches(cards_batch_two):
    branches = {c.relative_path.split("/", 1)[0] for c in cards_batch_two}
    assert branches == {
        "educational-methods", "hci-human-ai-collaboration",
        "prerequisite-knowledge-graphs", "scientific-discovery-metascience", "ai-and-researchers",
    }

def test_batch_two_fixture_carries_a_new_area_not_in_batch_one(cards_batch_two):
    pan = _card(cards_batch_two, "pan-et-al-2017")
    assert pan.relative_path.startswith("prerequisite-knowledge-graphs/")

def test_batch_two_fixture_header_is_skipped_the_same_way_batch_one_s_is(cards_batch_two):
    # Confirms the parser skips the `voice-ignore-file` header on a
    kitano_path = literature.DEFAULT_FIXTURES_DIR_BATCH_TWO / "ai-and-researchers" / "kitano-2021-nobel-turing-challenge.md"
    raw = kitano_path.read_text()
    assert raw.startswith("<!-- voice-ignore-file:")
    kitano = _card(cards_batch_two, "kitano-2021")
    assert kitano.title == "Nobel Turing Challenge: Creating the Engine for Scientific Discovery"
    for claim in kitano.key_claims:
        assert raw[claim.char_start:claim.char_end] == claim.text

def test_cards_from_a_single_root_are_tagged_batch_one(cards):
    assert all(c.batch == "batch-1" for c in cards)

def test_cards_from_a_sequence_of_roots_are_tagged_by_position(cards_both):
    by_root = {c.relative_path: c.batch for c in cards_both}
    bloom = next(path for path in by_root if "bloom-1984" in path)
    kitano = next(path for path in by_root if "kitano-2021" in path)
    assert by_root[bloom] == "batch-1"
    assert by_root[kitano] == "batch-2"

def test_load_default_cards_dirs_constant_is_both_fixture_batches():
    assert literature.DEFAULT_CARDS_DIRS == (literature.DEFAULT_FIXTURES_DIR, literature.DEFAULT_FIXTURES_DIR_BATCH_TWO)

def test_both_batches_combine_to_seventeen_disjoint_sources(corpus_both):
    assert len(corpus_both.sources) == 17
    assert len(corpus_both.evidence) == 51

def test_both_batches_source_batches_field_names_its_own_root(corpus_both):
    bloom_doi = "10.3102/0013189x013006004"
    kitano_doi = "10.1038/s41540-021-00189-3"
    assert corpus_both.sources[bloom_doi].batches == ["batch-1"]
    assert corpus_both.sources[kitano_doi].batches == ["batch-2"]

def test_a_doi_shared_by_two_roots_dedupes_to_the_first_and_merges_batches(tmp_path):
    dupe_root = tmp_path / "dupe-batch"
    (dupe_root / "educational-methods").mkdir(parents=True)
    bloom_path = literature.DEFAULT_FIXTURES_DIR / "educational-methods" / "bloom-1984-two-sigma-problem.md"
    (dupe_root / "educational-methods" / "bloom-1984-two-sigma-problem.md").write_text(bloom_path.read_text())

    corpus = literature.load([literature.DEFAULT_FIXTURES_DIR, dupe_root])
    bloom_doi = "10.3102/0013189x013006004"
    assert corpus.sources[bloom_doi].batches == ["batch-1", "batch-2"]
    assert len([e for e in corpus.evidence if e.source_id == bloom_doi]) == 3

def test_load_default_matches_both_batches_combined():
    default_corpus = literature.load_default()
    both = literature.load(literature.DEFAULT_CARDS_DIRS)
    assert len(default_corpus.sources) == len(both.sources) == 17

def _copy_card(src: Path, dest_dir: Path) -> None:
    dest_dir.mkdir(parents=True, exist_ok=True)
    (dest_dir / src.name).write_text(src.read_text())

BLOOM_CARD = FIXTURES_DIR / "educational-methods" / "bloom-1984-two-sigma-problem.md"
BLOOM_DOI = "10.3102/0013189x013006004"
KULIK_CARD = FIXTURES_DIR / "educational-methods" / "kulik-kulik-bangert-drowns-1990-mastery-learning-meta-analysis.md"

@pytest.fixture
def three_root_tree(tmp_path):
    intake = tmp_path / "_intake"
    primary = intake / "research-os-k12-literature"
    declared = primary / "declared-batch"
    sibling = intake / "research-os-k12-literature-extra"

    _copy_card(BLOOM_CARD, primary / "educational-methods")
    (primary / "README.md").write_text("Some corpus notes.\n\nBatch root: `declared-batch`\n")
    _copy_card(KULIK_CARD, declared / "educational-methods")
    _copy_card(BLOOM_CARD, sibling / "educational-methods")

    return tmp_path, primary, declared, sibling

def test_discover_card_roots_globs_plus_readme_declared_subfolder(three_root_tree):
    base, primary, declared, sibling = three_root_tree
    discovered = literature.discover_card_roots(base=base)
    assert set(discovered) == {primary, declared, sibling}
    assert len(discovered) == 3

def test_discover_card_roots_returns_empty_list_with_no_intake_dir(tmp_path):
    assert literature.discover_card_roots(base=tmp_path) == []

def test_discover_card_roots_skips_a_declared_path_that_does_not_exist(tmp_path):
    intake = tmp_path / "_intake"
    primary = intake / "research-os-k12-literature"
    _copy_card(BLOOM_CARD, primary / "educational-methods")
    (primary / "README.md").write_text("Batch root: `does-not-exist`\n")
    assert literature.discover_card_roots(base=tmp_path) == [primary]

def test_load_over_discovered_roots_dedupes_doi_and_tags_three_batches(three_root_tree):
    base, primary, declared, sibling = three_root_tree
    discovered = literature.discover_card_roots(base=base)
    corpus = literature.load(discovered)

    assert len(corpus.sources) == 2
    assert corpus.sources[BLOOM_DOI].batches == ["batch-1", "batch-3"]
    kulik_doi = next(doi for doi in corpus.sources if doi != BLOOM_DOI)
    assert corpus.sources[kulik_doi].batches == ["batch-2"]
    assert len([e for e in corpus.evidence if e.source_id == BLOOM_DOI]) == 3

def test_load_cards_dir_none_prefers_discovered_roots_over_network(three_root_tree, monkeypatch):
    base, primary, declared, sibling = three_root_tree
    monkeypatch.setattr(literature, "_REPO_ROOT", base)

    def fail_urlopen(request, timeout=30):
        raise AssertionError("load() must not hit the network once discover_card_roots finds real roots")

    monkeypatch.setattr(literature.urllib.request, "urlopen", fail_urlopen)
    corpus = literature.load()
    assert len(corpus.sources) == 2

def test_discover_card_roots_against_the_real_repo_checkout():
    discovered = literature.discover_card_roots()
    if literature.LOCAL_INTAKE_DIR.is_dir():
        assert literature.LOCAL_INTAKE_DIR in discovered

def test_load_cards_dir_none_against_the_real_repo_checkout_succeeds_with_every_degraded_card_named_in_the_log(caplog):
    if not literature.LOCAL_INTAKE_DIR.is_dir():
        pytest.skip("literature adapter: no _intake/research-os-k12-literature/ tree in this checkout")

    raw = literature.load_raw(literature.discover_card_roots())
    expected_sources = len({card.doi for card in raw})
    expected_degraded = sum(1 for card in raw if card.doi_missing)
    assert expected_degraded > 0

    with caplog.at_level(logging.WARNING, logger="hte.corpus.literature"):
        corpus = literature.load(cards_dir=None)

    assert len(corpus.sources) == expected_sources
    degraded_ids = [source_id for source_id in corpus.sources if source_id.startswith("nodoi:")]
    assert len(degraded_ids) == expected_degraded
    degraded_items = [item for item in corpus.evidence if item.source_id in degraded_ids]
    assert degraded_items
    assert all(item.tier == Tier.T4 for item in degraded_items)
    assert all(item.views.get("doi_missing") is True for item in degraded_items)

    assert "skipped_or_degraded" in caplog.text
    assert f"{expected_degraded} of {len(raw)}" in caplog.text
    for relative_path in (
        "educational-methods/anderson-krathwohl-2001-taxonomy-revision.md",
        "educational-methods/wiske-1998-teaching-for-understanding.md",
        "educational-methods/perkins-1993-teaching-for-understanding.md",
        "project-based-inquiry-learning/condliffe-2017-project-based-learning-literature-review.md",
        "project-based-inquiry-learning/kingston-2018-pbl-student-achievement.md",
        "teacher-workload-adoption/cuban-2001-oversold-underused-computers-classroom.md",
    ):
        assert relative_path in caplog.text

def test_missing_cards_dir_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        literature.load(tmp_path / "does-not-exist")

def test_empty_cards_dir_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        literature.load(tmp_path)

def test_ensure_cards_cached_over_monkeypatched_urllib(tmp_path, monkeypatch):
    monkeypatch.setenv("LITERATURE_CARDS_DIR", str(tmp_path / "cache"))
    monkeypatch.setattr(literature, "discover_card_roots", lambda *a, **k: [])

    real_cards = literature.load_raw(FIXTURES_DIR)
    tree_payload = {
        "tree": [
            {"path": f"{literature.GITHUB_INTAKE_PATH}/{card.relative_path}", "type": "blob"}
            for card in real_cards
        ] + [{"path": f"{literature.GITHUB_INTAKE_PATH}/README.md", "type": "blob"}]
    }
    raw_text_by_path = {
        f"{literature.GITHUB_INTAKE_PATH}/{card.relative_path}": (FIXTURES_DIR / card.relative_path).read_text()
        for card in real_cards
    }

    class FakeResponse:
        def __init__(self, payload: bytes) -> None:
            self._payload = payload

        def read(self) -> bytes:
            return self._payload

        def __enter__(self) -> "FakeResponse":
            return self

        def __exit__(self, *exc_info: object) -> bool:
            return False

    captured_urls: list[str] = []

    def fake_urlopen(request, timeout=30):  # noqa: ANN001 - matches urllib's own signature
        url = request.full_url
        captured_urls.append(url)
        if "api.github.com" in url:
            return FakeResponse(json.dumps(tree_payload).encode("utf-8"))
        for path, text in raw_text_by_path.items():
            if url.endswith(path):
                return FakeResponse(text.encode("utf-8"))
        raise AssertionError(f"unexpected URL in test: {url}")

    monkeypatch.setattr(literature.urllib.request, "urlopen", fake_urlopen)

    corpus = literature.load(ref="fake-ref")

    assert len(corpus.sources) == len(real_cards)
    assert any("api.github.com" in u for u in captured_urls)
    assert any(u.endswith(f"{literature.GITHUB_INTAKE_PATH}/{real_cards[0].relative_path}") for u in captured_urls)

    captured_urls.clear()
    literature.load(ref="fake-ref")
    assert not any(literature.GITHUB_RAW_BASE in u for u in captured_urls)

def test_fetch_card_text_wraps_url_error_naming_path_and_ref(monkeypatch):
    def fake_urlopen(request, timeout=30):  # noqa: ANN001 - matches urllib's own signature
        raise literature.urllib.error.URLError("connection reset")

    monkeypatch.setattr(literature.urllib.request, "urlopen", fake_urlopen)
    with pytest.raises(RuntimeError, match="ai-and-researchers/some-card.md.*fake-ref"):
        literature._fetch_card_text(f"{literature.GITHUB_INTAKE_PATH}/ai-and-researchers/some-card.md", "fake-ref")

def test_ensure_cards_cached_leaves_no_partial_final_file_on_a_write_failure(tmp_path, monkeypatch):
    monkeypatch.setenv("LITERATURE_CARDS_DIR", str(tmp_path / "cache"))
    real_cards = literature.load_raw(FIXTURES_DIR)
    one_card = real_cards[0]
    tree_payload = {"tree": [{"path": f"{literature.GITHUB_INTAKE_PATH}/{one_card.relative_path}", "type": "blob"}]}
    raw_text = (FIXTURES_DIR / one_card.relative_path).read_text()

    class FakeResponse:
        def __init__(self, payload: bytes) -> None:
            self._payload = payload

        def read(self) -> bytes:
            return self._payload

        def __enter__(self) -> "FakeResponse":
            return self

        def __exit__(self, *exc_info: object) -> bool:
            return False

    def fake_urlopen(request, timeout=30):  # noqa: ANN001 - matches urllib's own signature
        url = request.full_url
        if "api.github.com" in url:
            return FakeResponse(json.dumps(tree_payload).encode("utf-8"))
        return FakeResponse(raw_text.encode("utf-8"))

    monkeypatch.setattr(literature.urllib.request, "urlopen", fake_urlopen)

    real_write_text = literature.Path.write_text

    def flaky_write_text(self, *args, **kwargs):
        if self.name.endswith(".tmp"):
            raise OSError("simulated disk full mid-write")
        return real_write_text(self, *args, **kwargs)

    monkeypatch.setattr(literature.Path, "write_text", flaky_write_text)

    with pytest.raises(OSError, match="simulated disk full"):
        literature._ensure_cards_cached("fake-ref")

    dest = (tmp_path / "cache") / one_card.relative_path
    assert not dest.exists()

    monkeypatch.setattr(literature.Path, "write_text", real_write_text)
    literature._ensure_cards_cached("fake-ref")
    assert dest.is_file()
    assert dest.read_text() == raw_text

@pytest.mark.slow
def test_live_fetch_lists_cards_or_skips_when_offline():
    try:
        paths = literature._fetch_card_paths("main")
    except (RuntimeError, urllib.error.URLError) as exc:
        pytest.skip(f"literature adapter: no network (or no corpus on main yet) for the live-fetch check: {exc}")
    if not paths:
        pytest.skip("literature adapter: live fetch returned no card paths")
    assert any("bloom-1984-two-sigma-problem.md" in p for p in paths)
    assert all(p.endswith(".md") for p in paths)
    assert not any(p.endswith("/README.md") for p in paths)
