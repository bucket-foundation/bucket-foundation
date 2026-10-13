from __future__ import annotations

import json
from pathlib import Path

from prime_directions import ror
from prime_directions.advisors import Person

def org(rid, name, country, related=()):
    return {
        "id": f"https://ror.org/{rid}",
        "names": [{"value": name, "types": ["ror_display", "label"]}],
        "locations": [{"geonames_details": {"country_code": country}}],
        "relationships": [{"id": f"https://ror.org/{r}", "type": "child"} for r in related],
    }

ORGS = {
    "cmu": org("cmu", "Carnegie Mellon University", "US"),
    "csiro": org("csiro", "CSIRO", "AU"),
    "osu": org("osu", "The Ohio State University", "US", related=("osuw",)),
    "osuw": org("osuw", "Ohio State Wexner Medical Center", "US", related=("osu",)),
    "uw": org("uw", "University of Washington", "US"),
    "cifar": org("cifar", "Canadian Institute for Advanced Research", "CA"),
}
MATCH = {"carnegie mellon university": "cmu", "the ohio state university": "osu", "canadian institute for advanced research": "cifar"}

class FakeFetch:
    def __init__(self):
        self.calls = []

    def __call__(self, url):
        self.calls.append(url)
        if "affiliation=" in url:
            name = url.split("affiliation=", 1)[1]
            from urllib.parse import unquote

            key = MATCH.get(unquote(name).lower())
            items = [{"chosen": True, "organization": ORGS[key]}] if key else [{"chosen": False, "organization": ORGS["uw"]}]
            return {"items": items}
        rid = url.rsplit("/", 1)[-1]
        if rid not in ORGS:
            raise OSError("404")
        return ORGS[rid]

def client(tmp_path: Path, fetch=None) -> ror.RorClient:
    return ror.RorClient(tmp_path / "ror.json", fetch=fetch or FakeFetch(), pause=0)

def test_parse_reads_display_name_country_and_relations():
    o = ror.parse(ORGS["osu"])
    assert o == ror.Org("osu", "The Ohio State University", "US", frozenset({"osuw"}))

def test_check_flags_name_based_mismatch_and_fixes_country(tmp_path: Path):
    c = client(tmp_path)
    wrong = {"institution": "Carnegie Mellon University", "ror": "csiro", "country": "AU", "resolution": "tracker-autocomplete-dominant-name"}
    assert ror.check(wrong, c) == {"country_listed": "US", "listed_ror": "cmu", "identity": "check", "profile_institution": "CSIRO"}
    related = {"institution": "The Ohio State University", "ror": "osuw", "resolution": "cockpit-openalex-url"}
    assert ror.check(related, c)["identity"] == "match"
    moved = {"institution": "Canadian Institute for Advanced Research", "ror": "uw", "resolution": "cockpit-openalex-url"}
    assert ror.check(moved, c)["identity"] == "moved"
    unknown = {"institution": "Nowhere Lab", "ror": "cmu"}
    assert ror.check(unknown, c)["identity"] == "unknown"

def test_validate_updates_meta_and_caches(tmp_path: Path):
    fetch = FakeFetch()
    c = client(tmp_path, fetch)
    people = [Person("a", "A", "t", {"institution": "Carnegie Mellon University", "ror": "csiro", "country": "AU",
                                     "resolution": "tracker-autocomplete"}),
              Person("b", "B", "t", {"institution": "Carnegie Mellon University", "ror": "cmu", "country": "US"})]
    report = ror.validate(people, c)
    assert people[0].meta["country"] == "US" and people[0].meta["country_profile"] == "AU"
    assert people[0].meta["identity"] == "check" and people[1].meta["identity"] == "match"
    assert report == {"identity": {"check": 1, "match": 1}, "country_corrected": 1, "lookup_failures": 0}
    calls = len(fetch.calls)
    again = ror.RorClient(tmp_path / "ror.json", fetch=fetch, pause=0)
    ror.validate(people, again)
    assert len(fetch.calls) == calls
    assert json.loads((tmp_path / "ror.json").read_text())["matches"]["carnegie mellon university"]["id"].endswith("cmu")

def test_lookup_failures_are_counted_and_offline_skips_network(tmp_path: Path):
    fetch = FakeFetch()
    c = client(tmp_path, fetch)
    assert c.org("missing") is None and c.misses == 1
    off = ror.RorClient(tmp_path / "none.json", fetch=fetch, offline=True)
    n = len(fetch.calls)
    assert off.match("Carnegie Mellon University") is None and len(fetch.calls) == n
    assert ror.check({"institution": "Carnegie Mellon University", "ror": "cmu"}, off)["identity"] == "unknown"

def test_unmatched_affiliation_is_cached_as_none(tmp_path: Path):
    fetch = FakeFetch()
    c = client(tmp_path, fetch)
    assert c.match("Nowhere Lab") is None
    n = len(fetch.calls)
    assert c.match("nowhere lab") is None and len(fetch.calls) == n
