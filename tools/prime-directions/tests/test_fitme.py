from __future__ import annotations

import json
import socket
from pathlib import Path

import pytest

from prime_directions import cli, fitme
from prime_directions.corpora import TOOL_REPO_ROOT

FIXTURES = Path(__file__).parent / "fixtures"
PEOPLE = FIXTURES / "people-synthetic.jsonl"

STATEMENT = """# Research Statement

I study mitochondria, circadian metabolism and membrane protein energy in the cell, with neural network inference on biological data.

## Research Directions

1. **Mitochondrial energy.** Measure membrane protein energy and circadian metabolism in the cell across tissues and time.
2. **Neural inference.** Build neural network inference over biological data to predict protein structure and metabolism.
- **Circadian clocks.** Link circadian clocks to mitochondria and cell energy with longitudinal measurement.

## Long-Term Goals

Keep going.
"""


def people_with_emails(tmp_path: Path) -> Path:
    lines = PEOPLE.read_text().splitlines()
    rows = [json.loads(x) for x in lines]
    for i, r in enumerate(rows[:5]):
        r.update(email=f"person{i}@example.edu", email_source="official_directory")
    f = tmp_path / "people.jsonl"
    f.write_text("\n".join(json.dumps(r) for r in rows) + "\n")
    return f


def run(tmp_path: Path, out: Path, monkeypatch, extra=()):
    monkeypatch.setenv("PRIME_DATA_ROOT", str(tmp_path / "data"))
    st = tmp_path / "statement.md"
    st.write_text(STATEMENT)
    return cli.main(["fit-me", "--statement", str(st), "--people", str(people_with_emails(tmp_path)), "--out", str(out),
                     "--k", "6", "--top", "30", "--label", "5", "--min-df", "2", "--max-df", "0.9", "--min-chars", "50", *extra])


@pytest.fixture
def no_network(monkeypatch):
    def refuse(*a, **k):
        raise AssertionError("network call attempted")
    monkeypatch.setattr(socket.socket, "connect", refuse)
    monkeypatch.setattr(socket, "create_connection", refuse)
    monkeypatch.setattr(socket, "getaddrinfo", refuse)


def test_fit_me_writes_marked_publishable_output_without_statement_text(tmp_path, monkeypatch, no_network):
    out = tmp_path / "fit"
    assert run(tmp_path, out, monkeypatch) == 0
    assert (out / fitme.MARKER).read_text().startswith(fitme.VERSION)
    page = (out / "index.html").read_text()
    body = " ".join(STATEMENT.split())
    for i in range(0, len(body) - 40, 7):
        assert body[i:i + 40] not in page
    for name in ("index.html", "ranked.csv", "report.json"):
        assert "@example.edu" not in (out / name).read_text()
    data = json.loads(page.split('<script id="data" type="application/json">')[1].split("</script>")[0])
    labels = data["context"]["our_axes"]
    assert 1 <= len(labels) <= 3 and all(len(l.split()) <= 3 and len(l) < 40 for l in labels)


def test_direction_items_prefers_section_and_falls_back():
    assert len(fitme.direction_items(STATEMENT)) == 3
    text = "# T\n\n" + ("word " * 40 + "\n\n") * 8
    assert len(fitme.direction_items(text)) == 6


def test_prepare_out_refuses_unmarked_nonempty_and_symlink(tmp_path):
    busy = tmp_path / "busy"
    busy.mkdir()
    (busy / "keep.txt").write_text("x")
    with pytest.raises(fitme.FitError):
        fitme.prepare_out(busy, tmp_path / "data")
    link = tmp_path / "link"
    link.symlink_to(tmp_path / "elsewhere", target_is_directory=True)
    with pytest.raises(fitme.FitError):
        fitme.prepare_out(link, tmp_path / "data")
    fresh = fitme.prepare_out(tmp_path / "fresh", tmp_path / "data")
    assert (fresh / fitme.MARKER).exists()
    assert fitme.prepare_out(fresh, tmp_path / "data") == fresh


def test_forget_deletes_only_marked_dirs(tmp_path, monkeypatch, no_network):
    out = tmp_path / "fit"
    assert run(tmp_path, out, monkeypatch) == 0
    outside = tmp_path / "outside.txt"
    outside.write_text("keep")
    (out / "link-out").symlink_to(outside)
    assert cli.main(["fit-me", "--out", str(out), "--forget"]) == 0
    assert not out.exists() and outside.read_text() == "keep"
    unmarked = tmp_path / "unmarked"
    unmarked.mkdir()
    assert cli.main(["fit-me", "--out", str(unmarked), "--forget"]) == 2 and unmarked.exists()


@pytest.mark.parametrize("target", ["home", "root", "repo", "home_parent", "data"])
def test_forget_refuses_protected_even_with_marker(tmp_path, monkeypatch, target):
    fake_home = tmp_path / "home" / "me"
    fake_home.mkdir(parents=True)
    monkeypatch.setattr(Path, "home", staticmethod(lambda: fake_home))
    path = {"home": fake_home, "root": Path("/"), "repo": TOOL_REPO_ROOT, "home_parent": fake_home.parent, "data": tmp_path / "data"}[target]
    path.mkdir(parents=True, exist_ok=True)
    checked = []
    real_is_file = Path.is_file
    monkeypatch.setattr(Path, "is_file", lambda self: checked.append(self) or (self.name == fitme.MARKER) or real_is_file(self))
    with pytest.raises(fitme.FitError):
        fitme.forget(path, TOOL_REPO_ROOT, tmp_path / "data")
    assert path.exists()


def test_fit_me_needs_people_until_the_public_export_lands(tmp_path, monkeypatch):
    monkeypatch.setenv("PRIME_DATA_ROOT", str(tmp_path / "data"))
    st = tmp_path / "s.md"
    st.write_text(STATEMENT)
    assert cli.main(["fit-me", "--statement", str(st), "--out", str(tmp_path / "o")]) == 2


def test_forget_refuses_a_forged_marker(tmp_path, monkeypatch):
    monkeypatch.setenv("PRIME_DATA_ROOT", str(tmp_path / "data"))
    forged = tmp_path / "forged"
    forged.mkdir()
    (forged / fitme.MARKER).write_text(f"{fitme.VERSION}\nnot-recorded\n")
    assert cli.main(["fit-me", "--out", str(forged), "--forget"]) == 2 and forged.exists()


def test_run_writes_nothing_else_under_data_root_and_report_has_no_path(tmp_path, monkeypatch, no_network):
    out = tmp_path / "fit"
    assert run(tmp_path, out, monkeypatch) == 0
    data = tmp_path / "data"
    assert sorted(p.name for p in data.rglob("*")) == sorted([fitme.registry_path(data).name, "fit-me-registry.lock"])
    assert oct(fitme.registry_path(data).stat().st_mode & 0o777) == "0o600"
    report = (out / "report.json").read_text()
    assert "statement.md" not in report and str(tmp_path) not in report


def test_statement_text_is_capped(tmp_path):
    f = tmp_path / "big.md"
    f.write_text("word " * 100_000)
    assert len(fitme.read_text(f)) == fitme.MAX_CHARS


def test_scanned_or_empty_pdf_fails_clearly(tmp_path):
    from pypdf import PdfWriter

    w = PdfWriter()
    w.add_blank_page(width=200, height=200)
    f = tmp_path / "scan.pdf"
    with open(f, "wb") as h:
        w.write(h)
    with pytest.raises(fitme.FitError, match="text layer"):
        fitme.read_text(f)


def test_pdf_statement_and_cv_feed_the_fit_without_their_text(tmp_path, monkeypatch, no_network):
    reportlab = pytest.importorskip("reportlab.pdfgen.canvas")
    pdf = tmp_path / "statement.pdf"
    c = reportlab.Canvas(str(pdf))
    y = 800
    for line in STATEMENT.splitlines():
        c.drawString(40, y, line[:110])
        y -= 14
    c.save()
    cv = tmp_path / "cv.md"
    cv.write_text("Curriculum vitae. Skills: neural network inference, protein structure, circadian metabolism measurement, mitochondria assays, data pipelines. " * 3)
    monkeypatch.setenv("PRIME_DATA_ROOT", str(tmp_path / "data"))
    out = tmp_path / "fit"
    code = cli.main(["fit-me", "--statement", str(pdf), "--cv", str(cv), "--people", str(people_with_emails(tmp_path)), "--out", str(out),
                     "--k", "6", "--top", "30", "--label", "5", "--min-df", "2", "--max-df", "0.9", "--min-chars", "50"])
    assert code == 0
    page = (out / "index.html").read_text()
    body = " ".join(cv.read_text().split())
    for i in range(0, len(body) - 40, 11):
        assert body[i:i + 40] not in page


def test_oversized_file_is_refused(tmp_path, monkeypatch):
    f = tmp_path / "huge.md"
    f.write_text("x")
    monkeypatch.setattr(fitme, "MAX_BYTES", 0)
    with pytest.raises(fitme.FitError, match="MB"):
        fitme.read_text(f)


def test_damaged_registry_is_an_error(tmp_path, monkeypatch):
    data = tmp_path / "data"
    data.mkdir()
    fitme.registry_path(data).write_text('{"trunc')
    with pytest.raises(fitme.FitError, match="damaged"):
        fitme.prepare_out(tmp_path / "o", data)


def test_missing_pdftotext_has_its_own_error(tmp_path, monkeypatch):
    from pypdf import PdfWriter

    w = PdfWriter()
    w.add_blank_page(width=200, height=200)
    f = tmp_path / "scan.pdf"
    with open(f, "wb") as h:
        w.write(h)
    monkeypatch.setattr(fitme.shutil, "which", lambda name: None)
    with pytest.raises(fitme.FitError, match="pdftotext is not installed"):
        fitme.read_text(f)


def test_page_limit_is_enforced_in_the_worker(tmp_path, monkeypatch):
    from pypdf import PdfWriter

    w = PdfWriter()
    for _ in range(fitme.MAX_PAGES + 1):
        w.add_blank_page(width=100, height=100)
    f = tmp_path / "long.pdf"
    with open(f, "wb") as h:
        w.write(h)
    with pytest.raises(fitme.FitError, match="pages"):
        fitme.read_text(f)


def test_cv_contact_details_never_reach_any_output(tmp_path, monkeypatch, no_network):
    cv = tmp_path / "cv.md"
    cv.write_text("Jane Example, jane.example@example.org, +1 (555) 010-4477, 42 Elm Street, Springfield. "
                  "Skills: neural network inference, protein structure, circadian metabolism, mitochondria assays. " * 3)
    monkeypatch.setenv("PRIME_DATA_ROOT", str(tmp_path / "data"))
    st = tmp_path / "statement.md"
    st.write_text(STATEMENT)
    out = tmp_path / "fit"
    code = cli.main(["fit-me", "--statement", str(st), "--cv", str(cv), "--people", str(people_with_emails(tmp_path)), "--out", str(out),
                     "--k", "6", "--top", "30", "--label", "5", "--min-df", "2", "--max-df", "0.9", "--min-chars", "50"])
    assert code == 0
    for f in out.rglob("*"):
        if f.is_file() and f.suffix in (".html", ".csv", ".json"):
            text = f.read_text(errors="replace")
            for needle in ("jane.example@example.org", "(555)", "010-4477", "Elm Street", "Jane Example"):
                assert needle not in text, (f.name, needle)
