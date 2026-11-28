import csv
import io
import re

import fetch

ZILLOW = "https://files.zillowstatic.com/research/public_csvs/"
ZILLOW_FILES = [
    "zhvi/Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
    "zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
    "zhvi/County_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
    "zhvi/State_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
    "zhvi/City_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
    "zhvi/Neighborhood_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
    "zhvi/Metro_zhvi_uc_sfr_tier_0.33_0.67_sm_sa_month.csv",
    "zhvi/Metro_zhvi_uc_condo_tier_0.33_0.67_sm_sa_month.csv",
    "zhvi/Metro_zhvi_uc_sfrcondo_tier_0.0_0.33_sm_sa_month.csv",
    "zhvi/Metro_zhvi_uc_sfrcondo_tier_0.67_1.0_sm_sa_month.csv",
    "zori/Metro_zori_uc_sfrcondomfr_sm_month.csv",
    "zori/Metro_zori_uc_sfrcondomfr_sm_sa_month.csv",
    "zori/Zip_zori_uc_sfrcondomfr_sm_month.csv",
    "zori/County_zori_uc_sfrcondomfr_sm_month.csv",
    "zori/City_zori_uc_sfrcondomfr_sm_month.csv",
]
FHFA = "https://www.fhfa.gov"
FHFA_PAGE = FHFA + "/data/hpi/datasets"
REDFIN = "https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/us_national_market_tracker.tsv000.gz"
FANNIE = "https://capitalmarkets.fanniemae.com/credit-risk-transfer/single-family-credit-risk-transfer/fannie-mae-single-family-loan-performance-data"
FREDDIE = "https://www.freddiemac.com/research/datasets/sf-loanlevel-dataset"
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def parse_wide(body):
    reader = csv.reader(io.StringIO(body.decode("utf-8", "replace")))
    header = next(reader)
    dates = [h for h in header if DATE.match(h)]
    rows = sum(1 for _ in reader)
    return rows, (dates[0] if dates else None), (dates[-1] if dates else None)


def zillow():
    for f in ZILLOW_FILES:
        fetch.get(ZILLOW + f, fetch.RAW / "zillow" / f, parse_wide)


def fhfa_links(html):
    return sorted(set(re.findall(r'href="(/hpi/download/[^"]+\.(?:csv|xlsx))"', html)))


def parse_hpi_master(body):
    reader = csv.DictReader(io.StringIO(body.decode("utf-8", "replace")))
    years = [int(r["yr"]) for r in reader if r.get("yr", "").isdigit()]
    return len(years), (f"{min(years)}-01-01" if years else None), (f"{max(years)}-12-31" if years else None)


def fhfa():
    for link in fhfa_links(fetch.request(FHFA_PAGE).text):
        name = link.split("/")[-1]
        parse = parse_hpi_master if name == "hpi_master.csv" else None
        fetch.get(FHFA + link, fetch.RAW / "fhfa" / name, parse)


def redfin():
    try:
        fetch.request(REDFIN, timeout=30)
    except fetch.FetchError as e:
        fetch.gate("redfin", REDFIN, f"S3 bucket refuses scripted download: {e}")
        return
    fetch.get(REDFIN, fetch.RAW / "redfin" / "us_national_market_tracker.tsv.gz")


def loan_level():
    fetch.gate("fannie_mae_loan_performance", FANNIE, "Data Dynamics download needs a registered login")
    fetch.gate("freddie_mac_loan_level", FREDDIE, "Clarity download needs a registered login; only file_headers zip is open")
    fetch.get(FREDDIE.split("/research")[0] + "/fmac-resources/research/docs/file_headers_july_2026.zip",
              fetch.RAW / "freddie" / "file_headers_july_2026.zip")


def run():
    zillow()
    fhfa()
    redfin()
    loan_level()
