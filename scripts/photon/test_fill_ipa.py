import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fill_ipa import edit_distance, normalize, parse_json, valid_llm_ipa


def test_normalize_drops_stress_brackets_and_alternates():
    assert normalize("/ˈpe.ro/, /ˈpe.ɾo/") == "pero"
    assert normalize("[ɡato]") == "gato"


def test_edit_distance_counts_phone_edits():
    assert edit_distance(list("pero"), list("pero")) == 0
    assert edit_distance(["p", "e", "r", "o"], ["p", "e", "ɾ", "o"]) == 1
    assert edit_distance([], list("ab")) == 2


def test_valid_llm_ipa_wraps_and_rejects():
    assert valid_llm_ipa("ˈpe.ro") == "/ˈpe.ro/"
    assert valid_llm_ipa("/ˈpe.ro/") == "/ˈpe.ro/"
    assert valid_llm_ipa(None) is None
    assert valid_llm_ipa("PERO") is None


def test_parse_json_finds_object_in_noise():
    assert parse_json('ok {"a": "/a/"} done') == {"a": "/a/"}
    assert parse_json("no json") == {}


def test_manifest_matches_shipped_file():
    import gzip
    import hashlib
    import json

    from fill_ipa import MANIFEST, SHIPPED, load
    from fill_thin_langs import READING_COL, coverage

    manifest = json.load(open(MANIFEST))
    assert hashlib.sha256(open(SHIPPED, "rb").read()).hexdigest() == manifest["shipped_sha256"]
    rows = load(SHIPPED)
    assert all(len(r) == READING_COL + 1 for r in json.loads(gzip.open(SHIPPED).read()))
    assert coverage(rows) == manifest["thin_langs"]["after"]
    for r in rows:
        assert (r[5] is None) == (r[9] is None)
    for lang, v in manifest["after"].items():
        if v["epitran"]:
            assert manifest["epitran_validation"][lang]["ship"]
        if v["llm"]:
            assert manifest["llm_validation"][lang]["ship"]
