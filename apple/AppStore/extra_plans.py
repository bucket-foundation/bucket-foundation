import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asc_setup import POLINGUAL, ROOT, ASC, all_territories, rel, upload

FAMILY = {"productId": "com.polingual.family.yearly", "name": "Family Yearly", "price": "89.99", "level": 1,
          "desc": "Every language system for up to six people, a year at a time."}
LIFETIME = {"productId": "com.polingual.lifetime", "name": "Lifetime", "price": "149.99",
            "desc": "Every language system, paid once."}
NOTE = ("Family Yearly is shared through Family Sharing and Lifetime is a one-time purchase. Both unlock every language system, "
        "the same access as the Yearly plan. They stay hidden in the app until review approves them.")


def shot():
    return os.path.join(ROOT, POLINGUAL["shots"], "iphone-6.9", "6-paywall.png")


def family(api, terr):
    group = POLINGUAL["group"]
    print(f"\n== {FAMILY['productId']}, {FAMILY['price']} USD a year, Family Sharing on")
    sub = next((s for s in api.all(f"/v1/subscriptionGroups/{group}/subscriptions") if s["attributes"]["productId"] == FAMILY["productId"]), None)
    if not sub:
        d = api.write("create Family Yearly", "POST", "/v1/subscriptions", {
            "data": {"type": "subscriptions", "attributes": {"productId": FAMILY["productId"], "name": FAMILY["name"], "subscriptionPeriod": "ONE_YEAR",
                                                              "groupLevel": FAMILY["level"], "familySharable": True, "reviewNote": NOTE},
                     "relationships": {"group": rel("subscriptionGroups", group)}}})
        if not d:
            print("  would add the localization, availability in every territory, the price and the review screenshot")
            return
        sub = d["data"]
    sid = sub["id"]
    if not api.all(f"/v1/subscriptions/{sid}/subscriptionLocalizations"):
        api.write("localization", "POST", "/v1/subscriptionLocalizations", {
            "data": {"type": "subscriptionLocalizations", "attributes": {"locale": "en-US", "name": FAMILY["name"], "description": FAMILY["desc"]},
                     "relationships": {"subscription": rel("subscriptions", sid)}}})
    s, d = api.call("GET", f"/v1/subscriptions/{sid}/subscriptionAvailability")
    if s != 200 or not d.get("data"):
        api.write(f"availability: all {len(terr)} territories", "POST", "/v1/subscriptionAvailabilities", {
            "data": {"type": "subscriptionAvailabilities", "attributes": {"availableInNewTerritories": True},
                     "relationships": {"subscription": rel("subscriptions", sid), "availableTerritories": {"data": [{"type": "territories", "id": t} for t in terr]}}}})
    if not api.get(f"/v1/subscriptions/{sid}/prices?limit=1")["data"]:
        usa = next(p for p in api.all(f"/v1/subscriptions/{sid}/pricePoints?filter[territory]=USA&limit=200") if p["attributes"]["customerPrice"] == FAMILY["price"])
        points = [usa] + api.all(f"/v1/subscriptionPricePoints/{usa['id']}/equalizations?limit=200")
        print(f"  {'setting' if api.apply else 'would set'} {FAMILY['price']} USD and its equivalents in {len(points)} territories")
        failed = 0
        for p in points if api.apply else []:
            st, body = api.call("POST", "/v1/subscriptionPrices", {"data": {"type": "subscriptionPrices", "attributes": {"startDate": None, "preserveCurrentPrice": False},
                                                                         "relationships": {"subscription": rel("subscriptions", sid), "subscriptionPricePoint": rel("subscriptionPricePoints", p["id"])}}})
            if st >= 300:
                failed += 1
                if failed <= 3:
                    print(f"  FAIL  price: {[(e.get('code'), e.get('detail')) for e in body.get('errors', [])]}")
        if api.apply:
            print(f"  done  prices in {len(points) - failed} of {len(points)} territories")
    s, d = api.call("GET", f"/v1/subscriptions/{sid}/appStoreReviewScreenshot")
    if s != 200 or not d.get("data"):
        upload(api, "review screenshot", "subscriptionAppStoreReviewScreenshots", {}, {"subscription": rel("subscriptions", sid)}, shot())
    print(f"  state {api.get(f'/v1/subscriptions/{sid}')['data']['attributes']['state']}")


def lifetime(api, terr):
    app = POLINGUAL["app"]
    print(f"\n== {LIFETIME['productId']}, {LIFETIME['price']} USD once, non-consumable")
    iap = next((p for p in api.all(f"/v1/apps/{app}/inAppPurchasesV2?limit=200") if p["attributes"]["productId"] == LIFETIME["productId"]), None)
    if not iap:
        d = api.write("create Lifetime", "POST", "/v2/inAppPurchases", {
            "data": {"type": "inAppPurchases", "attributes": {"productId": LIFETIME["productId"], "name": LIFETIME["name"], "inAppPurchaseType": "NON_CONSUMABLE",
                                                               "familySharable": False, "reviewNote": NOTE},
                     "relationships": {"app": rel("apps", app)}}})
        if not d:
            print("  would add the localization, availability in every territory, the price schedule and the review screenshot")
            return
        iap = d["data"]
    iid = iap["id"]
    if not api.all(f"/v2/inAppPurchases/{iid}/inAppPurchaseLocalizations"):
        api.write("localization", "POST", "/v1/inAppPurchaseLocalizations", {
            "data": {"type": "inAppPurchaseLocalizations", "attributes": {"locale": "en-US", "name": LIFETIME["name"], "description": LIFETIME["desc"]},
                     "relationships": {"inAppPurchaseV2": rel("inAppPurchases", iid)}}})
    s, d = api.call("GET", f"/v2/inAppPurchases/{iid}/inAppPurchaseAvailability")
    if s != 200 or not d.get("data"):
        api.write(f"availability: all {len(terr)} territories", "POST", "/v1/inAppPurchaseAvailabilities", {
            "data": {"type": "inAppPurchaseAvailabilities", "attributes": {"availableInNewTerritories": True},
                     "relationships": {"inAppPurchase": rel("inAppPurchases", iid), "availableTerritories": {"data": [{"type": "territories", "id": t} for t in terr]}}}})
    s, d = api.call("GET", f"/v2/inAppPurchases/{iid}/iapPriceSchedule")
    if s != 200 or not d.get("data"):
        usa = next(p for p in api.all(f"/v2/inAppPurchases/{iid}/pricePoints?filter[territory]=USA&limit=200") if p["attributes"]["customerPrice"] == LIFETIME["price"])
        api.write(f"price schedule: {LIFETIME['price']} USD base, other territories follow Apple's equivalents", "POST", "/v1/inAppPurchasePriceSchedules", {
            "data": {"type": "inAppPurchasePriceSchedules",
                     "relationships": {"inAppPurchase": rel("inAppPurchases", iid), "baseTerritory": rel("territories", "USA"),
                                       "manualPrices": {"data": [{"type": "inAppPurchasePrices", "id": "${base}"}]}}},
            "included": [{"type": "inAppPurchasePrices", "id": "${base}", "attributes": {"startDate": None},
                          "relationships": {"inAppPurchasePricePoint": rel("inAppPurchasePricePoints", usa["id"])}}]})
    s, d = api.call("GET", f"/v2/inAppPurchases/{iid}/appStoreReviewScreenshot")
    if s != 200 or not d.get("data"):
        upload(api, "review screenshot", "inAppPurchaseAppStoreReviewScreenshots", {}, {"inAppPurchaseV2": rel("inAppPurchases", iid)}, shot())
    print(f"  state {api.get(f'/v2/inAppPurchases/{iid}')['data']['attributes']['state']}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    api = ASC(a.apply)
    print("APPLYING CHANGES" if a.apply else "DRY RUN: nothing is changed; add --apply to write")
    terr = all_territories(api)
    family(api, terr)
    lifetime(api, terr)
    print("\nNext: add both products to the next Polingual version in App Store Connect and submit them with it. Keep extra_plans off until they are approved.")


if __name__ == "__main__":
    sys.exit(main())
