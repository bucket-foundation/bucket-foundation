from __future__ import annotations

import re
from dataclasses import dataclass, field

CURRENCY_SUFFIX = re.compile(r"\s*[\(\[]\s*(?!UTC)[A-Z]{3}\s*[\)\]]\s*$")


def norm(h: str) -> str:
    h = CURRENCY_SUFFIX.sub("", str(h).replace("﻿", "").strip())
    return re.sub(r"[^a-z0-9]+", " ", h.lower()).strip()


def header_currency(h: str) -> str | None:
    m = re.search(r"[\(\[]\s*((?!UTC)[A-Z]{3})\s*[\)\]]\s*$", str(h))
    return m.group(1) if m else None


@dataclass(frozen=True)
class Adapter:
    platform: str
    grain: str
    required: tuple[tuple[str, ...], ...]
    optional: tuple[str, ...]
    columns: dict[str, tuple[str, ...]]
    channel: str | None = None
    counted: tuple[str, ...] = field(default_factory=tuple)
    footer: str | None = None


ADAPTERS: tuple[Adapter, ...] = (
    Adapter(
        "meta_ads", "ad",
        required=(("campaign name",), ("amount spent",), ("impressions",), ("reporting starts", "day")),
        optional=("reach", "link clicks", "results", "purchases", "purchases conversion value", "cpc cost per link click", "frequency"),
        columns={
            "date": ("day", "reporting starts"), "campaign": ("campaign name",), "spend": ("amount spent",),
            "impressions": ("impressions",), "clicks": ("link clicks", "clicks all", "clicks"),
            "conversions": ("purchases", "website purchases", "results"),
            "revenue": ("purchases conversion value", "website purchases conversion value", "purchase conversion value"),
            "currency": ("currency",),
        },
        channel="paid_social_meta",
    ),
    Adapter(
        "google_ads", "ad",
        required=(("campaign",), ("cost",), ("impr", "impressions"), ("clicks",)),
        optional=("day", "conversions", "conv value", "currency code", "avg cpc", "ctr", "campaign type"),
        columns={
            "date": ("day", "date"), "campaign": ("campaign",), "spend": ("cost",), "impressions": ("impr", "impressions"),
            "clicks": ("clicks",), "conversions": ("conversions",), "revenue": ("conv value", "conversion value", "all conv value"),
            "currency": ("currency code", "currency"),
        },
        channel="paid_search_google",
        footer="total",
    ),
    Adapter(
        "ga4", "ad",
        required=(("session default channel group", "first user default channel group", "default channel group", "session primary channel group"), ("sessions",)),
        optional=("date", "engaged sessions", "key events", "conversions", "total revenue", "purchase revenue", "users", "total users"),
        columns={
            "date": ("date",), "channel": ("session default channel group", "first user default channel group", "default channel group", "session primary channel group"),
            "sessions": ("sessions",), "conversions": ("key events", "conversions"), "revenue": ("total revenue", "purchase revenue"),
        },
    ),
    Adapter(
        "shopify", "txn",
        required=(("name",), ("financial status",), ("total",), ("created at", "paid at")),
        optional=("email", "subtotal", "currency", "lineitem name", "referring site", "source", "shipping", "taxes", "customer id"),
        columns={
            "order_id": ("name",), "customer_id": ("customer id", "email"), "date": ("created at", "paid at"), "revenue": ("total",),
            "refunded": ("refunded amount",), "status": ("financial status",), "currency": ("currency",), "channel": ("utm source", "referring site", "source"),
        },
        counted=("paid", "partially refunded", "partially paid"),
    ),
    Adapter(
        "stripe", "txn",
        required=(("id",), ("amount",), ("created date utc", "created utc", "created"), ("status",)),
        optional=("amount refunded", "currency", "customer id", "customer email", "description", "fee", "captured"),
        columns={
            "order_id": ("id",), "customer_id": ("customer id", "customer email"), "date": ("created date utc", "created utc", "created"),
            "revenue": ("amount",), "refunded": ("amount refunded",), "status": ("status",), "currency": ("currency",),
        },
        counted=("paid", "succeeded", "partially refunded"),
    ),
    Adapter(
        "hubspot", "txn",
        required=(("record id",), ("deal stage",), ("amount",), ("close date",)),
        optional=("deal name", "pipeline", "original source", "original traffic source", "associated company", "deal owner", "create date"),
        columns={
            "order_id": ("record id",), "customer_id": ("associated company", "associated contact", "company name", "deal name"),
            "date": ("close date",), "revenue": ("amount",), "status": ("deal stage",), "channel": ("original source", "original traffic source"),
            "currency": ("currency",),
        },
        counted=("closed won", "closedwon"),
    ),
)

GENERIC = Adapter(
    "generic", "ad",
    required=(),
    optional=(),
    columns={
        "date": ("date", "day", "week", "month", "period", "reporting starts"), "campaign": ("campaign", "campaign name", "ad set name", "ad group"),
        "channel": ("channel", "source", "medium", "source medium", "platform", "network"),
        "spend": ("spend", "cost", "amount spent", "ad spend", "budget spent"), "impressions": ("impressions", "impr", "views"),
        "clicks": ("clicks", "link clicks"), "conversions": ("conversions", "purchases", "leads", "signups", "orders", "results"),
        "revenue": ("revenue", "sales", "conversion value", "conv value", "value", "income"), "sessions": ("sessions", "visits"),
        "currency": ("currency", "currency code"),
    },
)

METRIC_FIELDS = ("spend", "impressions", "clicks", "conversions", "revenue", "sessions")


def score(adapter: Adapter, headers: set[str]) -> float:
    if not all(any(opt in headers for opt in alts) for alts in adapter.required):
        return 0.0
    return len(adapter.required) + 0.25 * sum(o in headers for o in adapter.optional)


def detect(header: list[str]) -> tuple[Adapter | None, dict[str, str], float]:
    normed = {norm(h): h for h in header if str(h).strip()}
    keys = set(normed)
    best, top = None, 0.0
    for a in ADAPTERS:
        s = score(a, keys)
        if s > top:
            best, top = a, s
    if best is None:
        mapping = column_map(GENERIC, normed)
        metrics = [f for f in METRIC_FIELDS if f in mapping]
        if "date" in mapping and len(metrics) >= 2:
            return GENERIC, mapping, 0.0
        return None, {}, 0.0
    return best, column_map(best, normed), top


def column_map(adapter: Adapter, normed: dict[str, str]) -> dict[str, str]:
    out = {}
    for field_name, candidates in adapter.columns.items():
        for c in candidates:
            if c in normed:
                out[field_name] = normed[c]
                break
    return out


def header_row(rows: list[list], limit: int = 15) -> int:
    best, top = 0, 0.0
    for i, r in enumerate(rows[:limit]):
        adapter, _, s = detect([str(c) if c is not None else "" for c in r])
        if adapter is not None and adapter.platform != "generic" and s > top:
            best, top = i, s
    return best
