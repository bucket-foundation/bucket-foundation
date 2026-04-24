import resolvers


def test_classify_doi():
    assert resolvers.classify_input("10.1126/science.208.4448.1095") == ("doi", "10.1126/science.208.4448.1095")


def test_classify_doi_url():
    assert resolvers.classify_input("https://doi.org/10.1038/nature12373")[0] == "doi"


def test_classify_arxiv_prefix():
    assert resolvers.classify_input("arxiv:2405.14909") == ("arxiv", "2405.14909")


def test_classify_pmid_prefix():
    assert resolvers.classify_input("pmid:17426811") == ("pmid", "17426811")


def test_classify_query():
    kind, _ = resolvers.classify_input("mitochondrial free radical theory of aging")
    assert kind == "query"


def test_normalize_doi_strips_url():
    assert resolvers._normalize_doi("https://doi.org/10.1038/nature12373") == "10.1038/nature12373"


def test_parse_arxiv_atom_minimal():
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/2405.14909v1</id>
    <title>Example Title</title>
    <summary>Abstract.</summary>
    <published>2024-05-23T00:00:00Z</published>
    <author><name>Jane Doe</name></author>
    <author><name>John Roe</name></author>
    <arxiv:doi>10.1234/example</arxiv:doi>
  </entry>
</feed>"""
    rec = resolvers._parse_arxiv_atom(xml)
    assert rec["title"] == "Example Title"
    assert rec["doi"] == "10.1234/example"
    assert rec["authors"] == ["Jane Doe", "John Roe"]
