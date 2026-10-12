import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
REPO = HERE.parent.parent
LEDGERS = HERE / "claims"
SITE = REPO / "src" / "lib" / "research-os" / "solvability-claims-data.json"
NEIGHBORS = REPO / "src" / "lib" / "research-os" / "solvability-neighbors-data.json"
CARDS = REPO / "src" / "lib" / "research-os" / "solvability-atlas-data.json"
RECORDS = HERE / "records"
SCHEMA = "bucket.solvability-atlas.claims/v1"
SITE_SCHEMA = "bucket.solvability-atlas.claims-site/v1"
CLAIMED = "claimed"
MATCHES = ("problem", "special_case", "weaker_bound", "related", "unestablished")
SETTLING_MATCH = "problem"
FORMAL_SCOPES = ("full", "narrower", "none")
CONFIRMATION_KINDS = ("named_expert", "refereed_venue")
STATUS_RULE = "A row is claimed when an unwithdrawn ledger entry states its problem in full and no independent confirmation is recorded. A claimed row is unsolved in every frontier, reach and solved-rate computation. A confirmation by a named expert or a refereed venue turns the row solved with the confirmation year as its resolved year. Entries that match a special case, a weaker bound or a related statement are notes and leave the status alone."
ENTRY = {"id": str, "family": str, "family_title": str, "claimant": str, "date": str, "source_url": str, "manuscripts": list, "statement": str, "match": str, "match_note": str, "formal": dict}
FORMAL = {"exists": bool, "scope": str, "statement": (str, type(None)), "url": (str, type(None)), "note": str}
CONFIRMATION = {"by": str, "kind": str, "url": str, "date": str}
WITHDRAWAL = {"date": str, "url": str}
SOURCE = {"url": str, "commit": str, "licence": str, "retrieved": str, "claimant": str, "date": str, "review": str}


def typed(obj, spec, tag):
    if not isinstance(obj, dict):
        return [f"{tag} is not an object"]
    out = []
    for k, t in spec.items():
        if k not in obj:
            out.append(f"{tag} missing {k}")
        elif not isinstance(obj[k], t):
            out.append(f"{tag} {k} has type {type(obj[k]).__name__}")
    return out


def iso_date(text):
    parts = text.split("-")
    return len(parts) == 3 and all(p.isdigit() for p in parts) and len(parts[0]) == 4


def entry_errors(e, tag):
    out = typed(e, ENTRY, tag)
    if out:
        return out
    if e["match"] not in MATCHES:
        out.append(f"{tag} match {e['match']}")
    if not iso_date(e["date"]):
        out.append(f"{tag} date {e['date']}")
    if not e["source_url"].startswith("https://"):
        out.append(f"{tag} source_url is not https")
    if not e["statement"].strip() or not e["claimant"].strip():
        out.append(f"{tag} empty statement or claimant")
    out += typed(e["formal"], FORMAL, f"{tag} formal")
    f = e["formal"]
    if not out:
        if f["scope"] not in FORMAL_SCOPES:
            out.append(f"{tag} formal scope {f['scope']}")
        if f["exists"] != (f["scope"] != "none"):
            out.append(f"{tag} formal exists disagrees with scope")
        if f["exists"] and not (f["statement"] and f["url"]):
            out.append(f"{tag} formal proof without statement or url")
        if f["scope"] == "narrower" and not f["note"].strip():
            out.append(f"{tag} narrower formal scope without a note")
    c = e.get("confirmation")
    if c is not None:
        out += typed(c, CONFIRMATION, f"{tag} confirmation")
        if isinstance(c, dict) and c.get("kind") not in CONFIRMATION_KINDS:
            out.append(f"{tag} confirmation kind {c.get('kind')}")
        if isinstance(c, dict) and isinstance(c.get("by"), str) and not c["by"].strip():
            out.append(f"{tag} confirmation names nobody")
        if isinstance(c, dict) and isinstance(c.get("url"), str) and not c["url"].startswith("https://"):
            out.append(f"{tag} confirmation without an https url")
        if isinstance(c, dict) and isinstance(c.get("date"), str) and not iso_date(c["date"]):
            out.append(f"{tag} confirmation date {c['date']}")
    w = e.get("withdrawn")
    if w is not None:
        out += typed(w, WITHDRAWAL, f"{tag} withdrawn")
    if "confirmation" not in e:
        out.append(f"{tag} missing confirmation")
    return out


def errors(ledger):
    out = []
    if not isinstance(ledger, dict):
        return ["ledger is not an object"]
    if ledger.get("schema") != SCHEMA:
        out.append(f"schema is {ledger.get('schema')}")
    if not isinstance(ledger.get("batch"), str) or not ledger.get("batch"):
        out.append("batch missing")
    out += typed(ledger.get("source"), SOURCE, "source")
    entries = ledger.get("claims")
    if not isinstance(entries, list):
        return out + ["claims missing"]
    seen = set()
    for i, e in enumerate(entries):
        tag = f"claims[{i}]"
        out += entry_errors(e, tag)
        key = (e.get("id"), e.get("family")) if isinstance(e, dict) else None
        if key in seen:
            out.append(f"{tag} duplicate {key}")
        seen.add(key)
    for i, a in enumerate(ledger.get("absent", [])):
        out += typed(a, {"reference": str, "reason": str}, f"absent[{i}]")
    return out


def validate(ledger):
    e = errors(ledger)
    if e:
        raise ValueError("; ".join(e[:10]))
    return ledger


def ledgers(directory=LEDGERS):
    out = []
    for path in sorted(Path(directory).glob("*.json")):
        data = json.loads(path.read_text(encoding="utf8"))
        if data.get("schema") == SCHEMA:
            out.append(validate(data))
    return out


def entries(directory=LEDGERS):
    out = []
    for ledger in ledgers(directory):
        for e in ledger["claims"]:
            out.append({**e, "batch": ledger["batch"]})
    return out


def active(e):
    return e.get("withdrawn") is None


def settles(e):
    return e["match"] == SETTLING_MATCH and active(e)


def by_id(items):
    out = {}
    for e in items:
        out.setdefault(e["id"], []).append(e)
    return out


def governing(items):
    out = {}
    for pid, rows in by_id(items).items():
        settling = [e for e in rows if settles(e)]
        if not settling:
            continue
        confirmed = sorted((e for e in settling if e["confirmation"] is not None), key=lambda e: e["confirmation"]["date"])
        if confirmed:
            out[pid] = {"status": "solved", "resolved": int(confirmed[0]["confirmation"]["date"][:4]), "entry": confirmed[0]}
        else:
            out[pid] = {"status": CLAIMED, "resolved": None, "entry": sorted(settling, key=lambda e: (e["date"], e["family"]))[0]}
    return out


def compact(e):
    return {"batch": e["batch"], "family": e["family"], "match": e["match"], "formal_scope": e["formal"]["scope"], "confirmed": e["confirmation"] is not None, "withdrawn": not active(e)}


def attach(card, ledger):
    mine = [compact(e) for e in ledger.get(card["id"], [])] if card.get("source_kind") != "lean" else []
    if mine:
        card["published_claims"] = mine
    else:
        card.pop("published_claims", None)
    return card


def record_claims(pid, items):
    return [{k: v for k, v in e.items() if k != "id"} for e in items if e["id"] == pid]


def site_payload(directory=LEDGERS):
    batches = []
    rows = {}
    for ledger in ledgers(directory):
        batches.append({"batch": ledger["batch"], "source": ledger["source"], "counts": ledger.get("counts", {}), "absent": ledger.get("absent", [])})
        for e in ledger["claims"]:
            rows.setdefault(e["id"], []).append({**{k: v for k, v in e.items() if k != "id"}, "batch": ledger["batch"]})
    return {"schema": SITE_SCHEMA, "rule": STATUS_RULE, "batches": batches, "rows": rows}


def apply(neighbors=NEIGHBORS, records=RECORDS, site=SITE, directory=LEDGERS, cards=CARDS):
    import atlas
    import record_schema

    items = entries(directory)
    nodes = atlas.full_nodes(atlas.load_problems(), atlas.load_bucketmath(), ledger=items)
    status = {n["id"]: n for n in nodes}
    data = json.loads(Path(neighbors).read_text())
    if data["ids"] != [n["id"] for n in nodes]:
        raise SystemExit("node order differs from the committed neighbour data")
    changed = 0
    for row in data["nodes"]:
        n = status[row["id"]]
        if (row["status"], row["solved"], row["resolved"]) != (n["status"], n["solved"], n["resolved"]):
            changed += 1
        row["status"], row["solved"], row["resolved"] = n["status"], n["solved"], n["resolved"]
    solved = [n["id"] for n in nodes if n["solved"]]
    if solved != data["solved"]:
        raise SystemExit("the ledger changes the solved set: rebuild with build.sh, since reach and neighbours move")
    data["note"] = data["note"].replace(data["solved_rule"], atlas.SOLVED_RULE)
    data["solved_rule"] = atlas.SOLVED_RULE
    Path(neighbors).write_text(json.dumps(data, separators=(",", ":")))
    written = 0
    for path in sorted(Path(records).glob("*.json")):
        rec = json.loads(path.read_text(encoding="utf8"))
        mine = record_claims(rec["id"], items)
        if rec.get("claims", []) == mine:
            continue
        if mine:
            rec["claims"] = mine
        else:
            rec.pop("claims", None)
        record_schema.validate(rec)
        path.write_text(json.dumps(rec, indent=1, ensure_ascii=False), encoding="utf8")
        written += 1
    Path(site).write_text(json.dumps(site_payload(directory), indent=1, ensure_ascii=False) + "\n", encoding="utf8")
    deck = json.loads(Path(cards).read_text())
    ledger = by_id(items)
    for card in deck["productions"]:
        attach(card, ledger)
    Path(cards).write_text(json.dumps(deck, indent=1))
    return {"neighbour_rows_changed": changed, "records_written": written, "claimed": sum(1 for n in nodes if n["status"] == CLAIMED)}


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args(argv)
    items = entries()
    if args.apply:
        print(json.dumps(apply()))
        return 0
    g = governing(items)
    print(json.dumps({"entries": len(items), "rows": len(by_id(items)), "claimed": sum(1 for v in g.values() if v["status"] == CLAIMED), "confirmed": sum(1 for v in g.values() if v["status"] == "solved")}))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
