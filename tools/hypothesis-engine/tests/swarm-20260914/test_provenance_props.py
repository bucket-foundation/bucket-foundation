"""Property tests for `hte.provenance`, the one module on `tests/COVERAGE.md`'s
own tracked file set carrying no property-swarm file of its own (`tests/
test_provenance.py` already covers every function with fixed examples; this
file adds the swarm's own generated-input pass over `collect`/
`collect_from_corpus`/`stamp_manifest`).

`EvidenceItem.source_id` and `Source.id` are plain `str` fields with no
non-empty constraint of their own (`hte/evidence.py`), so a corpus is free to
carry an empty-string source id; this round's own strategies draw that value
on purpose to probe every truthiness guard in `hte/provenance.py` against it.

Found and fixed the same tick (`FINDING-2026-09-14-602` below); no `xfail`
marker was needed, matching round four's/five's/seven's own precedent in
`tests/swarm/FINDINGS-2026-09-10.md`.
"""
from __future__ import annotations

import json

from hypothesis import given, settings
from hypothesis import strategies as st

from hte import provenance
from hte.corpus import Corpus
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Tier

# --------------------------------------------------------------------------
# Strategies
# --------------------------------------------------------------------------

# Deliberately includes "" alongside ordinary ids: `source_id` carries no
# non-empty constraint at the dataclass level (see module docstring above).
_ID = st.one_of(st.none(), st.just(""), st.text(min_size=1, max_size=6, alphabet="abcXYZ-"))
_SOURCE_ID = st.text(min_size=0, max_size=6, alphabet="abcXYZ-")


def _span(quote: str, doc_id: str = "doc-1") -> EvidenceSpan:
    return EvidenceSpan(doc_id=doc_id, locator="l", quote=quote, char_start=0, char_end=len(quote))


@st.composite
def evidence_items(draw, *, item_id: str):
    source_id = draw(_SOURCE_ID)
    quote = draw(st.text(min_size=0, max_size=8))
    actor = draw(st.one_of(st.none(), st.text(min_size=1, max_size=6)))
    production_id = draw(_ID)
    learner_id = draw(_ID)
    item = EvidenceItem(
        id=item_id, kind=EvidenceKind.TEXTUAL, tier=Tier.T4, source_id=source_id,
        span=_span(quote), provenance="test", actor=actor,
    )
    if production_id is not None:
        item.production_id = production_id
    if learner_id is not None:
        item.learner_id = learner_id
    return item


@st.composite
def evidence_item_lists(draw, *, min_size: int = 0, max_size: int = 8):
    n = draw(st.integers(min_value=min_size, max_value=max_size))
    return [draw(evidence_items(item_id=f"ev-{i}")) for i in range(n)]


@st.composite
def sources(draw, *, source_id: str):
    production_id = draw(_ID)
    learner_id = draw(_ID)
    source = Source(id=source_id, kind=EvidenceKind.TEXTUAL)
    if production_id is not None:
        source.production_id = production_id
    if learner_id is not None:
        source.learner_id = learner_id
    return source


@st.composite
def corpora(draw, *, min_evidence: int = 0, max_evidence: int = 8, min_sources: int = 0, max_sources: int = 4):
    evidence = draw(evidence_item_lists(min_size=min_evidence, max_size=max_evidence))
    n_sources = draw(st.integers(min_value=min_sources, max_value=max_sources))
    source_list = [draw(sources(source_id=f"src-{i}")) for i in range(n_sources)]
    return Corpus(sources={s.id: s for s in source_list}, evidence=evidence)


def _truthy_ids(items: list[EvidenceItem], attr: str) -> set[str]:
    return {v for v in (getattr(it, attr, None) for it in items) if v}


# --------------------------------------------------------------------------
# collect()
# --------------------------------------------------------------------------


@given(items=evidence_item_lists(min_size=0, max_size=0))
@settings(max_examples=5)
def test_collect_returns_none_for_empty_evidence(items):
    assert provenance.collect(items) is None


@given(items=evidence_item_lists(min_size=1, max_size=10))
@settings(max_examples=60)
def test_collect_never_returns_none_for_nonempty_evidence(items):
    assert provenance.collect(items) is not None


@given(items=evidence_item_lists(min_size=1, max_size=10))
@settings(max_examples=60)
def test_collect_source_ids_are_exactly_the_truthy_source_ids(items):
    result = provenance.collect(items)
    expected = sorted({it.source_id for it in items if it.source_id})
    assert result["source_ids"] == expected


@given(items=evidence_item_lists(min_size=1, max_size=10))
@settings(max_examples=60)
def test_collect_production_and_learner_ids_are_exactly_the_truthy_attributes(items):
    result = provenance.collect(items)
    assert result["production_ids"] == sorted(_truthy_ids(items, "production_id"))
    assert result["learner_ids"] == sorted(_truthy_ids(items, "learner_id"))


@given(items=evidence_item_lists(min_size=1, max_size=10))
@settings(max_examples=60)
def test_collect_result_fields_are_deduped_and_sorted(items):
    result = provenance.collect(items)
    for key in ("source_ids", "production_ids", "learner_ids"):
        values = result[key]
        assert values == sorted(set(values))


# --------------------------------------------------------------------------
# collect_from_corpus()
# --------------------------------------------------------------------------


@given(corpus=corpora())
@settings(max_examples=60)
def test_collect_from_corpus_top_level_source_ids_match_collect_over_evidence_alone(corpus):
    """The top-level `source_ids` field reads only `corpus.evidence` (never
    `corpus.sources`' own `.id`), the same evidence-only reading `collect`
    itself uses."""
    result = provenance.collect_from_corpus(corpus)
    collected = provenance.collect(corpus.evidence) or {"source_ids": []}
    assert result["source_ids"] == collected["source_ids"]


@given(corpus=corpora())
@settings(max_examples=60)
def test_collect_from_corpus_production_and_learner_ids_union_evidence_and_sources(corpus):
    result = provenance.collect_from_corpus(corpus)
    expected_production = _truthy_ids(corpus.evidence, "production_id") | _truthy_ids(list(corpus.sources.values()), "production_id")
    expected_learner = _truthy_ids(corpus.evidence, "learner_id") | _truthy_ids(list(corpus.sources.values()), "learner_id")
    assert result["production_ids"] == sorted(expected_production)
    assert result["learner_ids"] == sorted(expected_learner)


@given(corpus=corpora())
@settings(max_examples=60)
def test_by_production_keys_match_the_production_ids_list(corpus):
    result = provenance.collect_from_corpus(corpus)
    assert set(result["by_production"].keys()) == set(result["production_ids"])


@given(corpus=corpora(min_evidence=1, max_evidence=10))
@settings(max_examples=60)
def test_finding_2026_09_14_602_by_production_source_ids_never_carry_a_falsy_id(corpus):
    """FINDING-2026-09-14-602 (fixed in this same pass): the per-production
    `evidence` loop in `collect_from_corpus` added `item.source_id` to its
    own `by_production[pid]["source_ids"]` bucket unconditionally, with no
    truthiness guard, while the top-level `source_ids` set (and `collect`'s
    own identical field) skip a falsy (empty-string) `source_id` throughout
    the rest of this module. An `EvidenceItem` with `source_id == ""` (a
    plain, unvalidated `str` field, `hte/evidence.py`) tied to a
    `production_id` reproduced a `by_production[pid]["source_ids"]` entry
    containing `""`, invisible from the top-level `source_ids` list. `hte.
    purge._purge_from_evidence` folds every `by_production[pid]
    ["source_ids"]` entry straight into its own `agg_source_ids` set and
    hands it to `_shallow_matches`/`_deep_matches`, which flag any JSON
    string field equal to a member of that set for redaction (`hte/
    purge.py`): an `""` member there would flag every unrelated node
    anywhere in a run's own `timeline.json`/`self-report.json`/`run.log`
    that happens to carry an empty-string `source_id`/`sourceId` field,
    over-redacting content that has nothing to do with the production
    being purged (`docs/PRIVACY.md`). Root cause: a missing `if
    item.source_id:` guard on the one line, inconsistent with every other
    guard in the same function. Fix: guard that line the same way the
    surrounding code already guards `source_ids.add(item.source_id)` at
    the top of the same loop."""
    result = provenance.collect_from_corpus(corpus)
    for bucket in result["by_production"].values():
        assert all(bucket["source_ids"]), bucket["source_ids"]


@given(corpus=corpora(min_evidence=1, max_evidence=10))
@settings(max_examples=60)
def test_by_production_source_ids_are_a_subset_of_the_top_level_source_ids(corpus):
    result = provenance.collect_from_corpus(corpus)
    top_level = set(result["source_ids"])
    for bucket in result["by_production"].values():
        assert set(bucket["source_ids"]) <= top_level


@given(corpus=corpora(min_evidence=1, max_evidence=10))
@settings(max_examples=60)
def test_by_production_quotes_and_labels_are_deduped_and_sorted(corpus):
    result = provenance.collect_from_corpus(corpus)
    for bucket in result["by_production"].values():
        assert bucket["quotes"] == sorted(set(bucket["quotes"]))
        assert bucket["labels"] == sorted(set(bucket["labels"]))
        assert "" not in bucket["quotes"]


def test_collect_from_corpus_over_empty_corpus_is_all_empty():
    result = provenance.collect_from_corpus(Corpus())
    assert result == {"source_ids": [], "production_ids": [], "learner_ids": [], "by_production": {}}


# --------------------------------------------------------------------------
# stamp_manifest()
# --------------------------------------------------------------------------


@given(extra=st.dictionaries(st.text(min_size=1, max_size=6, alphabet="abcXYZ"), st.integers(), max_size=4))
@settings(max_examples=25)
def test_stamp_manifest_preserves_every_pre_existing_key(tmp_path_factory, extra):
    run_dir = tmp_path_factory.mktemp("run")
    (run_dir / "MANIFEST.json").write_text(json.dumps(extra))
    manifest = provenance.stamp_manifest(run_dir, Corpus())
    for key, value in extra.items():
        assert manifest[key] == value
    assert "provenance" in manifest


@given(corpus=corpora(min_evidence=0, max_evidence=5))
@settings(max_examples=25)
def test_stamp_manifest_on_disk_matches_the_returned_dict(tmp_path_factory, corpus):
    run_dir = tmp_path_factory.mktemp("run")
    (run_dir / "MANIFEST.json").write_text("{}")
    manifest = provenance.stamp_manifest(run_dir, corpus)
    on_disk = json.loads((run_dir / "MANIFEST.json").read_text())
    assert on_disk == manifest
