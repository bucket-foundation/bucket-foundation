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
