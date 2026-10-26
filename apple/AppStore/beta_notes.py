import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asc_setup import ASC

APPS = {"polingual": "6825177856", "bucket": "6825123451"}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true")
    p.add_argument("--app", choices=APPS, required=True)
    p.add_argument("--build", default="", help="build number, latest upload when empty")
    p.add_argument("--notes", required=True, help="What to Test text, or @path to a file")
    args = p.parse_args()
    notes = open(args.notes[1:]).read().strip() if args.notes.startswith("@") else args.notes
    api = ASC(args.apply)
    query = f"/v1/builds?filter[app]={APPS[args.app]}&sort=-uploadedDate&limit=1"
    if args.build:
        query = f"/v1/builds?filter[app]={APPS[args.app]}&filter[version]={args.build}&limit=1"
    builds = api.all(query)
    if not builds:
        sys.exit(f"no build {args.build or 'uploaded'} for {args.app}")
    build = builds[0]
    print(f"  build {build['attributes']['version']} {build['attributes'].get('processingState')}")
    locs = api.all(f"/v1/builds/{build['id']}/betaBuildLocalizations")
    loc = next((l for l in locs if l["attributes"]["locale"] == "en-US"), None)
    if loc:
        api.write("What to Test (en-US)", "PATCH", f"/v1/betaBuildLocalizations/{loc['id']}",
                  {"data": {"type": "betaBuildLocalizations", "id": loc["id"], "attributes": {"whatsNew": notes}}})
    else:
        api.write("What to Test (en-US)", "POST", "/v1/betaBuildLocalizations",
                  {"data": {"type": "betaBuildLocalizations", "attributes": {"locale": "en-US", "whatsNew": notes},
                            "relationships": {"build": {"data": {"type": "builds", "id": build["id"]}}}}})


if __name__ == "__main__":
    main()
