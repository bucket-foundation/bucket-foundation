from __future__ import annotations

import argparse
import json
import sys

from . import auth
from .registry import RegistryError
from .registry import load as load_registry


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="workbench")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("tools")
    t = sub.add_parser("token")
    ts = t.add_subparsers(dest="action", required=True)
    i = ts.add_parser("issue")
    i.add_argument("--user", required=True)
    i.add_argument("--scopes", default="read,local")
    i.add_argument("--ttl", type=float, default=auth.DEFAULT_TTL_DAYS)
    ts.add_parser("list")
    for name in ("revoke", "rotate"):
        ts.add_parser(name).add_argument("id")
    s = sub.add_parser("serve")
    s.add_argument("--host", default="127.0.0.1")
    s.add_argument("--port", type=int, default=8430)
    args = p.parse_args(argv)
    if args.cmd == "tools":
        try:
            reg = load_registry()
        except RegistryError as exc:
            print(f"registry: {exc}", file=sys.stderr)
            return 2
        for t in reg.tools.values():
            print(f"{t.id:28} {t.group:17} {t.scope:9} {t.status}")
        return 0
    if args.cmd == "token":
        store = auth.TokenStore()
        try:
            if args.action == "issue":
                tid, secret = store.issue(args.user, args.scopes.split(","), args.ttl)
                print(json.dumps({"id": tid, "token": secret}))
            elif args.action == "list":
                print(json.dumps(store.list(), indent=1))
            elif args.action == "revoke":
                store.revoke(args.id)
            else:
                tid, secret = store.rotate(args.id)
                print(json.dumps({"id": tid, "token": secret, "old_valid_s": auth.ROTATE_GRACE_S}))
        except (KeyError, ValueError) as exc:
            print(f"token: {exc}", file=sys.stderr)
            return 2
        return 0
    from .serve import serve
    from .service import Workbench

    server = serve(Workbench(), auth.SignedRequests(auth.signing_keys()), args.host, args.port)
    print(f"workbench-serve on {args.host}:{args.port}", file=sys.stderr)
    server.serve_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())
