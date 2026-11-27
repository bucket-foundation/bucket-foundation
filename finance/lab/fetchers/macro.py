import csv
import io
import json
import re
import zipfile
from datetime import date

import fetch

WB = "https://api.worldbank.org/v2/country/all/indicator/{}"
WB_INDICATORS = [
    "NY.GDP.MKTP.CD", "NY.GDP.MKTP.KD", "NY.GDP.MKTP.KD.ZG", "NY.GDP.PCAP.CD", "NY.GDP.PCAP.PP.KD", "NY.GDP.DEFL.KD.ZG",
    "FP.CPI.TOTL.ZG", "FP.CPI.TOTL", "SL.UEM.TOTL.ZS", "SP.POP.TOTL", "SP.POP.GROW", "NE.EXP.GNFS.ZS", "NE.IMP.GNFS.ZS",
    "NE.GDI.TOTL.ZS", "NE.CON.PRVT.ZS", "NE.TRD.GNFS.ZS", "BN.CAB.XOKA.GD.ZS", "BX.KLT.DINV.WD.GD.ZS", "GC.DOD.TOTL.GD.ZS",
    "GC.BAL.CASH.GD.ZS", "GC.REV.XGRT.GD.ZS", "FM.LBL.BMNY.GD.ZS", "FS.AST.PRVT.GD.ZS", "FR.INR.LEND", "FR.INR.RINR",
    "FR.INR.DPST", "PA.NUS.FCRF", "PA.NUS.PPP", "FI.RES.TOTL.CD", "CM.MKT.LCAP.GD.ZS", "DT.DOD.DECT.GN.ZS",
    "SI.POV.GINI", "SP.DYN.LE00.IN", "SP.POP.65UP.TO.ZS", "EG.USE.PCAP.KG.OE", "NV.IND.MANF.ZS", "NV.AGR.TOTL.ZS",
    "SL.TLF.CACT.ZS", "GB.XPD.RSDV.GD.ZS", "IT.NET.USER.ZS",
]
IMF = "https://api.imf.org/external/sdmx/2.1/data/{}/all"
IMF_FLOWS = ["IMF.RES,WEO", "IMF.STA,COFER", "IMF.RES,PCPS", "IMF.STA,EER", "IMF.STA,CPI", "IMF.STA,MFS_IR"]
SDMX_CSV = {"Accept": "application/vnd.sdmx.data+csv;version=1.0.0", **fetch.UA}
OECD = "https://sdmx.oecd.org/public/rest/data/{}/all"
OECD_FLOWS = [
    "OECD.SDD.NAD,DSD_NAMAIN1@DF_QNA_EXPENDITURE_GROWTH_OECD,",
    "OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,",
    "OECD.SDD.TPS,DSD_LFS@DF_IALFS_UNE_M,",
    "OECD.SDD.STES,DSD_STES@DF_CLI,",
    "OECD.SDD.STES,DSD_KEI@DF_KEI,",
    "OECD.SDD.STES,DSD_STES@DF_FINMARK,",
]
BIS_PAGE = "https://data.bis.org/bulkdownload"
BIS = "https://data.bis.org/static/bulk/"
TREASURY = "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/{y}/all"
TREASURY_TYPES = {"daily_treasury_yield_curve": 1990, "daily_treasury_real_yield_curve": 2003,
                  "daily_treasury_bill_rates": 2002, "daily_treasury_long_term_rate": 2000, "daily_treasury_real_long_term": 2000}
CFTC = "https://www.cftc.gov/files/dea/history/"
CFTC_SETS = {"deacot{y}.zip": (1986, "legacy_fut"), "fut_disagg_txt_{y}.zip": (2006, "disagg_fut"),
             "fut_fin_txt_{y}.zip": (2006, "tff_fut"), "deahistfo{y}.zip": (1995, "legacy_futopt")}
CFTC_HIST = {"fut_disagg_txt_hist_2006_2016.zip": "disagg_fut", "fut_fin_txt_hist_2006_2016.zip": "tff_fut",
             "deacot1986_2016.zip": "legacy_fut", "deahistfo_1995_2016.zip": "legacy_futopt"}
PINK_PAGE = "https://www.worldbank.org/en/research/commodity-markets"


def parse_wb(body):
    meta, rows = body
    pts = [r for r in rows or [] if r.get("value") is not None]
    years = [r["date"] for r in pts]
    return len(pts), (min(years) if years else None), (max(years) if years else None)


def worldbank():
    for ind in WB_INDICATORS:
        dest = fetch.RAW / "worldbank" / f"{ind}.json"
        if fetch.skip(dest):
            continue
        url = WB.format(ind)
        body = fetch.request(url, {"format": "json", "per_page": 20000, "date": "1960:2030"}, timeout=120).json()
        if len(body) < 2:
            print("FAIL", ind, body)
            continue
        fetch.save(dest, url, json.dumps(body), lambda b: parse_wb(json.loads(b)))


def parse_sdmx_csv(body):
    reader = csv.DictReader(io.StringIO(body.decode("utf-8", "replace")))
    periods, n = [], 0
    for r in reader:
        n += 1
        p = r.get("TIME_PERIOD")
        if p:
            periods.append(p)
    return n, (min(periods) if periods else None), (max(periods) if periods else None)


def sdmx(base, flows, sub, headers):
    for flow in flows:
        name = re.sub(r"[^A-Za-z0-9_]+", "_", flow).strip("_") + ".csv"
        dest = fetch.RAW / sub / name
        if fetch.skip(dest):
            continue
        url = base.format(flow)
        try:
            r = fetch.request(url, timeout=600, headers=headers)
        except fetch.FetchError as e:
            print("FAIL", flow, e)
            fetch.gate(sub, url, str(e))
            continue
        fetch.save(dest, url, r.content, parse_sdmx_csv)
        fetch.time.sleep(3)


def imf():
    sdmx(IMF, IMF_FLOWS, "imf", SDMX_CSV)


def oecd():
    sdmx(OECD, OECD_FLOWS, "oecd", {"Accept": "application/vnd.sdmx.data+csv; charset=utf-8", **fetch.UA})


def bis_links(html):
    return sorted(set(re.findall(r"(WS_[A-Z0-9_]+_csv_flat\.zip)", html)))


def parse_bis_zip(body):
    z = zipfile.ZipFile(io.BytesIO(body))
    with z.open(z.namelist()[0]) as f:
        return parse_sdmx_csv(f.read())


def bis():
    for name in bis_links(fetch.request(BIS_PAGE).text):
        fetch.get(BIS + name, fetch.RAW / "bis" / name, parse_bis_zip, timeout=600)


def parse_treasury(body):
    reader = csv.reader(io.StringIO(body.decode("utf-8", "replace")))
    next(reader, None)
    dates = []
    for r in reader:
        if r and re.match(r"\d{2}/\d{2}/\d{4}", r[0]):
            m, d, y = r[0].split("/")
            dates.append(f"{y}-{m}-{d}")
    return len(dates), (min(dates) if dates else None), (max(dates) if dates else None)


def treasury():
    this = date.today().year
    for kind, first in TREASURY_TYPES.items():
        for y in range(first, this + 1):
            dest = fetch.RAW / "treasury" / kind / f"{y}.csv"
            url = TREASURY.format(y=y)
            fetch.get(url, dest, parse_treasury, current=y == this, params={"type": kind, "field_tdr_date_value": y, "page": "", "_format": "csv"})


def parse_cftc(body):
    z = zipfile.ZipFile(io.BytesIO(body))
    text = z.read(z.namelist()[0]).decode("latin1")
    reader = csv.reader(io.StringIO(text))
    header = next(reader)
    idx = next((i for i, h in enumerate(header) if "YYYY-MM-DD" in h or h.strip() == "Report_Date_as_YYYY-MM-DD"), None)
    dates, n = [], 0
    for r in reader:
        n += 1
        if idx is not None and idx < len(r):
            dates.append(r[idx][:10])
    return n, (min(dates) if dates else None), (max(dates) if dates else None)


def cftc():
    this = date.today().year
    for pattern, (first, sub) in CFTC_SETS.items():
        for y in range(first, this + 1):
            name = pattern.format(y=y)
            dest = fetch.RAW / "cftc" / sub / name
            fetch.get(CFTC + name, dest, parse_cftc, current=y == this)
            fetch.time.sleep(0.5)
    for name, sub in CFTC_HIST.items():
        fetch.get(CFTC + name, fetch.RAW / "cftc" / sub / name, parse_cftc)


def pink_links(html):
    return sorted(set(re.findall(r'href="(https://thedocs\.worldbank\.org/[^"]+CMO-Historical-Data-[A-Za-z]+\.xlsx)"', html)))


def pinksheet():
    for link in pink_links(fetch.request(PINK_PAGE).text):
        fetch.get(link, fetch.RAW / "pinksheet" / link.split("/")[-1])


def run():
    for fn in (worldbank, treasury, cftc, pinksheet, bis, oecd, imf):
        try:
            fn()
        except fetch.FetchError as e:
            print("FAIL", fn.__name__, e)
