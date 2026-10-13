from __future__ import annotations

import csv
import datetime as dt
import io
import math
import random
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).resolve().parent / "tests/fixtures/marketing"
START = dt.date(2026, 1, 1)
DAYS = 60
SEED = 20260930


def daily_factor(i: int) -> float:
    d = START + dt.timedelta(days=i)
    return 1.0 + (0.25 if d.weekday() >= 5 else 0.0) + 0.1 * math.sin(i / 9)


def write_csv(path: Path, header: list[str], rows: list[list], preamble: list[str] | None = None, encoding: str = "utf-8", delim: str = ",") -> None:
    buf = io.StringIO()
    for line in preamble or []:
        buf.write(line + "\n")
    w = csv.writer(buf, delimiter=delim, lineterminator="\n")
    w.writerow(header)
    w.writerows(rows)
    path.write_bytes(buf.getvalue().encode(encoding))


def meta(rng: random.Random) -> tuple[list[str], list[list]]:
    header = ["Campaign name", "Day", "Amount spent (USD)", "Impressions", "Link clicks", "Purchases", "Purchases conversion value", "Reporting starts", "Reporting ends"]
    rows = []
    for i in range(DAYS):
        d = (START + dt.timedelta(days=i)).isoformat()
        for name, base in (("Spring Prospecting", 120.0), ("Retargeting Cart", 60.0), ("Lookalike Buyers", 90.0)):
            spend = round(base * daily_factor(i) * rng.uniform(0.9, 1.1), 2)
            if name == "Spring Prospecting" and i == 41:
                spend = round(spend * 6, 2)
            impr = int(spend * rng.uniform(80, 110))
            clicks = int(impr * rng.uniform(0.012, 0.018))
            purchases = int(clicks * rng.uniform(0.03, 0.06))
            rows.append([name, d, f"{spend:.2f}", impr, clicks, purchases, f"{purchases * 48.5:.2f}", d, d])
    return header, rows


def google_ads(rng: random.Random) -> tuple[list[str], list[list]]:
    header = ["Day", "Campaign", "Currency code", "Cost", "Impr.", "Clicks", "Conversions", "Conv. value"]
    rows = []
    for i in range(DAYS):
        d = START + dt.timedelta(days=i)
        for name, base in (("Brand Search", 40.0), ("Generic Shoes", 110.0)):
            cost = round(base * daily_factor(i) * rng.uniform(0.9, 1.1), 2)
            impr = int(cost * rng.uniform(25, 40))
            clicks = int(impr * rng.uniform(0.04, 0.07))
            conv = round(clicks * rng.uniform(0.04, 0.08), 2)
            rows.append([d.strftime("%b %d, %Y"), name, "USD", f"{cost:,.2f}", f"{impr:,}", clicks, conv, f"{conv * 52:.2f}"])
    return header, rows


def ga4(rng: random.Random) -> tuple[list[str], list[list]]:
    header = ["Date", "Session default channel group", "Sessions", "Engaged sessions", "Key events", "Total revenue"]
    rows = []
    for i in range(DAYS):
        d = (START + dt.timedelta(days=i)).strftime("%Y%m%d")
        for ch, base in (("Paid Social", 400), ("Paid Search", 350), ("Organic Search", 500), ("Direct", 250), ("Email", 120)):
            s = int(base * daily_factor(i) * rng.uniform(0.9, 1.1))
            ev = int(s * rng.uniform(0.01, 0.03))
            rows.append([d, ch, s, int(s * 0.6), ev, f"{ev * 50.0:.2f}"])
    return header, rows


def customers(rng: random.Random, n: int) -> list[str]:
    return [f"buyer{k:04d}@example.com" for k in range(n)]


def shopify(rng: random.Random) -> tuple[list[str], list[list]]:
    header = ["Name", "Email", "Financial Status", "Paid at", "Currency", "Subtotal", "Total", "Refunded Amount", "Lineitem name", "Created at", "Referring Site"]
    people = customers(rng, 140)
    rows = []
    order = 1000
    for i in range(DAYS):
        for _ in range(rng.randint(3, 7)):
            order += 1
            who = people[min(len(people) - 1, int(rng.expovariate(1 / 40)))]
            total = round(rng.uniform(25, 140), 2)
            status = rng.choices(["paid", "refunded", "partially_refunded", "pending"], [0.88, 0.04, 0.04, 0.04])[0]
            refunded = f"{total / 2:.2f}" if status == "partially_refunded" else "0.00"
            stamp = (dt.datetime.combine(START + dt.timedelta(days=i), dt.time(22, 30)) + dt.timedelta(minutes=rng.randint(0, 120))).strftime("%Y-%m-%d %H:%M:%S -0500")
            site = rng.choice(["https://www.facebook.com/", "https://www.google.com/", "", "https://mail.example.com/", "https://www.instagram.com/"])
            rows.append([f"#{order}", who, status, stamp, "USD", f"{total:.2f}", f"{total:.2f}", refunded, "Trail Shoe", stamp, site])
            if rng.random() < 0.3:
                rows.append([f"#{order}", who, "", "", "", "", "", "", "Socks", "", ""])
    return header, rows


def stripe(rng: random.Random) -> tuple[list[str], list[list]]:
    header = ["id", "Created date (UTC)", "Amount", "Amount Refunded", "Currency", "Status", "Customer ID", "Description"]
    rows = []
    for i in range(DAYS):
        for k in range(rng.randint(1, 4)):
            stamp = (START + dt.timedelta(days=i)).isoformat() + f" {rng.randint(0, 23):02d}:{rng.randint(0, 59):02d}"
            status = rng.choices(["Paid", "Failed", "Refunded"], [0.9, 0.06, 0.04])[0]
            amount = rng.choice([19.0, 49.0, 99.0])
            rows.append([f"ch_test_{i:03d}{k}", stamp, f"{amount:.2f}", "0.00", "usd", status, f"cus_test_{rng.randint(1, 60):03d}", "Subscription"])
    return header, rows


def hubspot(rng: random.Random) -> tuple[list[str], list[list]]:
    header = ["Record ID", "Deal Name", "Deal Stage", "Amount", "Close Date", "Original Source", "Associated Company"]
    rows = []
    for k in range(80):
        d = START + dt.timedelta(days=rng.randint(0, DAYS - 1))
        stage = rng.choices(["Closed Won", "Closed Lost", "Appointment Scheduled"], [0.5, 0.3, 0.2])[0]
        rows.append([str(900000 + k), f"Deal {k}", stage, f"{rng.choice([1200, 2500, 5000])}", d.isoformat() + " 10:00", rng.choice(["Paid Search", "Organic Search", "Paid Social", "Referrals"]), f"Company {k % 30}"])
    return header, rows


def col_letter(i: int) -> str:
    s = ""
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


def write_xlsx(path: Path, header: list[str], rows: list[list], extra_cells: str = "") -> None:
    lines = []
    for r, row in enumerate([header, *rows], start=1):
        cells = []
        for c, v in enumerate(row):
            ref = f"{col_letter(c)}{r}"
            if isinstance(v, dt.date):
                serial = (v - dt.date(1899, 12, 30)).days
                cells.append(f'<c r="{ref}" s="1"><v>{serial}</v></c>')
            elif isinstance(v, (int, float)):
                cells.append(f'<c r="{ref}"><v>{v}</v></c>')
            else:
                cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{escape(str(v))}</t></is></c>')
        lines.append(f'<row r="{r}">{"".join(cells)}</row>')
    sheet = ('<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
             + "".join(lines) + extra_cells + "</sheetData></worksheet>")
    parts = {
        "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
        "_rels/.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        "xl/workbook.xml": '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets></workbook>',
        "xl/_rels/workbook.xml.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
        "xl/styles.xml": '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14" applyNumberFormat="1"/></cellXfs></styleSheet>',
        "xl/worksheets/sheet1.xml": sheet,
    }
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, body in parts.items():
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            zf.writestr(info, body)


def write_pdf(path: Path, lines: list[str]) -> None:
    content = ["BT", "/F1 9 Tf", "11 TL", "36 800 Td"]
    for ln in lines:
        content.append("(" + ln.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") + ") Tj T*")
    content.append("ET")
    stream = "\n".join(content).encode("latin-1")
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, o in enumerate(objs, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + o + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    path.write_bytes(bytes(out))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rng = random.Random(SEED)
    h, r = meta(rng)
    write_csv(OUT / "meta_ads.csv", h, r)
    h, r = google_ads(rng)
    total = ["Total: Account", "", "USD", "0", "0", "0", "0", "0"]
    write_csv(OUT / "google_ads.csv", h, r + [total], preamble=["Campaign report", "January 1, 2026 - March 1, 2026"])
    write_csv(OUT / "google_ads_utf16.tsv", h, r[:40], preamble=["Campaign report", "January 1, 2026 - March 1, 2026"], encoding="utf-16", delim="\t")
    h, r = ga4(rng)
    write_csv(OUT / "ga4.csv", h, r, preamble=["# ----------------------------------------", "# Traffic acquisition", "# 20260101-20260301", "# ----------------------------------------"])
    h, r = shopify(rng)
    write_csv(OUT / "shopify_orders.csv", h, r)
    h, r = stripe(rng)
    write_csv(OUT / "stripe_payments.csv", h, r)
    h, r = hubspot(rng)
    write_csv(OUT / "hubspot_deals.csv", h, r)
    eu = [["2026-01-%02d" % (i + 1), "Kampagne A", f"{1000 + i * 37.5:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), str(20000 + i * 100), str(300 + i), str(10 + i % 4)] for i in range(21)]
    write_csv(OUT / "generic_eu.csv", ["date", "campaign", "spend", "impressions", "clicks", "conversions"], eu, delim=",")
    rng2 = random.Random(SEED)
    h, r = meta(rng2)
    xrows = []
    for row in r[:30]:
        xrows.append([row[0], dt.date.fromisoformat(row[1]), float(row[2]), row[3], row[4], row[5], float(row[6]), row[7], row[8]])
    n = len(xrows) + 2
    extra = (f'<row r="{n}"><c r="A{n}" t="inlineStr"><is><t>Formula Check</t></is></c><c r="B{n}" s="1"><v>46052</v></c>'
             f'<c r="C{n}"><f>WEBSERVICE("http://example.invalid/")</f><v>12.5</v></c><c r="D{n}"><f>1+1</f></c>'
             f'<c r="E{n}" t="inlineStr"><is><t>=HYPERLINK("http://example.invalid","x")</t></is></c></row>')
    write_xlsx(OUT / "meta_ads.xlsx", ["Campaign name", "Day", "Amount spent (USD)", "Impressions", "Link clicks", "Purchases", "Purchases conversion value", "Reporting starts", "Reporting ends"], xrows, extra)
    pdf_lines = ["Monthly channel report", "", f"{'Date':<14}{'Channel':<18}{'Spend':>10}{'Clicks':>10}{'Conversions':>14}"]
    for i in range(14):
        d = (START + dt.timedelta(days=i)).isoformat()
        for ch, s in (("Paid Search", 120 + i), ("Paid Social", 90 + 2 * i)):
            pdf_lines.append(f"{d:<14}{ch:<18}{s:>10.2f}{s * 3:>10d}{s // 20:>14d}")
    pdf_lines.append("Page 1 of 1")
    write_pdf(OUT / "channel_report.pdf", pdf_lines)


if __name__ == "__main__":
    main()
