#!/usr/bin/env python3
"""zenodo-mint.py: mint a Zenodo deposition for a Bucket Foundation paper.

Stdlib-only. Reads deposit metadata from a `zenodo.json` sidecar that sits
next to the paper's `main.tex`/`main.pdf` (see
`papers/history-hypothesis-engine/zenodo.json` for the first instance), so
the next paper reuses this script without touching the code: write a new
`zenodo.json`, point `--paper-dir` at its folder, done.

Token handling: reads `ZENODO_TOKEN` from the environment. Never accepts a
token as a CLI argument, never logs it, and never prints it. Every request
carries the token in an `Authorization: Bearer` header instead of the
legacy `?access_token=` query parameter, keeping it out of shell history,
process listings, and proxy access logs.

Subcommands:
  create   Create a new draft deposition, attach every --file given, and
           push the zenodo.json metadata. Prints the metadata JSON (never
           the token) before submitting. Prints the draft id + review URL.
           Never publishes.
  update   Push zenodo.json metadata (and any --file given) to an existing
           draft deposition id.
  show     Print a deposition's current state (metadata + files), for a
           pre-publish sanity check.
  publish  Finalize a draft deposition. THERE IS NO UNDO: once a Zenodo DOI
           is published it is permanent, even if the deposition is later
           discarded. Requires --confirm.

`--dry-run` (any subcommand): skips every Zenodo API call and every file
read past `zenodo.json` itself; prints what the real run would send (the
loaded metadata, the endpoint and method each skipped call would have
hit, the files it would have uploaded) and exits 0. No `ZENODO_TOKEN` is
read in this mode, since nothing carrying it ever leaves the process; a
rehearsal of `create` or `update` needs no token at all, and a rehearsal
of `publish` needs neither a token nor `--confirm`, since nothing
irreversible runs either way.

Usage:
  ZENODO_TOKEN=... zenodo-mint.py create --paper-dir papers/<slug> \\
      --file papers/<slug>/main.pdf --file /tmp/<slug>-sources.zip
  zenodo-mint.py show --deposition-id 12345678
  zenodo-mint.py publish --deposition-id 12345678 --confirm
  zenodo-mint.py --dry-run create --paper-dir papers/<slug> --file papers/<slug>/main.pdf
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

ZENODO_API = {
    "production": "https://zenodo.org/api",
    "sandbox": "https://sandbox.zenodo.org/api",
}


def _token() -> str:
    token = os.environ.get("ZENODO_TOKEN")
    if not token:
        print(
            "ZENODO_TOKEN is not set. This tool reads the token only from "
            "the environment and never accepts it as an argument.",
            file=sys.stderr,
        )
        sys.exit(2)
    return token


def _request(method: str, url: str, token: str, data: bytes | None = None,
             content_type: str | None = None) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    if content_type:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        # Redact the token if it ever echoes back (Zenodo does not, but stay safe).
        err_body = err_body.replace(token, "<redacted>")
        print(f"HTTP {e.code} on {method} {url}:\n{err_body}", file=sys.stderr)
        sys.exit(1)


def _base(sandbox: bool) -> str:
    return ZENODO_API["sandbox" if sandbox else "production"]


def load_metadata(paper_dir: str) -> dict:
    path = os.path.join(paper_dir, "zenodo.json")
    with open(path, "r", encoding="utf-8") as f:
        metadata = json.load(f)
    print(f"Loaded metadata from {path}:")
    print(json.dumps(metadata, indent=2, ensure_ascii=False))
    return metadata


def upload_file(bucket_url: str, file_path: str, token: str) -> None:
    filename = os.path.basename(file_path)
    with open(file_path, "rb") as f:
        data = f.read()
    url = f"{bucket_url}/{filename}"
    print(f"Uploading {file_path} -> {url} ({len(data)} bytes)")
    _request("PUT", url, token, data=data, content_type="application/octet-stream")


def cmd_create(args: argparse.Namespace) -> None:
    base = _base(args.sandbox)
    metadata = load_metadata(args.paper_dir)

    if args.dry_run:
        print(f"[dry-run] would POST {base}/deposit/depositions to create a draft deposition.")
        for file_path in args.file:
            print(f"[dry-run] would upload {file_path}")
        print("[dry-run] would PUT the metadata above onto the new draft. No API call made.")
        return

    token = _token()
    deposition = _request("POST", f"{base}/deposit/depositions", token,
                           data=b"{}", content_type="application/json")
    dep_id = deposition["id"]
    bucket_url = deposition["links"]["bucket"]
    print(f"Created draft deposition {dep_id}")

    for file_path in args.file:
        upload_file(bucket_url, file_path, token)

    updated = _request(
        "PUT", f"{base}/deposit/depositions/{dep_id}", token,
        data=json.dumps({"metadata": metadata}).encode("utf-8"),
        content_type="application/json",
    )
    print(f"Metadata applied. Draft review URL: https://{'sandbox.' if args.sandbox else ''}zenodo.org/deposit/{dep_id}")
    print(json.dumps({"id": dep_id, "links": updated.get("links", {})}, indent=2))


def cmd_update(args: argparse.Namespace) -> None:
    base = _base(args.sandbox)
    metadata = load_metadata(args.paper_dir)

    if args.dry_run:
        print(f"[dry-run] would GET {base}/deposit/depositions/{args.deposition_id} for its upload bucket.")
        for file_path in args.file:
            print(f"[dry-run] would upload {file_path}")
        print(f"[dry-run] would PUT the metadata above onto deposition {args.deposition_id}. No API call made.")
        return

    token = _token()
    dep = _request("GET", f"{base}/deposit/depositions/{args.deposition_id}", token)
    bucket_url = dep["links"]["bucket"]

    for file_path in args.file:
        upload_file(bucket_url, file_path, token)

    _request(
        "PUT", f"{base}/deposit/depositions/{args.deposition_id}", token,
        data=json.dumps({"metadata": metadata}).encode("utf-8"),
        content_type="application/json",
    )
    print(f"Deposition {args.deposition_id} updated.")


def cmd_show(args: argparse.Namespace) -> None:
    base = _base(args.sandbox)
    if args.dry_run:
        print(f"[dry-run] would GET {base}/deposit/depositions/{args.deposition_id}. No API call made.")
        return

    token = _token()
    dep = _request("GET", f"{base}/deposit/depositions/{args.deposition_id}", token)
    print(json.dumps(dep, indent=2, ensure_ascii=False))


def cmd_publish(args: argparse.Namespace) -> None:
    base = _base(args.sandbox)
    if args.dry_run:
        print(
            f"[dry-run] would POST {base}/deposit/depositions/{args.deposition_id}/actions/publish. "
            "No API call made; --confirm is not required in dry-run mode, since nothing irreversible runs."
        )
        return

    if not args.confirm:
        print(
            "Refusing to publish without --confirm. A Zenodo DOI is "
            "permanent once published; there is no undo.",
            file=sys.stderr,
        )
        sys.exit(2)
    token = _token()
    result = _request(
        "POST", f"{base}/deposit/depositions/{args.deposition_id}/actions/publish",
        token,
    )
    doi = result.get("doi") or result.get("metadata", {}).get("doi")
    print(f"Published. DOI: {doi}")
    print(json.dumps(result, indent=2, ensure_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__,
                                      formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--sandbox", action="store_true",
                         help="Use sandbox.zenodo.org instead of the production API.")
    parser.add_argument("--dry-run", action="store_true", dest="dry_run",
                         help="Skip every Zenodo API call; print what would be sent and exit 0.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_create = sub.add_parser("create")
    p_create.add_argument("--paper-dir", required=True)
    p_create.add_argument("--file", action="append", default=[])
    p_create.set_defaults(func=cmd_create)

    p_update = sub.add_parser("update")
    p_update.add_argument("--paper-dir", required=True)
    p_update.add_argument("--deposition-id", required=True)
    p_update.add_argument("--file", action="append", default=[])
    p_update.set_defaults(func=cmd_update)

    p_show = sub.add_parser("show")
    p_show.add_argument("--deposition-id", required=True)
    p_show.set_defaults(func=cmd_show)

    p_publish = sub.add_parser("publish")
    p_publish.add_argument("--deposition-id", required=True)
    p_publish.add_argument("--confirm", action="store_true")
    p_publish.set_defaults(func=cmd_publish)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
