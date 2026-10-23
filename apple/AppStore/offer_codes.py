import argparse
import os
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asc_setup import ASC, BASE, rel, all_territories

GROUP = "22498866"
PRODUCT = "com.polingual.yearly"
OFFER = {"name": "Early access", "duration": "THREE_MONTHS", "offerMode": "FREE_TRIAL", "numberOfPeriods": 1,
         "customerEligibilities": ["NEW", "EXPIRED"], "offerEligibility": "REPLACE_INTRO_OFFERS"}
CUSTOM = {"code": "POLYGLOTBETA", "uses": 500}
ONE_TIME = 200
EXPIRES = "2027-03-31"


def create(api, label, path, body):
    if not api.apply:
        print(f"  would {label}")
        return None
    s, d = api.call("POST", path, body)
    if s < 300:
        print(f"  done  {label}")
        return d
    codes = [e.get("code") for e in d.get("errors", [])]
    if any("APP_STATE" in c or "SALABLE_STATE" in c for c in codes):
        print(f"  wait  {label}: Apple allows codes once the app and the subscription are live; rerun after approval")
    else:
        print(f"  FAIL  {label}: {s} {[(e.get('code'), e.get('detail')) for e in d.get('errors', [])]}")
    return None


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true")
    p.add_argument("--out", default=os.path.expanduser("~/Desktop/polingual-early-access-codes.csv"))
    args = p.parse_args()
    api = ASC(args.apply)
    sub = next(s for s in api.all(f"/v1/subscriptionGroups/{GROUP}/subscriptions?limit=50") if s["attributes"]["productId"] == PRODUCT)
    sid = sub["id"]
    print(f"Polingual Yearly {sid}")
    offer = next((o for o in api.all(f"/v1/subscriptions/{sid}/offerCodes?limit=50") if o["attributes"]["name"] == OFFER["name"]), None)
    if offer is None:
        terr = all_territories(api)
        attrs = {k: v for k, v in OFFER.items()}
        d = api.write(f"offer '{OFFER['name']}': {OFFER['duration']} free, {len(terr)} territories", "POST", "/v1/subscriptionOfferCodes", {
            "data": {"type": "subscriptionOfferCodes", "attributes": attrs,
                     "relationships": {"subscription": rel("subscriptions", sid),
                                       "prices": {"data": [{"type": "subscriptionOfferCodePrices", "id": f"${{p{i}}}"} for i in range(len(terr))]}}},
            "included": [{"type": "subscriptionOfferCodePrices", "id": f"${{p{i}}}", "relationships": {"territory": rel("territories", t)}}
                         for i, t in enumerate(terr)]})
        offer = d and d["data"]
    else:
        print(f"  have  offer '{OFFER['name']}' {offer['id']}")
    if offer is None:
        print("  stop  no offer yet; rerun with --apply")
        return
    oid = offer["id"]
    customs = api.all(f"/v1/subscriptionOfferCodes/{oid}/customCodes?limit=50")
    if not any(c["attributes"]["customCode"] == CUSTOM["code"] for c in customs):
        create(api, f"custom code {CUSTOM['code']} for {CUSTOM['uses']} people, until {EXPIRES}", "/v1/subscriptionOfferCodeCustomCodes", {
            "data": {"type": "subscriptionOfferCodeCustomCodes",
                     "attributes": {"customCode": CUSTOM["code"], "numberOfCodes": CUSTOM["uses"], "expirationDate": EXPIRES},
                     "relationships": {"offerCode": rel("subscriptionOfferCodes", oid)}}})
    else:
        print(f"  have  custom code {CUSTOM['code']}")
    batches = api.all(f"/v1/subscriptionOfferCodes/{oid}/oneTimeUseCodes?limit=50")
    if not batches:
        d = create(api, f"{ONE_TIME} one-time codes, until {EXPIRES}", "/v1/subscriptionOfferCodeOneTimeUseCodes", {
            "data": {"type": "subscriptionOfferCodeOneTimeUseCodes",
                     "attributes": {"numberOfCodes": ONE_TIME, "expirationDate": EXPIRES},
                     "relationships": {"offerCode": rel("subscriptionOfferCodes", oid)}}})
        batches = [d["data"]] if d else []
    else:
        print(f"  have  {len(batches)} one-time code batch")
    for b in batches:
        req = urllib.request.Request(f"{BASE}/v1/subscriptionOfferCodeOneTimeUseCodes/{b['id']}/values", headers={"Authorization": "Bearer " + api.token()})
        try:
            with urllib.request.urlopen(req) as r:
                csv = r.read().decode()
        except urllib.error.HTTPError as e:
            print(f"  note  codes not ready yet ({e.code}); rerun in a few minutes")
            continue
        with open(args.out, "w") as f:
            f.write(csv)
        os.chmod(args.out, 0o600)
        print(f"  saved {csv.count(chr(10))} lines of one-time codes to {args.out}")
    print(f"Redeem link: https://apps.apple.com/redeem?ctx=offercodes&id=6825177856&code={CUSTOM['code']}")


if __name__ == "__main__":
    main()
