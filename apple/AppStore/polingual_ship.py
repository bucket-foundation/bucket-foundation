import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asc_setup import ASC

APP = "6825177856"
EXTERNAL_GROUP = "24c75263-401b-4914-834f-94cfeac0d346"


def find_build(api, number, wait):
    deadline = time.time() + wait
    while True:
        path = f"/v1/builds?filter[app]={APP}&sort=-uploadedDate&limit=1&include=preReleaseVersion"
        if number:
            path += f"&filter[version]={number}"
        d = api.get(path)
        if d["data"]:
            b = d["data"][0]
            state = b["attributes"]["processingState"]
            if state == "VALID":
                pre = next(i["attributes"]["version"] for i in d.get("included", []) if i["type"] == "preReleaseVersions")
                return b, pre
            if state in ("FAILED", "INVALID"):
                raise SystemExit(f"build {b['attributes']['version']} is {state}")
        if time.time() > deadline:
            raise SystemExit(f"build {number or 'latest'} not VALID after {wait}s")
        print(f"waiting for build {number or 'latest'} to process")
        time.sleep(30)


def set_beta_notes(api, build, notes):
    for loc in api.get(f"/v1/builds/{build['id']}/betaBuildLocalizations")["data"]:
        api.write(f"tester notes {loc['attributes']['locale']}", "PATCH", f"/v1/betaBuildLocalizations/{loc['id']}",
                  {"data": {"type": "betaBuildLocalizations", "id": loc["id"], "attributes": {"whatsNew": notes}}})


def external(api, build, notes):
    if notes:
        set_beta_notes(api, build, notes)
    api.write("add build to Polingual Beta Learners", "POST", f"/v1/betaGroups/{EXTERNAL_GROUP}/relationships/builds",
              {"data": [{"type": "builds", "id": build["id"]}]})
    s, d = api.call("GET", f"/v1/builds/{build['id']}/betaAppReviewSubmission")
    if s < 300 and d.get("data"):
        print(f"  beta review already {d['data']['attributes']['betaReviewState']}")
        return
    api.write("submit beta app review", "POST", "/v1/betaAppReviewSubmissions",
              {"data": {"type": "betaAppReviewSubmissions", "relationships": {"build": {"data": {"type": "builds", "id": build["id"]}}}}})


def release(api, build, version, notes):
    versions = api.all(f"/v1/apps/{APP}/appStoreVersions?filter[platform]=IOS&limit=20")
    v = next((x for x in versions if x["attributes"]["versionString"] == version), None)
    if v is None:
        d = api.write(f"create App Store version {version}", "POST", "/v1/appStoreVersions",
                      {"data": {"type": "appStoreVersions", "attributes": {"platform": "IOS", "versionString": version, "releaseType": "AFTER_APPROVAL"},
                                "relationships": {"app": {"data": {"type": "apps", "id": APP}}}}})
        if d is None:
            return
        v = d["data"]
    state = v["attributes"]["appStoreState"]
    if state not in ("PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED"):
        raise SystemExit(f"version {version} is {state}, nothing to submit")
    api.write(f"attach build {build['attributes']['version']}", "PATCH", f"/v1/appStoreVersions/{v['id']}/relationships/build",
              {"data": {"type": "builds", "id": build["id"]}})
    for loc in api.all(f"/v1/appStoreVersions/{v['id']}/appStoreVersionLocalizations?limit=50"):
        api.write(f"what's new {loc['attributes']['locale']}", "PATCH", f"/v1/appStoreVersionLocalizations/{loc['id']}",
                  {"data": {"type": "appStoreVersionLocalizations", "id": loc["id"], "attributes": {"whatsNew": notes}}})
    sub = api.write("open review submission", "POST", "/v1/reviewSubmissions",
                    {"data": {"type": "reviewSubmissions", "attributes": {"platform": "IOS"},
                              "relationships": {"app": {"data": {"type": "apps", "id": APP}}}}})
    if sub is None:
        open_subs = api.get(f"/v1/reviewSubmissions?filter[app]={APP}&filter[state]=READY_FOR_REVIEW&limit=1")["data"]
        if not open_subs:
            return
        sub = {"data": open_subs[0]}
    sid = sub["data"]["id"]
    api.write("add version to submission", "POST", "/v1/reviewSubmissionItems",
              {"data": {"type": "reviewSubmissionItems", "relationships": {
                  "reviewSubmission": {"data": {"type": "reviewSubmissions", "id": sid}},
                  "appStoreVersion": {"data": {"type": "appStoreVersions", "id": v["id"]}}}}})
    api.write("submit for App Review", "PATCH", f"/v1/reviewSubmissions/{sid}",
              {"data": {"type": "reviewSubmissions", "id": sid, "attributes": {"submitted": True}}})


def main():
    p = argparse.ArgumentParser()
    p.add_argument("mode", choices=["external", "release", "status"])
    p.add_argument("--build", default="", help="build number, default the newest upload")
    p.add_argument("--notes", default="", help="tester notes or App Store what's new text")
    p.add_argument("--wait", type=int, default=1800, help="seconds to wait for processing")
    p.add_argument("--apply", action="store_true", help="write to App Store Connect, otherwise dry run")
    a = p.parse_args()
    api = ASC(a.apply)
    if a.mode == "status":
        for x in api.all(f"/v1/apps/{APP}/appStoreVersions?limit=5"):
            print("store", x["attributes"]["versionString"], x["attributes"]["appStoreState"])
        ext = [x["attributes"]["version"] for x in api.get(f"/v1/betaGroups/{EXTERNAL_GROUP}/builds?limit=1")["data"]]
        print("external testers on", ext[0] if ext else "none")
        b, pre = find_build(api, a.build, 0)
        print("newest build", b["attributes"]["version"], pre)
        return
    b, pre = find_build(api, a.build, a.wait)
    print(f"build {b['attributes']['version']} version {pre}")
    if a.mode == "external":
        external(api, b, a.notes)
    else:
        if not a.notes:
            raise SystemExit("release needs --notes for What's New")
        release(api, b, pre, a.notes)


if __name__ == "__main__":
    main()
