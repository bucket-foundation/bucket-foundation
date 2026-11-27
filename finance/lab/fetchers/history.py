import io
import re
import time
import zipfile

import fetch

FRENCH = "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/"
SHILLER_PAGE = "https://shillerdata.com/"
JST_PAGE = "https://www.macrohistory.net/database/"
JST_SITE = "https://www.macrohistory.net"


def french_links(html):
    return sorted(set(re.findall(r'href="(ftp/[^"]+_CSV\.zip)"', html)))


def parse_french_zip(body):
    z = zipfile.ZipFile(io.BytesIO(body))
    text = z.read(z.namelist()[0]).decode("latin1")
    keys = [line.split(",")[0].strip() for line in text.splitlines()]
    dates = [k for k in keys if k.isdigit() and len(k) in (4, 6, 8)]
    if not dates:
        return 0, None, None
    def norm(k):
        return f"{k[:4]}-{k[4:6] or '01'}-{k[6:8] or '01'}"
    return len(dates), norm(min(dates, key=lambda k: k.ljust(8, "0"))), norm(max(dates, key=lambda k: k.ljust(8, "0")))


def french():
    html = fetch.request(FRENCH + "data_library.html").text
    links = french_links(html)
    if not links:
        raise fetch.FetchError("french library page has no CSV zips")
    for link in links:
        if fetch.get(FRENCH + link, fetch.RAW / "french" / "library" / link.split("/")[-1], parse_french_zip):
            time.sleep(1)


def shiller_link(html):
    m = re.search(r'(//img1\.wsimg\.com/[^"\s]*?/ie_data\.xls)', html)
    return "https:" + m.group(1) if m else None


def parse_shiller(body):
    import pandas as pd
    x = pd.read_excel(io.BytesIO(body), sheet_name="Data", skiprows=7)
    d = x.iloc[:, 0].dropna()
    d = d[d.apply(lambda v: isinstance(v, (int, float)))]
    first, last = f"{d.iloc[0]:.2f}", f"{d.iloc[-1]:.2f}"
    return len(d), first.replace(".", "-"), last.replace(".", "-")


def shiller():
    link = shiller_link(fetch.request(SHILLER_PAGE).text)
    urls = [u for u in [link] + fetch.SHILLER if u]
    fetch.get_first(urls, fetch.RAW / "shiller" / "ie_data_latest.xls", parse_shiller)


def jst_links(html):
    return sorted(set(re.findall(r'href="(/app/download/\d+/JSTdataset[^"?]+\.(?:dta|xlsx))', html)))


def parse_jst_dta(body):
    import pandas as pd
    df = pd.read_stata(io.BytesIO(body))
    return len(df), str(int(df["year"].min())), str(int(df["year"].max()))


def jst():
    links = jst_links(fetch.request(JST_PAGE).text)
    if not links:
        raise fetch.FetchError("jst page has no dataset links")
    for link in links:
        name = link.split("/")[-1]
        parse = parse_jst_dta if name.endswith(".dta") else None
        fetch.get(JST_SITE + link, fetch.RAW / "jst" / "latest" / name, parse)


def run():
    french()
    shiller()
    jst()
