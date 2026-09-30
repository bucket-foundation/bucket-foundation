from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np
import pytest

from prime_directions import advisors, cli
from prime_directions.corpora import TOOL_REPO_ROOT

FIXTURES = Path(__file__).parent / "fixtures"
PEOPLE = FIXTURES / "people-synthetic.jsonl"
STATEMENT = FIXTURES / "statement-synthetic.md"

def small_model(k: int = 6) -> advisors.AdvisorModel:
    return advisors.fit_people(advisors.load_people(PEOPLE), k=k, min_df=2, max_df=0.9, min_chars=50)

def test_load_people_flattens_and_dedupes(tmp_path: Path):
    path = tmp_path / "p.jsonl"
    path.write_text("\n".join([
        json.dumps({"id": "a", "name": "A", "titles": ["x y", "z"], "topics": [{"name": "t1"}], "field": ["F1", "F2"], "country": "US"}),
        json.dumps({"id": "a", "name": "dup", "titles": ["q"]}),
        "",
        json.dumps({"display_name": "B", "abstracts": "see https://x.org/y and more"}),
    ]))
    people = advisors.load_people(path)
    assert [p.id for p in people] == ["a", "B"]
    assert "x y" in people[0].text and "t1" in people[0].text
    assert people[0].meta["field"] == "F1; F2" and people[0].meta["country"] == "US"
    assert "https" not in people[1].text

def test_load_people_rejects_bad_lines(tmp_path: Path):
    bad = tmp_path / "b.jsonl"
    bad.write_text("{not json}\n")
    with pytest.raises(ValueError, match=":1:"):
        advisors.load_people(bad)
    arr = tmp_path / "a.jsonl"
    arr.write_text("[1, 2]\n")
    with pytest.raises(ValueError):
        advisors.load_people(arr)

def test_fit_rejects_too_few_people():
    people = advisors.load_people(PEOPLE)[:5]
    with pytest.raises(ValueError):
        advisors.fit_people(people, k=6, min_chars=10)

def test_projection_of_a_member_matches_its_fitted_scores():
    model = small_model()
    person = model.people[model.kept[3]]
    projected = model.project([person.text])[0]
    np.testing.assert_allclose(projected, model.result.raw_scores[3], atol=1e-9)
    assert model.result.orthogonality < 1e-8

def test_rank_orders_by_score_and_puts_the_statement_field_first():
    model = small_model()
    rows, qraw, report = advisors.rank(model, STATEMENT.read_text(), top=40)
    assert [r["rank"] for r in rows] == list(range(1, 41))
    assert all(rows[i]["score"] >= rows[i + 1]["score"] for i in range(len(rows) - 1))
    assert all(rows[i]["percentile"] >= rows[i + 1]["percentile"] for i in range(len(rows) - 1))
    assert rows[0]["percentile"] == pytest.approx(100.0)
    assert sum(r["field"] == "Biology" for r in rows[:20]) >= 18
    assert rows[0]["email"].endswith("@example.org")
    assert 1 <= len(rows[0]["shared_terms"].split()) <= 5
    assert report["scoring"] == "whitened" and report["score_spread"]["top1"] == pytest.approx(rows[0]["score"], abs=1e-4)
    raw = model.result.raw_scores
    z, zq = advisors.score_space(raw, qraw, "whitened")
    i = model.result.doc_ids.index(rows[0]["id"])
    assert rows[0]["score"] == pytest.approx(float(advisors.cosine(z[i:i + 1], zq)[0]), abs=1e-4)

@pytest.mark.parametrize("scoring", advisors.SCORINGS)
def test_scoring_spaces(scoring):
    rng = np.random.default_rng(0)
    raw = rng.normal(loc=3, scale=[1, 10, 0.1], size=(50, 3))
    q = raw[0] + 1
    space, qs = advisors.score_space(raw, q, scoring)
    if scoring == "raw":
        assert np.allclose(space, raw) and np.allclose(qs, q)
    else:
        assert np.allclose(space.mean(axis=0), 0)
        assert np.allclose(np.linalg.norm(space - qs, axis=1), np.linalg.norm(space - qs, axis=1))
    if scoring == "whitened":
        assert np.allclose(space.std(axis=0), 1)
    with pytest.raises(ValueError):
        advisors.score_space(raw, q, "nope")

def test_percentile_and_spread():
    v = np.array([0.1, 0.5, 0.3, 0.9])
    assert advisors.percentile_of(v).tolist() == pytest.approx([0, 200 / 3, 100 / 3, 100])
    s = advisors.spread(np.linspace(0, 1, 400))
    assert s["top1"] == 1.0 and s["top1"] > s["top10"] > s["top100"] > s["top300"]
    assert s["gap_top1_top100"] == pytest.approx(s["top1"] - s["top100"])

def test_cosine_handles_zero_vectors():
    out = advisors.cosine(np.array([[0.0, 0.0], [1.0, 0.0]]), np.array([1.0, 0.0]))
    assert out.tolist() == [0.0, 1.0]
    assert advisors.cosine(np.array([[1.0, 0.0]]), np.zeros(2)).tolist() == [0.0]

def test_unit_vectors_make_l2_rank_match_cosine_rank():
    rng = np.random.default_rng(3)
    a = rng.normal(size=(200, 5))
    q = rng.normal(size=5)
    by_cos = np.argsort(-advisors.cosine(a, q))[:20]
    by_l2 = np.argsort(np.linalg.norm(advisors.unit(a) - advisors.unit(q), axis=1))[:20]
    assert by_cos.tolist() == by_l2.tolist()

def test_index_benchmark_exact_and_indexed_agree():
    model = small_model()
    _, qraw, _ = advisors.rank(model, STATEMENT.read_text(), top=5)
    space, qs = advisors.score_space(model.result.raw_scores, qraw, "whitened")
    rows = advisors.index_benchmark(space, np.vstack([qs, space[:20]]), k=10)
    assert {r["backend"] for r in rows} == {"brute", "kdtree", "hnsw"}
    assert all(r["tie_aware_recall"] >= 0.99 for r in rows)

def test_page_inlines_image_and_escapes_data(tmp_path: Path):
    png = tmp_path / "p.png"
    png.write_bytes(b"\x89PNG\r\n\x1a\nfake")
    rows = [{"rank": 1, "score": 0.9, "percentile": 100.0, "id": "x", "name": "</script><script>alert(1)</script>",
             "institution": "I <!-- x", "field": "Bio", "country": "US", "shared_terms": "cell"}]
    ctx = {"key": "k", "summary": "s", "method": "m", "plot": "p", "spread": {"top1": 1, "top10": 1, "top100": 1, "top300": 1, "median": 0}}
    page = advisors.write_page(rows, png, ctx, tmp_path / "i.html").read_text()
    assert 'src="data:image/png;base64,' in page and "pca.png" not in page
    data = page.split('<script id="data" type="application/json">', 1)[1].split("</script>", 1)[0]
    assert "</" not in data and "<!--" not in data
    assert json.loads(data)["rows"][0]["name"] == "</script><script>alert(1)</script>"
    assert "innerHTML" not in page

def test_cli_advisor_review_writes_private_outputs(tmp_path: Path, monkeypatch, capsys):
    monkeypatch.setenv("PRIME_DATA_ROOT", str(tmp_path / "data"))
    out = tmp_path / "review"
    code = cli.main(["advisor-review", "--people", str(PEOPLE), "--query", str(STATEMENT), "--out", str(out),
                     "--k", "6", "--top", "30", "--label", "5", "--min-df", "2", "--max-df", "0.9", "--min-chars", "50"])
    assert code == 0
    for name in ("ranked.csv", "pca.png", "index.html", "report.json"):
        assert (out / name).exists()
    with open(out / "ranked.csv") as f:
        rows = list(csv.DictReader(f))
    assert len(rows) == 30 and rows[0]["rank"] == "1"
    report = json.loads((out / "report.json").read_text())
    assert report["fitted"] == 160 and len(report["statement_scores"]) == 6
    assert report["plot"]["components"][0] != report["plot"]["components"][1]
    assert "pca.png" not in (out / "index.html").read_text()
    assert "xdg-open" in capsys.readouterr().out

def test_cli_advisor_review_refuses_repo_output():
    code = cli.main(["advisor-review", "--people", str(PEOPLE), "--query", str(STATEMENT),
                     "--out", str(TOOL_REPO_ROOT / "tools" / "advisor-out")])
    assert code == 2

def test_load_people_skips_a_partial_last_line_while_the_file_is_written(tmp_path: Path):
    path = tmp_path / "p.jsonl"
    path.write_text(json.dumps({"id": "a", "titles": ["x"]}) + "\n" + '{"id": "b", "tit')
    assert [p.id for p in advisors.load_people(path)] == ["a"]
    with pytest.raises(ValueError):
        advisors.load_people(path, allow_partial_tail=False)
    path.write_text('{"id": "b", "tit\n' + json.dumps({"id": "a"}) + "\n")
    with pytest.raises(ValueError):
        advisors.load_people(path)

def test_cli_min_rows_gate_and_watch_reruns_on_growth(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("PRIME_DATA_ROOT", str(tmp_path / "data"))
    rows = PEOPLE.read_text().splitlines()
    people = tmp_path / "people.jsonl"
    people.write_text("\n".join(rows[:40]) + "\n")
    base = ["advisor-review", "--people", str(people), "--query", str(STATEMENT), "--out", str(tmp_path / "o"),
            "--k", "4", "--top", "10", "--label", "3", "--min-df", "2", "--max-df", "0.9", "--min-chars", "50"]
    assert cli.main(base + ["--min-rows", "100"]) == 3
    assert not (tmp_path / "o" / "ranked.csv").exists()
    sleeps = []

    def grow(seconds):
        sleeps.append(seconds)
        people.write_text("\n".join(rows[: 40 + 60 * len(sleeps)]) + "\n")

    monkeypatch.setattr(cli.time, "sleep", grow)
    assert cli.main(base + ["--min-rows", "100", "--watch", "0.01", "--max-runs", "2"]) == 0
    report = json.loads((tmp_path / "o" / "report.json").read_text())
    assert report["people"] == 160

def test_nested_topic_records_feed_text_and_filters(tmp_path: Path):
    path = tmp_path / "p.jsonl"
    rec = {
        "id": "A1", "name": "N", "country": "US", "h_index": 12, "sources": ["cockpit", "stevens"],
        "author_topics": [{"count": 3, "field": "Physics", "name": "Quantum optics"},
                          {"count": 9, "field": "Biology", "name": "Mitochondrial membranes"}],
        "cockpit": {"interests_matched": "bioenergetics", "tier": "C"},
        "funding": {"active": True, "recent_grants": [{"title": "Proton gradients", "funder_source": "nsf"}]},
        "atlas_topics": None, "works": [],
    }
    path.write_text(json.dumps(rec) + "\n")
    person = advisors.load_people(path)[0]
    for word in ("Quantum optics", "Mitochondrial membranes", "bioenergetics", "Proton gradients"):
        assert word in person.text
    assert "nsf" not in person.text and "tier" not in person.text
    assert person.meta["field"] == "Biology" and person.meta["funding"] == "active grant"
    assert person.meta["sources"] == "cockpit; stevens"
    assert advisors.derive_funding({"active": False}) == "past grants"
    assert advisors.derive_field({"atlas_topics": {"primary_field": "Math"}}) == "Math"

def test_statement_body_stops_at_references():
    text = "# T\nbody line\n## References\n[1] cited"
    assert advisors.statement_body(text) == "# T\nbody line"
    assert advisors.statement_body("no refs") == "no refs"

def test_diversify_caps_institutions_in_the_window_and_keeps_everyone():
    rows = [{"id": str(i), "institution": "A" if i < 8 else f"B{i}"} for i in range(20)]
    out = advisors.diversify(rows, cap=5, window=10)
    assert sorted(r["id"] for r in out) == sorted(r["id"] for r in rows)
    head = out[:10]
    assert sum(r["institution"] == "A" for r in head) == 5
    assert [r["id"] for r in head[:5]] == ["0", "1", "2", "3", "4"]
    assert [r["id"] for r in out[10:13]] == ["5", "6", "7"]
    assert advisors.diversify(rows, cap=50, window=10) == rows

def test_institution_mix_and_sources():
    rows = [{"institution": "S", "sources": "stevens"}] * 3 + [{"institution": "T", "sources": "cockpit; stevens"}, {"institution": "U", "sources": "cockpit"}]
    mix = advisors.institution_mix(rows, n=5)
    assert mix["institutions"] == 3 and mix["largest_share"] == 0.6 and mix["stevens_share"] == 0.8
    assert mix["top"][0] == {"institution": "S", "count": 3}
    assert advisors.is_source(rows[3], "stevens") and not advisors.is_source(rows[4], "stevens")

def test_write_csv_neutralizes_formula_cells(tmp_path: Path):
    rows = [{"name": "=HYPERLINK(1)", "institution": "+x", "field": "-y", "department": "@z", "score": -0.5, "topics": ["a", "=b"], "ok": "plain"}]
    path = advisors.write_csv(rows, tmp_path / "r.csv")
    with open(path) as f:
        out = next(csv.DictReader(f))
    assert out["name"] == "'=HYPERLINK(1)" and out["institution"] == "'+x" and out["field"] == "'-y" and out["department"] == "'@z"
    assert out["score"] == "-0.5" and out["topics"] == "a; =b" and out["ok"] == "plain"


def test_direction_profiles_give_bounded_stars_and_labels():
    model = small_model()
    query = advisors.statement_body(STATEMENT.read_text())
    rows, _, _ = advisors.rank(model, query, top=None)
    dirs = [("alpha", "protein folding energy landscape"), ("beta", "graph learning agents discovery")]
    ctx = advisors.direction_profiles(model, rows, query, dirs)
    assert len(ctx["prime_axes"]) == 6 and all(ctx["prime_axes"])
    assert ctx["our_axes"] == ["alpha", "beta"] and len(ctx["star_ref_ours"]) == 2
    assert all(0 <= v <= 1 for v in ctx["star_query_prime"])
    for r in rows:
        assert len(r["star_prime"]) == 6 and all(0 <= v <= 1 for v in r["star_prime"])
        assert len(r["star_ours"]) == 2 and all(0 <= v <= 1 for v in r["star_ours"])


def test_direction_profiles_without_directions_skip_our_star():
    model = small_model()
    query = advisors.statement_body(STATEMENT.read_text())
    rows, _, _ = advisors.rank(model, query, top=None)
    ctx = advisors.direction_profiles(model, rows, query, [])
    assert "our_axes" not in ctx and all("star_ours" not in r for r in rows)


def test_load_directions_skips_header_and_blank(tmp_path: Path):
    f = tmp_path / "d.tsv"
    f.write_text("label\ttext\nalpha\tsome words\n\nbeta\tmore words\n")
    assert advisors.load_directions(f) == [("alpha", "some words"), ("beta", "more words")]
    assert advisors.load_directions(None) == []


def test_page_carries_panel_timeline_and_direction_filters(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("PRIME_DATA_ROOT", str(tmp_path / "data"))
    d = tmp_path / "dirs.tsv"
    d.write_text("alpha\tprotein folding\nbeta\tgraph learning agents\n")
    out = tmp_path / "review"
    code = cli.main(["advisor-review", "--people", str(PEOPLE), "--query", str(STATEMENT), "--out", str(out), "--directions", str(d),
                     "--k", "6", "--top", "30", "--label", "5", "--min-df", "2", "--max-df", "0.9", "--min-chars", "50"])
    assert code == 0
    page = (out / "index.html").read_text()
    for hook in ('id="panel"', 'id="tl"', 'id="dirs"', '"prime_axes"', '"our_axes"', '"star_prime"', '"star_ours"'):
        assert hook in page


def test_email_public_only_for_public_sources_and_publishable_strips(tmp_path: Path):
    lines = PEOPLE.read_text().splitlines()
    a, b = json.loads(lines[0]), json.loads(lines[1])
    a.update(email="a@example.edu", email_source="official_directory")
    b.update(email="b@example.edu", email_source="scraped")
    f = tmp_path / "p.jsonl"
    f.write_text("\n".join([json.dumps(a), json.dumps(b)] + lines[2:]) + "\n")
    model = advisors.fit_people(advisors.load_people(f), k=6, min_df=2, max_df=0.9, min_chars=50)
    rows, _, _ = advisors.rank(model, advisors.statement_body(STATEMENT.read_text()), top=None)
    by = {r["email"]: r for r in rows if r["email"]}
    assert by["a@example.edu"]["email_public"] is True and by["b@example.edu"]["email_public"] is False
    assert all(r["email"] == "" and r["email_public"] is False for r in advisors.publishable_rows(rows))


def test_our_directions_are_percentiles_among_everyone_and_the_statement_is_placed_on_them():
    model = small_model()
    query = advisors.statement_body(STATEMENT.read_text())
    rows, _, _ = advisors.rank(model, query, top=None)
    dirs = [("alpha", "protein folding energy landscape"), ("beta", "graph learning agents discovery")]
    ctx = advisors.direction_profiles(model, rows, query, dirs)
    ours = np.array([r["star_ours"] for r in rows])
    assert ours.max(axis=0).tolist() == [1.0, 1.0]
    assert ours.min(axis=0).tolist() == [0.0, 0.0]
    assert np.all(np.abs(np.median(ours, axis=0) - 0.5) < 0.15)
    q = ctx["star_query_ours"]
    assert len(q) == 2 and all(0 <= v <= 1 for v in q)
    same = advisors.direction_profiles(model, rows, query, [("alpha", query), ("beta", query)])
    assert all(v >= 0.95 for v in same["star_query_ours"])
