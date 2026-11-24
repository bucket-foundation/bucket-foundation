import csv
import gzip
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta

from asc_setup import BASE

POLINGUAL_APP = "6825177856"
PRODUCTS = ["com.polingual.monthly", "com.polingual.yearly", "com.polingual.family.yearly", "com.polingual.lifetime"]
APP_DOWNLOAD_TYPES = {"1", "1F", "1T", "1E", "1EP", "1EU", "F1"}
VERSIONS = {"SALES": "1_0", "SUBSCRIPTION": "1_3", "SUBSCRIPTION_EVENT": "1_3"}
SUBSCRIPTION_COLUMNS = {
    "standard": ["Active Standard Price Subscriptions"],
    "trial": ["Active Free Trial Introductory Offer Subscriptions"],
    "introPaid": ["Active Pay Up Front Introductory Offer Subscriptions", "Active Pay As You Go Introductory Offer Subscriptions"],
    "promo": ["Free Trial Promotional Offer Subscriptions", "Pay Up Front Promotional Offer Subscriptions", "Pay As You Go Promotional Offer Subscriptions"],
    "offerCode": ["Free Trial Offer Code Subscriptions", "Pay Up Front Offer Code Subscriptions", "Pay As You Go Offer Code Subscriptions"],
    "billingRetry": ["Billing Retry"],
    "grace": ["Grace Period"],
}
SKU_RE = re.compile(r"^[A-Za-z0-9._-]{1,80}$")
MAX_NOTE = 200
SUBSCRIPTION_LOOKBACK = 5
REPORT_DELAY_DAYS = 2
RETRY_STATUS = {429, 500, 502, 503, 504}
RETRY_WAITS = [2, 6, 18]


class ReportError(Exception):
    pass


def table(text, required):
    rows = list(csv.DictReader(io.StringIO(text), delimiter="\t"))
    head = rows[0].keys() if rows else (text.splitlines() or [""])[0].split("\t")
    missing = [c for c in required if c not in head]
    if missing:
        raise ReportError(f"report lacks columns {', '.join(missing)}")
    return rows


def integer(v):
    v = (v or "").strip()
    return int(float(v)) if v else 0


def sku_for(apple_id, names):
    sku = names.get(apple_id) or f"apple-id-{apple_id}"
    return sku if SKU_RE.match(sku) else None


def parse_sales(text, day, app=POLINGUAL_APP, products=PRODUCTS):
    totals = {}
    for r in table(text, ["SKU", "Product Type Identifier", "Units", "Developer Proceeds", "Currency of Proceeds", "Apple Identifier"]):
        sku = r["SKU"].strip()
        if sku in products:
            key = (sku, "product")
        elif r["Apple Identifier"].strip() == app and r["Product Type Identifier"].strip() in APP_DOWNLOAD_TYPES:
            key = ("app", "app")
        else:
            continue
        units = integer(r["Units"])
        key += ((r["Currency of Proceeds"] or "").strip().upper(),)
        have = totals.setdefault(key, [0, 0.0])
        have[0] += units
        have[1] += units * float(r["Developer Proceeds"] or 0)
    return [{"day": day, "sku": sku, "kind": kind, "units": u, "proceeds": round(p, 2), "currency": cur}
            for (sku, kind, cur), (u, p) in sorted(totals.items())]


def parse_subscriptions(text, names, app=POLINGUAL_APP):
    totals = {}
    for r in table(text, ["App Apple ID", "Subscription Apple ID", "Active Standard Price Subscriptions"]):
        if r["App Apple ID"].strip() != app:
            continue
        sku = sku_for(r["Subscription Apple ID"].strip(), names)
        if not sku:
            continue
        have = totals.setdefault(sku, {k: 0 for k in SUBSCRIPTION_COLUMNS})
        for field, columns in SUBSCRIPTION_COLUMNS.items():
            have[field] += sum(integer(r.get(c)) for c in columns)
    return [{"sku": sku, **totals[sku]} for sku in sorted(totals)]


def parse_events(text, day, names, app=POLINGUAL_APP):
    totals = {}
    for r in table(text, ["Event", "App Apple ID", "Subscription Apple ID", "Quantity"]):
        if r["App Apple ID"].strip() != app:
            continue
        sku = sku_for(r["Subscription Apple ID"].strip(), names)
        event = r["Event"].strip()[:80]
        if not sku or not event:
            continue
        key = (sku, event, (r.get("Subscription Offer Type") or "").strip()[:40])
        totals[key] = totals.get(key, 0) + integer(r["Quantity"])
    return [{"day": day, "sku": sku, "event": event, "offer": offer, "quantity": q} for (sku, event, offer), q in sorted(totals.items())]


def fetch(api, vendor, report_type, day, opener=urllib.request.urlopen, sleep=time.sleep):
    q = urllib.parse.urlencode({
        "filter[frequency]": "DAILY", "filter[reportType]": report_type, "filter[reportSubType]": "SUMMARY",
        "filter[vendorNumber]": vendor, "filter[reportDate]": day, "filter[version]": VERSIONS[report_type],
    })
    for wait in [*RETRY_WAITS, None]:
        req = urllib.request.Request(f"{BASE}/v1/salesReports?{q}", headers={"Authorization": "Bearer " + api.token(), "Accept": "application/a-gzip, application/json"})
        try:
            with opener(req, timeout=60) as r:
                return "ok", gzip.decompress(r.read()).decode("utf-8")
        except urllib.error.HTTPError as e:
            raw = e.read().decode(errors="replace")
            if e.code == 404:
                return "absent", None
            if e.code in RETRY_STATUS and wait is not None:
                sleep(wait)
                continue
            try:
                detail = " ".join(str(x.get("detail") or x.get("title") or "") for x in json.loads(raw).get("errors", []))
            except ValueError:
                detail = raw
            raise ReportError(f"HTTP {e.code} {detail}".strip())


def product_names(api, app=POLINGUAL_APP):
    names = {}
    for g in api.all(f"/v1/apps/{app}/subscriptionGroups?limit=50&fields[subscriptionGroups]=referenceName"):
        for s in api.all(f"/v1/subscriptionGroups/{g['id']}/subscriptions?limit=50&fields[subscriptions]=productId"):
            names[s["id"]] = s["attributes"]["productId"]
    for p in api.all(f"/v1/apps/{app}/inAppPurchasesV2?limit=50&fields[inAppPurchases]=productId"):
        names[p["id"]] = p["attributes"]["productId"]
    return names


def vendor_number():
    v = os.environ.get("ASC_VENDOR_NUMBER", "").strip()
    return v if re.fullmatch(r"[0-9]{6,12}", v) else None


def daily(api, vendor, report_type, days, parse, stored=(), pending=()):
    fetched, absent, rows = [], [], []
    for day in days:
        if day in stored:
            continue
        status, text = fetch(api, vendor, report_type, day)
        if status == "ok":
            fetched.append(day)
            rows += parse(text, day)
        elif day not in pending:
            absent.append(day)
    if not fetched and not stored:
        return None
    return {"days": sorted(fetched + absent), "rows": rows}


def latest_subscriptions(api, vendor, days, names):
    for day in reversed(days[-SUBSCRIPTION_LOOKBACK:]):
        status, text = fetch(api, vendor, "SUBSCRIPTION", day)
        if status == "ok":
            return {"day": day, "rows": parse_subscriptions(text, names)}
    return None


def stored_days(report):
    daily_rows = ((report or {}).get("revenue") or {}).get("daily") or []
    return {
        "sales": {d["day"] for d in daily_rows if d.get("appUnits") is not None},
        "events": {d["day"] for d in daily_rows if d.get("trialsStarted") is not None},
    }


def read_stored(snapshot_url, key, opener=urllib.request.urlopen):
    url = snapshot_url.rstrip("/")
    url = url[: -len("/snapshot")] if url.endswith("/snapshot") else url
    try:
        with opener(urllib.request.Request(url, headers={"Authorization": "Bearer " + key}), timeout=30) as r:
            return stored_days(json.loads(r.read()))
    except (OSError, ValueError) as e:
        print(f"stored revenue days unreadable, reading the full window: {getattr(e, 'code', type(e).__name__)}", file=sys.stderr)
        return stored_days(None)


def collect(api, days=30, today=None, vendor=None, stored=None):
    today = today or date.today()
    stored = stored or stored_days(None)
    window = [(today - timedelta(days=n)).isoformat() for n in range(days, 0, -1)]
    pending = set(window[-REPORT_DELAY_DAYS:])
    out = {"days": days, "known": [], "sales": None, "subscriptions": None, "events": None, "notes": []}
    names = product_names(api)
    out["known"] = sorted(n for n in set(names.values()) if SKU_RE.match(n))
    vendor = vendor or vendor_number()
    if not vendor:
        out["notes"].append("ASC_VENDOR_NUMBER is not set, so no Sales and Trends report was requested")
        return out
    sections = {
        "sales": lambda: daily(api, vendor, "SALES", window, parse_sales, stored["sales"], pending),
        "subscriptions": lambda: latest_subscriptions(api, vendor, window, names),
        "events": lambda: daily(api, vendor, "SUBSCRIPTION_EVENT", window, lambda text, day: parse_events(text, day, names), stored["events"], pending),
    }
    for name, load in sections.items():
        try:
            out[name] = load()
            if out[name] is None:
                out["notes"].append(f"{name}: Apple returned no report in the last {days} days")
        except (ReportError, OSError, ValueError) as e:
            out["notes"].append(f"{name}: {e}"[:MAX_NOTE])
    return out
