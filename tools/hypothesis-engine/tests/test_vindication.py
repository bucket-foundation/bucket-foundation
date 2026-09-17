import json

from hte import calibrate, cli
from hte.belief import Constants
from hte.corpus import GroundTruthEvent, vindication_fixture


def test_ground_truth_event_round_trips_acceptance_and_control():
    e = GroundTruthEvent(id="x", label="x", year=1, doc_id="d", discovery_year=1, acceptance_year=5, control=True)
    assert GroundTruthEvent.from_dict(e.to_dict()) == e
    plain = GroundTruthEvent.from_dict({"id": "y", "label": "y", "year": 2, "doc_id": "d", "discovery_year": 2})
    assert plain.acceptance_year is None and plain.control is False


def test_vindication_lifts_the_fringe_claim_before_acceptance_and_holds_the_control_down():
    result = calibrate.run_vindication(vindication_fixture.build(), Constants())
    rows = {r["event_id"]: r for r in result["rows"]}
    assert rows["v-claim"]["kind"] == "vindicated" and rows["v-claim"]["cutoff"] == 1970
    assert rows["v-claim"]["covered"] and rows["v-claim"]["lifted"] is True
    assert rows["c-claim"]["kind"] == "control" and rows["c-claim"]["cutoff"] is None
    assert rows["c-claim"]["covered"] and rows["c-claim"]["lifted"] is False
    assert result["vindication_rate"] == 1.0 and result["false_alarm_rate"] == 0.0
    assert result["vindication_rate_ci"][0] <= 1.0 and result["false_alarm_rate_ci"][1] >= 0.0
    assert set(result) >= {"n_vindicated", "n_lifted", "n_controls", "n_false_alarms", "lift_floor"}


def test_calibrate_command_vindication_writes_vindication_json(tmp_path, capsys):
    rc = cli.main(["calibrate", "--corpus", "vindication-fixture", "--cutoff-years", "1960", "--vindication", "--out", str(tmp_path)])
    assert rc == 0
    assert "vindication written to" in capsys.readouterr().out
    data = json.loads((tmp_path / "vindication.json").read_text())
    assert data["n_vindicated"] == 1 and data["n_controls"] == 1
