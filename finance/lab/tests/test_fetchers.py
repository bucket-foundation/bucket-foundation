import gzip
import io
import json
import zipfile
from datetime import date

import pytest

import fetch
from fetchers import crypto, fred, gpu, history, kalshi, macro, polymarket, realestate, sec, sports


def zbytes(name, text):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr(name, text)
    return buf.getvalue()


def test_polymarket_page_drops_images_and_reads_cursor():
    rows, cursor = polymarket.parse_page({"markets": [{"id": "1", "image": "x", "question": "q"}], "next_cursor": "abc"})
    assert rows == [{"id": "1", "question": "q"}] and cursor == "abc"
    assert polymarket.parse_page({"markets": [], "next_cursor": ""})[1] is None


def test_polymarket_history_rows_and_tokens():
    rows = polymarket.parse_history("7", "tok", {"history": [{"t": 1700000000, "p": 0.4}]})
    assert rows == [{"id": "7", "token": "tok", "t": 1700000000, "p": 0.4}]
    assert polymarket.point_date(rows[0]) == "2023-11-14"
    assert polymarket.tokens({"clobTokenIds": '["a","b"]'}) == ["a", "b"]
    assert polymarket.tokens({"clobTokenIds": "bad"}) == []
    assert polymarket.volume({"volumeNum": "12.5"}) == 12.5


def test_kalshi_page_and_candles():
    rows, cursor = kalshi.parse_page({"markets": [{"ticker": "A", "close_time": "2024-01-01T00:00:00Z", "custom_strike": {}}], "cursor": ""})
    assert rows == [{"ticker": "A", "close_time": "2024-01-01T00:00:00Z"}] and cursor is None
    body = {"candlesticks": [{"end_period_ts": 1700000000, "price": {"open_dollars": "0.4", "high_dollars": "0.5",
                                                                     "low_dollars": "0.3", "close_dollars": "0.45"}, "volume_fp": "10"}]}
    c = kalshi.parse_candles("A", body)
    assert c[0]["close"] == "0.45" and c[0]["volume"] == "10" and kalshi.candle_date(c[0]) == "2023-11-14"


def test_paginate_resumes_and_writes_shards(tmp_path, monkeypatch):
    monkeypatch.setattr(fetch, "RAW", tmp_path)
    monkeypatch.setattr(fetch, "MANIFEST", tmp_path / "M.jsonl")
    pages = [([{"d": "2024-01-02"}], "c1"), ([{"d": "2024-01-01"}], None)]
    def gen(cursor):
        start = 0 if cursor is None else 1
        for p in pages[start:]:
            yield p
    state = fetch.paginate(tmp_path / "x", "u", gen, lambda r: r["d"], shard_rows=1)
    assert state["done"] and state["shard"] == 2
    rows = fetch.read_jsonl_gz(tmp_path / "x" / "part-00000.jsonl.gz")
    assert rows == [{"d": "2024-01-02"}]
    m = [json.loads(l) for l in (tmp_path / "M.jsonl").read_text().splitlines()]
    assert m[0]["rows"] == 1 and m[0]["start"] == "2024-01-02"


def test_crypto_parsers_and_csv():
    cb = crypto.coinbase_rows([[1700000000, 1, 3, 2, 2.5, 9]])
    assert cb[0]["low"] == 1 and cb[0]["open"] == 2
    bn = crypto.binance_rows([[1700000000000, "1", "2", "0.5", "1.5", "10", 0, "15", 7, 0, 0, 0]])
    assert bn[0]["t"] == 1700000000 and bn[0]["trades"] == 7
    text = crypto.csv_text(crypto.dedupe(cb + cb))
    assert text.splitlines()[0] == "date,t,low,high,open,close,volume" and len(text.splitlines()) == 2


def test_coinbase_unlisted_product_records_gate(tmp_path, monkeypatch):
    monkeypatch.setattr(fetch, "RAW", tmp_path)
    monkeypatch.setattr(fetch, "GATES", tmp_path / "G.jsonl")
    monkeypatch.setattr(fetch, "request", lambda *a, **k: (_ for _ in ()).throw(fetch.FetchError("u status 404")))
    crypto.coinbase("NOPE", "1d", sleep=lambda s: None)
    assert "NOPE-USD" in (tmp_path / "G.jsonl").read_text()


def test_stablecoin_rows():
    rows = crypto.stablecoin_rows([{"date": "1700000000", "totalCirculatingUSD": {"peggedUSD": 5, "peggedEUR": 1}}])
    assert rows == [{"date": "2023-11-14", "usd": 5, "peggedEUR": 1}]


def test_fred_csv_and_api():
    assert fred.parse_csv(b"observation_date,X\n2000-01-01,1\n2000-02-01,.\n") == (2, "2000-01-01", "2000-02-01")
    with pytest.raises(fetch.FetchError):
        fred.parse_csv(b"<html>blocked</html>")
    text = fred.api_to_csv("X", {"observations": [{"date": "2001-01-01", "value": "2"}]})
    assert fred.parse_csv(text) == (1, "2001-01-01", "2001-01-01")


def test_french_links_and_zip():
    assert history.french_links('<a href="ftp/A_CSV.zip">x</a><a href="ftp/A_TXT.zip">') == ["ftp/A_CSV.zip"]
    body = zbytes("a.csv", "header\n,Mkt-RF\n192607,1.0\n202609,2.0\n\nAnnual\n1927,3\n")
    assert history.parse_french_zip(body) == (3, "1926-07-01", "2026-09-01")


def test_shiller_and_jst_links():
    html = '<a href="//img1.wsimg.com/blobby/go/x/downloads/y/ie_data.xls?ver=1">'
    assert history.shiller_link(html) == "https://img1.wsimg.com/blobby/go/x/downloads/y/ie_data.xls"
    html = '<a href="/app/download/1/JSTdatasetR6.dta?t=2"><a href="/app/download/2/JSTdatasetR6.xlsx?t=2">'
    assert history.jst_links(html) == ["/app/download/1/JSTdatasetR6.dta", "/app/download/2/JSTdatasetR6.xlsx"]


def test_zillow_wide_and_fhfa():
    body = b"RegionID,RegionName,2000-01-31,2026-10-31\n1,US,100,300\n2,NY,1,2\n"
    assert realestate.parse_wide(body) == (2, "2000-01-31", "2026-10-31")
    assert realestate.fhfa_links('href="/hpi/download/monthly/hpi_master.csv" href="/x.pdf"') == ["/hpi/download/monthly/hpi_master.csv"]
    assert realestate.parse_hpi_master(b"hpi_type,yr,period\nt,1975,1\nt,2026,3\n") == (2, "1975-01-01", "2026-12-31")


def test_macro_parsers():
    assert macro.parse_wb([{}, [{"date": "2020", "value": 1}, {"date": "1960", "value": None}]]) == (1, "2020", "2020")
    csvb = b"DATAFLOW,TIME_PERIOD,OBS_VALUE\nX,2001-Q1,1\nX,1999-Q4,2\n"
    assert macro.parse_sdmx_csv(csvb) == (2, "1999-Q4", "2001-Q1")
    assert macro.parse_bis_zip(zbytes("a.csv", csvb.decode())) == (2, "1999-Q4", "2001-Q1")
    assert macro.bis_links("WS_SPP_csv_flat.zip WS_SPP_csv_col.zip") == ["WS_SPP_csv_flat.zip"]
    assert macro.parse_treasury(b'Date,"1 Mo"\n12/31/2024,4.4\n01/02/2024,5.5\n') == (2, "2024-01-02", "2024-12-31")
    cot = zbytes("annual.txt", "Market,Report_Date_as_YYYY-MM-DD,OI\nA,2024-01-02,5\nB,2024-12-31,6\n")
    assert macro.parse_cftc(cot) == (2, "2024-01-02", "2024-12-31")
    html = 'href="https://thedocs.worldbank.org/en/doc/x/related/CMO-Historical-Data-Monthly.xlsx"'
    assert macro.pink_links(html) == ["https://thedocs.worldbank.org/en/doc/x/related/CMO-Historical-Data-Monthly.xlsx"]


def test_sports_links_and_matches():
    html = 'HREF="englandm.php" HREF="blog/x.php" HREF="https://other.com/a.php" HREF="data.php"'
    assert sports.country_pages(html) == ["englandm.php"]
    assert sports.csv_links('HREF="mmz4281/2526/E0.csv" HREF="new/ARG.csv" HREF="x.csv"') == ["mmz4281/2526/E0.csv", "new/ARG.csv"]
    body = b"Div,Date,HomeTeam\nE0,15/08/25,A\nE0,01/05/2026,B\n,,\n"
    assert sports.parse_matches(body) == (2, "2025-08-15", "2026-05-01")


def test_gpu_prices_and_vast():
    assert gpu.dollars_per_hour("H100 $2.49/hr and $3.00 per GPU-hour") == ["2.49", "3.00"]
    assert gpu.vast_rows({"offers": [{"id": 1, "gpu_name": "H100", "junk": 0}]})[0]["gpu_name"] == "H100"


def test_sec_quarters_and_fsds():
    qs = sec.quarters(date(2026, 11, 27))
    assert qs[0] == "2009q1" and qs[-1] == "2026q3"
    body = zbytes("num.txt", "adsh\ttag\tddate\tvalue\na\tX\t20240331\t1\nb\tY\t20091231\t2\n")
    assert sec.parse_fsds(body) == (2, "2009-12-31", "2024-03-31")


def test_sec_without_contact_records_gate(tmp_path, monkeypatch):
    monkeypatch.delenv("SEC_USER_AGENT", raising=False)
    monkeypatch.setattr(fetch, "GATES", tmp_path / "G.jsonl")
    sec.run()
    assert "SEC_USER_AGENT" in (tmp_path / "G.jsonl").read_text()


def test_dataset_cap_refuses_and_logs(tmp_path, monkeypatch):
    monkeypatch.setattr(fetch, "RAW", tmp_path)
    monkeypatch.setattr(fetch, "GATES", tmp_path / "G.jsonl")
    monkeypatch.setattr(fetch, "_sizes", {})
    monkeypatch.setattr(fetch, "DATASET_CAP_BYTES", 10)
    fetch.atomic_write(tmp_path / "zillow" / "a.csv", "12345")
    with pytest.raises(fetch.SizeCap):
        fetch.atomic_write(tmp_path / "zillow" / "b.csv", "123456")
    assert not (tmp_path / "zillow" / "b.csv").exists()
    assert "skipped for size" in (tmp_path / "G.jsonl").read_text()


def test_raw_cap_refuses(tmp_path, monkeypatch):
    monkeypatch.setattr(fetch, "RAW", tmp_path)
    monkeypatch.setattr(fetch, "GATES", tmp_path / "G.jsonl")
    monkeypatch.setattr(fetch, "_sizes", {})
    monkeypatch.setattr(fetch, "RAW_CAP_BYTES", 8)
    fetch.atomic_write(tmp_path / "a" / "x", "12345")
    with pytest.raises(fetch.SizeCap):
        fetch.atomic_write(tmp_path / "b" / "y", "12345")
