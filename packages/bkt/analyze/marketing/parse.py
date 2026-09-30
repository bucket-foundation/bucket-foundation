from __future__ import annotations

import datetime as dt
import functools
import math
import re

SYMBOLS = {"$": "USD", "€": "EUR", "£": "GBP", "¥": "JPY"}
ISO = re.compile(r"^([A-Z]{3})\s*|\s*([A-Z]{3})$")
US = re.compile(r"^-?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$")
EU = re.compile(r"^-?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$")
SHARE = 0.95
MISSING = {"", "-", "--", "n/a", "na", "null", "none", "nan"}
DAY_FORMATS = ("%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%d.%m.%Y", "%b %d, %Y", "%B %d, %Y", "%a, %b %d, %Y", "%Y%m%d")
STAMP_FORMATS = ("%Y-%m-%d %H:%M:%S %z", "%Y-%m-%d %H:%M %z", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S", "%m/%d/%Y %H:%M", "%m/%d/%Y %H:%M:%S")


def blank(v) -> bool:
    if v is None:
        return True
    if isinstance(v, float) and math.isnan(v):
        return True
    return isinstance(v, str) and v.strip().lower() in MISSING


def strip_currency(s: str) -> tuple[str, str | None]:
    s = s.strip().replace(" ", " ")
    cur = None
    for sym, code in SYMBOLS.items():
        if sym in s:
            s = s.replace(sym, "")
            cur = code
    m = ISO.search(s)
    if m:
        cur = m.group(1) or m.group(2)
        s = ISO.sub("", s)
    return s.strip(), cur


def _clean(s: str) -> tuple[str, bool]:
    neg = s.startswith("(") and s.endswith(")")
    if neg:
        s = s[1:-1].strip()
    if s.startswith("-"):
        neg = not neg if neg else True
        s = s[1:].strip()
    return s.replace(" ", ""), neg


def money_column(values: list) -> tuple[list, str | None, str | None]:
    texts = []
    currencies: dict[str, int] = {}
    for v in values:
        if blank(v) or isinstance(v, bool):
            texts.append(None)
        elif isinstance(v, (int, float)):
            texts.append(float(v) if math.isfinite(v) else None)
        else:
            s, cur = strip_currency(str(v))
            if cur:
                currencies[cur] = currencies.get(cur, 0) + 1
            texts.append(_clean(s.rstrip("%")))
    strs = [t for t in texts if isinstance(t, tuple)]
    nums = sum(isinstance(t, float) for t in texts)
    style = "us"
    if strs:
        whole = len(strs) + nums
        us = (nums + sum(bool(US.match(t[0])) for t in strs)) / whole
        eu = (nums + sum(bool(EU.match(t[0])) for t in strs)) / whole
        us_only = sum(bool(US.match(t[0])) and not EU.match(t[0]) for t in strs)
        eu_only = sum(bool(EU.match(t[0])) and not US.match(t[0]) for t in strs)
        if us >= SHARE and us_only >= eu_only:
            style = "us"
        elif eu >= SHARE:
            style = "eu"
        else:
            return [t if isinstance(t, float) else None for t in texts], _top(currencies), "W_NUMBER_FORMAT"
    out: list = []
    for t in texts:
        if t is None or isinstance(t, float):
            out.append(t)
            continue
        s, neg = t
        s = s.replace(",", "") if style == "us" else s.replace(".", "").replace(",", ".")
        try:
            f = float(s)
        except ValueError:
            out.append(None)
            continue
        out.append(-f if neg else f)
    return out, _top(currencies), None


def _top(counts: dict[str, int]) -> str | None:
    return max(counts, key=counts.get) if counts else None


def parse_day(v) -> str | None:
    if isinstance(v, dt.datetime):
        if v.tzinfo is not None:
            v = v.astimezone(dt.timezone.utc)
        return v.date().isoformat()
    if isinstance(v, dt.date):
        return v.isoformat()
    if blank(v) or not isinstance(v, str):
        return None
    return day_text(v.strip())


@functools.lru_cache(maxsize=65536)
def day_text(s: str) -> str | None:
    if s.endswith(" UTC"):
        s = s[:-4]
    for fmt in STAMP_FORMATS:
        try:
            d = dt.datetime.strptime(s, fmt)
        except ValueError:
            continue
        if d.tzinfo is not None:
            d = d.astimezone(dt.timezone.utc)
        return d.date().isoformat()
    for fmt in DAY_FORMATS:
        try:
            return dt.datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    try:
        d = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None
    if d.tzinfo is not None:
        d = d.astimezone(dt.timezone.utc)
    return d.date().isoformat()


def text(v) -> str | None:
    if blank(v):
        return None
    return str(v).strip()[:200]
