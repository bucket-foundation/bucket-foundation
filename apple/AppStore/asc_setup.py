import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
BASE = "https://api.appstoreconnect.apple.com"

BUCKET = {
    "app": "6825123451",
    "version": "2.0",
    "build": "2610211209",
    "subtitle": "Foundations of every science",
    "privacy": "https://www.bucket.foundation/privacy",
    "privacyText": "Bucket Foundation collects your email address, learning progress and a user ID only when you sign in, so your progress syncs across your devices. Bucket has no ads, no tracking, and does not sell or share personal data. You can delete your account and all progress in the app under Account, Delete account. Full policy: https://www.bucket.foundation/privacy",
    "support": "https://www.bucket.foundation",
    "marketing": "https://www.bucket.foundation",
    "keywords": "physics,math,chemistry,cosmology,biology,mind,science,spaced,repetition,flashcards,languages,study",
    "promo": "Learn the foundations of mathematics, physics, chemistry, information, biophysics, cosmology and mind, and learn a set of languages together.",
    "listing": "docs/internal/apple/BUCKET-LISTING.md",
    "shots": "apple/Bucket/AppStore/screenshots",
    "notes": "Sign-in is optional and uses a one-time email code sent to the address entered. Every screen except Account works signed out. Learn shows the science decks; Learn, Languages opens language systems. The microphone and speech recognition prompts appear on the first speaking exercise. Delete account is under Account once signed in.",
}

POLINGUAL = {
    "app": "6825177856",
    "version": "1.0",
    "build": "2610211209",
    "subtitle": "Learn many languages together",
    "privacy": "https://polingual.com/privacy",
    "privacyText": "Polingual collects your email address, learning progress and a user ID only when you sign in, so your progress syncs across your devices and with Bucket. Polingual has no ads, no tracking, and does not sell or share personal data. Apple handles all payments. You can delete your account and all progress in the app under Account, Delete account. Full policy: https://polingual.com/privacy",
    "support": "https://polingual.com/support",
    "marketing": "https://polingual.com",
    "keywords": "spanish,french,italian,german,japanese,latin,vocabulary,flashcards,polyglot,romance,spaced",
    "promo": "Start a 3-day free trial. Learn Spanish, French and Italian side by side, or build your own set from 29 languages. Your progress syncs with Bucket.",
    "listing": "docs/internal/polingual/APP-STORE-LISTING.md",
    "shots": "apple/Polingual/AppStore/screenshots",
    "notes": "Onboarding runs three screens, then the subscription screen. Use a sandbox Apple Account to start the free trial. Sign-in is optional and uses a one-time email code. The microphone and speech recognition prompts appear on the first speaking exercise. Delete account is under Account once signed in.",
    "group": "22498866",
    "subs": [
        {"productId": "com.polingual.yearly", "name": "Polingual Yearly", "period": "ONE_YEAR", "level": 1, "price": "59.99", "desc": "Every language system, a year at a time."},
        {"productId": "com.polingual.monthly", "name": "Polingual Monthly", "period": "ONE_MONTH", "level": 2, "price": "9.99", "desc": "Every language system, month to month."},
    ],
}

COPYRIGHT = "2026 AGFarms LLC"
SHOT_TYPES = {"iphone-6.9": "APP_IPHONE_67", "ipad-13": "APP_IPAD_PRO_3GEN_129"}
AGE = {
    "alcoholTobaccoOrDrugUseOrReferences": "NONE", "contests": "NONE", "gamblingSimulated": "NONE", "horrorOrFearThemes": "NONE",
    "matureOrSuggestiveThemes": "NONE", "medicalOrTreatmentInformation": "NONE", "profanityOrCrudeHumor": "NONE",
    "sexualContentGraphicAndNudity": "NONE", "sexualContentOrNudity": "NONE", "violenceCartoonOrFantasy": "NONE",
    "violenceRealistic": "NONE", "violenceRealisticProlongedGraphicOrSadistic": "NONE", "gunsOrOtherWeapons": "NONE",
    "gambling": False, "unrestrictedWebAccess": False, "lootBox": False, "messagingAndChat": False, "parentalControls": False,
    "ageAssurance": False, "userGeneratedContent": False, "advertising": False, "healthOrWellnessTopics": False,
}


class ASC:
    def __init__(self, apply):
        self.apply = apply
        self.tok = None
        self.born = 0

    def token(self):
        if not self.tok or time.time() - self.born > 900:
            self.tok = subprocess.run(["swift", os.path.join(HERE, "jwt.swift")], capture_output=True, text=True, check=True).stdout.strip()
            self.born = time.time()
        return self.tok

    def call(self, method, path, body=None):
        url = path if path.startswith("http") else BASE + path
        req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None,
                                     headers={"Authorization": "Bearer " + self.token(), "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req) as r:
                raw = r.read()
                return r.status, json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            raw = e.read()
            try:
                return e.code, json.loads(raw)
            except ValueError:
                return e.code, {"raw": raw.decode(errors="replace")}

    def get(self, path):
        s, d = self.call("GET", path)
        if s >= 300:
            raise SystemExit(f"GET {path} failed {s}: {json.dumps(d)[:500]}")
        return d

    def all(self, path):
        out = []
        while path:
            d = self.get(path)
            out += d.get("data", [])
            path = d.get("links", {}).get("next")
        return out

    def write(self, label, method, path, body):
        if not self.apply:
            print(f"  would {label}")
            return None
        while True:
            s, d = self.call(method, path, body)
            if s < 300:
                print(f"  done  {label}")
                return d
            dropped = [e.get("source", {}).get("pointer", "") for e in d.get("errors", [])]
            dropped = [p.rsplit("/", 1)[-1] for p in dropped if p.startswith("/data/attributes/")]
            attrs = (body or {}).get("data", {}).get("attributes", {})
            if dropped and all(k in attrs for k in dropped):
                for k in dropped:
                    attrs.pop(k)
                print(f"  note  {label}: Apple does not accept {', '.join(dropped)}, retrying without")
                continue
            print(f"  FAIL  {label}: {s} {[(e.get('code'), e.get('detail')) for e in d.get('errors', [])]}")
            return None


def listing_description(path):
    text = open(os.path.join(ROOT, path)).read()
    start = text.index("## Description")
    end = text.index("\n## ", start + 5)
    return text[start + len("## Description"):end].strip()


def rel(kind, id_):
    return {"data": {"type": kind, "id": id_}}


def upload(api, label, create_type, create_attrs, relationship, file_path):
    data = open(file_path, "rb").read()
    body = {"data": {"type": create_type, "attributes": dict(create_attrs, fileName=os.path.basename(file_path), fileSize=len(data)), "relationships": relationship}}
    if not api.apply:
        print(f"  would upload {label}")
        return
    s, d = api.call("POST", f"/v1/{create_type}", body)
    if s >= 300:
        print(f"  FAIL  upload {label}: {s} {[(e.get('code'), e.get('detail')) for e in d.get('errors', [])]}")
        return
    asset = d["data"]
    for op in asset["attributes"]["uploadOperations"]:
        chunk = data[op["offset"]:op["offset"] + op["length"]]
        req = urllib.request.Request(op["url"], method=op["method"], data=chunk, headers={h["name"]: h["value"] for h in op["requestHeaders"]})
        urllib.request.urlopen(req).read()
    api.write(f"commit {label}", "PATCH", f"/v1/{create_type}/{asset['id']}",
              {"data": {"type": create_type, "id": asset["id"], "attributes": {"uploaded": True, "sourceFileChecksum": hashlib.md5(data).hexdigest()}}})


def all_territories(api):
    return [t["id"] for t in api.all("/v1/territories?limit=200")]


def setup_app(api, cfg, contact, free_price):
    app = cfg["app"]
    print(f"\n== {api.get(f'/v1/apps/{app}')['data']['attributes']['name']} ({app})")

    if api.get(f"/v1/apps/{app}?fields[apps]=contentRightsDeclaration")["data"]["attributes"]["contentRightsDeclaration"] is None:
        api.write("content rights: uses third-party content", "PATCH", f"/v1/apps/{app}",
                  {"data": {"type": "apps", "id": app, "attributes": {"contentRightsDeclaration": "USES_THIRD_PARTY_CONTENT"}}})

    s, d = api.call("GET", f"/v1/appPriceSchedules/{app}/manualPrices?limit=1")
    if (s == 404 or not d.get("data")) and free_price:
        point = next(p for p in api.all(f"/v1/apps/{app}/appPricePoints?filter[territory]=USA&limit=200") if p["attributes"]["customerPrice"] in ("0", "0.0", "0.00"))
        api.write("price: free", "POST", "/v1/appPriceSchedules", {
            "data": {"type": "appPriceSchedules", "relationships": {"app": rel("apps", app), "baseTerritory": rel("territories", "USA"),
                                                                   "manualPrices": {"data": [{"type": "appPrices", "id": "${p0}"}]}}},
            "included": [{"type": "appPrices", "id": "${p0}", "attributes": {"startDate": None},
                          "relationships": {"appPricePoint": rel("appPricePoints", point["id"])}}]})

    s, _ = api.call("GET", f"/v1/apps/{app}/appAvailabilityV2")
    if s == 404:
        terr = all_territories(api)
        api.write(f"availability: all {len(terr)} territories", "POST", "/v2/appAvailabilities", {
            "data": {"type": "appAvailabilities", "attributes": {"availableInNewTerritories": True},
                     "relationships": {"app": rel("apps", app), "territoryAvailabilities": {"data": [{"type": "territoryAvailabilities", "id": f"${{t{i}}}"} for i in range(len(terr))]}}},
            "included": [{"type": "territoryAvailabilities", "id": f"${{t{i}}}", "attributes": {"available": True},
                          "relationships": {"territory": rel("territories", t)}} for i, t in enumerate(terr)]})

    info = next(i for i in api.all(f"/v1/apps/{app}/appInfos?include=primaryCategory") if i["attributes"].get("state") != "READY_FOR_DISTRIBUTION")
    api.write("categories: Education, Reference", "PATCH", f"/v1/appInfos/{info['id']}", {
        "data": {"type": "appInfos", "id": info["id"], "relationships": {"primaryCategory": rel("appCategories", "EDUCATION"), "secondaryCategory": rel("appCategories", "REFERENCE")}}})
    api.write("age rating: 4+, all None", "PATCH", f"/v1/ageRatingDeclarations/{info['id']}",
              {"data": {"type": "ageRatingDeclarations", "id": info["id"], "attributes": dict(AGE)}})
    loc = next(l for l in api.all(f"/v1/appInfos/{info['id']}/appInfoLocalizations") if l["attributes"]["locale"] == "en-US")
    api.write("subtitle, privacy URL and Apple TV privacy text", "PATCH", f"/v1/appInfoLocalizations/{loc['id']}", {
        "data": {"type": "appInfoLocalizations", "id": loc["id"], "attributes": {"subtitle": cfg["subtitle"], "privacyPolicyUrl": cfg["privacy"], "privacyPolicyText": cfg["privacyText"]}}})

    ver = next(v for v in api.all(f"/v1/apps/{app}/appStoreVersions?filter[platform]=IOS") if v["attributes"]["appStoreState"] in ("PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED"))
    attrs = {"copyright": COPYRIGHT, "releaseType": "MANUAL"}
    if ver["attributes"]["versionString"] != cfg["version"]:
        attrs["versionString"] = cfg["version"]
    api.write(f"version {cfg['version']}, copyright, manual release", "PATCH", f"/v1/appStoreVersions/{ver['id']}",
              {"data": {"type": "appStoreVersions", "id": ver["id"], "attributes": attrs}})

    build = next((b for b in api.all(f"/v1/builds?filter[app]={app}&filter[version]={cfg['build']}") if b["attributes"]["processingState"] == "VALID"), None)
    if build:
        api.write(f"attach build {cfg['build']}", "PATCH", f"/v1/appStoreVersions/{ver['id']}/relationships/build", rel("builds", build["id"]))
    else:
        print(f"  FAIL  build {cfg['build']} is not processed yet")

    vloc = next(l for l in api.all(f"/v1/appStoreVersions/{ver['id']}/appStoreVersionLocalizations") if l["attributes"]["locale"] == "en-US")
    api.write("description, keywords, promotional text, URLs", "PATCH", f"/v1/appStoreVersionLocalizations/{vloc['id']}", {
        "data": {"type": "appStoreVersionLocalizations", "id": vloc["id"], "attributes": {
            "description": listing_description(cfg["listing"]), "keywords": cfg["keywords"], "promotionalText": cfg["promo"],
            "supportUrl": cfg["support"], "marketingUrl": cfg["marketing"]}}})

    sets = {s["attributes"]["screenshotDisplayType"]: s for s in api.all(f"/v1/appStoreVersionLocalizations/{vloc['id']}/appScreenshotSets")}
    for folder, kind in SHOT_TYPES.items():
        files = sorted(f for f in os.listdir(os.path.join(ROOT, cfg["shots"], folder)) if f.endswith(".png"))
        existing = api.all(f"/v1/appScreenshotSets/{sets[kind]['id']}/appScreenshots") if kind in sets else []
        if existing:
            print(f"  skip  {kind}: {len(existing)} screenshots already there")
            continue
        if kind not in sets:
            d = api.write(f"screenshot set {kind}", "POST", "/v1/appScreenshotSets", {
                "data": {"type": "appScreenshotSets", "attributes": {"screenshotDisplayType": kind}, "relationships": {"appStoreVersionLocalization": rel("appStoreVersionLocalizations", vloc["id"])}}})
            if not d:
                print(f"  would upload {len(files)} screenshots to {kind}")
                continue
            sets[kind] = d["data"]
        for f in files:
            upload(api, f"{kind} {f}", "appScreenshots", {}, {"appScreenshotSet": rel("appScreenshotSets", sets[kind]["id"])}, os.path.join(ROOT, cfg["shots"], folder, f))

    s, d = api.call("GET", f"/v1/appStoreVersions/{ver['id']}/appStoreReviewDetail")
    review = {"contactFirstName": contact["first"], "contactLastName": contact["last"], "contactPhone": contact["phone"], "contactEmail": contact["email"],
              "demoAccountRequired": False, "notes": cfg["notes"]}
    if s == 200 and d.get("data"):
        api.write("review contact and notes", "PATCH", f"/v1/appStoreReviewDetails/{d['data']['id']}",
                  {"data": {"type": "appStoreReviewDetails", "id": d["data"]["id"], "attributes": review}})
    else:
        api.write("review contact and notes", "POST", "/v1/appStoreReviewDetails",
                  {"data": {"type": "appStoreReviewDetails", "attributes": review, "relationships": {"appStoreVersion": rel("appStoreVersions", ver["id"])}}})


def setup_subscriptions(api, cfg):
    print("\n== Polingual subscriptions")
    group = cfg["group"]
    if not api.all(f"/v1/subscriptionGroups/{group}/subscriptionGroupLocalizations"):
        api.write("group localization: Polingual", "POST", "/v1/subscriptionGroupLocalizations", {
            "data": {"type": "subscriptionGroupLocalizations", "attributes": {"locale": "en-US", "name": "Polingual", "customAppName": "Polingual"},
                     "relationships": {"subscriptionGroup": rel("subscriptionGroups", group)}}})
    existing = {s["attributes"]["productId"]: s for s in api.all(f"/v1/subscriptionGroups/{group}/subscriptions")}
    shot = os.path.join(ROOT, cfg["shots"], "iphone-6.9", "6-paywall.png")
    terr = None
    for spec in cfg["subs"]:
        print(f"  -- {spec['productId']}")
        sub = existing.get(spec["productId"])
        if not sub:
            d = api.write(f"create {spec['name']}", "POST", "/v1/subscriptions", {
                "data": {"type": "subscriptions", "attributes": {"productId": spec["productId"], "name": spec["name"], "subscriptionPeriod": spec["period"],
                                                                  "groupLevel": spec["level"], "familySharable": False, "reviewNote": cfg["notes"]},
                         "relationships": {"group": rel("subscriptionGroups", group)}}})
            if not d:
                print("  would add localization, price, availability, trial and review screenshot")
                continue
            sub = d["data"]
        sid = sub["id"]
        if not api.all(f"/v1/subscriptions/{sid}/subscriptionLocalizations"):
            api.write("localization", "POST", "/v1/subscriptionLocalizations", {
                "data": {"type": "subscriptionLocalizations", "attributes": {"locale": "en-US", "name": spec["name"], "description": spec["desc"]},
                         "relationships": {"subscription": rel("subscriptions", sid)}}})
        s, d = api.call("GET", f"/v1/subscriptions/{sid}/subscriptionAvailability")
        if s != 200 or not d.get("data"):
            terr = terr or all_territories(api)
            api.write(f"availability: all {len(terr)} territories", "POST", "/v1/subscriptionAvailabilities", {
                "data": {"type": "subscriptionAvailabilities", "attributes": {"availableInNewTerritories": True},
                         "relationships": {"subscription": rel("subscriptions", sid), "availableTerritories": {"data": [{"type": "territories", "id": t} for t in terr]}}}})
        if not api.get(f"/v1/subscriptions/{sid}/prices?limit=1")["data"]:
            usa = next(p for p in api.all(f"/v1/subscriptions/{sid}/pricePoints?filter[territory]=USA&limit=200") if p["attributes"]["customerPrice"] == spec["price"])
            points = [usa] + api.all(f"/v1/subscriptionPricePoints/{usa['id']}/equalizations?limit=200")
            print(f"  {'would set' if not api.apply else 'setting'} price {spec['price']} USD in {len(points)} territories")
            failed = 0
            for p in points:
                if api.apply:
                    s, d = api.call("POST", "/v1/subscriptionPrices", {"data": {"type": "subscriptionPrices", "attributes": {"startDate": None, "preserveCurrentPrice": False},
                                                                             "relationships": {"subscription": rel("subscriptions", sid), "subscriptionPricePoint": rel("subscriptionPricePoints", p["id"])}}})
                    if s >= 300:
                        failed += 1
                        if failed <= 3:
                            print(f"  FAIL  price: {[(e.get('code'), e.get('detail')) for e in d.get('errors', [])]}")
            if api.apply:
                print(f"  done  prices set in {len(points) - failed} of {len(points)} territories")
        if not api.all(f"/v1/subscriptions/{sid}/introductoryOffers?limit=200"):
            d = api.write("3-day free trial, all territories", "POST", "/v1/subscriptionIntroductoryOffers", {
                "data": {"type": "subscriptionIntroductoryOffers", "attributes": {"duration": "THREE_DAYS", "offerMode": "FREE_TRIAL", "numberOfPeriods": 1},
                         "relationships": {"subscription": rel("subscriptions", sid)}}})
            if api.apply and d is None:
                terr = terr or all_territories(api)
                print(f"  retrying the trial per territory ({len(terr)})")
                ok = 0
                for t in terr:
                    st, _ = api.call("POST", "/v1/subscriptionIntroductoryOffers", {
                        "data": {"type": "subscriptionIntroductoryOffers", "attributes": {"duration": "THREE_DAYS", "offerMode": "FREE_TRIAL", "numberOfPeriods": 1},
                                 "relationships": {"subscription": rel("subscriptions", sid), "territory": rel("territories", t)}}})
                    ok += st < 300
                print(f"  done  trial in {ok} of {len(terr)} territories")
        s, d = api.call("GET", f"/v1/subscriptions/{sid}/appStoreReviewScreenshot")
        if s != 200 or not d.get("data"):
            upload(api, "review screenshot", "subscriptionAppStoreReviewScreenshots", {}, {"subscription": rel("subscriptions", sid)}, shot)
        print(f"  state {api.get(f'/v1/subscriptions/{sid}')['data']['attributes']['state']}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--phone", required=True)
    ap.add_argument("--email", default="gianyrox@gmail.com")
    ap.add_argument("--first", default="Gianangelo")
    ap.add_argument("--last", default="Dichio")
    ap.add_argument("--only", choices=["bucket", "polingual"])
    a = ap.parse_args()
    api = ASC(a.apply)
    contact = {"first": a.first, "last": a.last, "phone": a.phone, "email": a.email}
    print("APPLYING CHANGES" if a.apply else "DRY RUN: nothing is changed; add --apply to write")
    if a.only in (None, "bucket"):
        setup_app(api, BUCKET, contact, free_price=True)
    if a.only in (None, "polingual"):
        setup_app(api, POLINGUAL, contact, free_price=True)
        setup_subscriptions(api, POLINGUAL)
    print("\nWeb-only steps left: the subscription group display name, App Privacy for both apps, then add both subscriptions to the Polingual 1.0 version and submit.")


if __name__ == "__main__":
    sys.exit(main())
