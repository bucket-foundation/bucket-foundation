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
    assert atlas.embed_text(n)[1] == "record"
    assert atlas.embed_text(n | {"id": "nope"}) == ("Alpha problem. mathematics. k", "keywords")
    assert atlas.embed_text(n | {"kind": "lean"})[1] == "keywords"


def test_offline_build_from_fixture_records(tmp_path, monkeypatch):
    monkeypatch.setattr(records, "CACHE", tmp_path / "cache")
    a, b = fixture("alpha"), fixture("beta")
    problems = []
    for r in (a, b):
        problems.append({"id": r["id"], "name": r["title"], "branch": r["branch"], "level": r["level"], "lean": r["formal"]["status"], "posed": r["posed"], "resolved": r["resolved"], "keywords": ["shared word", r["id"]], "market": ["ai"], "description": "fallback statement", "formal_source": None, "wikipedia": "", "query": r["title"]})
    titles = [("pubmed", "PMID1", "On the alpha problem of 1900", "pubmed/x"), ("openalex-fanout", "W1", "unrelated", "openalex-fanout/y")]
    built = [records.build(p, problems, titles, offline=True) for p in problems]
    assert [record_schema.errors(r) for r in built] == [[], []]
    assert built[0]["statement"] == {"text": "fallback statement", "source": "descriptions.tsv"}
    assert built[0]["key_works"] == [] and built[0]["activity"]["openalex_total"] == 0 and built[0]["activity"]["arxiv_total"] is None
    assert built[0]["related"][0]["id"] == "beta" and "shared word" in built[0]["related"][0]["why"]
    assert [m["id"] for m in built[0]["repo_mentions"]] == ["PMID1"]
    assert built[0]["sources"] == []
    assert "alpha" in records.index(built) and "beta" in records.index(built)
    assert built == [records.build(p, problems, titles, offline=True) for p in problems]


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
