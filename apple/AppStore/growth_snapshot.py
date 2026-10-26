import argparse
import json
import os
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from beta_feedback import APPS, client

REPO = os.environ.get("BUCKET_REPO", os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MAX_NOTES = 50


def git(*args):
    r = subprocess.run(["git", "-C", REPO, *args], capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else None


def tag_for(app, build):
    name = f"{app}-build-{build}"
    return name if git("rev-parse", "-q", "--verify", f"refs/tags/{name}") else None


def notes(prev_tag, tag):
    if not tag:
        return []
    span = f"{prev_tag}..{tag}" if prev_tag else tag
    out = git("log", "--no-merges", "--format=%s", f"-{MAX_NOTES}", span)
    return [line for line in (out or "").splitlines() if line]


def testers(api, app_id, app):
    rows = api.all(f"/v1/betaTesters?filter[apps]={app_id}&fields[betaTesters]=state&limit=200")
    return [{"app": app, "state": r["attributes"].get("state") or "INVITED"} for r in rows]


def builds(api, app_id, app):
    d = api.get(f"/v1/builds?filter[app]={app_id}&sort=-uploadedDate&limit=100&include=preReleaseVersion&fields[preReleaseVersions]=version")
    versions = {i["id"]: i["attributes"]["version"] for i in d.get("included", []) if i["type"] == "preReleaseVersions"}
    rows = []
    for r in d.get("data", []):
        a = r["attributes"]
        pre = (r.get("relationships", {}).get("preReleaseVersion", {}).get("data") or {}).get("id")
        rows.append({"app": app, "version": versions.get(pre, "?"), "build": a["version"], "uploadedAt": a["uploadedDate"], "state": a.get("processingState", "UNKNOWN")})
    rows.sort(key=lambda b: b["uploadedAt"])
    prev = None
    for b in rows:
        b["tag"] = tag_for(app, b["build"])
        b["notes"] = notes(prev, b["tag"])
        prev = b["tag"] or prev
    return rows


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true", help="print counts, send nothing")
    args = p.parse_args()
    api = client()
    snap = {"takenAt": datetime.now(timezone.utc).isoformat(), "testers": [], "builds": []}
    for app, app_id in APPS.items():
        snap["testers"] += testers(api, app_id, app)
        snap["builds"] += builds(api, app_id, app)
    if args.dry_run:
        print(f"testers {len(snap['testers'])} builds {len(snap['builds'])}")
        return
    url = os.environ["GROWTH_SNAPSHOT_URL"]
    req = urllib.request.Request(url, method="POST", data=json.dumps(snap).encode(),
                                 headers={"Authorization": "Bearer " + os.environ["WAITLIST_ADMIN_KEY"], "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        print(f"snapshot sent: {r.status}")


if __name__ == "__main__":
    main()
