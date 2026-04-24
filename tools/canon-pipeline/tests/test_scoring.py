import scoring


def test_high_impact_classic():
    rec = {
        "title": "Extraterrestrial Cause for the Cretaceous-Tertiary Extinction",
        "year": 1980,
        "citation_count": 5000,
        "oa_status": {"is_oa": True},
        "venue": {"name": "Science"},
        "_crossref_type": "journal-article",
        "concepts": ["asteroid", "extinction"],
    }
    s, reasons = scoring.score(rec)
    assert s >= 70, (s, reasons)
    assert any("foundational venue" in r for r in reasons)


def test_retracted_penalised():
    rec = {"title": "x", "year": 2020, "citation_count": 0, "_crossref_type": "journal-article", "is_retracted": True, "oa_status": {}}
    s, reasons = scoring.score(rec)
    clean = {**rec, "is_retracted": False}
    s_clean, _ = scoring.score(clean)
    assert s_clean - s == 30
    assert any("retracted" in r for r in reasons)


def test_branch_hints_biophysics():
    rec = {"title": "Mitochondrial membrane protein folding", "concepts": ["cell biology"]}
    hints = scoring.branch_hints(rec)
    assert "05-biophysics" in hints
