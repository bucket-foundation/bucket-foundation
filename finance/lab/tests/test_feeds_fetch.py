import json

import pandas as pd
import pytest

import fetch
from lab import feeds


class Resp:
    def __init__(self, status, body):
        self.status_code = status
        self._body = body
        self.content = json.dumps(body).encode()
        self.text = json.dumps(body)

    def json(self):
        return self._body


def test_fred_falls_back_to_cache(monkeypatch):
    def down(*a, **k):
        raise ConnectionError("blocked")
    monkeypatch.setattr(feeds, "_get", down)
    cached = pd.Series([4.9], index=pd.to_datetime(["2026-11-24"]))
    monkeypatch.setattr(feeds.data, "fred", lambda s: cached)
    s, src = feeds.fred_series("DGS10")
    assert src.startswith("FRED cached") and s.iloc[-1] == 4.9


def test_fred_without_cache_raises(monkeypatch):
    monkeypatch.setattr(feeds, "_get", lambda *a, **k: (_ for _ in ()).throw(ConnectionError("x")))
    def missing(s):
        raise FileNotFoundError(s)
    monkeypatch.setattr(feeds.data, "fred", missing)
    with pytest.raises(FileNotFoundError):
        feeds.fred_series("NOPE")


def test_price_series_falls_back_to_stooq(monkeypatch):
    monkeypatch.setattr(feeds, "yahoo_daily", lambda s: (_ for _ in ()).throw(ValueError("y")))
    monkeypatch.setattr(feeds, "stooq_daily", lambda s: pd.Series([1.0]))
    assert feeds.price_series("^GSPC", "^spx")[1] == "Stooq"


def test_coinbase_429_retries_then_raises_and_writes_nothing(tmp_path, monkeypatch):
    monkeypatch.setattr(fetch, "RAW", tmp_path)
    calls = []
    def fake(url, params=None, headers=None, timeout=None):
        calls.append(params)
        if len(calls) == 1:
            return Resp(200, [[1700000000, 1, 2, 1, 1.5, 10]])
        return Resp(429, {})
    monkeypatch.setattr(fetch.requests, "get", fake)
    with pytest.raises(fetch.FetchError):
        fetch.fetch_coinbase("BTC-USD", sleep=lambda s: None)
    assert len(calls) == 1 + fetch.RETRIES
    assert not list(tmp_path.rglob("*.json"))


def test_coinbase_short_history_rejected(tmp_path, monkeypatch):
    monkeypatch.setattr(fetch, "RAW", tmp_path)
    pages = iter([Resp(200, [[1700000000, 1, 2, 1, 1.5, 10]]), Resp(200, [])])
    monkeypatch.setattr(fetch.requests, "get", lambda *a, **k: next(pages))
    with pytest.raises(fetch.FetchError, match="starts"):
        fetch.fetch_coinbase("BTC-USD", sleep=lambda s: None)
    assert not list(tmp_path.rglob("*.json"))


def test_kalshi_404_fails_loudly(tmp_path, monkeypatch):
    monkeypatch.setattr(fetch, "RAW", tmp_path)
    monkeypatch.setattr(fetch.requests, "get", lambda *a, **k: Resp(404, {}))
    with pytest.raises(fetch.FetchError):
        fetch.fetch_kalshi(sleep=lambda s: None)


def test_atomic_write_and_refresh(tmp_path, monkeypatch):
    dest = tmp_path / "a" / "x.csv"
    fetch.atomic_write(dest, "new")
    assert dest.read_text() == "new" and not (tmp_path / "a" / "x.csv.part").exists()
    monkeypatch.setattr(fetch, "REFRESH", False)
    assert fetch.skip(dest)
    monkeypatch.setattr(fetch, "REFRESH", True)
    assert not fetch.skip(dest)
