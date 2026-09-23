#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import signoff_core as core  # type: ignore
else:
    from . import signoff_core as core  # type: ignore

def _record_ref(root: Path, r: "core.PendingRecord") -> str:
    return f"{r.path}#{r.id}"

def cmd_list(args) -> int:
    records = core.list_pending()
    if args.json:
        print(json.dumps([r.__dict__ for r in records], indent=2))
        return 0
    if not records:
        print("no pending records")
        return 0
    for r in records:
        doi = r.doi or "(no DOI)"
        print(f"{_record_ref(core.CANON_ROOT, r)}  [{r.tier}]  score={r.canon_score}  doi={doi}")
        print(f"    {r.title}")
    print(f"\n{len(records)} pending record(s)")
    return 0

def cmd_approve(args) -> int:
    try:
        result = core.approve(args.record, args.by, offline=args.offline)
    except core.SignoffError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    if args.json:
        print(json.dumps(result, indent=2))
    elif result["action"] == "noop":
        print(result["message"])
    else:
        print(f"approved {result['id']} ({result['path']}) by {args.by}: {result['value']}")
    return 0

def cmd_reject(args) -> int:
    try:
        result = core.reject(args.record, args.by, args.reason)
    except core.SignoffError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    if args.json:
        print(json.dumps(result, indent=2))
    elif result["action"] == "noop":
        print(result["message"])
    else:
        print(f"rejected {result['id']} ({result['path']}) by {args.by}: {result['value']}")
    return 0

def cmd_audit(args) -> int:
    result = core.audit()
    if args.json:
        print(json.dumps({"cli_events": result.cli_events, "engine_events": result.engine_events}, indent=2))
        return 0
    if not result.cli_events and not result.engine_events:
        print("no signoff events recorded")
        return 0
    if result.cli_events:
        print(f"canon sign-off events ({len(result.cli_events)}):")
        for e in result.cli_events:
            reason = f" -- reason: {e['reason']}" if e.get("reason") else ""
            print(f"  {e['date']}  {e['action']:<9} {e['path']}#{e['id']}  by {e['by']}{reason}")
            print(f"             \"{e['title']}\"")
    if result.engine_events:
        print(f"\nhypothesis-engine write-back events ({len(result.engine_events)}, candidate tier, gated at write time):")
        for e in result.engine_events:
            print(f"  {e['date'] or '(unknown date)'}  signed off by {e['by']}")
    return 0

def main(argv=None) -> int:
    p = argparse.ArgumentParser(
        prog="signoff.py",
        description="Human sign-off tool for bucket-canon/ provenance_signoff (GOVERNANCE.md).",
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    p_list = sub.add_parser("list", help="list pending records")
    p_list.add_argument("--json", action="store_true")
    p_list.set_defaults(func=cmd_list)

    p_appr = sub.add_parser("approve", help="approve a pending record")
    p_appr.add_argument("record", help="record id, <path>#<id>, or a path with exactly one pending record")
    p_appr.add_argument("--by", required=True, help="named human approver")
    p_appr.add_argument("--offline", action="store_true", help="skip the DOI HEAD-request check")
    p_appr.add_argument("--json", action="store_true")
    p_appr.set_defaults(func=cmd_approve)

    p_rej = sub.add_parser("reject", help="reject a pending record")
    p_rej.add_argument("record", help="record id, <path>#<id>, or a path with exactly one pending record")
    p_rej.add_argument("--by", required=True, help="named human approver")
    p_rej.add_argument("--reason", required=True, help="one-line rejection reason")
    p_rej.add_argument("--json", action="store_true")
    p_rej.set_defaults(func=cmd_reject)

    p_aud = sub.add_parser("audit", help="print every signoff event recorded in CANON-INGESTION-INDEX.md")
    p_aud.add_argument("--json", action="store_true")
    p_aud.set_defaults(func=cmd_audit)

    args = p.parse_args(argv)
    return args.func(args)

if __name__ == "__main__":
    sys.exit(main())
