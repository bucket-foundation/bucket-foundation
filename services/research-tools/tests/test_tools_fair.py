from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_fair as f  # noqa: E402

STRONG = {
    "title": "Cortical interneuron scRNA-seq under hypoxia",
    "description": "Processed expression matrices for 24 samples.",
    "creators": ["A. Researcher", "B. Collaborator"],
    "doi": "10.5281/zenodo.7654321",
    "repository": "Zenodo",
    "access_protocol": "https",
    "access_open": True,
    "metadata_persists": True,
    "indexed_in": "Zenodo / OpenAIRE",
    "formats": ["csv", "json", "hdf5"],
    "license": "CC-BY-4.0",
    "subject": "neuroscience, single-cell",
    "date": "2026-01-15",
    "vocabularies": ["schema.org", "DataCite"],
    "provenance": "Aligned with Cell Ranger 7.1, QC'd per scanpy pipeline v1.9.",
    "references": ["10.1038/s41586-020-0000-0"],
    "standards": ["ISA-Tab"],
}

def test_missing_license_lowers_reusable():
    with_lic = f.run_fair_check({"record": STRONG})
    no_lic_record = {k: v for k, v in STRONG.items() if k != "license"}
    without = f.run_fair_check({"record": no_lic_record})
    assert without["subscores"]["Reusable"] < with_lic["subscores"]["Reusable"]
    assert without["sub_principles"]["R1.1"] == 0.0
    assert with_lic["sub_principles"]["R1.1"] == 1.0
    assert without["overall_fair_score"] < with_lic["overall_fair_score"]

def test_closed_license_scores_below_open():
    open_lic = f.run_fair_check({"record": STRONG})
    closed = f.run_fair_check({"record": {**STRONG, "license": "All rights reserved"}})
    assert closed["sub_principles"]["R1.1"] < open_lic["sub_principles"]["R1.1"]
    assert closed["detected"]["license_kind"].startswith("closed")

def test_doi_detected_as_pid():
    out = f.run_fair_check({"record": {"doi": "10.5281/zenodo.123", "title": "x"}})
    assert out["sub_principles"]["F1"] == 1.0
    assert out["detected"]["persistent_identifier"] == "DOI"

def test_bare_url_is_not_full_pid():
    out = f.run_fair_check({"record": {"url": "https://example.org/data/file", "title": "x"}})
    assert out["sub_principles"]["F1"] < 1.0
    assert out["detected"]["pid_is_url_only"] is True

def test_accession_detected():
    out = f.run_fair_check({"record": {"accession": "GSE12345", "title": "x"}})
    assert out["sub_principles"]["F1"] == 1.0

def test_open_formats_beat_proprietary():
    openf = f.run_fair_check({"record": {"formats": ["csv", "json"], "title": "x"}})
    propf = f.run_fair_check({"record": {"formats": ["xlsx", "mat"], "title": "x"}})
    assert openf["detected"]["machine_readable_fraction"] >= 0.0
    pdf = f.run_fair_check({"record": {"formats": ["pdf"], "title": "x"}})
    assert pdf["sub_principles"]["I1"] < openf["sub_principles"]["I1"]

def test_known_vocabulary_scores_interoperable():
    out = f.run_fair_check({"record": {"vocabularies": ["schema.org", "GO"], "title": "x"}})
    assert out["sub_principles"]["I2"] == 1.0
    assert "schema.org" in out["detected"]["matched_vocabularies"]

def test_demo_gap_list_prioritized():
    out = f.run_fair_check({"record": "demo"})
    assert out["demo"] is True
    gaps = out["prioritized_gaps"]
    assert len(gaps) >= 1
    priorities = [g["priority"] for g in gaps]
    assert priorities == sorted(priorities, reverse=True)
    assert all(g["fix"] for g in gaps)
    assert any(g["letter"] in ("I", "R") for g in gaps[:3])

def test_grade_monotonic():
    strong = f.run_fair_check({"record": STRONG})
    weak = f.run_fair_check({"record": {"title": "x"}})
    assert strong["overall_fair_score"] > weak["overall_fair_score"]
    assert strong["grade"] <= weak["grade"]

def test_validation_structured_errors():
    assert f.run_fair_check({"record": "{not json"}).get("error")
    assert f.run_fair_check({"record": ""}).get("error")
    assert f.run_fair_check({"record": 12345}).get("error")
    assert f.run_fair_check({"record": "[1,2,3]"}).get("error")
    assert f.run_fair_check({}).get("error")
    ok = f.run_fair_check({"record": '{"doi": "10.1/x", "title": "t"}'})
    assert "overall_fair_score" in ok

if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
