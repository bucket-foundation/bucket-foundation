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

def test_rank_orders_by_cosine_and_puts_the_statement_field_first():
    model = small_model()
    rows, qvec = advisors.rank(model, STATEMENT.read_text(), top=40)
    assert [r["rank_cosine"] for r in rows] == list(range(1, 41))
    assert all(rows[i]["cosine"] >= rows[i + 1]["cosine"] for i in range(len(rows) - 1))
    assert sum(r["field"] == "Biology" for r in rows[:20]) >= 18
    assert rows[0]["email"].endswith("@example.org") and rows[0]["shared_terms"]
    best = rows[0]
    scores = model.result.raw_scores
    i = model.result.doc_ids.index(best["id"])
    assert best["euclidean"] == pytest.approx(float(np.linalg.norm(scores[i] - qvec)), abs=1e-4)

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
    _, qvec = advisors.rank(model, STATEMENT.read_text(), top=5)
    rows = advisors.index_benchmark(model, np.vstack([qvec, model.result.raw_scores[:20]]), k=10)
    assert {r["backend"] for r in rows} == {"brute", "kdtree", "hnsw"}
    assert all(r["tie_aware_recall"] >= 0.99 for r in rows)

def test_page_escapes_and_embeds_filters(tmp_path: Path):
    rows = [{"rank_cosine": 1, "rank_euclidean": 1, "cosine": 0.9, "euclidean": 0.1, "id": "x",
             "name": "<script>alert(1)</script>", "field": "Bio", "country": "US", "funding": "",
             "institution": "Inst </script>", "taking_students": "", "email": "a@b.c", "shared_terms": "cell"}]
    page = advisors.write_page(rows, "pca.png", "summary & more", tmp_path / "i.html").read_text()
    assert "<script>alert(1)</script>" not in page
    assert "<\\/script>" in page
    assert 'id="f-field"' in page and 'id="f-country"' in page and 'id="f-funding"' not in page
    assert "summary &amp; more" in page

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
    assert len(rows) == 30 and rows[0]["rank_cosine"] == "1"
    report = json.loads((out / "report.json").read_text())
    assert report["fitted"] == 160 and len(report["statement_scores"]) == 6
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
