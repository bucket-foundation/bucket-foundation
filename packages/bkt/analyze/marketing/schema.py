from __future__ import annotations

from urllib.parse import urlsplit

from .adapters import Adapter, header_currency
from .parse import blank, money_column, parse_day, text

SCHEMA = "marketing.v1"
CHANNELS = (
    (("facebook", "instagram", "meta", "fb", "ig", "paid social", "paid_social_meta"), "paid_social_meta"),
    (("google", "adwords", "cpc", "paid search", "paid_search_google", "google ads"), "paid_search_google"),
    (("organic search", "seo"), "organic_search"),
    (("direct", "(direct)", "(none)"), "direct"),
    (("email", "newsletter", "klaviyo", "mailchimp"), "email"),
    (("referral",), "referral"),
    (("organic social", "social"), "organic_social"),
)


def channel_of(raw: str | None) -> str:
    if not raw:
        return "unattributed"
    s = raw.strip().lower()
    if s.startswith(("http://", "https://")):
        host = urlsplit(s).hostname or ""
        host = host[4:] if host.startswith("www.") else host
        if "mail" in host.split(".")[0]:
            return "email"
        s = host or "unattributed"
    if "organic" in s:
        return "organic_social" if any(k in s for k in ("social", "facebook", "instagram", "tiktok")) else "organic_search"
    for keys, name in CHANNELS:
        if s == name or any(k == s or (len(k) > 3 and k in s) for k in keys):
            return name
    return s[:60]


def normalize(values: dict[str, list], adapter: Adapter, mapping: dict[str, str]) -> tuple[list[dict], list[dict], list[dict]]:
    warnings: list[dict] = []
    n = len(next(iter(values.values()))) if values else 0
    money: dict[str, list] = {}
    file_currency = None
    for f in ("spend", "revenue", "refunded", "impressions", "clicks", "conversions", "sessions"):
        if f in mapping:
            col, cur, warn = money_column(values[mapping[f]])
            money[f] = col
            file_currency = file_currency or header_currency(mapping[f]) or (cur if f in ("spend", "revenue") else None)
            if warn:
                warnings.append({"code": warn, "where": mapping[f], "message": "numbers fit neither 1,234.56 nor 1.234,56 in 95% of rows; column skipped"})
                money[f] = [None] * n
    cur_col = values.get(mapping["currency"]) if "currency" in mapping else None

    def get(f: str, i: int):
        return values[mapping[f]][i] if f in mapping else None

    ad: list[dict] = []
    txn: list[dict] = []
    footer = 0
    undated = 0
    excluded = 0
    seen_orders: set[str] = set()
    for i in range(n):
        first = next((values[c][i] for c in values), None)
        if adapter.footer and isinstance(first, str) and first.strip().lower().startswith(adapter.footer):
            footer += 1
            continue
        day = parse_day(get("date", i))
        currency = (text(cur_col[i]).upper() if cur_col is not None and not blank(cur_col[i]) else None) or file_currency or "unknown"
        if adapter.grain == "ad":
            row = {"date": day, "platform": adapter.platform, "channel": adapter.channel or channel_of(text(get("channel", i))),
                   "campaign": text(get("campaign", i)), "currency": currency}
            for f in ("spend", "impressions", "clicks", "conversions", "revenue", "sessions"):
                row[f] = money[f][i] if f in money else None
            if all(row[f] is None for f in ("spend", "impressions", "clicks", "conversions", "revenue", "sessions")):
                continue
            if day is None:
                undated += 1
            ad.append(row)
        else:
            order = text(get("order_id", i))
            revenue = money["revenue"][i] if "revenue" in money else None
            if order is not None and order in seen_orders:
                continue
            if order is not None and revenue is None and adapter.platform == "shopify":
                continue
            status = (text(get("status", i)) or "").lower().replace("_", " ")
            if adapter.counted and status not in adapter.counted:
                excluded += 1
                if order:
                    seen_orders.add(order)
                continue
            refunded = money["refunded"][i] if "refunded" in money else None
            if revenue is not None and refunded:
                revenue -= refunded
            if order:
                seen_orders.add(order)
            if day is None:
                undated += 1
            txn.append({"date": day, "platform": adapter.platform, "order_id": order, "customer": text(get("customer_id", i)) or order,
                        "revenue": revenue, "channel": channel_of(text(get("channel", i))) if "channel" in mapping else None,
                        "currency": currency, "status": status or None})
    if footer:
        warnings.append({"code": "W_FOOTER_ROWS", "where": adapter.platform, "message": f"{footer} total rows skipped"})
    if undated:
        warnings.append({"code": "W_UNDATED", "where": mapping.get("date", "date"), "message": f"{undated} rows have no readable date and sit outside time series"})
    if excluded:
        warnings.append({"code": "W_STATUS_EXCLUDED", "where": mapping.get("status", "status"), "message": f"{excluded} orders with a status outside {', '.join(adapter.counted)} left out of revenue"})
    return ad, txn, warnings
