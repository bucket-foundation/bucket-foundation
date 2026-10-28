import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asc_setup import ASC, rel

APP = "6825123451"


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
        api.write(f"add version {args.version} to submission", "POST", "/v1/reviewSubmissionItems",
                  {"data": {"type": "reviewSubmissionItems", "relationships": {"reviewSubmission": rel("reviewSubmissions", sub["id"]), "appStoreVersion": rel("appStoreVersions", v["id"])}}})
    api.write("submit for review", "PATCH", f"/v1/reviewSubmissions/{sub['id']}",
              {"data": {"type": "reviewSubmissions", "id": sub["id"], "attributes": {"submitted": True}}})


if __name__ == "__main__":
    main()
