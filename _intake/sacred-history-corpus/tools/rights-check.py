#!/usr/bin/env python3
"""rights-check.py — machine-checkable gate for the Sacred-History Corpus.

Delivers the runnable half of bkt-npa: rights.json is the data; this is the
checker every ingestion runner and downstream tool calls BEFORE writing bytes.

Two modes:

  1. validate  (default) — assert rights.json obeys RIGHTS-POLICY.md invariants.
     Exits non-zero on any violation. Wire this into run-all.sh / CI.

  2. classify <source_id> [--license <class>] [--images]
     — print the tier decision for one edition. Exit 0 = Tier A (full text
       allowed), exit 10 = Tier B / metadata-only, exit 20 = per-item
       (must read upstream license at fetch time).

Design: zero third-party deps (stdlib only), same posture as the runner.

Invariants enforced (from spec/RIGHTS-POLICY.md §2, §5):
  I1  every source has the required fields, fully populated
  I2  license class maps to the declared tier (A/B/per-item) via license_classes
  I3  NC (cc-by-nc*, nc_present on a non-per-item source) is NEVER Tier A
  I4  Tier B / metadata-only sources declare full_text_allowed in {no, metadata-only}
  I5  Tier A sources declare full_text_allowed == yes
  I6  images_excluded is true for EVERY source (image bytes never stored)
  I7  every phase1_live source resolves to Tier A or per-item (never a hard Tier B)
  I8  default_on_absence is always "metadata-only" (when-in-doubt-leave-it-out)
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RIGHTS = os.path.normpath(os.path.join(HERE, "..", "spec", "rights.json"))

REQUIRED = [
    "id", "tradition", "name", "endpoint", "license", "tier",
    "full_text_allowed", "per_item_license_read", "nc_present",
    "manuscript_provenance", "images_excluded", "phase1_live",
    "default_on_absence", "notes",
]
NC_CLASSES = {"cc-by-nc", "cc-by-nc-sa"}
TIER_A_FTA = {"yes"}
TIER_B_FTA = {"no", "metadata-only"}


def load():
    with open(RIGHTS, encoding="utf-8") as fh:
        return json.load(fh)


def validate(doc):
    errs = []
    classes = doc.get("license_classes", {})
    seen = set()
    for s in doc.get("sources", []):
        sid = s.get("id", "<no-id>")
        # I1 required fields
        for f in REQUIRED:
            if f not in s or s[f] in (None, ""):
                errs.append(f"[{sid}] I1 missing/empty field: {f}")
        if sid in seen:
            errs.append(f"[{sid}] duplicate source id")
        seen.add(sid)

        lic = s.get("license")
        tier = s.get("tier")
        fta = s.get("full_text_allowed")

        # I2 license class -> tier
        expected = classes.get(lic)
        if expected is None:
            errs.append(f"[{sid}] I2 license '{lic}' not in license_classes")
        elif expected != tier:
            errs.append(f"[{sid}] I2 license '{lic}' maps to tier '{expected}' but source declares '{tier}'")

        # I3 NC never Tier A
        if (lic in NC_CLASSES) and tier == "A":
            errs.append(f"[{sid}] I3 NC license '{lic}' declared Tier A (must be B)")
        if s.get("nc_present") is True and tier == "A":
            errs.append(f"[{sid}] I3 nc_present=true on a Tier A source (NC must be gated per-item or Tier B)")

        # I4 / I5 tier <-> full_text_allowed
        if tier == "A" and fta not in TIER_A_FTA:
            errs.append(f"[{sid}] I5 Tier A must have full_text_allowed=yes, got '{fta}'")
        if tier == "B" and fta not in TIER_B_FTA:
            errs.append(f"[{sid}] I4 Tier B must have full_text_allowed in {sorted(TIER_B_FTA)}, got '{fta}'")

        # per-item must actually read the upstream license
        if tier == "per-item" and s.get("per_item_license_read") is not True:
            errs.append(f"[{sid}] per-item source must set per_item_license_read=true")

        # I6 images always excluded
        if s.get("images_excluded") is not True:
            errs.append(f"[{sid}] I6 images_excluded must be true (image bytes are never stored)")

        # I7 live sources never a hard Tier B
        if s.get("phase1_live") is True and tier == "B":
            errs.append(f"[{sid}] I7 phase1_live source resolves to hard Tier B — a live PD/open source cannot be Tier B")

        # I8 default on absence
        if s.get("default_on_absence") != "metadata-only":
            errs.append(f"[{sid}] I8 default_on_absence must be 'metadata-only'")

    return errs


def classify(doc, source_id, license_override=None, images=False):
    by_id = {s["id"]: s for s in doc["sources"]}
    s = by_id.get(source_id)
    if not s:
        print(f"unknown source: {source_id}", file=sys.stderr)
        return 2
    # image bytes are never allowed regardless of source
    if images:
        print(f"{source_id}: images -> METADATA-ONLY (image bytes are never stored)")
        return 10
    tier = s["tier"]
    lic = s["license"]
    if license_override:
        cls = doc["license_classes"].get(license_override)
        if cls is None:
            print(f"unknown license class: {license_override}", file=sys.stderr)
            return 2
        tier = cls
        lic = license_override
    if tier == "A":
        print(f"{source_id}: Tier A -> FULL-TEXT ALLOWED (license={lic})")
        return 0
    if tier == "per-item":
        print(f"{source_id}: PER-ITEM -> read upstream license at fetch time; fall back to metadata-only on absence/NC/copyright")
        return 20
    print(f"{source_id}: Tier B -> METADATA-ONLY (license={lic})")
    return 10


def main():
    ap = argparse.ArgumentParser(description="Sacred-History Corpus rights gate")
    sub = ap.add_subparsers(dest="cmd")
    sub.add_parser("validate")
    c = sub.add_parser("classify")
    c.add_argument("source_id")
    c.add_argument("--license", default=None, help="override license class for this edition")
    c.add_argument("--images", action="store_true", help="the item is a manuscript image")
    args = ap.parse_args()

    doc = load()

    if args.cmd == "classify":
        return classify(doc, args.source_id, args.license, args.images)

    # default: validate
    errs = validate(doc)
    n = len(doc.get("sources", []))
    if errs:
        print(f"RIGHTS CHECK FAILED — {len(errs)} violation(s) across {n} sources:\n")
        for e in errs:
            print("  " + e)
        return 1
    a = sum(1 for s in doc["sources"] if s["tier"] == "A")
    b = sum(1 for s in doc["sources"] if s["tier"] == "B")
    pi = sum(1 for s in doc["sources"] if s["tier"] == "per-item")
    live = sum(1 for s in doc["sources"] if s.get("phase1_live"))
    print(f"RIGHTS CHECK PASSED — {n} sources: {a} Tier-A, {b} Tier-B, {pi} per-item; {live} phase1-live.")
    print("Every source: images excluded, default-on-absence=metadata-only, NC never Tier A.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
