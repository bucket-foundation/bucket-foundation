import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asc_setup import ASC

APPS = {"bucket": "6825123451", "polingual": "6825177856"}
SKIP = ("appreview", "app-review", "apple-review")


def external_groups(api):
    out = []
    for app in APPS.values():
        out += [g for g in api.get(f"/v1/apps/{app}/betaGroups?limit=50")["data"] if not g["attributes"]["isInternalGroup"]]
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument("emails", help="file with one email per line")
    p.add_argument("--apply", action="store_true")
    args = p.parse_args()
    api = ASC(args.apply)
    emails = sorted({l.strip().lower() for l in open(args.emails) if "@" in l})
    emails = [e for e in emails if not e.split("@")[0].startswith(SKIP)]
    groups = external_groups(api)
    members = {g["id"]: {t["attributes"]["email"].lower() for t in api.all(f"/v1/betaGroups/{g['id']}/betaTesters?limit=200") if t["attributes"].get("email")} for g in groups}
    print(f"{len(emails)} accounts, {len(groups)} external groups")
    for e in emails:
        want = [g for g in groups if e not in members[g["id"]]]
        if not want:
            continue
        masked = e[:2] + "***@" + e.split("@")[1]
        for g in want:
            api.write(f"invite {masked} to {g['attributes']['name']}", "POST", "/v1/betaTesters", {"data": {"type": "betaTesters", "attributes": {"email": e}, "relationships": {"betaGroups": {"data": [{"type": "betaGroups", "id": g["id"]}]}}}})


if __name__ == "__main__":
    main()
