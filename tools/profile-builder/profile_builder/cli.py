import argparse
import json
from pathlib import Path

from . import profile, sources

SIGN_IN_SOURCES = {
    "email": "identity only, no data collected",
    "github": "public repos, languages, topics, READMEs; private repos only with the person's OAuth token",
    "orcid": "works and topics through ORCID and OpenAlex",
    "wallet": "linked identity; on-chain activity only with consent",
    "web": "personal sites and link lists, crawled up to --max-links pages on the same hosts",
    "local": "project docs on the person's own machine, read only with consent",
}

def run_sources(plan) -> list[sources.Item]:
    items: list[sources.Item] = []
    for name, fn in plan:
        try:
            items += fn()
        except Exception as exc:
            items.append(sources.Item(name, name, "", "", {"kind": "source", "error": f"{type(exc).__name__}: {exc}"}))
    return items

def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="profile-builder")
    ap.add_argument("--name", required=True)
    ap.add_argument("--email")
    ap.add_argument("--github")
    ap.add_argument("--orcid")
    ap.add_argument("--wallet")
    ap.add_argument("--web", nargs="*", default=[])
    ap.add_argument("--local", nargs="*", default=[])
    ap.add_argument("--max-links", type=int, default=50)
    ap.add_argument("--out", required=True)
    ap.add_argument("--list-sources", action="store_true")
    args = ap.parse_args(argv)
    if args.list_sources:
        print(json.dumps(SIGN_IN_SOURCES, indent=2))
        return
    out = Path(args.out).expanduser().resolve()
    repo_root = Path(__file__).resolve().parents[3]
    if repo_root in out.parents:
        raise SystemExit(f"refusing to write a profile inside the repository: {out}")
    items: list[sources.Item] = []
    plan = []
    if args.github:
        plan.append(("github", lambda: sources.github(args.github, args.max_links, sources.gh_token())))
    if args.orcid or args.github is None:
        plan.append(("openalex", lambda: sources.openalex(args.orcid, None if args.orcid else args.name, args.max_links)))
    if args.web:
        plan.append(("web", lambda: sources.websites(args.web, args.max_links)))
    if args.local:
        plan.append(("local", lambda: sources.local(args.local, args.max_links)))
    items += run_sources(plan)
    person = {"name": args.name, "email": args.email, "github": args.github, "orcid": args.orcid, "wallet": args.wallet,
              "sources_used": [s for s in ("github", "orcid", "web", "local") if getattr(args, s)]}
    result = profile.build(person, items)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2))
    print(json.dumps({"out": str(out), **result["counts"], "branches": result["branches"]}))
