import collections
import json
import os
import sqlite3
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROW_TABLES = ["frameworks", "progression", "assessments", "courses"]
ALL_TABLES = ROW_TABLES + ["books", "resources", "programs"]
RETIRED = {"Deleted", "Moved to"}


def find_tables(argv):
    candidates = argv[1:2] + [os.path.join(os.path.dirname(HERE), "build", "out"), os.path.join(os.path.dirname(HERE), "tables")]
    for path in candidates:
        if os.path.exists(os.path.join(path, "backbone_codes.jsonl")):
            return path
    raise SystemExit("no consolidated tables found; run build/consolidate.py first")


def read_table(folder, name):
    plain = os.path.join(folder, name + ".jsonl")
    if os.path.exists(plain):
        with open(plain, encoding="utf-8") as fh:
            return [json.loads(line) for line in fh if line.strip()]
    packed = plain + ".zst"
    if os.path.exists(packed):
        text = subprocess.run(["zstd", "-dc", packed], check=True, capture_output=True).stdout.decode("utf-8")
        return [json.loads(line) for line in text.splitlines() if line.strip()]
    raise SystemExit("missing table %s in %s" % (name, folder))


def n(value):
    return format(value, ",") if value else ""


def inventory(w):
    path = os.path.join(HERE, "backbone.sqlite")
    if not os.path.exists(path):
        return
    db = sqlite3.connect(path)
    tables = ["fields", "occupations", "skills", "tasks", "levels", "edges"]
    w("## Backbone Tables\n")
    w("| Table | Rows |\n|---|---|")
    for t in tables:
        w("| %s | %s |" % (t, format(db.execute("select count(*) from " + t).fetchone()[0], ",")))
    w("\n## Rows per Source\n")
    w("Rows counts nodes plus the edges that source supplies.\n")
    w("| Source | Version | Status | Rows |\n|---|---|---|---|")
    for name, version, status, rows in db.execute("select name, version, status, rows from sources"):
        w("| %s | %s | %s | %s |" % (name, version, status, format(rows, ",")))
    w("\n## Rows per Classification\n")
    w("| Table | Scheme | Rows |\n|---|---|---|")
    for t in ["fields", "occupations", "skills"]:
        for scheme, rows in db.execute("select scheme, count(*) from %s group by scheme order by scheme" % t):
            w("| %s | %s | %s |" % (t, scheme, format(rows, ",")))
    w("")
    db.close()


def build(folder):
    codes = read_table(folder, "backbone_codes")
    cip = {c["code"]: c for c in codes if c["scheme"] == "cip2020"}
    soc = {c["code"]: c for c in codes if c["scheme"] != "cip2020"}
    live = lambda c: c["action"] not in RETIRED and c["title"].lower() != "reserved"
    series = sorted(c for c in cip if cip[c]["grain"] == 2)
    groups = sorted(c for c in cip if cip[c]["grain"] == 4 and live(cip[c]))
    programs_in = collections.Counter(c[:5] for c in cip if cip[c]["grain"] == 6 and live(cip[c]))
    minors = sorted(c for c in soc if soc[c]["grain"] == "minor")
    majors = sorted(c for c in soc if soc[c]["grain"] == "major")
    detailed_in = collections.Counter(soc[c]["minor_group"] for c in soc if soc[c]["grain"] == "detailed")
    onet_in = collections.Counter(soc[c]["minor_group"] for c in soc if soc[c]["grain"] == "onet")
    crosswalk = collections.defaultdict(set)
    for pair in read_table(folder, "cip_soc_crosswalk"):
        minor = soc.get(pair["soc"], {}).get("minor_group")
        if minor:
            crosswalk[pair["cip"]].add(minor)
            crosswalk[pair["cip"][:5]].add(minor)

    g = collections.defaultdict(collections.Counter)
    s2 = collections.defaultdict(collections.Counter)
    m = collections.defaultdict(collections.Counter)
    major_only = collections.defaultdict(collections.Counter)
    totals = collections.OrderedDict()
    home = {}
    tables = {name: read_table(folder, name) for name in ALL_TABLES}
    for name, rows in tables.items():
        t = totals[name] = collections.Counter()
        column = name if name in ("books", "resources", "programs") else "rows"
        for r in rows:
            t["rows"] += 1
            t["verified"] += bool(r["verified"])
            code = r["cip"]["code"]
            t["cip"] += bool(code)
            t["cip_verified"] += bool(r["cip"]["mapping_verified"])
            family = None
            if code:
                t["grain%d" % r["cip"]["grain"]] += 1
                s2[code[:2]][column] += 1
                if column == "rows":
                    s2[code[:2]]["verified"] += bool(r["verified"])
                if len(code) >= 5:
                    family = code[:5]
                    g[family][column] += 1
                    if column == "rows":
                        g[family]["verified"] += bool(r["verified"])
                else:
                    s2[code]["series_only"] += 1
            occ = r.get("onet_soc")
            minor = None
            if occ:
                t["soc"] += 1
                t["soc_verified"] += bool(occ["mapping_verified"])
                minor = occ.get("minor_group")
                if minor:
                    m[minor]["rows"] += 1
                    m[minor]["verified"] += bool(r["verified"])
                else:
                    major_only[occ["code"][:2]]["rows"] += 1
            elif column != "rows" and code:
                for reached in crosswalk.get(code if len(code) == 7 else code[:5], ()):
                    m[reached][column] += 1
            if column == "rows":
                home[r["id"]] = (code, family, minor)
    edges = read_table(folder, "edges")
    edge_totals = collections.Counter()
    for e in edges:
        edge_totals["rows"] += 1
        edge_totals["stated"] += bool(e["stated"])
        edge_totals["external"] += bool(e["external"])
        code, family, minor = home.get(e["dst"], (None, None, None))
        if code:
            s2[code[:2]]["edges"] += 1
        if family:
            g[family]["edges"] += 1
        if minor:
            m[minor]["edges"] += 1

    keys = ["rows", "books", "resources", "programs"]
    covered = [c for c in groups if any(g[c][k] for k in keys)]
    empty = [c for c in groups if c not in covered]
    covered_minor = [c for c in minors if any(m[c][k] for k in keys)]
    empty_minor = [c for c in minors if c not in covered_minor]
    stats = json.load(open(os.path.join(folder, "stats.json"), encoding="utf-8"))

    out = []
    w = out.append
    w("# Backbone Coverage\n")
    w("The consolidated progressions corpus measured against CIP 2020 and SOC 2018. %d of %d four-digit CIP families in use hold a row, a program, a book or a resource. %d of %d SOC minor groups hold an occupation row or are reached from a program, a book or a resource through the CIP to SOC crosswalk.\n" % (len(covered), len(groups), len(covered_minor), len(minors)))
    inventory(w)
    w("## Method\n")
    w("`build/consolidate.py` writes a `cip` object on every row and an `onet_soc` object on every occupation row. `coverage.py` reads those codes and holds no label rules of its own. The label to code table is `field_map.tsv`, an editorial mapping; catalogue courses and programs carry the code their department or program title matched; resources carry the provider field guess. `mapping_verified` is true only where the source prints the code, which holds for the O*NET profile rows.\n")
    w("Rows counts frameworks, progression, assessments and courses. Verified counts the rows among them with `verified` true. Edges counts prerequisite edges whose dependent row sits in the family. A six-digit code rolls up to its four-digit family. A row mapped at two digits counts toward its series alone. In the SOC tables, programs, books and resources are those whose CIP code the NCES and BLS crosswalk joins to an occupation in the group, so one item can count toward several groups.\n")
    w("## Tables\n")
    w("| Table | Rows | Verified | Share | CIP mapped | Two-digit | Four-digit | Six-digit | CIP code stated by source | SOC mapped | SOC code stated by source |\n|---|---|---|---|---|---|---|---|---|---|---|")
    for name, t in totals.items():
        w("| %s | %s | %s | %.1f%% | %s | %s | %s | %s | %s | %s | %s |" % (name, n(t["rows"]), n(t["verified"]), 100.0 * t["verified"] / max(t["rows"], 1), n(t["cip"]), n(t["grain2"]), n(t["grain4"]), n(t["grain6"]), t["cip_verified"], n(t["soc"]), n(t["soc_verified"])))
    w("| edges | %s | %s stated | %.1f%% | | | | | | | |" % (n(edge_totals["rows"]), n(edge_totals["stated"]), 100.0 * edge_totals["stated"] / max(edge_totals["rows"], 1)))
    w("\n%s edges point at a course code with no row and carry `external` true.\n" % n(edge_totals["external"]))

    w("## CIP Series\n")
    w("Families counts four-digit groups in use. Series only counts items mapped at two digits.\n")
    w("| Code | Series | Families | Covered | Rows | Verified | Edges | Programs | Books | Resources | Series only |\n|---|---|---|---|---|---|---|---|---|---|---|")
    for code in series:
        fam = [c for c in groups if c[:2] == code]
        w("| %s | %s | %d | %d | %s | %s | %s | %s | %s | %s | %s |" % (code, cip[code]["title"].title(), len(fam), len([c for c in fam if c in covered]), n(s2[code]["rows"]), n(s2[code]["verified"]), n(s2[code]["edges"]), n(s2[code]["programs"]), n(s2[code]["books"]), n(s2[code]["resources"]), n(s2[code]["series_only"])))

    w("\n## CIP Four-Digit Families\n")
    w("CIP programs counts six-digit codes in use under the family.\n")
    w("| Code | Family | CIP programs | Rows | Verified | Edges | Programs | Books | Resources |\n|---|---|---|---|---|---|---|---|---|")
    for code in groups:
        c = g[code]
        w("| %s | %s | %d | %s | %s | %s | %s | %s | %s |" % (code, cip[code]["title"], programs_in[code], n(c["rows"]), n(c["verified"]), n(c["edges"]), n(c["programs"]), n(c["books"]), n(c["resources"])))

    w("\n## Four-Digit Families with Nothing\n")
    w("%d families hold no row, program, book or resource. Sorted by the count of six-digit programs in use.\n" % len(empty))
    w("| Code | Family | CIP programs |\n|---|---|---|")
    for code in sorted(empty, key=lambda c: (-programs_in[c], c)):
        w("| %s | %s | %d |" % (code, cip[code]["title"], programs_in[code]))

    w("\n## SOC Minor Groups\n")
    w("Occupations counts SOC detailed occupations, then O*NET 31.0 occupations.\n")
    w("| Code | Minor group | Occupations | Rows | Verified | Edges | Programs | Books | Resources |\n|---|---|---|---|---|---|---|---|---|")
    for code in minors:
        c = m[code]
        w("| %s | %s | %d / %d | %s | %s | %s | %s | %s | %s |" % (code, soc[code]["title"], detailed_in[code], onet_in[code], n(c["rows"]), n(c["verified"]), n(c["edges"]), n(c["programs"]), n(c["books"]), n(c["resources"])))

    w("\n## SOC Minor Groups with No Occupation Row\n")
    w("| Code | Minor group | Occupations | Reached through the crosswalk |\n|---|---|---|---|")
    for code in minors:
        if not m[code]["rows"]:
            w("| %s | %s | %d | %s |" % (code, soc[code]["title"], detailed_in[code], "yes" if code in covered_minor else "no"))

    w("\n## Rows Mapped at SOC Major Group Alone\n")
    w("| Code | Major group | Rows |\n|---|---|---|")
    for code in majors:
        if major_only[code[:2]]["rows"]:
            w("| %s | %s | %s |" % (code, soc[code]["title"], n(major_only[code[:2]]["rows"])))

    w("\n## Unmapped Rows\n")
    w("| Table | Rows with no CIP code |\n|---|---|")
    for name, t in totals.items():
        w("| %s | %s |" % (name, format(t["rows"] - t["cip"], ",")))
    labels = stats.get("unmapped_field_labels") or []
    if labels:
        w("\n| Slice | Label absent from field_map.tsv | Rows |\n|---|---|---|")
        for item in labels:
            w("| %s | %s | %d |" % (item["slice"], item["label"], item["rows"]))
    summary = {
        "cip_four_digit_in_use": len(groups), "cip_four_digit_covered": len(covered),
        "soc_minor_groups": len(minors), "soc_minor_groups_covered": len(covered_minor),
        "soc_minor_groups_with_occupation_row": len([c for c in minors if m[c]["rows"]]),
        "largest_empty_cip_families": [{"code": c, "title": cip[c]["title"], "cip_programs": programs_in[c]} for c in sorted(empty, key=lambda c: (-programs_in[c], c))[:10]],
    }
    return "\n".join(out) + "\n", summary


def main():
    folder = find_tables(sys.argv)
    text, summary = build(folder)
    target = os.path.join(HERE if os.path.exists(os.path.join(HERE, "backbone.sqlite")) else os.path.dirname(HERE), "COVERAGE.md")
    with open(target, "w", encoding="utf-8") as fh:
        fh.write(text)
    with open(os.path.join(folder, "coverage.json"), "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=1)
        fh.write("\n")
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
