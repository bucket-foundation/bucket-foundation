from __future__ import annotations

import pytest

from hte.corpus.younger_dryas import (
    Card,
    Claim,
    _claim_interval,
    _corroborated_card_slugs,
    _parse_frontmatter,
    _truncate,
    _TIER_BY_VENUE_TYPE,
)
from hte.evidence import Stance, Tier
from hte.timeline import UncertaintyKind

def _card_text(claims_block: str = '  - "ACTOR=meltwater-pulse | ACTION=triggered | OBJECT=cooling-event | '
                                    'PLACE=north-atlantic | MECHANISM=amoc-shutdown | STANCE=positive | '
                                    'INTERVAL_KA=none :: a claim"', *, extra_fields: str = "") -> str:
    return (
        "---\n"
        'doi: "10.1000/test-card"\n'
        'title: "A Test Card"\n'
        "authors:\n"
        '  - "Smith, J."\n'
        "year: 2020\n"
        'venue: "Test Journal"\n'
        'venue_type: "journal-article"\n'
        'side: "proponent"\n'
        'kind: "geological"\n'
        "cited_by_count: 5\n"
        'doi_check: "checked against crossref"\n'
        f"{extra_fields}"
        'abstract: "An abstract sentence."\n'
        "claims:\n"
        f"{claims_block}\n"
        "---\n"
    )

def test_parse_frontmatter_raises_on_missing_opening_marker():
    with pytest.raises(ValueError, match="has no frontmatter opening"):
        _parse_frontmatter("no frontmatter opener here at all", "bad.md", "bad")

def test_parse_frontmatter_raises_on_missing_closing_marker():
    with pytest.raises(ValueError, match="has no frontmatter closing"):
        _parse_frontmatter('---\ndoi: "10.1/x"\n', "bad.md", "bad")

def test_parse_frontmatter_raises_naming_the_missing_field():
    text = "---\n" 'doi: "10.1/x"\n' 'title: "T"\n' "---\n"
    with pytest.raises(ValueError, match="missing required field 'authors'"):
        _parse_frontmatter(text, "bad.md", "bad")

def test_parse_frontmatter_raises_on_unparseable_top_level_line():
    text = "---\n" '- "not a key: value line"\n' "---\n"
    with pytest.raises(ValueError, match="unparseable frontmatter line"):
        _parse_frontmatter(text, "bad.md", "bad")

def test_parse_frontmatter_raises_on_unparseable_claim_line():
    text = _card_text('  - "a plain sentence with no slot header at all"')
    with pytest.raises(ValueError, match="unparseable claim line"):
        _parse_frontmatter(text, "bad.md", "bad")

def test_parse_frontmatter_raises_on_unparseable_scalar_field():
    text = _card_text().replace("year: 2020\n", "year: not a bare token\n")
    with pytest.raises(ValueError, match="unparseable scalar field"):
        _parse_frontmatter(text, "bad.md", "bad")

def test_parse_frontmatter_happy_path_reads_every_field():
    card = _parse_frontmatter(_card_text(), "ok.md", "ok")
    assert card.doi == "10.1000/test-card"
    assert card.title == "A Test Card"
    assert card.authors == ("Smith, J.",)
    assert card.year == 2020
    assert card.rebuts == ()
    assert card.replicates == ()
    assert len(card.claims) == 1
    claim = card.claims[0]
    assert claim.actor == "meltwater-pulse"
    assert claim.stance == Stance.POSITIVE
    assert claim.interval is None

def test_parse_frontmatter_reads_rebuts_and_replicates_when_present():
    extra = '  - "other-card"\nreplicates:\n  - "third-card"\n'
    text = _card_text().replace("abstract:", f"rebuts:\n{extra}abstract:")
    card = _parse_frontmatter(text, "ok.md", "ok")
    assert card.rebuts == ("other-card",)
    assert card.replicates == ("third-card",)

def test_claim_interval_none_spec_returns_none():
    assert _claim_interval("none") is None

def test_claim_interval_degenerate_span_reads_point():
    interval = _claim_interval("12.9-12.9")
    assert interval is not None
    assert interval.start == interval.end
    assert interval.uncertainty.kind == UncertaintyKind.POINT

def test_claim_interval_orders_by_magnitude_regardless_of_input_order():
    forward = _claim_interval("14.7-11.7")
    backward = _claim_interval("11.7-14.7")
    assert forward == backward
    assert forward.start < forward.end
    assert forward.uncertainty.kind == UncertaintyKind.UNIFORM

def test_truncate_leaves_a_short_title_unchanged():
    title = "a" * 80
    assert _truncate(title) == title

def test_truncate_shortens_a_long_title_to_the_limit_with_ellipsis():
    title = "a" * 81
    result = _truncate(title)
    assert len(result) == 80
    assert result.endswith("…")

def test_tier_by_venue_type_falls_back_to_t2_for_an_unlisted_venue_type():
    assert _TIER_BY_VENUE_TYPE.get("preprint", Tier.T2) == Tier.T2
    assert _TIER_BY_VENUE_TYPE.get("journal-article", Tier.T2) == Tier.T2
    assert _TIER_BY_VENUE_TYPE.get("book-chapter", Tier.T2) == Tier.T3

def _make_card(slug: str, author: str, mechanism: str, obj: str, rebuts: tuple[str, ...] = ()) -> Card:
    claim = Claim(
        text="t", actor="a", action="act", object=obj, place="p", mechanism=mechanism,
        stance=Stance.POSITIVE, interval=None, line_start=1, line_end=1, char_start=0, char_end=1,
    )
    return Card(
        doi=f"10.1/{slug}", slug=slug, title="T", authors=(author,), year=2020, venue="V",
        venue_type="journal-article", side="proponent", kind="geological", cited_by_count=0,
        doi_check="x", rebuts=rebuts, replicates=(), abstract="a", claims=(claim,), relative_path="x",
    )

def test_corroboration_does_not_qualify_when_every_contributor_shares_one_surname():
    cards = [_make_card("a1", "Smith, J.", "mech1", "obj1"), _make_card("a2", "Smith, K.", "mech1", "obj1")]
    assert _corroborated_card_slugs(cards) == set()

def test_corroboration_qualifies_when_two_distinct_surnames_share_a_reading():
    cards = [_make_card("a1", "Jones, A.", "mech2", "obj2"), _make_card("a2", "Brown, B.", "mech2", "obj2")]
    assert _corroborated_card_slugs(cards) == {"a1", "a2"}

def test_corroboration_excludes_a_card_that_is_itself_a_rebuttal_target():
    cards = [
        _make_card("a1", "Jones, A.", "mech3", "obj3"),
        _make_card("a2", "Brown, B.", "mech3", "obj3"),
        _make_card("a3", "Lee, C.", "mech-other", "obj-other", rebuts=("a1",)),
    ]
    assert _corroborated_card_slugs(cards) == set()
