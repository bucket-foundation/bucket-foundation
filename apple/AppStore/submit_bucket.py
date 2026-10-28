import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asc_setup import ASC, rel, upload

APP = "6825123451"
HERE = os.path.dirname(os.path.abspath(__file__))
PRIVACY_TEXT = "Read the Bucket privacy policy at https://www.bucket.foundation/privacy"
WATCH_SHOTS = [("APP_WATCH_SERIES_10", os.path.join(HERE, "watch-bucket-1.png"))]


def prepare(api, v):
    clips = api.all(f"/v1/apps/{APP}/appClips")
    if clips:
        exp = api.all(f"/v1/appClips/{clips[0]['id']}/appClipDefaultExperiences")
        if exp:
            api.write("link App Clip experience to the version", "PATCH", f"/v1/appStoreVersions/{v['id']}/relationships/appClipDefaultExperience",
                      {"data": {"type": "appClipDefaultExperiences", "id": exp[0]["id"]}})
    info = api.all(f"/v1/apps/{APP}/appInfos")[0]
    for loc in api.all(f"/v1/appInfos/{info['id']}/appInfoLocalizations"):
        if not loc["attributes"].get("privacyPolicyText"):
            api.write(f"privacy policy text ({loc['attributes']['locale']})", "PATCH", f"/v1/appInfoLocalizations/{loc['id']}",
                      {"data": {"type": "appInfoLocalizations", "id": loc["id"], "attributes": {"privacyPolicyText": PRIVACY_TEXT}}})
    age = api.get(f"/v1/appInfos/{info['id']}/ageRatingDeclaration")["data"]
    if age["attributes"].get("socialMedia") is None:
        api.write("age rating: social media none", "PATCH", f"/v1/ageRatingDeclarations/{age['id']}",
                  {"data": {"type": "ageRatingDeclarations", "id": age["id"], "attributes": {"socialMedia": False}}})
    for loc in api.all(f"/v1/appStoreVersions/{v['id']}/appStoreVersionLocalizations"):
        sets = {st["attributes"]["screenshotDisplayType"]: st for st in api.all(f"/v1/appStoreVersionLocalizations/{loc['id']}/appScreenshotSets")}
        for kind, path in WATCH_SHOTS:
            st = sets.get(kind)
            if st and api.all(f"/v1/appScreenshotSets/{st['id']}/appScreenshots"):
                continue
            if not st:
                d = api.write(f"{kind} screenshot set ({loc['attributes']['locale']})", "POST", "/v1/appScreenshotSets",
                              {"data": {"type": "appScreenshotSets", "attributes": {"screenshotDisplayType": kind},
                                        "relationships": {"appStoreVersionLocalization": rel("appStoreVersionLocalizations", loc["id"])}}})
                st = d and d["data"]
            if st:
                upload(api, f"{kind} screenshot", "appScreenshots", {}, {"appScreenshotSet": rel("appScreenshotSets", st["id"])}, path)


def ios_version(api, version):
    for v in api.all(f"/v1/apps/{APP}/appStoreVersions?filter[platform]=IOS&limit=10"):
        if v["attributes"]["versionString"] == version:
            return v
    sys.exit(f"no iOS version {version}")


def processed_build(api, number, wait):
    while True:
        builds = api.all(f"/v1/builds?filter[app]={APP}&filter[version]={number}&limit=1")
        state = builds[0]["attributes"].get("processingState") if builds else "MISSING"
        print(f"  build {number} {state}")
        if state == "VALID":
            return builds[0]
        if not wait or state in ("FAILED", "INVALID"):
            sys.exit(f"build {number} is {state}")
        time.sleep(60)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true")
    p.add_argument("--version", default="2.0")
    p.add_argument("--build", required=True)
    p.add_argument("--wait", action="store_true", help="wait for the build to finish processing")
    args = p.parse_args()
    api = ASC(args.apply)
    v = ios_version(api, args.version)
    print(f"  version {args.version} {v['attributes']['appStoreState']} release {v['attributes'].get('releaseType')}")
    build = processed_build(api, args.build, args.wait)
    prepare(api, v)
    api.write(f"attach build {args.build} to {args.version}", "PATCH", f"/v1/appStoreVersions/{v['id']}/relationships/build",
              {"data": {"type": "builds", "id": build["id"]}})
    open_subs = [s for s in api.all(f"/v1/apps/{APP}/reviewSubmissions?filter[platform]=IOS&filter[state]=READY_FOR_REVIEW")]
    sub = open_subs[0] if open_subs else None
    if not sub:
        d = api.write("create review submission", "POST", "/v1/reviewSubmissions",
                      {"data": {"type": "reviewSubmissions", "attributes": {"platform": "IOS"}, "relationships": {"app": rel("apps", APP)}}})
        sub = d and d["data"]
    if not sub:
        return
    items = api.all(f"/v1/reviewSubmissions/{sub['id']}/items")
    if not any(i["relationships"].get("appStoreVersion", {}).get("data", {}) and i["relationships"]["appStoreVersion"]["data"]["id"] == v["id"] for i in items if "relationships" in i):
        body = {"data": {"type": "reviewSubmissionItems", "relationships": {"reviewSubmission": rel("reviewSubmissions", sub["id"]), "appStoreVersion": rel("appStoreVersions", v["id"])}}}
        if not args.apply:
            print(f"  would add version {args.version} to submission")
        else:
            status, d = api.call("POST", "/v1/reviewSubmissionItems", body)
            if status >= 300:
                print(f"  FAIL  add version {args.version} to submission: {status}")
                for e in d.get("errors", []):
                    print(f"        {e.get('detail')}")
                    for group in (e.get("meta", {}).get("associatedErrors") or {}).values():
                        for a in group:
                            print(f"        - {a.get('code')}: {a.get('detail')}")
                return
            print(f"  done  add version {args.version} to submission")
    api.write("submit for review", "PATCH", f"/v1/reviewSubmissions/{sub['id']}",
              {"data": {"type": "reviewSubmissions", "id": sub["id"], "attributes": {"submitted": True}}})


if __name__ == "__main__":
    main()
