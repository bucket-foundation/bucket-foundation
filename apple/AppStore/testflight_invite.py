import argparse
import os
import sys
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asc_setup import ASC

APPS = {"bucket": "6825123451", "polingual": "6825177856"}
SKIP = ("appreview", "app-review", "apple-review")


def link(api, label, group, tester):
    if not api.apply:
        print(f"  would {label}")
        return
    status, body = api.call("POST", f"/v1/betaGroups/{group}/relationships/betaTesters", {"data": [{"type": "betaTesters", "id": tester}]})
    if status < 300:
        print(f"  done  {label}")
    else:
        print(f"  FAIL  {label}: {status} {[(e.get('code'), e.get('detail')) for e in body.get('errors', [])]}")


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
        found = api.get(f"/v1/betaTesters?filter[email]={quote(e)}&limit=1")["data"]
        if found:
            for g in want:
                link(api, f"add {masked} to {g['attributes']['name']}", g["id"], found[0]["id"])
            continue
        first, rest = want[0], want[1:]
        made = api.write(f"invite {masked} to {first['attributes']['name']}", "POST", "/v1/betaTesters", {"data": {"type": "betaTesters", "attributes": {"email": e}, "relationships": {"betaGroups": {"data": [{"type": "betaGroups", "id": first["id"]}]}}}})
        tid = (made or {}).get("data", {}).get("id")
        for g in rest:
            if tid or not api.apply:
                link(api, f"add {masked} to {g['attributes']['name']}", g["id"], tid)


if __name__ == "__main__":
    main()
