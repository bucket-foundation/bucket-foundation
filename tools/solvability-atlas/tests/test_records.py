import copy
import json
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent))
import atlas
import record_schema
import records

FIXTURES = HERE / "fixtures"


def fixture(name):
    return json.load(open(FIXTURES / f"{name}.json"))


def test_fixtures_validate():
    for name in ("alpha", "beta"):
        assert record_schema.errors(fixture(name)) == []


def test_validator_names_each_fault():
    r = fixture("alpha")
    bad = copy.deepcopy(r)
    bad["key_works"][0]["role"] = "guess"
    bad["resolved"] = r["posed"] - 1
    bad["statement"] = {"text": "x", "source": None}
    bad["related"].append({"id": r["id"], "why": "self"})
    bad["activity"]["openalex_by_year"]["year"] = 1
    e = record_schema.errors(bad)
    assert any("role guess" in m for m in e)
    assert "resolved before posed" in e
    assert "statement text without source" in e
    assert any("points at itself" in m for m in e)
    assert any("activity year" in m for m in e)
    with pytest.raises(ValueError):
        record_schema.validate(bad)
    assert record_schema.errors({}) and record_schema.errors("x") == ["record is not an object"]


def test_record_text_holds_statement_aliases_and_titles_without_branch():
    r = fixture("alpha")
    n = {"id": r["id"], "name": r["title"], "branch": r["branch"], "keywords": ["alpha word", "beta word"], "kind": "problem"}
    text = atlas.record_text(n, r)
    assert text.startswith(r["title"] + ".")
    assert r["statement"]["text"] in text
    assert r["aliases"][0] in text
    assert r["key_works"][0]["title"] in text
    assert "alpha word" in text
    assert "mathematics" not in text.split(r["statement"]["text"])[0].replace("Also called", "")
    assert atlas.keyword_text(n) == "Alpha problem. mathematics. alpha word, beta word"


def test_embed_text_falls_back_to_keywords(monkeypatch):
    monkeypatch.setattr(atlas, "RECORDS", FIXTURES)
    n = {"id": "alpha", "name": "Alpha problem", "branch": "mathematics", "keywords": ["k"], "kind": "problem"}
    assert atlas.embed_text(n, "statement_titles_aliases")[1] == "statement_titles_aliases"
    assert atlas.embed_text(n | {"id": "nope"}, "statement") == ("Alpha problem. mathematics. k", "keywords")
    assert atlas.embed_text(n | {"kind": "lean"}, "statement_titles")[1] == "keywords"
    assert atlas.embed_text(n, "keywords") == ("Alpha problem. mathematics. k", "keywords")
    assert atlas.DEFAULT_TEXT in atlas.TEXT_VARIANTS
    with pytest.raises(ValueError):
        atlas.embed_text(n, "nope")


def test_text_variants_add_parts_in_order():
    r = fixture("alpha")
    n = {"id": r["id"], "name": r["title"], "branch": r["branch"], "keywords": ["k"], "kind": "problem"}
    st = atlas.record_text(n, r, "statement")
    tt = atlas.record_text(n, r, "statement_titles")
    al = atlas.record_text(n, r, "statement_titles_aliases")
    assert r["statement"]["text"] in st and "Key works" not in st and "Also called" not in st
    assert "Key works" in tt and "Also called" not in tt
    assert "Key works" in al and "Also called" in al


def test_pair_hits_scores_expected_neighbours():
    import numpy as np
    ids = ["a", "b", "c", "d"]
    emb = atlas.unit(np.array([[1, 0, 0], [0.9, 0.1, 0], [0, 1, 0], [0, 0.2, 1.0]]))
    res = atlas.pair_hits(ids, emb, pairs=[("a", "b"), ("a", "d"), ("x", "a")], k=1)
    assert res["hits"] == 1 and res["hit_pairs"] == [("a", "b")] and res["missed"] == [("a", "d"), ("x", "a")]
    assert atlas.neighbours(ids, emb, k=1)["a"] == {"b"}


def test_offline_build_from_fixture_records(tmp_path, monkeypatch):
    monkeypatch.setattr(records, "CACHE", tmp_path / "cache")
    a, b = fixture("alpha"), fixture("beta")
    problems = []
    for r in (a, b):
        problems.append({"id": r["id"], "name": r["title"], "branch": r["branch"], "level": r["level"], "lean": r["formal"]["status"], "posed": r["posed"], "resolved": r["resolved"], "keywords": ["shared word", r["id"]], "market": ["ai"], "description": "fallback statement", "formal_source": None, "wikipedia": "", "query": r["title"]})
    titles = [("pubmed", "PMID1", "On the alpha problem of 1900", "pubmed/x"), ("openalex-fanout", "W1", "unrelated", "openalex-fanout/y")]
    built = [records.build(p, problems, titles, offline=True) for p in problems]
    assert [record_schema.errors(r) for r in built] == [[], []]
    assert built[0]["statement"]["text"] == "fallback statement" and built[0]["statement"]["source"] == "descriptions.tsv"
    assert built[0]["statement"]["licence"] and built[0]["statement"]["attribution"]["url"]
    assert built[0]["quality"]["status"] == "empty" and built[0]["key_works_considered"] == 0 and built[0]["key_works_dropped"] == {}
    assert built[0]["key_works"] == [] and built[0]["activity"]["openalex_total"] == 0 and built[0]["activity"]["arxiv_total"] is None
    assert built[0]["related"][0]["id"] == "beta" and "shared word" in built[0]["related"][0]["why"]
    assert [m["id"] for m in built[0]["repo_mentions"]] == ["PMID1"]
    assert built[0]["sources"] == []
    assert "alpha" in records.index(built) and "| empty |" in records.index(built)
    assert built == [records.build(p, problems, titles, offline=True) for p in problems]


def problem(pid, branch, markets, keywords, query):
    return {"id": pid, "name": pid, "branch": branch, "level": 5, "lean": "none", "posed": 1850, "resolved": None, "keywords": keywords, "market": markets, "description": "", "formal_source": None, "wikipedia": "", "query": query}


WORKS = json.load(open(FIXTURES / "openalex_works.json"))


def test_name_hit_overrides_field_and_problem_words_rescue_abstract_hits():
    cases = [("turbulence", "physics", ["fluid dynamics"], "turbulence closure", "On entropy method of turbulence closure problem", "Economics, Econometrics and Finance"),
             ("hodge", "mathematics", ["algebraic cycles"], "Hodge conjecture", "The Millennium Prize Problems", "Computer Science"),
             ("poincare", "mathematics", ["3-manifold"], "Poincaré conjecture", "Some Open Problems and Research Directions", "Mathematics"),
             ("geomlanglands", "mathematics", ["D-modules"], "geometric Langlands", "On De Jong's conjecture", "Mathematics"),
             ("halting", "information", ["Turing machine"], "halting problem", "Bounded Quantification Is Undecidable", "Computer Science")]
    for pid, branch, kws, query, title, field in cases:
        p = problem(pid, branch, [], kws, query)
        w = {"id": "https://openalex.org/W1", "title": title, "publication_year": 2000, "cited_by_count": 5, "primary_topic": {"display_name": "x", "field": {"display_name": field}, "subfield": {"display_name": "y"}}}
        assert [x["title"] for x in records.key_works([w], p, "src")] == [title], pid
    off = {"id": "https://openalex.org/W2", "title": "Random Matrix Theory and Wireless Communications", "publication_year": 2004, "cited_by_count": 2125, "primary_topic": {"display_name": "Random Matrices", "field": {"display_name": "Mathematics"}, "subfield": {"display_name": "Statistics"}}}
    kept, dropped = records.select_works([off, dict(off, id="https://openalex.org/W3")], problem("riemann", "mathematics", [], ["zeta function"], "Riemann hypothesis"), [])
    assert kept == [] and dropped == {"no keyword hit": 1, "duplicate": 1}


def test_key_work_filter_drops_off_topic_and_uncited_works():
    riemann = problem("riemann", "mathematics", ["cryptography"], ["zeta function", "nontrivial zeros", "prime distribution", "critical line", "analytic number theory"], "Riemann hypothesis")
    kept = records.key_works(WORKS["riemann"], riemann, "src", ["Riemann hypothesis"])
    assert [w["title"] for w in kept] == ["The Theory of the Riemann Zeta-Function", "Riemann's hypothesis and tests for primality"]
    assert all(w["in_embedding"] for w in kept) and kept[0]["relevance"] >= kept[1]["relevance"]
    navier = problem("navier", "physics", ["aerospace"], ["fluid dynamics", "blow-up", "regularity", "PDE", "turbulence", "energy estimate"], "Navier-Stokes existence")
    kept = records.key_works(WORKS["navier"], navier, "src", [])
    assert [w["openalex"] for w in kept] == ["W7"]
    dark = problem("darkmatter", "cosmology", [], ["rotation curves", "WIMP", "axion", "galaxy clusters", "lensing"], "dark matter")
    kept = records.key_works(WORKS["darkmatter"], dark, "src", [])
    assert [w["openalex"] for w in kept] == ["W10"]
    assert records.industries(dark, [w for _, w in records.select_works(WORKS["darkmatter"], dark, [])[0]]) == []


def test_key_works_dedupe_and_embedding_cap():
    p = problem("alpha", "mathematics", [], ["alpha word"], "alpha")
    works = [{"id": f"https://openalex.org/W{i}", "title": "Alpha word paper" if i < 12 else f"Alpha word paper {i}", "publication_year": 2000, "cited_by_count": 100 - i, "primary_topic": {"field": {"display_name": "Mathematics"}}} for i in range(20)]
    kept = records.key_works(works, p, "src")
    assert len(kept) == 9 and sum(w["in_embedding"] for w in kept) == records.EMBED_WORKS
    assert len({w["title"] for w in kept}) == len(kept)


def test_industries_need_three_works_and_merge_synonyms():
    p = problem("pnp", "information", ["ai", "cryptography"], ["complexity class"], "P versus NP")
    sub = lambda name: {"primary_topic": {"subfield": {"display_name": name}}}
    kept = [sub("Artificial Intelligence")] * 3 + [sub("Emergency Medicine")] + [sub("Computational Theory and Mathematics")] * 2
    assert records.industries(p, kept) == ["ai", "cryptography"]
    assert records.industries(p, kept + [sub("Computational Theory and Mathematics")]) == ["ai", "cryptography", "computational theory and mathematics"]


def test_strip_mailto_and_cache_key():
    url = "https://api.openalex.org/works?filter=x&mailto=a%40b.c&sort=y"
    assert records.strip_mailto(url) == "https://api.openalex.org/works?filter=x&sort=y"
    assert records.cache_path(records.strip_mailto(url)).name == records.cache_path("https://api.openalex.org/works?filter=x&sort=y").name
    assert "mailto" not in records.strip_mailto(url)


def test_neighbour_shift_counts_changed_slots():
    import numpy as np
    rng = np.random.default_rng(1)
    a = atlas.unit(rng.normal(size=(10, 6)))
    ids = [str(i) for i in range(10)]
    same = atlas.neighbour_shift(ids, a, a.copy(), k=3)
    assert same["changed_edges"] == 0 and same["problems_with_change"] == 0 and same["possible_edges"] == 30
    moved = atlas.neighbour_shift(ids, a, atlas.unit(rng.normal(size=(10, 6))), k=3)
    assert 0 < moved["changed_edges"] <= 30 and moved["rows"][0]["changed"] >= moved["rows"][-1]["changed"]
    assert all(len(r["left"]) == len(r["entered"]) == r["changed"] for r in moved["rows"])


def test_roles_and_history_pairing():
    p = {"posed": 1900, "resolved": 1950}
    assert records.role_of({"title": "A survey of alpha", "publication_year": 1990}, p) == "survey"
    assert records.role_of({"title": "Proof", "publication_year": 1951}, p) == "resolved"
    assert records.role_of({"title": "Note", "publication_year": 1903}, p) == "posed"
    assert records.role_of({"title": "Step", "publication_year": 1930}, p) == "partial"
    rows = [("Conjectured by", "A. Person"), ("Conjectured in", "1900"), ("First proof in", "1950"), ("Field", "Topology, 1900s")]
    h = records.history({"posed": 1900, "resolved": 1950}, rows, "https://en.wikipedia.org/wiki/Alpha")
    assert [e["event"] for e in h] == ["conjectured by A. Person", "posed", "first proof in: 1950", "resolved"]
    assert all(e["source"] for e in h)


def test_infobox_and_lead_parsing():
    page = '<p id="x"><b>Alpha problem</b> (also <b>alpha conjecture</b>) is open.</p><table class="infobox vevent"><tr><th>Conjectured by</th><td><a>Someone</a></td></tr><tr><th>Conjectured in</th><td>1900<sup>[1]</sup></td></tr></table>'
    assert records.infobox(page) == [("Conjectured by", "Someone"), ("Conjectured in", "1900")]
    assert records.lead_aliases(page) == ["Alpha problem", "alpha conjecture"]
    assert records.infobox("<p>none</p>") == [] and records.lead_aliases("<p>none</p>") == []
