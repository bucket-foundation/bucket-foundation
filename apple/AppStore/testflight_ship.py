import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asc_setup import ASC

APPS = {"bucket": "6825123451", "polingual": "6825177856"}
WHAT = "The latest build with fixes from your feedback. Take a lesson, try your groups, and tell us what feels slow or confusing."
DEMO = ("demoAccountName", "demoAccountPassword", "demoAccountRequired", "notes")


def ship(api, name, app, demo):
    print(f"== {name}")
    build = next(b for b in api.get(f"/v1/builds?filter[app]={app}&filter[processingState]=VALID&filter[expired]=false&sort=-uploadedDate&limit=1")["data"])
    bid = build["id"]
    print(f"  latest build {build['attributes']['version']}")
    detail = api.get(f"/v1/apps/{app}/betaAppReviewDetail")["data"]
    if demo and not detail["attributes"].get("demoAccountName"):
        api.write("copy demo sign-in to beta review", "PATCH", f"/v1/betaAppReviewDetails/{detail['id']}", {"data": {"type": "betaAppReviewDetails", "id": detail["id"], "attributes": demo}})
    locs = api.get(f"/v1/builds/{bid}/betaBuildLocalizations")["data"]
    en = next((l for l in locs if l["attributes"]["locale"] == "en-US"), None)
    if en:
        api.write("set what to test", "PATCH", f"/v1/betaBuildLocalizations/{en['id']}", {"data": {"type": "betaBuildLocalizations", "id": en["id"], "attributes": {"whatsNew": WHAT}}})
    else:
        api.write("set what to test", "POST", "/v1/betaBuildLocalizations", {"data": {"type": "betaBuildLocalizations", "attributes": {"locale": "en-US", "whatsNew": WHAT}, "relationships": {"build": {"data": {"type": "builds", "id": bid}}}}})
    for g in api.get(f"/v1/apps/{app}/betaGroups?limit=50")["data"]:
        if g["attributes"]["isInternalGroup"]:
            continue
        api.write(f"add build to {g['attributes']['name']}", "POST", f"/v1/betaGroups/{g['id']}/relationships/builds", {"data": [{"type": "builds", "id": bid}]})
    state = api.get(f"/v1/builds/{bid}/buildBetaDetail")["data"]["attributes"].get("externalBuildState")
    if state == "READY_FOR_BETA_SUBMISSION":
        api.write("submit for beta review", "POST", "/v1/betaAppReviewSubmissions", {"data": {"type": "betaAppReviewSubmissions", "relationships": {"build": {"data": {"type": "builds", "id": bid}}}}})
    else:
        print(f"  beta state {state}, no submission needed")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true")
    args = p.parse_args()
    api = ASC(args.apply)
    src = api.get(f"/v1/apps/{APPS['bucket']}/betaAppReviewDetail")["data"]["attributes"]
    demo = {k: src[k] for k in DEMO if src.get(k) is not None}
    for name, app in APPS.items():
        ship(api, name, app, demo if name != "bucket" else None)


if __name__ == "__main__":
    main()
