#!/usr/bin/env python3
import argparse
import collections
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alignlib as A  # noqa: E402

EXAMPLES = 3


def matched_rows(records):
    by_atom = collections.defaultdict(list)
    for record in records:
        if record["progression_id"]:
            by_atom[record["atom"]].append(record)
    return by_atom


def atom_levels(atoms, by_atom):
    out = []
    for atom in atoms:
        summary = A.level_summary(by_atom.get(atom["atom"], []))
        row = {"atom": atom["atom"], "deck": atom["deck"]}
        row.update(summary or {
            "level": None, "level_first": None, "level_last": None, "spread": None, "levels": {},
            "level_schema_rule": None, "rows": 0,
        })
        row["verified"] = False
        out.append(row)
    return out


def edge_agreement(atoms, by_atom, levels, forward):
    reach = {}

    def after(row_id):
        if row_id not in reach:
            reach[row_id] = A.reachable(forward, row_id)
        return reach[row_id]

    level_of = {row["atom"]: row["level"] for row in levels}
    out = []
    for atom in atoms:
        for required in atom["requires"]:
            before, later = f"atom:{atom['deck']}/{required}", atom["atom"]
            rows_before = sorted({r["progression_id"] for r in by_atom.get(before, []) if r["match"] in A.LEVEL_MATCHES})
            rows_later = sorted({r["progression_id"] for r in by_atom.get(later, []) if r["match"] in A.LEVEL_MATCHES})
            forward_pairs = [[b, l] for b in rows_before for l in rows_later if b != l and l in after(b)]
            reverse_pairs = [[l, b] for b in rows_before for l in rows_later if b != l and b in after(l)]
            tight_before = {r["progression_id"] for r in by_atom.get(before, []) if r["match"] in A.TIGHT_MATCHES}
            tight_later = {r["progression_id"] for r in by_atom.get(later, []) if r["match"] in A.TIGHT_MATCHES}
            strict = A.edge_verdict(
                [p for p in forward_pairs if p[0] in tight_before and p[1] in tight_later],
                [p for p in reverse_pairs if p[1] in tight_before and p[0] in tight_later],
            )
            lb, ll = level_of.get(before), level_of.get(later)
            order = None
            if lb and ll:
                order = "consistent" if A.LEVEL_RANK[lb] <= A.LEVEL_RANK[ll] else "inverted"
            out.append({
                "deck": atom["deck"], "prerequisite": before, "dependent": later,
                "verdict": A.edge_verdict(forward_pairs, reverse_pairs),
                "verdict_exact_rows_only": strict,
                "forward_pairs": len(forward_pairs), "reverse_pairs": len(reverse_pairs),
                "shared_rows": len(set(rows_before) & set(rows_later)),
                "rows_prerequisite": len(rows_before), "rows_dependent": len(rows_later),
                "forward_examples": forward_pairs[:EXAMPLES], "reverse_examples": reverse_pairs[:EXAMPLES],
                "level_prerequisite": lb, "level_dependent": ll, "level_order": order,
                "verified": False,
            })
    return out


def backbone():
    minor, cip = {}, set()
    for row in A.read_jsonl(os.path.join(A.CORPUS, "backbone_codes.jsonl")):
        if row["scheme"] == "soc2018" and row.get("minor_group"):
            minor[row["code"]] = row["minor_group"]
        if row["scheme"] == "cip2020":
            cip.add(row["code"])
    return minor, cip


def atom_careers(atoms, by_atom, minor):
    crosswalk = collections.defaultdict(set)
    for row in A.read_jsonl(os.path.join(A.CORPUS, "cip_soc_crosswalk.jsonl")):
        crosswalk[row["cip"]].add(row["soc"])
    out = []
    for atom in atoms:
        families = collections.Counter()
        for record in by_atom.get(atom["atom"], []):
            if record["match"] in A.LEVEL_MATCHES and record["cip"]:
                families[A.cip_family(record["cip"])] += 1
        if not families:
            continue
        groups = collections.Counter()
        for code, socs in crosswalk.items():
            if any(code.startswith(family) for family in families):
                for soc in socs:
                    if soc in minor:
                        groups[minor[soc]] += 1
        out.append({
            "atom": atom["atom"],
            "cip_families": [{"cip": c, "rows": n} for c, n in sorted(families.items(), key=lambda p: (-p[1], p[0]))],
            "soc_minor_groups": [{"soc": c, "links": n} for c, n in sorted(groups.items(), key=lambda p: (-p[1], p[0]))],
            "method": "rule:cip-of-matched-rows+cip-soc-crosswalk",
            "verified": False,
        })
    return out


def gaps(by_atom, forward):
    sequenced = set(forward)
    for dsts in forward.values():
        sequenced |= dsts
    cells = collections.defaultdict(lambda: collections.Counter())
    seq = collections.Counter()
    no_cip = 0
    for table in ("progression", "courses"):
        for row in A.read_jsonl(os.path.join(A.CORPUS, f"{table}.jsonl.zst")):
            family = A.cip_family((row.get("cip") or {}).get("code"))
            if not family:
                no_cip += 1
                continue
            cells[family][row.get("level") or "unlevelled"] += 1
            if row["id"] in sequenced:
                seq[family] += 1
    covered = collections.defaultdict(set)
    for records in by_atom.values():
        for record in records:
            if record["match"] in A.LEVEL_MATCHES and record["cip"]:
                covered[A.cip_family(record["cip"])].add(record["level"])
    out = []
    for family, levels in cells.items():
        rows = sum(levels.values())
        ordered = {name: levels[name] for name in A.LEVELS + ["unlevelled"] if levels[name]}
        if family not in covered:
            out.append({"kind": "family", "cip_family": family, "cip_series": family[:2], "rows": rows,
                        "sequenced_rows": seq[family], "levels": ordered})
        else:
            missing = {name: n for name, n in ordered.items() if name not in covered[family] and name != "unlevelled"}
            if missing:
                out.append({"kind": "level", "cip_family": family, "cip_series": family[:2], "rows": sum(missing.values()),
                            "sequenced_rows": None, "levels": missing})
    out.sort(key=lambda r: (r["kind"], -(r["sequenced_rows"] or 0), -r["rows"], r["cip_family"]))
    rank = collections.Counter()
    for row in out:
        rank[row["kind"]] += 1
        row["rank"] = rank[row["kind"]]
    return out, no_cip


def holdout_rates():
    rows = A.read_jsonl(os.path.join(A.PACKAGE, "review", "holdout-24.jsonl"))
    return dict(sorted(collections.Counter(row["judgement"] for row in rows).items()))


def sample_rates():
    rows = list(A.read_jsonl(os.path.join(A.PACKAGE, "review", "sample-60.jsonl")))
    limits = A.thresholds()
    bands = collections.defaultdict(collections.Counter)
    for row in rows:
        bands[row["band"]][row["judgement"]] += 1
        bands["accepted" if A.accepts(row["score"], row["row_level"], limits) else "rejected"][row["judgement"]] += 1
        bands["kind:" + row["kind"]][row["judgement"]] += 1
    return {name: dict(sorted(counts.items())) for name, counts in sorted(bands.items())}


def stats(atoms, records, levels, edges, resources, careers, gap_rows, no_cip):
    decks = collections.OrderedDict()
    matched = {r["atom"] for r in records if r["progression_id"]}
    for atom in atoms:
        deck = decks.setdefault(atom["deck"], {"atoms": 0, "matched": 0, "unmatched": 0, "alignments": 0})
        deck["atoms"] += 1
        deck["matched" if atom["atom"] in matched else "unmatched"] += 1
    for record in records:
        if record["progression_id"]:
            decks[record["atom"].split(":")[1].split("/")[0]]["alignments"] += 1
    verdicts = collections.defaultdict(collections.Counter)
    for edge in edges:
        verdicts[edge["deck"]][edge["verdict"]] += 1
        verdicts["all"][edge["verdict"]] += 1
        verdicts["level_order"][str(edge["level_order"])] += 1
        verdicts["exact_rows_only"][edge["verdict_exact_rows_only"]] += 1
    with_resources = {r["atom"] for r in resources}
    return {
        "limits": A.thresholds(),
        "atoms": len(atoms),
        "atoms_matched": len(matched),
        "alignments": sum(1 for r in records if r["progression_id"]),
        "decks": decks,
        "match": dict(collections.Counter(r["match"] for r in records)),
        "tables": dict(collections.Counter(r["table"] for r in records if r["table"])),
        "level": {name: sum(1 for r in levels if r["level"] == name) for name in A.LEVELS},
        "level_none": sum(1 for r in levels if r["level"] is None),
        "level_spread": dict(sorted(collections.Counter(r["spread"] for r in levels if r["spread"] is not None).items())),
        "level_schema_rule": sum(1 for r in levels if r["level_schema_rule"]),
        "edges": {name: dict(counts) for name, counts in verdicts.items()},
        "resources": {"links": len(resources), "atoms": len(with_resources),
                      "licence_unverified": sum(1 for r in resources if not r["licence_verified"])},
        "careers": {"atoms": len(careers)},
        "gaps": {"families": sum(1 for g in gap_rows if g["kind"] == "family"),
                 "levels": sum(1 for g in gap_rows if g["kind"] == "level"), "rows_without_cip": no_cip},
        "sample": sample_rates(),
        "holdout": holdout_rates(),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=A.OUT)
    args = parser.parse_args()
    atoms = A.load_atoms()
    records = A.load_alignments()
    by_atom = matched_rows(records)
    forward = A.stated_edges()
    levels = atom_levels(atoms, by_atom)
    edges = edge_agreement(atoms, by_atom, levels, forward)
    minor, _ = backbone()
    careers = atom_careers(atoms, by_atom, minor)
    gap_rows, no_cip = gaps(by_atom, forward)
    resources = list(A.read_jsonl(os.path.join(A.OUT, "atom_resources.jsonl")))
    os.makedirs(args.out, exist_ok=True)
    A.write_jsonl(os.path.join(args.out, "atom_levels.jsonl"), levels)
    A.write_jsonl(os.path.join(args.out, "edge_agreement.jsonl"), edges)
    A.write_jsonl(os.path.join(args.out, "atom_careers.jsonl"), careers)
    A.write_jsonl(os.path.join(args.out, "gaps.jsonl"), gap_rows)
    with open(os.path.join(args.out, "stats.json"), "w", encoding="utf-8") as handle:
        json.dump(stats(atoms, records, levels, edges, resources, careers, gap_rows, no_cip), handle, indent=1)
        handle.write("\n")


if __name__ == "__main__":
    main()
