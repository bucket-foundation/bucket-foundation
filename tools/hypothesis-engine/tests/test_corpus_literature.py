"""`hte.corpus.literature`: the Research OS for K-12 literature-corpus
adapter (PR #5, `_intake/research-os-k12-literature/`, grown by PR #15's
own "literature batch two"), exercised against the 6 real batch-one cards
checked in under `hte/data/literature-fixtures/` plus the 6 real
batch-two cards checked in under `hte/data/literature-fixtures-batch-
two/` (both copied verbatim from the two PRs' own real content). Every
test below passes `cards_dir` explicitly and never touches the network.

The two tests under "network fetch" are the exception: one monkeypatches
`urllib.request.urlopen` so the fetch-and-cache path is exercised
deterministically, no network required; the other makes one real,
small GitHub API call and skips itself, with the reason, when that call
fails for any reason (no connectivity, rate limit, DNS), the same
skip-don't-fail convention `tests/test_corpus_education_atlas.py` uses
for its own `gh repo clone` dependency.
"""
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


# --------------------------------------------------------------------------
# raw fixtures
# --------------------------------------------------------------------------


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
    assert "two-standard-deviation" in bloom.why_it_matters  # confirms real prose parsed
    assert len(bloom.key_claims) == 3
    assert len(bloom.research_questions) == 2


def test_quoted_title_with_embedded_quotes_is_unescaped():
    # not in the 6-card fixture subset, but the escape case this module's
    # own docstring names (Deci and Ryan 2000); regression-tested directly
    # against the parser rather than adding a 7th fixture file for one
    # title.
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
    # Regression test for the blocker every one of the 6 shipped fixtures
    # tripped: a card opens with a `voice-ignore-file` HTML comment line
    # (CLAUDE.md's escape hatch for verbatim founder material) before its
    # own `---` frontmatter opener. `_parse_frontmatter` must skip that
    # header rather than raising "no frontmatter opening `---`", and every
    # `Claim` span must still offset into the *full* raw text, header
    # included, not just the post-header slice.
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
    # the span locates the exact quote inside the real, full file text,
    # the header line's own length folded into the offset math
    assert raw[claim.char_start:claim.char_end] == claim.text == "The header does not corrupt the span."
    lines = raw.splitlines()
    located = "\n".join(lines[claim.line_start - 1:claim.line_end])
    assert claim.text in located
    # the claim's own line sits after the header's one extra line, same
    # line number it would carry in a header-less card plus 1
    header_free_raw = raw.split("\n", 1)[1]
    header_free_claim = literature._parse_frontmatter(header_free_raw, "x.md").key_claims[0]
    assert claim.line_start == header_free_claim.line_start + 1


def test_parse_frontmatter_still_raises_on_a_real_missing_opener():
    # A card with neither a comment header nor a `---` opener still
    # raises a real error; the header-skip logic never swallows it.
    with pytest.raises(ValueError, match="has no frontmatter opening"):
        literature._parse_frontmatter("title: not frontmatter at all\n", "bad.md")


def test_parse_frontmatter_missing_required_field_names_the_file():
    # Silent-failures review finding 7a: a card missing a required field
    # (here, `authors:`) used to raise a bare `KeyError: 'authors'` with
    # no indication of which of a 45-card-and-growing corpus's own files
    # to fix.
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
    # Silent-failures review finding 7a: a card with a non-numeric
    # `year:` used to raise a bare `ValueError: invalid literal for
    # int()...` with no file name either.
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


# --------------------------------------------------------------------------
# DOI-less cards (bkt-hte-outbox-seam review, "High": `literature.load(
# cards_dir=None)` raised on the real corpus because six cards carry
# `doi: null`; see this module's own top docstring, "DOI-less cards")
# --------------------------------------------------------------------------

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
    # `key_claims:` present but empty (no `  - "..."` item under it), not
    # the field missing outright: that hits the explicit `not key_claims`
    # check below the try block rather than the generic "carries no
    # 'key_claims' field" `KeyError` message.
    raw = _DOI_NULL_CARD.replace('  - "A claim."\n', '')
    with pytest.raises(ValueError, match="carries no key_claims"):
        literature._parse_frontmatter(raw, "educational-methods/no-doi-no-claims.md")


def test_doi_missing_card_tier_is_capped_at_t4_regardless_of_venue():
    # `venue: "Some Press"` names none of `_REPORT_OR_BOOK_VENUE_KEYWORDS`,
    # so a real-DOI card at this venue would read T2; `doi_missing` must
    # still cap it at T4.
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
    assert len(items) == 1  # one key_claims entry
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


# --------------------------------------------------------------------------
# tier
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    "needle,expected_tier",
    [
        ("bloom-1984", Tier.T2),           # Educational Researcher, refereed journal
        ("kulik-kulik", Tier.T2),          # Review of Educational Research, refereed journal
        ("roediger-karpicke", Tier.T2),    # Perspectives on Psychological Science
        ("kestin-et-al", Tier.T2),         # Scientific Reports
        ("si-yang-hashimoto", Tier.T3),    # arXiv preprint
        ("unesco-2025", Tier.T3),          # UNESCO report
    ],
)
def test_evidence_tier_by_venue_and_doi(cards, needle, expected_tier):
    card = _card(cards, needle)
    assert literature._evidence_tier(card) == expected_tier


def test_nature_news_doi_prefix_reads_as_commentary():
    # 10.1038/d... (Nature news/comment) is distinct from 10.1038/s... (Nature
    # research); not in the 6-card fixture subset (Stokel-Walker 2023 lives
    # in the full 45-card corpus), checked directly against a minimal Card.
    card = literature.Card(
        doi="10.1038/d41586-023-00107-z", title="t", authors=("A, B",), year=2023,
        venue="Nature", relative_path="x.md", why_it_matters="w",
        key_claims=(literature.Claim(text="c", line_start=1, line_end=1, char_start=0, char_end=1),),
        research_questions=(), how_it_bears_on_research_os="h",
    )
    assert literature._evidence_tier(card) == Tier.T4


# --------------------------------------------------------------------------
# method and kind
# --------------------------------------------------------------------------


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


# --------------------------------------------------------------------------
# ground truth: replicated findings, dated by publication
# --------------------------------------------------------------------------


def test_only_the_meta_analysis_becomes_ground_truth(corpus):
    # `corpus` (batch one alone) carries no cross-card corroboration
    # group and no bare "replicat" mention paired with an effect size
    # beyond Kulik, Kulik, and Bangert-Drowns 1990's own meta-analysis,
    # so the widened, three-way rule (`bkt-hte-ground-truth-enrichment`,
    # `docs/COVERAGE-2026-09-10.md`) still finds exactly one event
    # here; `test_widened_rule_finds_six_ground_truth_events_across_
    # both_batches` below exercises the widening itself.
    assert len(corpus.ground_truth) == 1
    event = corpus.ground_truth[0]
    assert event.doc_id == "10.3102/00346543060002265"  # Kulik, Kulik, and Bangert-Drowns 1990
    assert event.year == 1990
    assert event.discovery_year == 1990  # dated by publication, no discovery lag


def test_bloom_itself_is_not_ground_truth_despite_mentioning_replication(corpus):
    # Bloom 1984's own `research_questions_it_leaves_open` bullet asks
    # "whether the two-sigma figure replicates outside Bloom's own
    # studies"; that field is out of scope for the ground-truth check
    # (`_extraction_text` only), so Bloom's own card does not
    # self-report as a replicated finding.
    bloom_doi = "10.3102/0013189x013006004"
    assert not any(g.doc_id == bloom_doi for g in corpus.ground_truth)


# --------------------------------------------------------------------------
# ground truth widening (`bkt-hte-ground-truth-enrichment`): an effect
# size gates a bare "replicat" mention, and cross-card corroboration on
# `(mechanism, object)` is a third, independent way in
# --------------------------------------------------------------------------


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
    # The pre-widening rule credited any card whose scoped text named a
    # replication, no number required; this rule now also asks for a
    # quantified effect size (`_has_effect_size`), so a card that only
    # gestures at "the replication crisis" earns nothing on this reading
    # alone.
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
    # Both cards name the same intervention (a card mentioning nothing
    # this corpus's own lexicon resolves for actor/place is irrelevant
    # here; only mechanism and object drive this check), from different
    # first authors.
    a = _synthetic_card("doi-a", "Alpha", "Retrieval practice raised test scores in this cohort.")
    b = _synthetic_card("doi-b", "Beta", "Retrieval practice raised test scores in a second, independent cohort.")
    assert literature._corroborated_dois([a, b]) == {"doi-a", "doi-b"}


def test_corroborated_dois_excludes_a_single_author_repeating_itself():
    a = _synthetic_card("doi-a", "Alpha", "Retrieval practice raised test scores in this cohort.")
    b = _synthetic_card("doi-b", "Alpha", "Retrieval practice raised test scores in a follow-up by the same team.")
    assert literature._corroborated_dois([a, b]) == set()


def test_corroborated_dois_excludes_a_shared_other_object_even_with_two_authors():
    # Neither card names an outcome this corpus's own lexicon resolves
    # (`_detect_object` reads `OTHER`); two different authors both
    # landing on "unclassified" is not the corroboration this reading is
    # built to catch, `object` being the operative shared signal (see
    # `_corroborated_dois`'s own docstring).
    a = _synthetic_card("doi-a", "Alpha", "Something happens here that names no outcome this lexicon resolves.")
    b = _synthetic_card("doi-b", "Beta", "Something else happens here that also names no outcome this lexicon resolves.")
    assert literature._detect_object(literature._extraction_text(a)) == other_id(Slot.OBJECT)
    assert literature._corroborated_dois([a, b]) == set()


def test_widened_rule_finds_six_ground_truth_events_across_both_batches(corpus_both):
    # Up from the pre-widening rule's own single event across both
    # fixture batches (`docs/COVERAGE-2026-09-10.md`'s own "Ground
    # truth" section carries the before/after numbers): Kulik, Kulik,
    # and Bangert-Drowns 1990 and Deci, Koestner, and Ryan 1999 each
    # qualify alone (meta-analysis); Deci and Ryan 2000 and Oudeyer,
    # Kaplan, and Hafner 2007 corroborate Deci, Koestner, and Ryan
    # 1999's own `self-determination`/`motivation` reading; Alonzo and
    # Steedle 2009 and Corcoran, Mosher, and Rogat 2009 independently
    # corroborate a `learning-gain` reading, a disjoint pair with no
    # shared author.
    expected_dois = {
        "10.3102/00346543060002265",  # Kulik, Kulik, and Bangert-Drowns 1990
        "10.1037/0033-2909.125.6.627",  # Deci, Koestner, and Ryan 1999
        "10.1207/s15327965pli1104_01",  # Deci and Ryan 2000
        "10.1109/TEVC.2006.890271",  # Oudeyer, Kaplan, and Hafner 2007
        "10.1002/sce.20303",  # Alonzo and Steedle 2009
        "10.12698/cpre.2009.rr63",  # Corcoran, Mosher, and Rogat 2009
    }
    assert {g.doc_id for g in corpus_both.ground_truth} == expected_dois
    assert len(corpus_both.ground_truth) == 6


# --------------------------------------------------------------------------
# stemma: a card citing another card in the set
# --------------------------------------------------------------------------


def test_kulik_cites_bloom_as_a_stemma_parent(corpus):
    bloom_doi = "10.3102/0013189x013006004"
    kulik_doi = "10.3102/00346543060002265"
    assert corpus.sources[kulik_doi].stemma_parents == [bloom_doi]


def test_bloom_carries_no_stemma_parents_despite_being_named_forward(corpus):
    # Bloom 1984 cannot cite a 1990 paper; the corpus curator's own forward
    # pointer in Bloom's `research_questions_it_leaves_open` bullet must
    # not produce a chronologically impossible stemma edge.
    bloom_doi = "10.3102/0013189x013006004"
    assert corpus.sources[bloom_doi].stemma_parents == []


def test_cards_with_no_cross_reference_carry_no_stemma_parents(corpus):
    for doi in ("10.48550/arxiv.2409.04109", "10.1111/j.1745-6916.2006.00012.x", "10.1038/s41598-025-97652-6", "10.54676/sidm1046"):
        assert corpus.sources[doi].stemma_parents == []


# --------------------------------------------------------------------------
# EvidenceItem shape: id, source_id, span (file, line range, quote), interval
# --------------------------------------------------------------------------


def test_evidence_item_count_is_three_per_card(corpus):
    # every one of the 6 fixture cards carries exactly 3 key_claims bullets
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
        # the located line range's own raw lines contain the claim text too
        lines = raw.splitlines()
        located = "\n".join(lines[claim.line_start - 1:claim.line_end])
        assert claim.text in located


def test_interval_is_a_point_at_the_publication_year(corpus):
    bloom_item = next(e for e in corpus.evidence if e.source_id == "10.3102/0013189x013006004")
    assert bloom_item.interval is not None
    assert bloom_item.interval.start == 1984
    assert bloom_item.interval.end == 1984


# --------------------------------------------------------------------------
# slots and vocabulary
# --------------------------------------------------------------------------


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
    assert "mastery-learning" in mechanisms       # Bloom 1984, Kulik and others 1990
    assert "retrieval-practice" in mechanisms     # Roediger and Karpicke 2006
    assert "intelligent-tutoring" in mechanisms   # Kestin and others 2025
    assert "research-idea-generation" in mechanisms  # Si, Yang, and Hashimoto 2024


def test_actor_detection_finds_all_four_named_roles(corpus):
    actors = {e.actor for e in corpus.evidence if e.actor is not None}
    assert "tutor" in actors      # Bloom 1984, Kulik and others 1990, Kestin and others 2025
    assert "learner" in actors    # Roediger and Karpicke 2006
    assert "system" in actors     # Si, Yang, and Hashimoto 2024


def test_unnamed_actor_reads_as_other():
    from hte.concepts import other_id
    text = "A paper about nothing in particular's own effect on something else."
    assert literature._detect_actor(text) == other_id(Slot.ACTOR)


# --------------------------------------------------------------------------
# action classification
# --------------------------------------------------------------------------


def test_action_worsened_keyword_excludes_the_low_resource_compound():
    # "lower-resource" (a study population's own name) must not itself read
    # as a worsened effect; only "lower " (trailing space, an actual
    # negative-outcome phrase) does.
    assert literature._classify_action("Conducted in lower-resource school systems.") == "no-effect"
    assert literature._classify_action("Students showed lower motivation.") == "worsened"


def test_action_mixed_when_both_directions_present():
    assert literature._classify_action("The effect improved on one measure and was worse on another.") == "mixed"


# --------------------------------------------------------------------------
# round trip
# --------------------------------------------------------------------------


def test_corpus_json_round_trips(corpus):
    from hte.corpus import Corpus
    d = corpus.to_dict()
    json.dumps(d)  # must not raise
    restored = Corpus.from_dict(d)
    assert len(restored.evidence) == len(corpus.evidence)
    assert len(restored.sources) == len(corpus.sources)
    assert len(restored.ground_truth) == len(corpus.ground_truth)


# --------------------------------------------------------------------------
# batch two: a second 6-card fixture root (PR #15), and multi-root loading
# --------------------------------------------------------------------------


def test_load_raw_reads_all_eleven_batch_two_fixtures(cards_batch_two):
    # 6 original PR #15 cards plus 5 added by `bkt-hte-ground-truth-
    # enrichment` (`docs/COVERAGE-2026-09-10.md`) to widen the
    # ground-truth rule's cross-card-corroboration reach.
    assert len(cards_batch_two) == 11
    assert len({c.doi for c in cards_batch_two}) == 11


def test_batch_two_fixtures_span_five_branches(cards_batch_two):
    branches = {c.relative_path.split("/", 1)[0] for c in cards_batch_two}
    assert branches == {
        "educational-methods", "hci-human-ai-collaboration",
        "prerequisite-knowledge-graphs", "scientific-discovery-metascience", "ai-and-researchers",
    }


def test_batch_two_fixture_carries_a_new_area_not_in_batch_one(cards_batch_two):
    # prerequisite-knowledge-graphs is PR #15's own new area, absent from
    # batch one entirely (this module's own top docstring, "Batches").
    pan = _card(cards_batch_two, "pan-et-al-2017")
    assert pan.relative_path.startswith("prerequisite-knowledge-graphs/")


def test_batch_two_fixture_header_is_skipped_the_same_way_batch_one_s_is(cards_batch_two):
    # Confirms the parser skips the `voice-ignore-file` header on a
    # batch-two card exactly as it does on batch one's own fixtures
    # (`test_parse_frontmatter_skips_a_leading_voice_ignore_file_comment_
    # and_keeps_spans_correct` above already regression-tests the parser
    # itself directly; this checks a real batch-two fixture file on disk
    # carries that header and still parses).
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
    assert len(corpus_both.evidence) == 51  # 3 key_claims per card, 17 cards


def test_both_batches_source_batches_field_names_its_own_root(corpus_both):
    bloom_doi = "10.3102/0013189x013006004"  # batch one
    kitano_doi = "10.1038/s41540-021-00189-3"  # batch two
    assert corpus_both.sources[bloom_doi].batches == ["batch-1"]
    assert corpus_both.sources[kitano_doi].batches == ["batch-2"]


def test_a_doi_shared_by_two_roots_dedupes_to_the_first_and_merges_batches(tmp_path):
    # A synthetic second root repeating one of batch one's own DOIs (the
    # real fixture batches never collide; this exercises the dedup path
    # `_build_corpus` takes when they would) must not double-count that
    # source's evidence, and must fold the second root's own batch label
    # onto the first root's `Source.batches` rather than replacing it.
    dupe_root = tmp_path / "dupe-batch"
    (dupe_root / "educational-methods").mkdir(parents=True)
    bloom_path = literature.DEFAULT_FIXTURES_DIR / "educational-methods" / "bloom-1984-two-sigma-problem.md"
    (dupe_root / "educational-methods" / "bloom-1984-two-sigma-problem.md").write_text(bloom_path.read_text())

    corpus = literature.load([literature.DEFAULT_FIXTURES_DIR, dupe_root])
    bloom_doi = "10.3102/0013189x013006004"
    assert corpus.sources[bloom_doi].batches == ["batch-1", "batch-2"]
    assert len([e for e in corpus.evidence if e.source_id == bloom_doi]) == 3  # not 6


def test_load_default_matches_both_batches_combined():
    default_corpus = literature.load_default()
    both = literature.load(literature.DEFAULT_CARDS_DIRS)
    assert len(default_corpus.sources) == len(both.sources) == 17


# --------------------------------------------------------------------------
# root auto-discovery (bkt-hte-outbox-seam item 3): `discover_card_roots`
# globs `_intake/research-os-k12-literature*` under a base directory, plus
# any batch subfolder a matched root's own README declares as a distinct
# root of its own. A temp tree of three roots exercises both mechanisms at
# once: the primary glob match, a sibling glob match, and a subfolder the
# primary root's own README declares.
# --------------------------------------------------------------------------


def _copy_card(src: Path, dest_dir: Path) -> None:
    dest_dir.mkdir(parents=True, exist_ok=True)
    (dest_dir / src.name).write_text(src.read_text())


BLOOM_CARD = FIXTURES_DIR / "educational-methods" / "bloom-1984-two-sigma-problem.md"
BLOOM_DOI = "10.3102/0013189x013006004"
KULIK_CARD = FIXTURES_DIR / "educational-methods" / "kulik-kulik-bangert-drowns-1990-mastery-learning-meta-analysis.md"


@pytest.fixture
def three_root_tree(tmp_path):
    """A temp `_intake/` carrying three literature-corpus roots:

    1. `research-os-k12-literature/` (the primary glob match), one card
       (Bloom 1984), plus a `README.md` declaring a nested batch root.
    2. `research-os-k12-literature/declared-batch/` (the README-declared
       root, nested inside the primary root but a distinct root of its
       own), one different card (Kulik, Kulik, and Bangert-Drowns 1990).
    3. `research-os-k12-literature-extra/` (a second, sibling glob match),
       repeating Bloom's own card, so cross-root DOI dedup has something
       real to collapse.
    """
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

    # two distinct DOIs: Bloom (primary + sibling, deduped) and Kulik
    # (declared subfolder only)
    assert len(corpus.sources) == 2
    assert corpus.sources[BLOOM_DOI].batches == ["batch-1", "batch-3"]
    kulik_doi = next(doi for doi in corpus.sources if doi != BLOOM_DOI)
    assert corpus.sources[kulik_doi].batches == ["batch-2"]
    # Bloom's own evidence lands exactly once, from batch-1's own card (3
    # key_claims), the dedup collapsing the sibling root's repeated DOI
    # onto that same first occurrence rather than adding a second copy
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
    """No `base` argument: this repo's own `_intake/research-os-k12-
    literature/` root, the same real, on-disk tree `LOCAL_INTAKE_DIR`
    names, must be among the discovered roots whenever this package is
    running inside a checkout that carries it (true for this repo's own
    test suite; a sparse or packaged checkout with no `_intake/` at all
    would discover `[]` instead, which this test does not require)."""
    discovered = literature.discover_card_roots()
    if literature.LOCAL_INTAKE_DIR.is_dir():
        assert literature.LOCAL_INTAKE_DIR in discovered


def test_load_cards_dir_none_against_the_real_repo_checkout_succeeds_with_six_degraded_named_in_the_log(caplog):
    """bkt-hte-outbox-seam review, "High": `literature.load(cards_dir=
    None)` used to raise against this repo's own on-disk corpus, because
    six real cards carry `doi: null`. It must now succeed, report the
    real 147-card corpus, degrade (never drop) all six, and name every
    one of them in `load_raw`'s own `skipped_or_degraded` log line."""
    if not literature.LOCAL_INTAKE_DIR.is_dir():
        pytest.skip("literature adapter: no _intake/research-os-k12-literature/ tree in this checkout")

    with caplog.at_level(logging.WARNING, logger="hte.corpus.literature"):
        corpus = literature.load(cards_dir=None)

    assert len(corpus.sources) == 147
    degraded_ids = [source_id for source_id in corpus.sources if source_id.startswith("nodoi:")]
    assert len(degraded_ids) == 6
    degraded_items = [item for item in corpus.evidence if item.source_id in degraded_ids]
    assert degraded_items
    assert all(item.tier == Tier.T4 for item in degraded_items)
    assert all(item.views.get("doi_missing") is True for item in degraded_items)

    assert "skipped_or_degraded" in caplog.text
    assert "6 of 147" in caplog.text
    for relative_path in (
        "educational-methods/anderson-krathwohl-2001-taxonomy-revision.md",
        "educational-methods/wiske-1998-teaching-for-understanding.md",
        "educational-methods/perkins-1993-teaching-for-understanding.md",
        "project-based-inquiry-learning/condliffe-2017-project-based-learning-literature-review.md",
        "project-based-inquiry-learning/kingston-2018-pbl-student-achievement.md",
        "teacher-workload-adoption/cuban-2001-oversold-underused-computers-classroom.md",
    ):
        assert relative_path in caplog.text


# --------------------------------------------------------------------------
# errors
# --------------------------------------------------------------------------


def test_missing_cards_dir_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        literature.load(tmp_path / "does-not-exist")


def test_empty_cards_dir_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        literature.load(tmp_path)


# --------------------------------------------------------------------------
# network fetch
# --------------------------------------------------------------------------


def test_ensure_cards_cached_over_monkeypatched_urllib(tmp_path, monkeypatch):
    """`load(cards_dir=None, ref=...)` over a monkeypatched `urllib.request.
    urlopen`: one tree-listing response, one raw-content response per card,
    written into a temp cache directory, no real network call. Mirrors
    `hte.corpus.production`'s own `test_load_supabase_reads_rows_over_
    monkeypatched_urllib`.

    `discover_card_roots` is monkeypatched to return `[]` so this test
    keeps exercising the network-fetch fallback even though it runs inside
    a real `bucket-foundation` checkout, where `load(cards_dir=None)`
    would otherwise prefer the real, on-disk `_intake/research-os-k12-
    literature/` root over the network path this test means to cover (see
    `load`'s own "Root auto-discovery" docstring note)."""
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

    # idempotent: a second call against the same ref and cache re-lists the
    # tree (cheap, and the only way to notice a new card) but re-fetches no
    # raw file content, since every path it names is already on disk.
    captured_urls.clear()
    literature.load(ref="fake-ref")
    assert not any(literature.GITHUB_RAW_BASE in u for u in captured_urls)


def test_fetch_card_text_wraps_url_error_naming_path_and_ref(monkeypatch):
    """Silent-failures review finding 4: `_fetch_card_text` used to have
    no `try/except` at all, unlike its sibling `_fetch_card_paths`, so a
    network blip fetching one card raised a bare, low-level `urllib`
    exception naming neither the path nor the ref. It must now wrap the
    same way."""
    def fake_urlopen(request, timeout=30):  # noqa: ANN001 - matches urllib's own signature
        raise literature.urllib.error.URLError("connection reset")

    monkeypatch.setattr(literature.urllib.request, "urlopen", fake_urlopen)
    with pytest.raises(RuntimeError, match="ai-and-researchers/some-card.md.*fake-ref"):
        literature._fetch_card_text(f"{literature.GITHUB_INTAKE_PATH}/ai-and-researchers/some-card.md", "fake-ref")


def test_ensure_cards_cached_leaves_no_partial_final_file_on_a_write_failure(tmp_path, monkeypatch):
    """Silent-failures review finding 4: a crash mid-write (disk full,
    SIGKILL, Ctrl-C) must never leave a `dest`-named file on disk that a
    later `load()` call's `dest.is_file()` cache-hit check would treat
    as permanently valid; `_ensure_cards_cached` writes through a
    `.tmp` path and an atomic `rename` for exactly this reason (`hte.
    llm._write_cache`'s own convention). This test forces the write
    itself to fail and checks the real, final-named file was never
    created."""
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

    # the write failure is not permanent: a later, successful attempt
    # (the flaky patch removed) fetches this card fresh rather than
    # treating anything left behind as an already-valid cache entry
    monkeypatch.setattr(literature.Path, "write_text", real_write_text)
    literature._ensure_cards_cached("fake-ref")
    assert dest.is_file()
    assert dest.read_text() == raw_text


def test_live_fetch_lists_cards_or_skips_when_offline():
    """One real, small GitHub API call against `main` (PR #5 merged into
    `main` during this module's own review, deleting `DEFAULT_REF`'s own
    branch by this repo's default post-merge cleanup, the exact case
    `_fetch_card_paths` reads as a `RuntimeError` below); skips itself,
    with the reason, rather than failing the suite when offline,
    rate-limited, or `main` itself does not yet carry this corpus."""
    try:
        paths = literature._fetch_card_paths("main")
    except (RuntimeError, urllib.error.URLError) as exc:
        pytest.skip(f"literature adapter: no network (or no corpus on main yet) for the live-fetch check: {exc}")
    if not paths:
        pytest.skip("literature adapter: live fetch returned no card paths")
    assert any("bloom-1984-two-sigma-problem.md" in p for p in paths)
    assert all(p.endswith(".md") for p in paths)
    assert not any(p.endswith("/README.md") for p in paths)
