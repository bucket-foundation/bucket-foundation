import argparse
import json
import os
import subprocess
import sys
import urllib.parse
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


APP_PATHS = {"bucket": ["apple/Bucket", "apple/BucketKit", "apple/project.yml"], "polingual": ["apple/Polingual", "apple/BucketKit", "apple/project.yml"]}
VERCEL_PROJECTS = {"bucket": "prj_qbfcjWFRpgfnegePglXLXcPtGtAQ", "polingual": "prj_ceXsE1SimoVkKuu8BkCIYJLEGSVv"}
VERCEL_TEAM = "team_qDuUjDly9IF1wQ83QKivQhAA"


def lines(out):
    return [line for line in (out or "").splitlines() if line]


def notes(app, prev, cur):
    if cur["tag"]:
        span = f"{prev['tag']}..{cur['tag']}" if prev and prev.get("tag") else cur["tag"]
        return lines(git("log", "--no-merges", "--format=%s", f"-{MAX_NOTES}", span))
    if not prev:
        return []
    return lines(git("log", "origin/dev", "--no-merges", "--format=%s", f"-{MAX_NOTES}", f"--since={prev['uploadedAt']}", f"--until={cur['uploadedAt']}", "--", *APP_PATHS[app]))


def visits(days=7):
    token = os.environ.get("VERCEL_TOKEN", "").strip()
    if not token:
        return None
    until = datetime.now(timezone.utc)
    since = until.timestamp() - days * 86400
    out = {"days": days, "byApp": {}}
    for app, project in VERCEL_PROJECTS.items():
        q = urllib.parse.urlencode({"projectId": project, "teamId": VERCEL_TEAM, "since": int(since * 1000), "until": int(until.timestamp() * 1000)})
        req = urllib.request.Request(f"https://api.vercel.com/v1/query/web-analytics/visits/count?{q}", headers={"Authorization": "Bearer " + token})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                body = json.loads(r.read())
            n = body.get("data", body).get("total", body.get("count")) if isinstance(body, dict) else None
            out["byApp"][app] = int(n) if isinstance(n, (int, float)) else None
        except Exception as e:
            print(f"visits {app}: {getattr(e, 'code', type(e).__name__)}", file=sys.stderr)
            out["byApp"][app] = None
    return out


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
        b["notes"] = notes(app, prev, b)
        prev = b
    return rows


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true", help="print counts, send nothing")
    args = p.parse_args()
    api = client()
    snap = {"takenAt": datetime.now(timezone.utc).isoformat(), "testers": [], "builds": [], "visits": visits()}
    for app, app_id in APPS.items():
        snap["testers"] += testers(api, app_id, app)
        snap["builds"] += builds(api, app_id, app)
    if args.dry_run:
        print(f"testers {len(snap['testers'])} builds {len(snap['builds'])} notes {sum(len(b['notes']) for b in snap['builds'])} visits {snap['visits']}")
        return
    url = os.environ["GROWTH_SNAPSHOT_URL"]
    req = urllib.request.Request(url, method="POST", data=json.dumps(snap).encode(),
                                 headers={"Authorization": "Bearer " + os.environ["WAITLIST_ADMIN_KEY"], "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        print(f"snapshot sent: {r.status}")


if __name__ == "__main__":
    main()
