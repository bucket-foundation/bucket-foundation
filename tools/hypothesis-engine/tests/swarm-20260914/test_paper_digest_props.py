from __future__ import annotations

from types import SimpleNamespace

from hypothesis import given, settings
from hypothesis import strategies as st

from hte import paper
from hte.artifacts import RunCounts, TimelineArtifact

_ENTRY = st.fixed_dictionaries({
    "hypothesis_id": st.one_of(st.none(), st.text(min_size=1, max_size=6, alphabet="abc")),
    "posterior": st.one_of(st.none(), st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)),
})

def _timeline(bins_of_entries: list[list[dict]]) -> TimelineArtifact:
    return TimelineArtifact(bins=[{"ranked_hypotheses": entries} for entries in bins_of_entries])

@given(bins_of_entries=st.lists(st.lists(_ENTRY, max_size=5), max_size=5))
@settings(max_examples=150)
def test_deduped_posteriors_only_keeps_entries_with_both_fields(bins_of_entries):
    out = paper._deduped_posteriors(_timeline(bins_of_entries))
    all_entries = [e for bin_entries in bins_of_entries for e in bin_entries]
    well_formed_ids = {e["hypothesis_id"] for e in all_entries if e["hypothesis_id"] is not None and e["posterior"] is not None}
    assert set(out.keys()) == well_formed_ids

@given(bins_of_entries=st.lists(st.lists(_ENTRY, max_size=5), max_size=5))
@settings(max_examples=150)
def test_deduped_posteriors_first_occurrence_wins(bins_of_entries):
    out = paper._deduped_posteriors(_timeline(bins_of_entries))
    first_seen: dict[str, float] = {}
    for bin_entries in bins_of_entries:
        for e in bin_entries:
            hid, posterior = e["hypothesis_id"], e["posterior"]
            if hid is not None and posterior is not None and hid not in first_seen:
                first_seen[hid] = posterior
    assert out == first_seen

@given(
    hid=st.text(min_size=1, max_size=6, alphabet="abc"),
    first_posterior=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False),
    second_posterior=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=60)
def test_deduped_posteriors_repeat_id_across_bins_keeps_the_earlier_bins_value(hid, first_posterior, second_posterior):
    timeline = _timeline([
        [{"hypothesis_id": hid, "posterior": first_posterior}],
        [{"hypothesis_id": hid, "posterior": second_posterior}],
    ])
    assert paper._deduped_posteriors(timeline) == {hid: first_posterior}

def _run_data(*, n_survivors, robustness_stable_fraction):
    counts = RunCounts(n_survivors=n_survivors, robustness_stable_fraction=robustness_stable_fraction)
    return SimpleNamespace(counts=counts)

@given(n_survivors=st.one_of(st.none(), st.integers(min_value=0, max_value=1000)))
@settings(max_examples=40)
def test_robustness_rows_reads_n_a_when_fraction_is_none(n_survivors):
    row = paper._robustness_rows(_run_data(n_survivors=n_survivors, robustness_stable_fraction=None))
    assert "n/a" in row
    assert paper._fmt(n_survivors or 0) in row

@given(fraction=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False))
@settings(max_examples=40)
def test_robustness_rows_reads_n_a_when_n_survivors_is_zero_or_none(fraction):
    for n_survivors in (None, 0):
        row = paper._robustness_rows(_run_data(n_survivors=n_survivors, robustness_stable_fraction=fraction))
        assert row == "Stable & n/a \\\\\n    Unstable & n/a \\\\\n    Total & 0 \\\\"

@given(
    n_survivors=st.integers(min_value=1, max_value=1000),
    fraction=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=100)
def test_robustness_rows_stable_and_unstable_sum_to_n_survivors(n_survivors, fraction):
    row = paper._robustness_rows(_run_data(n_survivors=n_survivors, robustness_stable_fraction=fraction))
    assert "n/a" not in row
    stable = round(fraction * n_survivors)
    unstable = n_survivors - stable
    assert row == f"Stable & {stable} \\\\\n    Unstable & {unstable} \\\\\n    Total & {n_survivors} \\\\"
