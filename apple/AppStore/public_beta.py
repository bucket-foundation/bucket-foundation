import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asc_setup import ASC, rel

APPS = {"polingual": ("6825177856", "Polingual Beta"), "bucket": ("6825123451", "Bucket Beta Learners")}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true")
    p.add_argument("--app", choices=APPS, default="polingual")
    p.add_argument("--limit", type=int, default=0, help="cap on public-link testers, 0 for none")
    args = p.parse_args()
    api = ASC(args.apply)
    app, name = APPS[args.app]
    group = next((g for g in api.all(f"/v1/apps/{app}/betaGroups") if g["attributes"]["name"] == name), None)
    attrs = {"name": name, "publicLinkEnabled": True, "publicLinkLimitEnabled": args.limit > 0}
    if args.limit > 0:
        attrs["publicLinkLimit"] = args.limit
    if group is None:
        d = api.write(f"external group '{name}' with a public link", "POST", "/v1/betaGroups",
                      {"data": {"type": "betaGroups", "attributes": attrs, "relationships": {"app": rel("apps", app)}}})
        group = d and d["data"]
    else:
        print(f"  have  group '{name}'")
    build = api.all(f"/v1/builds?filter[app]={app}&sort=-uploadedDate&limit=1")[0]
    print(f"  latest build {build['attributes']['version']}")
    if group:
        api.write(f"add build {build['attributes']['version']} to '{name}'", "POST", f"/v1/betaGroups/{group['id']}/relationships/builds",
                  {"data": [{"type": "builds", "id": build["id"]}]})
    api.write("submit the build for beta review", "POST", "/v1/betaAppReviewSubmissions",
              {"data": {"type": "betaAppReviewSubmissions", "relationships": {"build": rel("builds", build["id"])}}})
    if group and args.apply:
        g = api.get(f"/v1/betaGroups/{group['id']}")["data"]["attributes"]
        print(f"Public link: {g.get('publicLink')} (works once Apple approves the beta review, usually within a day)")


if __name__ == "__main__":
    main()
