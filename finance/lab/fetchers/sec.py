import io
import os
import zipfile
from datetime import date

import fetch

FSDS = "https://www.sec.gov/files/dera/data/financial-statement-data-sets/{}.zip"
COMPANYFACTS = "https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip"
SUBMISSIONS = "https://www.sec.gov/Archives/edgar/daily-index/bulkdata/submissions.zip"
TICKERS = "https://www.sec.gov/files/company_tickers.json"


def quarters(today=None):
    today = today or date.today()
    out = []
    for y in range(2009, today.year + 1):
        for q in range(1, 5):
            if (y, q) >= (today.year, (today.month - 1) // 3 + 1):
                return out
            out.append(f"{y}q{q}")
    return out


def parse_fsds(body):
    z = zipfile.ZipFile(io.BytesIO(body))
    with z.open("num.txt") as f:
        header = f.readline().decode().rstrip("\n").split("\t")
        i = header.index("ddate")
        n, lo, hi = 0, None, None
        for line in f:
            n += 1
            d = line.decode("utf-8", "replace").split("\t")[i]
            if len(d) == 8 and d.isdigit():
                lo = d if lo is None or d < lo else lo
                hi = d if hi is None or d > hi else hi
    fmt = lambda d: f"{d[:4]}-{d[4:6]}-{d[6:]}" if d else None
    return n, fmt(lo), fmt(hi)


def zip_entries(body):
    return len(zipfile.ZipFile(io.BytesIO(body)).namelist()), None, None


def run():
    ua = os.environ.get("SEC_USER_AGENT")
    if not ua:
        fetch.gate("sec_edgar", FSDS.format("2024q1"),
                   "sec.gov returns 403 without a declared contact; set SEC_USER_AGENT='Name contact@domain' and rerun --only=sec")
        return
    headers = {"User-Agent": ua}
    for q in quarters():
        fetch.get(FSDS.format(q), fetch.RAW / "sec" / "fsds" / f"{q}.zip", parse_fsds, headers=headers, timeout=600)
        fetch.time.sleep(0.2)
    fetch.get(TICKERS, fetch.RAW / "sec" / "company_tickers.json", headers=headers)
    fetch.get(COMPANYFACTS, fetch.RAW / "sec" / "companyfacts.zip", zip_entries, headers=headers, timeout=3600)
    fetch.get(SUBMISSIONS, fetch.RAW / "sec" / "submissions.zip", zip_entries, headers=headers, timeout=3600)
