"""`hte-synth realsweep`: `hte.calibrate.run_calibration` over the
shipped real corpora, no LLM call and no full campaign
(`bkt-hte-generation-coverage`).

`quantum-history` and `production` are cheap enough (no network, no
sibling-repo checkout) to run in every test below; `education-atlas`
needs `$EDUCATION_ATLAS_DIR`/a sibling checkout and `literature` reads
this checkout's own `_intake/` tree, so neither is exercised here at
all, matching `tests/test_corpus_education_atlas.py`'s own skip-if-
absent convention rather than duplicating it.
"""
from __future__ import annotations

import json

from hte import cli_synth


def test_realsweep_writes_a_row_per_corpus(tmp_path):
    rc = cli_synth.main([
        "realsweep", "--corpora", "quantum-history,production", "--out", str(tmp_path),
    ])
    assert rc == 0
    rows = json.loads((tmp_path / "REALSWEEP.json").read_text())
    assert {r["corpus"] for r in rows} == {"quantum-history", "production"}
    for row in rows:
        assert row["coverage_of_truth"] is not None
        assert (tmp_path / row["corpus"] / "CALIBRATION.md").is_file()


def test_realsweep_diagnose_writes_diagnostics_per_corpus(tmp_path):
    rc = cli_synth.main([
        "realsweep", "--corpora", "quantum-history", "--diagnose", "--out", str(tmp_path),
    ])
    assert rc == 0
    rows = json.loads((tmp_path / "REALSWEEP.json").read_text())
    assert "reasons" in rows[0]
    assert set(rows[0]["reasons"]) == {
        "no_evidence_after_holdout", "no_placement_generated", "dropped_by_cap",
        "slot_mismatch", "interval_mismatch",
    }
    assert (tmp_path / "quantum-history" / "DIAGNOSTICS.md").is_file()


def test_realsweep_rejects_an_unknown_corpus_name(tmp_path, capsys):
    try:
        cli_synth.main(["realsweep", "--corpora", "not-a-real-corpus", "--out", str(tmp_path)])
    except SystemExit as exc:
        assert exc.code == 2
    else:
        raise AssertionError("realsweep should exit 2 (argparse.error) on an unregistered corpus name")
    err = capsys.readouterr().err
    assert "not-a-real-corpus" in err


def test_realsweep_default_corpora_covers_every_registered_name():
    args = cli_synth.build_parser().parse_args(["realsweep"])
    assert set(args.corpora.split(",")) == set(cli_synth._REAL_CORPUS_LOADERS)
