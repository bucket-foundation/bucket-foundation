import gzip
import io
import json
import os
import sys
import unittest
import urllib.error
import urllib.parse
from datetime import date
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import revenue_reports as rr

FIXTURES = os.path.join(HERE, "..", "..", "tests", "fixtures", "growth")
NAMES = {"6825200001": "com.polingual.yearly", "6825200002": "com.polingual.monthly"}
FILES = {"SALES": "sales.tsv", "SUBSCRIPTION": "subscription.tsv", "SUBSCRIPTION_EVENT": "subscription_event.tsv"}


def fixture(name):
    with open(os.path.join(FIXTURES, name), encoding="utf-8") as f:
        return f.read()


class StubApi:
    def all(self, path):
        if "subscriptionGroups?" in path:
            return [{"id": "22498866"}]
        if "/subscriptions?" in path:
            return [{"id": i, "attributes": {"productId": p}} for i, p in NAMES.items()]
        return []


def fake_fetch(api, vendor, report_type, day):
    if day == "2026-11-15":
        return "ok", fixture(FILES[report_type])
    return "absent", None


class Body:
    def __init__(self, raw):
        self.raw = raw

    def read(self):
        return self.raw

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def http_error(code, detail):
    return urllib.error.HTTPError("https://example.invalid", code, "x", {}, io.BytesIO(json.dumps({"errors": [{"detail": detail}]}).encode()))


class Opener:
    def __init__(self, *answers):
        self.answers = list(answers)
        self.requests = []

    def __call__(self, req, timeout=None):
        self.requests.append(req)
        answer = self.answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return Body(answer)


class Token:
    def token(self):
        return "t"


class RevenueReports(unittest.TestCase):
    def test_sales_groups_polingual_products_and_downloads(self):
        rows = rr.parse_sales(fixture("sales.tsv"), "2026-11-15")
        got = {(r["sku"], r["currency"]): (r["units"], r["proceeds"]) for r in rows}
        self.assertEqual(got, {
            ("app", "EUR"): (3, 0.0), ("app", "USD"): (12, 0.0),
            ("com.polingual.monthly", "EUR"): (1, 7.2), ("com.polingual.monthly", "USD"): (3, 25.47),
            ("com.polingual.yearly", "USD"): (1, 50.99),
        })

    def test_subscriptions_sum_by_product(self):
        rows = {r["sku"]: r for r in rr.parse_subscriptions(fixture("subscription.tsv"), NAMES)}
        self.assertEqual(sorted(rows), ["com.polingual.monthly", "com.polingual.yearly"])
        self.assertEqual(rows["com.polingual.yearly"], {"sku": "com.polingual.yearly", "standard": 5, "trial": 7, "introPaid": 0, "promo": 0, "offerCode": 2, "billingRetry": 1, "grace": 0})
        self.assertEqual(rows["com.polingual.monthly"]["grace"], 1)

    def test_unmapped_subscription_keeps_its_apple_id(self):
        rows = rr.parse_subscriptions(fixture("subscription.tsv"), {"6825200001": "com.polingual.yearly"})
        self.assertEqual([r["sku"] for r in rows], ["apple-id-6825200002", "com.polingual.yearly"])

    def test_events_count_by_name(self):
        rows = rr.parse_events(fixture("subscription_event.tsv"), "2026-11-15", NAMES)
        got = {(r["sku"], r["event"]): r["quantity"] for r in rows}
        self.assertEqual(got, {
            ("com.polingual.monthly", "Cancel"): 1,
            ("com.polingual.yearly", "Paid Subscription from Introductory Offer"): 2,
            ("com.polingual.yearly", "Start Introductory Offer"): 6,
            ("com.polingual.yearly", "Start Offer Code"): 3,
        })

    def test_missing_columns_raise(self):
        with self.assertRaises(rr.ReportError):
            rr.parse_sales("SKU\tUnits\nx\t1\n", "2026-11-15")
        with self.assertRaises(rr.ReportError):
            rr.parse_subscriptions("", NAMES)

    def test_collect_without_vendor_number_requests_nothing(self):
        with mock.patch.dict(os.environ, {"ASC_VENDOR_NUMBER": ""}), mock.patch.object(rr, "fetch") as fetch:
            out = rr.collect(StubApi(), days=3, today=date(2026, 11, 16))
        fetch.assert_not_called()
        self.assertEqual((out["sales"], out["subscriptions"], out["events"]), (None, None, None))
        self.assertEqual(out["known"], ["com.polingual.monthly", "com.polingual.yearly"])
        self.assertIn("ASC_VENDOR_NUMBER", out["notes"][0])

    def test_collect_matches_the_snapshot_fixture(self):
        with mock.patch.object(rr, "fetch", fake_fetch):
            out = rr.collect(StubApi(), days=5, today=date(2026, 11, 18), vendor="80000000")
        self.assertEqual(out["sales"]["days"], ["2026-11-13", "2026-11-14", "2026-11-15"])
        self.assertEqual(out["subscriptions"]["day"], "2026-11-15")
        self.assertEqual(out, json.loads(fixture("revenue.json")))

    def test_a_window_without_one_fetched_report_has_no_data(self):
        with mock.patch.object(rr, "fetch", lambda *a: ("absent", None)):
            out = rr.collect(StubApi(), days=10, today=date(2026, 11, 18), vendor="80000000")
        self.assertEqual((out["sales"], out["subscriptions"], out["events"]), (None, None, None))
        self.assertEqual(len(out["notes"]), 3)

    def test_recent_absent_days_stay_pending(self):
        def recent(api, vendor, report_type, day):
            return ("ok", fixture(FILES[report_type])) if day == "2026-11-10" else ("absent", None)
        with mock.patch.object(rr, "fetch", recent):
            out = rr.collect(StubApi(), days=8, today=date(2026, 11, 18), vendor="80000000")
        self.assertEqual(out["sales"]["days"], ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"])
        self.assertIsNone(out["subscriptions"])

    def test_stored_days_are_not_requested_again(self):
        asked = []

        def record(api, vendor, report_type, day):
            asked.append((report_type, day))
            return "absent", None
        stored = rr.stored_days({"revenue": {"daily": [{"day": "2026-11-14", "appUnits": 0, "trialsStarted": None}, {"day": "2026-11-15", "appUnits": 3, "trialsStarted": 1}]}})
        with mock.patch.object(rr, "fetch", record):
            out = rr.collect(StubApi(), days=5, today=date(2026, 11, 18), vendor="80000000", stored=stored)
        self.assertEqual([d for t, d in asked if t == "SALES"], ["2026-11-13", "2026-11-16", "2026-11-17"])
        self.assertEqual([d for t, d in asked if t == "SUBSCRIPTION_EVENT"], ["2026-11-13", "2026-11-14", "2026-11-16", "2026-11-17"])
        self.assertEqual(out["sales"], {"days": ["2026-11-13"], "rows": []})

    def test_fetch_reads_a_gzip_report_and_sends_the_filters(self):
        opener = Opener(gzip.compress(fixture("sales.tsv").encode()))
        status, text = rr.fetch(Token(), "80000000", "SALES", "2026-11-15", opener=opener)
        self.assertEqual((status, text), ("ok", fixture("sales.tsv")))
        req = opener.requests[0]
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(req.full_url).query)
        self.assertEqual(q, {"filter[frequency]": ["DAILY"], "filter[reportType]": ["SALES"], "filter[reportSubType]": ["SUMMARY"],
                             "filter[vendorNumber]": ["80000000"], "filter[reportDate]": ["2026-11-15"], "filter[version]": ["1_0"]})
        self.assertEqual(req.get_header("Authorization"), "Bearer t")
        self.assertIn("application/a-gzip", req.get_header("Accept"))

    def test_fetch_reports_both_404_kinds_as_absent(self):
        for detail in ["Report is not available yet. Daily reports for the Americas are available by 5 am Pacific Time.", "There were no sales for the date specified."]:
            self.assertEqual(rr.fetch(Token(), "80000000", "SALES", "2026-11-15", opener=Opener(http_error(404, detail))), ("absent", None))

    def test_fetch_retries_429_and_5xx_then_fails(self):
        waits = []
        opener = Opener(http_error(429, "slow down"), http_error(503, "busy"), gzip.compress(b"SKU\n"))
        self.assertEqual(rr.fetch(Token(), "80000000", "SALES", "2026-11-15", opener=opener, sleep=waits.append), ("ok", "SKU\n"))
        self.assertEqual(waits, [2, 6])
        with self.assertRaises(rr.ReportError) as raised:
            rr.fetch(Token(), "80000000", "SALES", "2026-11-15", opener=Opener(*[http_error(500, "down") for _ in range(4)]), sleep=waits.append)
        self.assertEqual(str(raised.exception), "HTTP 500 down")
        with self.assertRaises(rr.ReportError):
            rr.fetch(Token(), "80000000", "SALES", "2026-11-15", opener=Opener(http_error(403, "forbidden")), sleep=waits.append)
        self.assertEqual(waits, [2, 6, 2, 6, 18])

    def test_collect_records_an_api_failure_as_a_note(self):
        def boom(api, vendor, report_type, day):
            raise rr.ReportError("HTTP 403 forbidden")
        with mock.patch.object(rr, "fetch", boom):
            out = rr.collect(StubApi(), days=2, today=date(2026, 11, 16), vendor="80000000")
        self.assertIsNone(out["sales"])
        self.assertEqual(out["notes"], ["sales: HTTP 403 forbidden", "subscriptions: HTTP 403 forbidden", "events: HTTP 403 forbidden"])


if __name__ == "__main__":
    unittest.main()
