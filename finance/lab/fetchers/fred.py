import csv
import io
import os

import fetch

SERIES = """
GDP GDPC1 GDPPOT NGDPPOT A191RL1Q225SBEA GDPDEF PCE PCEC96 PCEPI PCEPILFE CPIAUCSL CPIAUCNS CPILFESL CPIENGSL CPIUFDSL
CUSR0000SAH1 CUSR0000SEHC PPIACO PPIFIS WPSFD4131 T5YIE T10YIE T5YIFR MICH EXPINF1YR UNRATE U6RATE CIVPART EMRATIO
PAYEMS USPRIV MANEMP ICSA CCSA JTSJOL JTSQUR JTSHIR AHETPI CES0500000003 AWHAETP INDPRO TCU IPMAN RSAFS RSXFS RRSFS
UMCSENT HOUST PERMIT HSN1F EXHOSLUSM495S MSACSR CSUSHPINSA CSUSHPISA SPCS20RSA SPCS10RSA USSTHPI MSPUS MORTGAGE30US
MORTGAGE15US RRVRUSQ156N RHORUSQ156N FEDFUNDS DFF EFFR SOFR IORB DPRIME TB3MS DTB3 DTB6 DTB1YR DGS1MO DGS3MO DGS6MO
DGS1 DGS2 DGS3 DGS5 DGS7 DGS10 DGS20 DGS30 GS1 GS2 GS5 GS10 GS30 DFII5 DFII10 DFII30 T10Y2Y T10Y3M T10YFF THREEFYTP10
AAA BAA DAAA DBAA BAMLH0A0HYM2 BAMLC0A0CM BAMLH0A0HYM2EY BAMLC0A4CBBB BAMLHE00EHYIOAS BAMLEMCBPIOAS TEDRATE
M1SL M2SL M2V BOGMBASE WALCL WRESBAL RRPONTSYD WTREGEN TOTRESNS TOTALSL REVOLSL BUSLOANS TOTLL DRTSCILM DRCCLACBS
NFCI ANFCI STLFSI4 VIXCLS SP500 NASDAQCOM DJIA DTWEXBGS DTWEXAFEGS DEXUSEU DEXJPUS DEXUSUK DEXCHUS DEXCAUS
DEXMXUS DEXSZUS DEXKOUS DEXINUS DEXBZUS DCOILWTICO DCOILBRENTEU DHHNGSP GASREGW PCOPPUSDM PWHEAMTUSDM
PMAIZMTUSDM APU0000708111 GFDEBTN GFDEGDQ188S FYFSD FYFSGDA188S FYOINT MTSDS133FMS W006RC1Q027SBEA A091RC1Q027SBEA
CP CPATAX NCBDBIQ027S TNWMVBSNNCB BOGZ1FL073164003Q PSAVERT DSPIC96 PI W875RX1 TDSP CMDEBT HDTGPDUSQ163N
NETEXP BOPGSTB IMPGS EXPGS USREC USRECD USRECM JHDUSRGDPBR SAHMREALTIME RECPROUSM156N CFNAI GACDFSA066MSFRBPHI
DGORDER NEWORDER AMTMNO BUSINV ISRATIO TTLCONS TLRESCONS ALTSALES TOTALSA VMTD11 RAILFRTCARLOADSD11 IR IQ
INTDSRUSM193N IRLTLT01USM156N IRLTLT01DEM156N IRLTLT01GBM156N IRLTLT01JPM156N CLVMNACSCAB1GQEA19 CPHPTT01EZM659N
ECBDFR ECBMRRFR IRSTCI01JPM156N NROU LNS14000006 LNS14000003 LNU04032231 OPHNFB ULCNFB COMPRNFB PRS85006092
""".split()
API = "https://api.stlouisfed.org/fred/series/observations"
GRAPH = "https://fred.stlouisfed.org/graph/fredgraph.csv"
ALFRED = "https://alfred.stlouisfed.org/graph/alfredgraph.csv"


def parse_csv(body):
    rows = list(csv.reader(io.StringIO(body.decode() if isinstance(body, bytes) else body)))
    data = [r for r in rows[1:] if r and r[0][:4].isdigit()]
    if not data:
        raise fetch.FetchError("fred csv has no observations")
    return len(data), data[0][0], data[-1][0]


def api_to_csv(series, body):
    obs = body.get("observations", [])
    return "observation_date," + series + "\n" + "".join(f"{o['date']},{o['value']}\n" for o in obs)


def one(series, key):
    dest = fetch.RAW / "fred" / f"{series}.csv"
    if fetch.skip(dest):
        return
    if key:
        params = {"series_id": series, "api_key": key, "file_type": "json"}
        body = fetch.request(API, params).json()
        text = api_to_csv(series, body)
        fetch.save(dest, f"{API}?series_id={series}", text, parse_csv)
        return
    for base in (GRAPH, ALFRED):
        try:
            r = fetch.request(base, {"id": series}, timeout=90)
            parse_csv(r.content)
        except fetch.FetchError as e:
            last = e
            continue
        fetch.save(dest, f"{base}?id={series}", r.content, parse_csv)
        return
    raise last


def run():
    key = os.environ.get("FRED_API_KEY")
    failed = []
    for s in dict.fromkeys(SERIES):
        try:
            one(s, key)
        except fetch.FetchError as e:
            failed.append(s)
            print("FAIL", s, e)
        fetch.time.sleep(0.5)
    if failed:
        fetch.gate("fred", GRAPH, f"{len(failed)} series failed on fredgraph and ALFRED; FRED_API_KEY unset: {' '.join(failed)}")
