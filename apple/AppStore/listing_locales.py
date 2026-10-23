import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asc_setup import ASC, POLINGUAL, ROOT, rel

EDITABLE = {"PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY"}


def upsert(api, label, kind, existing, parent_rel, parent_id, locale, attrs):
    if existing:
        api.write(f"{label} {locale}", "PATCH", f"/v1/{kind}/{existing['id']}",
                  {"data": {"type": kind, "id": existing["id"], "attributes": attrs}})
    else:
        api.write(f"{label} {locale} (new)", "POST", f"/v1/{kind}",
                  {"data": {"type": kind, "attributes": dict(attrs, locale=locale), "relationships": {parent_rel: rel(parent_rel + "s", parent_id)}}})


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true")
    args = p.parse_args()
    api = ASC(args.apply)
    app = POLINGUAL["app"]
    locales = json.load(open(os.path.join(ROOT, "apple/Polingual/AppStore/locales.json")))
    infos = api.all(f"/v1/apps/{app}/appInfos")
    info = next((i for i in infos if i["attributes"].get("appStoreState", i["attributes"].get("state")) in EDITABLE | {"PREPARE_FOR_SUBMISSION"}), None)
    versions = api.all(f"/v1/apps/{app}/appStoreVersions?filter[platform]=IOS")
    ver = next((v for v in versions if v["attributes"]["appStoreState"] in EDITABLE), None)
    if info is None and ver is None:
        print(f"  skip  no editable version yet ({[v['attributes']['appStoreState'] for v in versions]}); rerun once 1.0.1 exists")
        return
    if info:
        have = {l["attributes"]["locale"]: l for l in api.all(f"/v1/appInfos/{info['id']}/appInfoLocalizations")}
        for loc, t in locales.items():
            upsert(api, "name and subtitle", "appInfoLocalizations", have.get(loc), "appInfo", info["id"], loc,
                   {"name": "Polingual", "subtitle": t["subtitle"], "privacyPolicyUrl": POLINGUAL["privacy"]})
    if ver:
        have = {l["attributes"]["locale"]: l for l in api.all(f"/v1/appStoreVersions/{ver['id']}/appStoreVersionLocalizations")}
        for loc, t in locales.items():
            upsert(api, "description and keywords", "appStoreVersionLocalizations", have.get(loc), "appStoreVersion", ver["id"], loc,
                   {"description": t["description"], "keywords": t["keywords"], "promotionalText": t["promo"],
                    "supportUrl": POLINGUAL["support"], "marketingUrl": POLINGUAL["marketing"]})
    print(f"{len(locales)} locales")


if __name__ == "__main__":
    main()
