#!/usr/bin/env python3
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = HERE.parent / "public/input/manifest.json"
BUCKET = "polingual-input"
CACHE_CONTROL = "public, max-age=31536000, immutable"


def request(method, url, key, body=None, headers=None):
    req = urllib.request.Request(url, data=body, method=method,
                                 headers={"Authorization": f"Bearer {key}", "apikey": key, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def ensure_bucket(api, key):
    body = json.dumps({"id": BUCKET, "name": BUCKET, "public": True}).encode()
    code, out = request("POST", f"{api}/storage/v1/bucket", key, body, {"Content-Type": "application/json"})
    if code not in (200, 201) and b"already exists" not in out.lower() and b"duplicate" not in out.lower():
        sys.exit(f"upload_input_bands: bucket create failed {code} {out[:200]!r}")


def band_files(manifest):
    for entry in manifest["langs"].values():
        yield "bundles", entry["file"]
        for parts in entry.get("graded", {}).get("files", {}).values():
            for p in parts:
                yield "bands", p["file"]
    for entry in manifest.get("cognates", {}).values():
        yield "bands", entry["file"]


def exists(api, key, name):
    code, _ = request("HEAD", f"{api}/storage/v1/object/public/{BUCKET}/{name}", key)
    return code == 200


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--bands", default=os.environ.get("POLINGUAL_INPUT_BANDS_DIR", str(Path.home() / ".cache/polingual-input-bands")))
    ap.add_argument("--manifest", default=str(MANIFEST))
    ap.add_argument("--bundles", default=str(MANIFEST.parent))
    a = ap.parse_args(argv)
    api = (os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not api or not key:
        sys.exit("upload_input_bands: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (npm run db:local:status)")
    ensure_bucket(api, key)
    sent = skipped = 0
    for kind, name in band_files(json.loads(Path(a.manifest).read_text())):
        if exists(api, key, name):
            skipped += 1
            continue
        body = (Path(a.bands if kind == "bands" else a.bundles) / name).read_bytes()
        code, out = request("POST", f"{api}/storage/v1/object/{BUCKET}/{name}", key, body,
                            {"Content-Type": "application/json", "cache-control": CACHE_CONTROL, "x-upsert": "true"})
        if code not in (200, 201):
            sys.exit(f"upload_input_bands: {name} failed {code} {out[:200]!r}")
        sent += 1
    print(f"uploaded {sent}, already present {skipped}, base {api}/storage/v1/object/public/{BUCKET}")


if __name__ == "__main__":
    main()
