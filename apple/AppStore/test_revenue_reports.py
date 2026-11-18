import json
import os
import sys
import unittest
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
    if day == "2026-11-14":
        return "empty", None
    return "missing", None


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
            out = rr.collect(StubApi(), days=3, today=date(2026, 11, 16), vendor="80000000")
        self.assertEqual(out["sales"]["days"], ["2026-11-14", "2026-11-15"])
        self.assertEqual(out["subscriptions"]["day"], "2026-11-15")
        self.assertEqual(out, json.loads(fixture("revenue.json")))

    def test_collect_records_an_api_failure_as_a_note(self):
        def boom(api, vendor, report_type, day):
            raise rr.ReportError("HTTP 403 forbidden")
        with mock.patch.object(rr, "fetch", boom):
            out = rr.collect(StubApi(), days=2, today=date(2026, 11, 16), vendor="80000000")
        self.assertIsNone(out["sales"])
        self.assertEqual(out["notes"], ["sales: HTTP 403 forbidden", "subscriptions: HTTP 403 forbidden", "events: HTTP 403 forbidden"])


if __name__ == "__main__":
    unittest.main()
