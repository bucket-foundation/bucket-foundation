import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))
import fetch
import fitmap


def author(aid, inst, works):
    return {"id": f"https://openalex.org/{aid}", "display_name": "X", "works_count": works, "last_known_institutions": [{"display_name": inst}]}


def test_resolve_matches_institution():
    res = [author("A1", "Northfield Institute", 900), author("A2", "Lakeside University", 50)]
    assert fetch.resolve(res, "Lakeside")["id"].endswith("A2")


def test_resolve_skips_without_match_or_pin():
    res = [author("A1", "Northfield Institute", 900)]
    assert fetch.resolve(res, "Lakeside") is None


def test_resolve_uses_pin_only():
    res = [author("A1", "Hillcrest University", 900), author("A9", "Hillcrest University", 30)]
    assert fetch.resolve(res, "Lakeside", "A9")["id"].endswith("A9")
    assert fetch.resolve(res, "Lakeside", "A7") is None


def test_card_names_only_its_pi():
    p = {"name": "Ada Target", "institution": "Somewhere"}
    r = {"overlaps": [("Topic Modeling", "a", 0.9)]}
    fig = fitmap.make_card(p, r, ["t"] * 9, np.full(9, 0.5), np.full(9, 0.4))
    texts = " ".join(t.get_text() for t in fig.texts) + " ".join(t.get_text() for ax in fig.axes for t in ax.texts)
    assert "Ada Target" in texts
    fitmap.make_card({"name": "Bram Other", "institution": "X"}, r, ["t"] * 9, np.full(9, 0.5), np.full(9, 0.4))
    for other in ["Bram Other", "Cora Else"]:
        assert other not in texts
    assert "unvalidated" in texts


def test_outputs_refused_inside_repo():
    with pytest.raises(SystemExit):
        fitmap.assert_outside_repo(fitmap.HERE / "out")
    fitmap.assert_outside_repo(Path.home() / ".local/share/bucket-pi-fit")
