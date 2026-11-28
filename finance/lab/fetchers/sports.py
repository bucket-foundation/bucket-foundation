import csv
import io
import re
import time
from datetime import datetime

import fetch

FD = "https://www.football-data.co.uk/"
SEASON_NOW = "2627"
GATED = {
    "aussportsbetting": ("https://www.aussportsbetting.com/data/", "403 to scripted requests"),
    "the_odds_api_history": ("https://the-odds-api.com/liveapi/guides/v4", "historical odds are a paid plan"),
    "oddsportal": ("https://www.oddsportal.com", "no API; site ToS bars scraping"),
    "sportsdataio": ("https://sportsdata.io/historical-odds", "contact sales"),
}


def country_pages(html):
    pages = set()
    for href in re.findall(r'href="([^"]+\.php)"', html, re.I):
        name = href.split("/")[-1]
        if "blog" in href or name.lower() in {"data.php", "contact.php", "matches.php", "thestatsapi.php", "all_new_data.php"}:
            continue
        if href.startswith("http") and "football-data.co.uk" not in href:
            continue
        pages.add(name)
    return sorted(pages)


def csv_links(html):
    return sorted(set(m for m in re.findall(r'href="((?:mmz4281|new)/[^"]+\.csv)"', html, re.I)))


def parse_date(s):
    for fmt in ("%d/%m/%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(s.strip(), fmt).date().isoformat()
        except ValueError:
            continue
    return None


def parse_matches(body):
    text = body.decode("latin1")
    reader = csv.DictReader(io.StringIO(text))
    dates, n = [], 0
    for r in reader:
        if not any((v or "").strip() for v in r.values() if isinstance(v, str)):
            continue
        n += 1
        d = parse_date(r.get("Date") or "")
        if d:
            dates.append(d)
    return n, (min(dates) if dates else None), (max(dates) if dates else None)


def football_data():
    pages = country_pages(fetch.request(FD + "data.php").text) + ["all_new_data.php"]
    links = set()
    for p in pages:
        time.sleep(1)
        try:
            links.update(csv_links(fetch.request(FD + p).text))
        except fetch.FetchError as e:
            print("FAIL", p, e)
    if not links:
        raise fetch.FetchError("football-data pages listed no csv links")
    for link in sorted(links):
        current = SEASON_NOW in link or link.lower().startswith("new/")
        if fetch.get(FD + link, fetch.RAW / "football_data" / link, parse_matches, current=current):
            time.sleep(0.5)


def run():
    football_data()
    for name, (url, reason) in GATED.items():
        fetch.gate(name, url, reason)
