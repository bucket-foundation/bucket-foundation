from __future__ import annotations

import string

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from hte.concepts import Slot, other_id
from hte.corpus import literature
from hte.evidence import Tier

_GIVEN = settings(deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])

_no_backslash_quote_text = st.text(
    alphabet=st.characters(blacklist_characters='\\"', blacklist_categories=("Cs",)), max_size=40,
)

@given(text=_no_backslash_quote_text)
@_GIVEN
def test_unescape_is_identity_when_no_escaped_quote_is_present(text):
    assert literature._unescape(text) == text

def test_unescape_resolves_the_one_documented_escape():
    assert literature._unescape('a \\"quoted\\" word') == 'a "quoted" word'

@given(
    lines=st.lists(
        st.text(alphabet=string.ascii_lowercase + " ", max_size=15).map(lambda s: s + "\n"),
        max_size=8,
    ),
)
@_GIVEN
def test_iter_lines_with_offsets_reconstructs_the_original_text_exactly(lines):
    raw = "".join(lines)
    out = literature._iter_lines_with_offsets(raw)
    assert "".join(line for _, _, line in out) == raw
    for lineno, offset, line in out:
        assert raw[offset : offset + len(line)] == line
    assert [lineno for lineno, _, _ in out] == list(range(1, len(out) + 1))

def test_split_frontmatter_fields_every_group_starts_with_its_own_key_line():
    fm_text = 'title: "A"\nauthors:\n  - "Alice"\n  - "Bob"\nyear: 2020\n'
    fm_lines = literature._iter_lines_with_offsets(fm_text)
    fields = literature._split_frontmatter_fields(fm_lines)
    keys = [key for key, _ in fields]
    assert keys == ["title", "authors", "year"]
    for key, group_lines in fields:
        _, _, first_line = group_lines[0]
        assert first_line.startswith(f"{key}:")
    authors_group = dict(fields)["authors"]
    assert len(authors_group) == 3

def test_split_frontmatter_fields_keeps_a_blank_line_inside_the_open_field():
    fm_text = 'why_it_matters: >\n  line one\n\n  line two\nyear: 2020\n'
    fields = dict(literature._split_frontmatter_fields(literature._iter_lines_with_offsets(fm_text)))
    assert len(fields["why_it_matters"]) == 4
    assert len(fields["year"]) == 1

def test_parse_scalar_reads_quoted_bare_and_null_forms():
    quoted = literature._iter_lines_with_offsets('title: "Hello"\n')
    bare = literature._iter_lines_with_offsets("year: 2020\n")
    null = literature._iter_lines_with_offsets("doi: null\n")
    assert literature._parse_scalar(quoted) == "Hello"
    assert literature._parse_scalar(bare) == "2020"
    assert literature._parse_scalar(null) is None

def test_parse_list_skips_lines_that_do_not_match_the_list_item_shape():
    fm_lines = literature._iter_lines_with_offsets(
        'authors:\n  - "Alice"\n  not a list item\n  - "Bob"\n',
    )
    assert literature._parse_list(fm_lines) == ["Alice", "Bob"]

@given(word=st.text(alphabet=string.ascii_lowercase, min_size=1, max_size=10))
@_GIVEN
def test_parse_claims_char_offsets_locate_the_exact_text_in_the_original_line(word):
    raw = f'key_claims:\n  - "{word}"\n'
    fm_lines = literature._iter_lines_with_offsets(raw)
    claims = literature._parse_claims(fm_lines)
    assert len(claims) == 1
    claim = claims[0]
    assert claim.text == word
    assert raw[claim.char_start : claim.char_end] == word
    assert claim.line_start == claim.line_end == 2

def test_parse_block_scalar_folds_continuation_lines_with_single_spaces():
    fm_lines = literature._iter_lines_with_offsets("how_it_bears_on_research_os: >\n  first part\n  second part\n")
    assert literature._parse_block_scalar(fm_lines) == "first part second part"

def test_evidence_tier_preprint_prefix_wins_even_over_a_report_venue_keyword():
    card = literature.Card(
        doi="10.48550/arxiv.2101.00001", title="t", authors=("A",), year=2021,
        venue="World Bank working paper", relative_path="p.md", why_it_matters="w",
        key_claims=(), research_questions=(), how_it_bears_on_research_os="h",
    )
    assert literature._evidence_tier(card) == Tier.T3

def test_evidence_tier_commentary_prefix_reads_t4_with_no_other_signal():
    card = literature.Card(
        doi="10.1038/d41586-000-00000-0", title="t", authors=("A",), year=2021,
        venue="a plain journal", relative_path="p.md", why_it_matters="w",
        key_claims=(), research_questions=(), how_it_bears_on_research_os="h",
    )
    assert literature._evidence_tier(card) == Tier.T4

def test_evidence_tier_falls_back_to_t2_with_no_special_signal():
    card = literature.Card(
        doi="10.1000/plain", title="t", authors=("A",), year=2021,
        venue="a plain journal", relative_path="p.md", why_it_matters="w",
        key_claims=(), research_questions=(), how_it_bears_on_research_os="h",
    )
    assert literature._evidence_tier(card) == Tier.T2

@given(digit=st.integers(min_value=0, max_value=9))
@_GIVEN
def test_has_effect_size_requires_both_a_marker_and_a_digit(digit):
    marker_only = "the effect size was notable"
    digit_only = f"there were {digit} participants"
    both = f"the effect size was {digit} percent"
    assert literature._has_effect_size(marker_only) is False
    assert literature._has_effect_size(digit_only) is False
    assert literature._has_effect_size(both) is True

def test_is_ground_truth_meta_analysis_is_always_true_regardless_of_text():
    assert literature._is_ground_truth("meta-analysis", "no numbers or markers here at all") is True

def test_is_ground_truth_requires_replication_word_and_effect_size_for_non_meta_analysis():
    assert literature._is_ground_truth("rct", "a direct replication found a 20 percent gain") is True
    assert literature._is_ground_truth("rct", "a direct replication with no quantified size") is False
    assert literature._is_ground_truth("rct", "an effect size of 20 percent with no repeat study") is False

def test_classify_action_reads_mixed_when_both_keyword_classes_are_present():
    text = "scores improved on one measure but were lower on another"
    assert literature._classify_action(text) == "mixed"

def test_classify_action_reads_no_effect_with_neither_keyword_class():
    assert literature._classify_action("the study found nothing notable either way") == "no-effect"

@given(text=st.text(max_size=30))
@_GIVEN
def test_detect_helpers_fall_back_to_other_id_with_no_lexicon_match(text):
    noise = "".join(ch for ch in text if not ch.isalpha())
    assert literature._detect_actor(noise) == other_id(Slot.ACTOR)
    assert literature._detect_mechanism(noise) == other_id(Slot.MECHANISM)
    assert literature._detect_object(noise) == other_id(Slot.OBJECT)
    assert literature._detect_place(noise) == other_id(Slot.PLACE)

@given(text=st.text(max_size=200), limit=st.integers(min_value=4, max_value=100))
@_GIVEN
def test_truncate_never_exceeds_the_limit_and_is_identity_under_it(text, limit):
    result = literature._truncate(text, limit=limit)
    assert len(result) <= limit
    if len(text) <= limit:
        assert result == text
    else:
        assert len(result) <= limit
        assert result.endswith("...")

def test_discover_card_roots_returns_empty_list_with_no_intake_directory(tmp_path):
    assert literature.discover_card_roots(base=tmp_path) == []

def test_discover_card_roots_finds_matching_globs_in_sorted_order(tmp_path):
    intake = tmp_path / "_intake"
    (intake / "research-os-k12-literature").mkdir(parents=True)
    (intake / "research-os-k12-literature-2").mkdir(parents=True)
    (intake / "unrelated-corpus").mkdir(parents=True)
    roots = literature.discover_card_roots(base=tmp_path)
    assert roots == sorted(roots)
    assert {p.name for p in roots} == {"research-os-k12-literature", "research-os-k12-literature-2"}

def test_declared_batch_subfolders_reads_the_readme_marker_and_skips_a_stale_one(tmp_path):
    card_root = tmp_path / "research-os-k12-literature"
    nested = card_root / "batch-three"
    nested.mkdir(parents=True)
    (card_root / "README.md").write_text(
        "Some prose.\n\nBatch root: `batch-three`\n\nBatch root: `does-not-exist`\n",
        encoding="utf-8",
    )
    found = literature._declared_batch_subfolders(card_root)
    assert found == [nested.resolve()]

def test_declared_batch_subfolders_with_no_readme_returns_empty_list(tmp_path):
    card_root = tmp_path / "root-with-no-readme"
    card_root.mkdir()
    assert literature._declared_batch_subfolders(card_root) == []
