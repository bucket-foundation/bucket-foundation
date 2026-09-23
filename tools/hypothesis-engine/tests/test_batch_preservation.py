from hte import batching, roles
from hte.corpus import fixtures as fixtures_corpus
from hte.generate import combinatorial_sample

def _hyps(n):
    corpus = fixtures_corpus.build()
    return combinatorial_sample(corpus.vocab, [0], max_items=n, seed=0)[:n]

def test_batch_preservation_maps_entries_by_id_and_falls_back_per_missing_id(monkeypatch):
    hyps = _hyps(3)
    seen_prompts = []

    def fake_complete(prompt, *, role, schema, cache_dir, replay_only):
        seen_prompts.append(prompt)
        assert role == "preservation_critic" and schema is batching.PRESERVATION_BATCH_SCHEMA
        return {"results": [
            {"id": hyps[0].short_id, "expected_evidence": ["a plate"], "could_have_survived": True,
             "detectability_adjustment": 1.4, "rationale": "batched"},
            {"id": hyps[2].short_id, "expected_evidence": [], "could_have_survived": False,
             "detectability_adjustment": 0.2, "rationale": "batched"},
        ]}

    monkeypatch.setattr(batching.llm, "complete", fake_complete)
    fallbacks = []
    monkeypatch.setattr(roles, "preservation_critique", lambda h, table, **k: fallbacks.append(h.short_id) or {
        "expected_evidence": [], "could_have_survived": True, "detectability_adjustment": 0.5, "rationale": "single"})
    out = batching.batch_preservation(hyps, {("p", "k"): 0.7}, period="p", batch_size=8, cache_dir="x")
    assert [o["rationale"] for o in out] == ["batched", "single", "batched"]
    assert out[0]["detectability_adjustment"] == 1.0 and out[2]["could_have_survived"] is False
    assert fallbacks == [hyps[1].short_id]
    assert len(seen_prompts) == 1 and "id=" + hyps[1].short_id in seen_prompts[0] and "p, k" in seen_prompts[0] or "('p', 'k')" in seen_prompts[0]

def test_batch_preservation_fake_mode_falls_back_to_the_single_stand_in(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    hyps = _hyps(2)
    out = batching.batch_preservation(hyps, {}, batch_size=8, cache_dir="x")
    assert [o["detectability_adjustment"] for o in out] == [0.5, 0.5]
