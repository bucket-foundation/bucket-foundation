from __future__ import annotations

import datetime as dt
import os
import re
import resource
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

MAX_MEMBERS = 2000
MAX_MEMBER_BYTES = 64 << 20
MAX_ARCHIVE_BYTES = 200 << 20
PDF_TIMEOUT = 60
PDF_MEMORY = 1 << 30
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
PKG_REL_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"
SHEET_MAIN = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"
CELL_REF = re.compile(r"^([A-Z]{1,3})(\d+)$")
MAGIC = {"xlsx": b"PK\x03\x04", "pdf": b"%PDF-", "parquet": b"PAR1"}


class ReadError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def magic_ok(kind: str, head: bytes) -> bool:
    if kind in MAGIC:
        return head.startswith(MAGIC[kind])
    if b"\x00" in head and not head.startswith((b"\xff\xfe", b"\xfe\xff")):
        return False
    return True


class Budget:
    def __init__(self, total: int):
        self.left = total

    def take(self, n: int) -> None:
        self.left -= n
        if self.left < 0:
            raise ReadError("E_XLSX_TOO_LARGE", f"workbook expands past {MAX_ARCHIVE_BYTES >> 20} MB")


def read_member(zf: zipfile.ZipFile, name: str, budget: Budget) -> bytes:
    out = bytearray()
    with zf.open(name) as fh:
        while True:
            chunk = fh.read(1 << 16)
            if not chunk:
                break
            out.extend(chunk)
            budget.take(len(chunk))
            if len(out) > MAX_MEMBER_BYTES:
                raise ReadError("E_XLSX_TOO_LARGE", f"part {name} expands past {MAX_MEMBER_BYTES >> 20} MB")
    if b"<!DOCTYPE" in out[:4096] or b"<!ENTITY" in out:
        raise ReadError("E_XLSX_DOCTYPE", f"part {name} declares a DOCTYPE or entity")
    return bytes(out)


def parse_xml(data: bytes, name: str) -> ET.Element:
    try:
        return ET.fromstring(data)
    except ET.ParseError as exc:
        raise ReadError("E_XLSX_XML", f"part {name} is not valid XML: {exc}") from exc


def col_index(letters: str) -> int:
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n - 1


def excel_date(serial: float, date1904: bool) -> str:
    base = dt.datetime(1904, 1, 1) if date1904 else dt.datetime(1899, 12, 30)
    d = base + dt.timedelta(days=serial)
    return d.date().isoformat() if d.time() == dt.time(0) else d.isoformat(timespec="seconds")


def date_styles(root: ET.Element | None) -> set[int]:
    if root is None:
        return set()
    custom = {}
    fmts = root.find(f"{NS}numFmts")
    if fmts is not None:
        for f in fmts.findall(f"{NS}numFmt"):
            code = (f.get("formatCode") or "").lower()
            custom[int(f.get("numFmtId", "0"))] = bool(re.search(r"(^|[^\"\\])[dmyh]", re.sub(r"\[[^\]]*\]", "", code)))
    builtin = set(range(14, 23)) | set(range(45, 48))
    xfs = root.find(f"{NS}cellXfs")
    out = set()
    if xfs is not None:
        for i, xf in enumerate(xfs.findall(f"{NS}xf")):
            fid = int(xf.get("numFmtId", "0"))
            if fid in builtin or custom.get(fid):
                out.add(i)
    return out


def first_sheet_path(zf: zipfile.ZipFile, budget: Budget, sheet: int) -> tuple[str, bool]:
    wb = parse_xml(read_member(zf, "xl/workbook.xml", budget), "xl/workbook.xml")
    pr = wb.find(f"{NS}workbookPr")
    date1904 = pr is not None and pr.get("date1904") in ("1", "true")
    sheets = wb.find(f"{NS}sheets")
    if sheets is None or not len(sheets):
        raise ReadError("E_XLSX_NO_SHEET", "workbook has no sheets")
    if sheet >= len(sheets):
        raise ReadError("E_XLSX_NO_SHEET", f"workbook has {len(sheets)} sheets")
    rid = sheets[sheet].get(f"{REL_NS}id")
    rels = parse_xml(read_member(zf, "xl/_rels/workbook.xml.rels", budget), "workbook rels")
    for r in rels.findall(f"{PKG_REL_NS}Relationship"):
        if r.get("Id") == rid:
            target = r.get("Target", "").lstrip("/")
            path = target if target.startswith("xl/") else f"xl/{target}"
            if ".." in path.split("/"):
                raise ReadError("E_XLSX_XML", "sheet target leaves the workbook")
            return path, date1904
    raise ReadError("E_XLSX_NO_SHEET", "sheet relationship missing")


def read_xlsx(path: Path, max_rows: int, sheet: int = 0) -> tuple[list[str], list[list], list[dict], bool]:
    with path.open("rb") as fh:
        if not magic_ok("xlsx", fh.read(4)):
            raise ReadError("E_MAGIC", "file does not start with the XLSX zip signature")
    try:
        zf = zipfile.ZipFile(path)
    except zipfile.BadZipFile as exc:
        raise ReadError("E_XLSX_ZIP", f"not a valid zip: {exc}") from exc
    with zf:
        names = zf.namelist()
        if len(names) > MAX_MEMBERS:
            raise ReadError("E_XLSX_TOO_LARGE", f"{len(names)} parts, limit {MAX_MEMBERS}")
        if any(n.lower().endswith("vbaproject.bin") for n in names):
            raise ReadError("E_XLSX_MACRO", "macro-enabled workbook refused")
        budget = Budget(MAX_ARCHIVE_BYTES)
        if "[Content_Types].xml" not in names:
            raise ReadError("E_XLSX_TYPE", "missing [Content_Types].xml")
        ctypes = read_member(zf, "[Content_Types].xml", budget)
        if SHEET_MAIN.encode() not in ctypes:
            raise ReadError("E_XLSX_TYPE", "not a spreadsheetml workbook")
        sheet_path, date1904 = first_sheet_path(zf, budget, sheet)
        shared: list[str] = []
        if "xl/sharedStrings.xml" in names:
            sst = parse_xml(read_member(zf, "xl/sharedStrings.xml", budget), "sharedStrings")
            for si in sst.findall(f"{NS}si"):
                shared.append("".join(t.text or "" for t in si.iter(f"{NS}t")))
        styles = date_styles(parse_xml(read_member(zf, "xl/styles.xml", budget), "styles") if "xl/styles.xml" in names else None)
        if sheet_path not in names:
            raise ReadError("E_XLSX_NO_SHEET", "sheet part missing")
        ws = parse_xml(read_member(zf, sheet_path, budget), sheet_path)
    warnings: list[dict] = []
    uncached = 0
    grid: list[list] = []
    truncated = False
    data = ws.find(f"{NS}sheetData")
    for row in (data if data is not None else []):
        if len(grid) > max_rows:
            truncated = True
            break
        cells: dict[int, object] = {}
        for c in row.findall(f"{NS}c"):
            m = CELL_REF.match(c.get("r", ""))
            idx = col_index(m.group(1)) if m else len(cells)
            if idx > 16383:
                continue
            t = c.get("t", "n")
            v = c.find(f"{NS}v")
            has_formula = c.find(f"{NS}f") is not None
            if t == "inlineStr":
                val: object = "".join(x.text or "" for x in c.iter(f"{NS}t"))
            elif v is None or v.text is None:
                if has_formula:
                    uncached += 1
                val = None
            elif t == "s":
                i = int(v.text)
                val = shared[i] if 0 <= i < len(shared) else None
            elif t == "b":
                val = v.text == "1"
            elif t in ("str", "e"):
                val = v.text
            else:
                try:
                    num = float(v.text)
                except ValueError:
                    val = v.text
                else:
                    if int(c.get("s", "0")) in styles:
                        val = excel_date(num, date1904)
                    else:
                        val = int(num) if num.is_integer() and abs(num) < 2**53 else num
            cells[idx] = val
        if cells:
            width = max(cells) + 1
            grid.append([cells.get(i) for i in range(width)])
    if uncached:
        warnings.append({"code": "W_FORMULA_UNCACHED", "where": "sheet", "message": f"{uncached} formula cells have no saved value and read as missing; formulas are never run"})
    if not grid:
        raise ReadError("E_EMPTY", "sheet has no cells")
    width = max(len(r) for r in grid)
    grid = [r + [None] * (width - len(r)) for r in grid]
    header = ["" if h is None else str(h).strip() for h in grid[0]]
    while header and not header[-1]:
        header.pop()
    body = [r[: len(header)] for r in grid[1 : max_rows + 1]]
    return header, body, warnings, truncated or len(grid) - 1 > max_rows


def _limit_child() -> None:
    resource.setrlimit(resource.RLIMIT_AS, (PDF_MEMORY, PDF_MEMORY))
    resource.setrlimit(resource.RLIMIT_CPU, (PDF_TIMEOUT, PDF_TIMEOUT))
    os.setsid()


def split_layout(text: str) -> tuple[list[str], list[list], int]:
    lines = [ln.rstrip() for ln in text.splitlines() if ln.strip()]
    rows = [re.split(r"\s{2,}", ln.strip()) for ln in lines]
    if not rows:
        raise ReadError("E_PDF_NO_TEXT", "the PDF has no text layer")
    counts: dict[int, int] = {}
    for r in rows:
        if len(r) >= 2:
            counts[len(r)] = counts.get(len(r), 0) + 1
    if not counts:
        raise ReadError("E_PDF_NO_TABLE", "no line has two or more columns")
    modal = max(counts, key=lambda k: (counts[k], k))
    start = next(i for i, r in enumerate(rows) if len(r) == modal)
    header = rows[start]
    body = [r for r in rows[start + 1 :] if len(r) == modal and r != header]
    dropped = sum(1 for r in rows[start + 1 :] if len(r) != modal)
    return header, body, dropped


def read_pdf(path: Path, max_rows: int) -> tuple[list[str], list[list], list[dict], bool]:
    with path.open("rb") as fh:
        if not magic_ok("pdf", fh.read(5)):
            raise ReadError("E_MAGIC", "file does not start with %PDF-")
    worker = Path(__file__).with_name("pdfworker.py")
    try:
        p = subprocess.run([sys.executable, str(worker), str(path)], capture_output=True, text=True, timeout=PDF_TIMEOUT, preexec_fn=_limit_child)
    except subprocess.TimeoutExpired as exc:
        raise ReadError("E_PDF_TIMEOUT", f"PDF text extraction passed {PDF_TIMEOUT} s") from exc
    if p.returncode == 3:
        raise ReadError("E_PDF_PAGES", p.stderr.strip() or "too many pages")
    if p.returncode == 4:
        raise ReadError("E_PDF_DEPENDENCY", "PDF tables need pypdf: python3 -m pip install --user pypdf")
    if p.returncode != 0:
        raise ReadError("E_PDF_READ", "the PDF could not be read")
    header, body, dropped = split_layout(p.stdout)
    warnings = []
    if dropped:
        warnings.append({"code": "W_PDF_ROWS_DROPPED", "where": "pdf", "message": f"{dropped} lines did not match the table's {len(header)} columns and were dropped"})
    warnings.append({"code": "W_PDF_EXTRACTED", "where": "pdf", "message": "table read from the PDF text layer; check the columns against the source"})
    return header, body[:max_rows], warnings, len(body) > max_rows
