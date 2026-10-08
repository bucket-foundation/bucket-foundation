import json
import sys
from pathlib import Path

import urllib.error

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from kindred import corpus, crossref, mapsvg, openalex, rank
from kindred.claims import ClaimError, load_claims, verify_quotes

HERE = Path(__file__).resolve().parent
CLAIMS = HERE.parent / "claims.json"
THESIS = Path.home() / "agfarms" / "bucket-foundation" / "_intake" / "ideas" / "2026-10-07-founder-voice-notes-frontier-thesis.md"


def test_claims_parse_with_ids_quotes_lines_and_queries():
    claims, source = load_claims(CLAIMS)
    assert 8 <= len(claims) <= 12 and source.endswith("frontier-thesis.md")
    assert len({c["id"] for c in claims}) == len(claims)
    assert all(c["quote"] and c["line"] > 0 and 2 <= len(c["queries"]) <= 5 for c in claims)


def test_claim_file_without_queries_is_rejected(tmp_path):
    bad = tmp_path / "c.json"
    bad.write_text(json.dumps({"claims": [{"id": f"C{i}", "short": "s", "claim": "c", "line": 1, "quote": "q"} for i in range(9)]}))
    with pytest.raises(ClaimError):
        load_claims(bad)


def test_quotes_are_verbatim_on_their_line():
    claims, _ = load_claims(CLAIMS)
    lines = ["x"] * 100
    for c in claims:
        lines[c["line"] - 1] += " prefix " + c["quote"] + " suffix"
    assert verify_quotes(claims, "\n".join(lines)) == []
    same_line = [c["id"] for c in claims if c["line"] == claims[0]["line"]]
    lines[claims[0]["line"] - 1] = "different"
    assert verify_quotes(claims, "\n".join(lines)) == same_line


@pytest.mark.skipif(not THESIS.exists(), reason="founder voice notes live only in the main checkout")
def test_quotes_match_the_founder_notes():
    claims, _ = load_claims(CLAIMS)
    assert verify_quotes(claims, THESIS.read_text(encoding="utf-8")) == []


def test_abstract_reconstruction_orders_words_by_position():
    inverted = {"the": [0, 4], "cat": [1], "sat": [2], "on": [3], "mat": [5]}
    assert openalex.reconstruct_abstract(inverted) == "the cat sat on the mat"
    assert openalex.reconstruct_abstract(None) == ""


def test_strip_url_removes_mailto_and_api_key_only():
    url = "https://api.openalex.org/works?search=ai&mailto=a%40b.org&api_key=SECRET&per-page=25"
    stripped = openalex.strip_url(url)
    assert "mailto" not in stripped and "api_key" not in stripped and "SECRET" not in stripped
    assert "search=ai" in stripped and "per-page=25" in stripped


def test_cache_stores_only_the_stripped_url_and_replays_without_a_request(tmp_path, monkeypatch):
    monkeypatch.setenv("OPENALEX_API_KEY", "SECRETKEY")
    monkeypatch.setenv("OPENALEX_MAILTO", "me@example.org")
    seen = []

    def opener(url):
        seen.append(url)
        return {"results": [{"id": "W1", "doi": "https://doi.org/10.1/x", "title": "T", "publication_year": 2020, "cited_by_count": 3,
                             "authorships": [{"author": {"display_name": "Ada A"}}, {"author": {"display_name": "B B"}}, {"author": {"display_name": "C C"}}, {"author": {"display_name": "D D"}}],
                             "abstract_inverted_index": {"hello": [0], "world": [1]}}]}

    client = openalex.Client(tmp_path, pause=0, opener=opener)
    first = client.search("query words")
    again = client.search("query words")
    assert first == again and len(seen) == 1 and client.spent == 1
    assert "api_key=SECRETKEY" in seen[0]
    stored = "".join(p.read_text() for p in tmp_path.iterdir())
    assert "SECRETKEY" not in stored and "example.org" not in stored
    assert first[0]["authors"] == "Ada A, B B, C C et al." and first[0]["abstract"] == "hello world"


def test_budget_stops_requests(tmp_path):
    client = openalex.Client(tmp_path, budget=1, pause=0, opener=lambda u: {"results": []})
    client.search("a")
    with pytest.raises(RuntimeError):
        client.search("b")


def test_similarity_ranking_on_a_fixture():
    claims = np.array([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]])
    sources = np.array([[0.9, 0.1, 0.0], [0.0, 0.2, 1.0], [0.1, 0.9, 0.0], [1.0, 1.0, 0.0]])
    top = rank.top_sources(claims, sources, k=2)
    assert [j for j, _ in top[0]] == [0, 3] and [j for j, _ in top[1]] == [2, 3]
    assert top[0][0][1] > top[0][1][1]


def test_best_span_picks_the_sentence_closest_to_the_claim():
    def encode(texts):
        return np.array([[float("cats" in t.lower()), float("stars" in t.lower())] + [0.1] for t in texts])

    text = "Stars burn for billions of years in the sky. Cats sleep for sixteen hours each day at home. Rain fell on the town yesterday morning."
    span, sim = rank.best_span(np.array([1.0, 0.0, 0.1]), text, encode)
    assert span.startswith("Cats sleep") and sim > 0.9


def test_article_passages_read_front_matter_and_skip_headings(tmp_path):
    f = tmp_path / "a.md"
    f.write_text("---\ntitle: \"On Minds\"\ndate: 2026-09-22\nauthor: Robert Wright\nurl: https://example.org/p\n---\n\n# On Minds\n\n" + "word " * 40 + "\n\nshort\n")
    got = corpus.article_passages(f)
    assert len(got) == 1 and got[0]["title"] == "On Minds" and got[0]["year"] == "2026" and got[0]["url"] == "https://example.org/p"


def test_transcript_passages_carry_a_timestamped_link(tmp_path):
    d = tmp_path / "abc123-title"
    d.mkdir()
    segs = [{"start": "00:01:05.000", "end": "00:01:09.000", "text": "word " * 60}, {"start": "00:01:10.000", "end": "00:01:15.000", "text": "more " * 60}]
    (d / "transcript.json").write_text(json.dumps(segs))
    got = corpus.transcript_passages(d)
    assert got and got[0]["url"] == "https://youtu.be/abc123?t=65"


def test_pca_and_map_have_horizontal_labels_and_a_boxed_legend():
    rng = np.random.default_rng(1)
    pts = rank.pca2(rng.normal(size=(8, 5)))
    assert pts.shape == (8, 2)
    claims, _ = load_claims(CLAIMS)
    cxy = [tuple(p) for p in rng.normal(size=(len(claims), 2))]
    sources = [{"claim": claims[0]["id"], "xy": (0.1, 0.2), "label": "Ada 2020"}]
    svg = mapsvg.kindred_svg(claims, cxy, sources)
    assert svg.startswith("<svg") and "rotate" not in svg and "transform" not in svg
    assert svg.count("<text") >= len(claims) + 4 and 'fill="none" stroke="#1c2b2d"' in svg


def test_spread_keeps_labels_apart():
    ys = mapsvg.spread([10, 11, 12, 13], 15, 0, 100)
    assert all(b - a >= 15 - 1e-9 for a, b in zip(ys, ys[1:]))


def _http_429(url):
    raise urllib.error.HTTPError(url, 429, "Too Many Requests", {}, None)


def test_crossref_stops_on_429_as_quota_spent(tmp_path):
    from kindred.errors import QuotaSpent

    client = crossref.Client(tmp_path, pause=0)
    client.opener = lambda url: (_ for _ in ()).throw(QuotaSpent("Crossref answered 429"))
    with pytest.raises(QuotaSpent):
        client.search("anything")


def test_crossref_http_429_is_translated(monkeypatch, tmp_path):
    from kindred.errors import QuotaSpent

    def opener(request, timeout=None):
        raise urllib.error.HTTPError(request.full_url, 429, "Too Many Requests", {}, None)

    monkeypatch.setattr(crossref.urllib.request, "urlopen", opener)
    with pytest.raises(QuotaSpent):
        crossref.Client(tmp_path, pause=0).search("anything")


def test_openalex_long_retry_after_is_quota_spent(tmp_path):
    from kindred.errors import QuotaSpent

    class Headers(dict):
        pass

    def opener(url):
        raise urllib.error.HTTPError(url, 429, "x", Headers({"Retry-After": "72000"}), None)

    with pytest.raises(QuotaSpent):
        openalex.Client(tmp_path, pause=0, opener=opener).search("q")


def test_quotes_stay_within_two_hundred_characters_and_one_sentence():
    long = "word " * 80
    for span in corpus.spans(long + ". Short second sentence here today."):
        assert len(span) <= corpus.MAX_QUOTE + 3
    assert len(corpus.spans("A first sentence of enough words. A second sentence of enough words.")) == 2
