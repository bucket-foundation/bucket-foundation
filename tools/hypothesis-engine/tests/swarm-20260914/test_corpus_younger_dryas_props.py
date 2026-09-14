"""Property/behavior tests for `hte.corpus.younger_dryas`'s own low-level
parsing helpers: `tests/test_corpus_younger_dryas.py` already exercises
`load`/`load_raw` end to end against the 47 shipped cards, but never
constructs a malformed card of its own, so every error branch in
`_parse_frontmatter`, `_split_frontmatter_fields`, `_parse_scalar`,
`_parse_claim_line`, and the non-qualifying half of
`_corroborated_card_slugs` stays untested. This module's own frontmatter
parser is a hand-rolled, independent copy of `hte.corpus.literature`'s
three scalar/list/block-scalar shapes (this module's own top docstring),
so it carries the identical class of "what happens to a malformed file"
gap that module's own swarm rounds already found real defects in
(FINDING-2026-09-10-301). No defect found here; this is coverage-only,
one new file, one PR.
"""
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

# --------------------------------------------------------------------------
# a minimal, valid card text builder, one claims block substituted in
# --------------------------------------------------------------------------


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


# --------------------------------------------------------------------------
# _parse_frontmatter: the three ValueError branches
# --------------------------------------------------------------------------


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
    """A frontmatter line with no leading whitespace that does not match
    `^(\\w+):` (`_split_frontmatter_fields`'s own guard, e.g. a stray
    bullet with no key)."""
    text = "---\n" '- "not a key: value line"\n' "---\n"
    with pytest.raises(ValueError, match="unparseable frontmatter line"):
        _parse_frontmatter(text, "bad.md", "bad")


def test_parse_frontmatter_raises_on_unparseable_claim_line():
    """A `claims:` list item whose quoted content is well-formed YAML
    (matches the generic `_LIST_ITEM_RE`) but does not match this
    module's own `ACTOR=... | ... :: text` shape."""
    text = _card_text('  - "a plain sentence with no slot header at all"')
    with pytest.raises(ValueError, match="unparseable claim line"):
        _parse_frontmatter(text, "bad.md", "bad")


def test_parse_frontmatter_raises_on_unparseable_scalar_field():
    """`year:` reaching `_parse_scalar` unquoted-and-with-spaces matches
    neither `_QUOTED_SCALAR_RE` nor `_BARE_SCALAR_RE`."""
    text = _card_text().replace("year: 2020\n", "year: not a bare token\n")
    with pytest.raises(ValueError, match="unparseable scalar field"):
        _parse_frontmatter(text, "bad.md", "bad")


# --------------------------------------------------------------------------
# _parse_frontmatter: the happy path, once, to anchor the error tests above
# against a real card shape rather than only exercising failure branches
# --------------------------------------------------------------------------


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


# --------------------------------------------------------------------------
# _claim_interval
# --------------------------------------------------------------------------


def test_claim_interval_none_spec_returns_none():
    assert _claim_interval("none") is None


def test_claim_interval_degenerate_span_reads_point():
    interval = _claim_interval("12.9-12.9")
    assert interval is not None
    assert interval.start == interval.end
    assert interval.uncertainty.kind == UncertaintyKind.POINT


def test_claim_interval_orders_by_magnitude_regardless_of_input_order():
    """The older (larger) ka value always becomes `start`'s astronomical
    year, whichever order the two numbers appear in the spec."""
    forward = _claim_interval("14.7-11.7")
    backward = _claim_interval("11.7-14.7")
    assert forward == backward
    assert forward.start < forward.end
    assert forward.uncertainty.kind == UncertaintyKind.UNIFORM


# --------------------------------------------------------------------------
# _truncate
# --------------------------------------------------------------------------


def test_truncate_leaves_a_short_title_unchanged():
    title = "a" * 80
    assert _truncate(title) == title


def test_truncate_shortens_a_long_title_to_the_limit_with_ellipsis():
    title = "a" * 81
    result = _truncate(title)
    assert len(result) == 80
    assert result.endswith("…")


# --------------------------------------------------------------------------
# _TIER_BY_VENUE_TYPE fallback
# --------------------------------------------------------------------------


def test_tier_by_venue_type_falls_back_to_t2_for_an_unlisted_venue_type():
    assert _TIER_BY_VENUE_TYPE.get("preprint", Tier.T2) == Tier.T2
    assert _TIER_BY_VENUE_TYPE.get("journal-article", Tier.T2) == Tier.T2
    assert _TIER_BY_VENUE_TYPE.get("book-chapter", Tier.T2) == Tier.T3


# --------------------------------------------------------------------------
# _corroborated_card_slugs: the non-qualifying case this module's own
# tightening past `hte.corpus.literature`'s method 3 depends on
# --------------------------------------------------------------------------


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
    """This module's own tightening past `hte.corpus.literature`'s method
    3: a card named in any other card's own `rebuts:` list can never
    anchor a corroboration event, even when two independent authors
    otherwise share its `(mechanism, object)` reading."""
    cards = [
        _make_card("a1", "Jones, A.", "mech3", "obj3"),
        _make_card("a2", "Brown, B.", "mech3", "obj3"),
        _make_card("a3", "Lee, C.", "mech-other", "obj-other", rebuts=("a1",)),
    ]
    assert _corroborated_card_slugs(cards) == set()
