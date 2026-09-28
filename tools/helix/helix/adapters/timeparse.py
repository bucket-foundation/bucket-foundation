from __future__ import annotations

import datetime as dt

from ..schema import SeriesError

def year_fraction(value, path: str) -> float:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    text = str(value).strip()
    try:
        if len(text) == 4:
            return float(int(text))
        if len(text) == 7:
            y, m = text.split("-")
            return int(y) + (int(m) - 1) / 12
        d = dt.date.fromisoformat(text[:10])
    except ValueError as exc:
        raise SeriesError("E_NONFINITE", path, f"unreadable time {value!r}") from exc
    start = dt.date(d.year, 1, 1)
    days = (dt.date(d.year + 1, 1, 1) - start).days
    return d.year + (d - start).days / days
