import bibtex


def test_cite_key_basic():
    rec = {"authors": [{"family": "Alvarez", "given": "Luis"}], "year": 1980, "title": "The Chicxulub impact"}
    assert bibtex.cite_key(rec) == "alvarez1980chicxulub"


def test_cite_key_stopwords_skipped():
    rec = {"authors": [{"family": "Shannon", "given": "Claude"}], "year": 1948, "title": "A Mathematical Theory of Communication"}
    assert bibtex.cite_key(rec) == "shannon1948mathematical"


def test_bibtex_emits_article():
    rec = {
        "authors": [{"family": "Alvarez", "given": "L"}],
        "year": 1980,
        "title": "Extraterrestrial Cause",
        "venue": {"name": "Science", "publisher": "AAAS"},
        "doi": "10.1126/science.208.4448.1095",
        "canonical_url": "https://doi.org/10.1126/science.208.4448.1095",
        "_crossref_type": "journal-article",
    }
    out = bibtex.to_bibtex(rec)
    assert out.startswith("@article{alvarez1980extraterrestrial,")
    assert "doi = {10.1126/science.208.4448.1095}" in out
    assert "journal = {Science}" in out
    assert out.rstrip().endswith("}")
