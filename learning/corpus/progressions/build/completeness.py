import collections
import json
import os
import re
import resource
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CURATED = ["frameworks", "progression", "assessments", "books"]
CATALOGUE = ["courses", "programs"]
TABLES = CURATED + CATALOGUE + ["resources"]
TITLE_KEY = {"frameworks": "name", "progression": "topic", "assessments": "name", "books": "title", "resources": "title", "programs": "program", "courses": "title"}
SCHOOL_LEVELS = {"early", "primary", "lower-secondary", "upper-secondary", "undergraduate-lower", "undergraduate-upper", "graduate"}
PROFESSIONAL = {"professional-entry", "professional-advanced"}
WORK_SLICES = {"career", "trades-technical", "round2-occupations"}
SCHOOL_SLICES = {"school", "university-stem", "university-other", "catalogues"}
FIELD_OF = {"life_stage": "life_stage", "purpose": "purpose", "kind_of_knowing": "kind", "mode_of_transmission": "mode", "geography": "region", "language": "language"}
CELL_ALIAS = {"personal-household": "personal", "survival-safety": "survival", "play-sport": "play", "care-of-others": "care"}
ERA_SPAN = {"prehistoric": (-100000, -3001), "ancient": (-3000, 499), "medieval": (500, 1499), "early-modern": (1500, 1759), "industrial": (1760, 1945), "present": (1946, 2026), "emerging": (2027, 2200)}
WITHHELD = ("ocm:", "propaedia:")
SCHEME_LINK = {"ocm:": "https://hraf.yale.edu/resources/reference/outline-of-cultural-materials/", "propaedia:": "https://en.wikipedia.org/wiki/Propaedia"}
THIN_BELOW = 10
TOLERANCE_SHARE = 0.10
TOLERANCE_ROWS = 5
DIMENSIONS = ["life_stage", "purpose", "life_stage_x_purpose", "kind_of_knowing", "mode_of_transmission", "geography", "language", "era", "domain", "named_absence_probe", "occupation_isco08"]


def strip_frame(source, target):
    with open(source, encoding="utf-8") as src, open(target, "w", encoding="utf-8") as dst:
        for line in src:
            if not line.strip():
                continue
            cell = json.loads(line)
            for prefix in WITHHELD:
                if cell["cell"].startswith(prefix):
                    cell["label"] = None
                    cell["label_basis"] = "withheld, see source_url"
                    cell["source_url"] = SCHEME_LINK[prefix]
                    cell.pop("adjudication", None)
            dst.write(json.dumps(cell, ensure_ascii=False) + "\n")


def locate():
    parent = os.path.dirname(HERE)
    if len(sys.argv) > 3:
        return sys.argv[1], sys.argv[2], sys.argv[3]
    for tables, frame, target in (
        (os.path.join(parent, "tables"), os.path.join(parent, "completeness", "frame.jsonl"), os.path.join(parent, "COMPLETENESS.md")),
        (os.path.join(HERE, "public"), os.path.join(parent, "completeness-frame.jsonl"), os.path.join(HERE, "COMPLETENESS.md")),
    ):
        if os.path.exists(os.path.join(tables, "stats.json")) and os.path.exists(frame):
            return tables, frame, target
    raise SystemExit("tables or frame not found")


def read(folder, name):
    plain = os.path.join(folder, name + ".jsonl")
    if os.path.exists(plain):
        with open(plain, encoding="utf-8") as fh:
            for line in fh:
                if line.strip():
                    yield json.loads(line)
        return
    proc = subprocess.Popen(["zstd", "-dc", plain + ".zst"], stdout=subprocess.PIPE)
    for line in proc.stdout:
        if line.strip():
            yield json.loads(line)
    proc.wait()


class Row:
    __slots__ = ("table", "group", "verified", "title", "data", "level", "cip", "region_text")

    def __init__(self, table, data, frameworks):
        self.table = table
        self.group = "curated" if table in CURATED else "catalogue" if table in CATALOGUE else "resource"
        self.verified = bool(data.get("verified"))
        parts = [data.get(TITLE_KEY[table]), data.get("field"), data.get("subfield"), data.get("department")] + list(data.get("fields") or [])
        self.title = " | ".join(str(x) for x in parts if x).lower()
        self.data = data
        self.level = data.get("level") or data.get("level_from")
        self.cip = (data.get("cip") or {}).get("code") or ""
        text = ""
        if table == "frameworks":
            text = str(data.get("region_raw" if "region_raw" in data else "region") or "")
        elif table == "progression":
            parent = frameworks.get(data.get("framework_id")) or {}
            text = str(parent.get("region_raw" if "region_raw" in parent else "region") or "")
        elif table == "assessments":
            text = "%s %s" % (data.get("body") or "", data.get("name") or "")
        elif table in CATALOGUE:
            text = "US"
        self.region_text = text.lower()


def add(counter, r):
    counter["rows_total"] += 1
    if r.verified:
        counter["rows_verified"] += 1
        counter[r.group + "_verified"] += 1


def pattern_of(rule):
    if ": " not in rule:
        return None
    try:
        return re.compile(rule.split(": ", 1)[1], re.I)
    except re.error:
        return None


def cip_series(rule):
    m = re.search(r"CIP series ([\d,]+)", rule) or re.search(r"CIP code starts with (\d+)", rule) or re.match(r"CIP ([\d and]+?) or", rule)
    return re.findall(r"\d\d", m.group(1)) if m else []


def matcher(cell):
    dimension, rule, name = cell["dimension"], cell["detection_rule"], cell["cell"]
    regex = pattern_of(rule)
    series = cip_series(rule)
    if dimension == "life_stage" and rule.startswith("level "):
        levels = set(re.findall(r"[a-z]+(?:-[a-z]+)+|early|primary|graduate", rule))
        return (lambda r: r.level in levels), "full"
    if dimension == "purpose" and name == "work":
        return (lambda r: bool(r.data.get("onet_soc")) or r.level in PROFESSIONAL or r.data.get("slice") in WORK_SLICES), "full"
    if dimension == "purpose" and name == "school":
        return (lambda r: r.data.get("slice") in SCHOOL_SLICES and r.level in SCHOOL_LEVELS), "full"
    if dimension == "mode_of_transmission" and name == "school":
        return (lambda r: r.data.get("slice") in SCHOOL_SLICES), "full"
    if dimension == "mode_of_transmission" and name == "online":
        return (lambda r: r.table == "resources" and r.data.get("kind") in ("course", "video-series", "practice")), "full"
    if rule.startswith("every row"):
        return (lambda r: True), "full"
    if dimension == "geography" and regex:
        return (lambda r: bool(regex.search(r.region_text))), "full"
    if dimension == "language":
        codes = set(re.search(r"language field is ([\w/-]+)", rule).group(1).split("/"))
        return (lambda r: r.table == "resources" and r.data.get("language") in codes), "full"
    if regex and "title keywords" in rule and not series:
        return (lambda r: bool(regex.search(r.title))), "full"
    if series and regex:
        return (lambda r: r.cip[:2] in series or bool(regex.search(r.title))), "full"
    if series:
        return (lambda r: r.cip[:2] in series), "full" if "editorial map" in rule or "starts with" in rule else "cip-part-only"
    return None, "no-pattern-in-frame"


def overlaps(data, low, high):
    start = data.get("era_from")
    if not isinstance(start, int):
        return False
    end = data.get("era_to") if isinstance(data.get("era_to"), int) else start
    return start <= high and end >= low


def field_test(cell):
    dimension, name = cell["dimension"], CELL_ALIAS.get(cell["cell"], cell["cell"])
    if dimension == "era":
        low, high = ERA_SPAN[cell["cell"]]
        return (lambda d: overlaps(d, low, high)), "era_from"
    field = FIELD_OF.get(dimension)
    if field is None:
        return None, None
    return (lambda d: d.get(field) == name), field


def within(old, new):
    return abs(new - old) <= max(TOLERANCE_ROWS, TOLERANCE_SHARE * old)


def score(tables, frame_path):
    frameworks = {f["id"]: {"region": f.get("region"), "region_raw": f.get("region_raw")} if "region_raw" in f else {"region": f.get("region")} for f in read(tables, "frameworks")}
    with open(frame_path, encoding="utf-8") as fh:
        frame = [json.loads(line) for line in fh if line.strip()]
    soc_to_isco = collections.defaultdict(set)
    with open(os.path.join(tables, "soc_isco_crosswalk.jsonl"), encoding="utf-8") as fh:
        for line in fh:
            p = json.loads(line)
            if "soc" in p:
                soc_to_isco[p["soc"]].add(p["isco"])
    reached_any, reached_verified = set(), set()
    tests, crosses, fields, status = [], [], [], {}
    rule = [collections.Counter() for _ in frame]
    by_field = [collections.Counter() for _ in frame]
    for i, cell in enumerate(frame):
        dimension = cell["dimension"]
        if dimension == "life_stage_x_purpose":
            crosses.append((i, ("life_stage", cell["cell"].split("|")[0]), ("purpose", cell["cell"].split("|")[1])))
        elif dimension != "occupation_isco08":
            test, state = matcher(cell)
            status[(dimension, cell["cell"])] = state
            if test:
                tests.append((i, (dimension, cell["cell"]), test))
        check, field = field_test(cell)
        if check:
            fields.append((i, check, field))
    total = verified = 0
    for name in TABLES:
        for data in read(tables, name):
            r = Row(name, data, frameworks)
            total += 1
            verified += r.verified
            hit = set()
            for i, key, test in tests:
                if test(r):
                    add(rule[i], r)
                    hit.add(key)
            for i, left, right in crosses:
                if left in hit and right in hit:
                    add(rule[i], r)
            occ = data.get("onet_soc")
            if occ and occ.get("grain") in ("onet", "detailed"):
                for unit in soc_to_isco.get(occ["code"].split(".")[0], ()):
                    reached_any.add(unit)
                    if r.verified:
                        reached_verified.add(unit)
            if "life_stage_method" in data:
                for i, check, field in fields:
                    if check(data):
                        add(by_field[i], r)
                        by_field[i]["stated"] += data.get(field + "_method") == "stated"
    results = []
    for i, cell in enumerate(frame):
        dimension = cell["dimension"]
        out = {"dimension": dimension, "cell": cell["cell"], "label": None if cell["cell"].startswith(WITHHELD) else cell.get("label"), "critic_rows_verified": cell.get("rows_verified"), "critic_has_verified_row": cell.get("has_verified_row")}
        if dimension == "occupation_isco08":
            prefix = cell["cell"].split(":")[1]
            out.update(status="full", rows_total=len([u for u in reached_any if u.startswith(prefix)]), rows_verified=len([u for u in reached_verified if u.startswith(prefix)]), critic_rows_verified=cell.get("unit_groups_with_verified_row"))
        elif dimension == "life_stage_x_purpose":
            a, b = cell["cell"].split("|")
            left, right = status.get(("life_stage", a)), status.get(("purpose", b))
            out["status"] = "no-pattern-in-frame" if "no-pattern-in-frame" in (left, right) else "full" if left == right == "full" else "cip-part-only"
        else:
            out["status"] = status[(dimension, cell["cell"])]
        if dimension != "occupation_isco08" and out["status"] != "no-pattern-in-frame":
            out.update(rule[i])
        for key in ("rows_total", "rows_verified", "curated_verified", "catalogue_verified", "resource_verified"):
            out.setdefault(key, 0 if out["status"] != "no-pattern-in-frame" else None)
        if any(i == j for j, _, _ in fields):
            out["field_rows"] = by_field[i]["rows_total"]
            out["field_verified"] = by_field[i]["rows_verified"]
            out["field_stated"] = by_field[i]["stated"]
        if out["rows_verified"] is not None and out["critic_rows_verified"] is not None:
            out["within_tolerance"] = within(out["critic_rows_verified"], out["rows_verified"])
        results.append(out)
    return results, total, verified


def share(part, whole):
    return "%d of %d, %.0f%%" % (part, whole, 100.0 * part / whole) if whole else "0 of 0"


def validation_note(frame_path):
    folder = os.path.dirname(frame_path)
    for name in ("validation.json", "completeness-validation.json"):
        path = os.path.join(folder, name)
        if os.path.exists(path):
            with open(path, encoding="utf-8") as fh:
                v = json.load(fh)
            return "Run on %s, the scorer lands within tolerance on %d of the %d cells it can score. The cells it misses there are the tertiary by work cross and a dozen keyword cells where the first review matched text this scorer cannot see.\n" % (v["tables"], v["within_tolerance"], v["scorable"])
    return ""


def render(results, total, verified, note=""):
    out = []
    w = out.append
    w("# Completeness\n")
    w("**Independent critic verdict, 2026-10-11: 3.1 of 10, fail against the founder's standard.** That score weighs depth and survives a row-by-row reading. Nothing on this page replaces it.\n")
    w("This page recounts the critic's 441 cells in `completeness/frame.jsonl` from the committed tables: %s rows, %s with `verified` true. Rows that carry `page_fetched`, the courses and programs, count as unverified here.\n" % (format(total, ","), format(verified, ",")))
    w("Held means one or more verified rows land in the cell. It says nothing of depth or of whether the rows describe the learner's own learning: the first review read 54 verified infancy rows and kept none. Thin means one to nine verified rows. Keyword rules overstate.\n")
    w("Two counts sit side by side. Critic rule applies the detection rule the frame records for the cell. Facet field counts rows whose `life_stage`, `purpose`, `kind`, `mode`, `region`, `language` or era fields name the cell. Technologies, occupation history and activities sit outside both counts.\n")
    w("## Dimensions\n")
    w("| Dimension | Cells | Held, first review | Critic rule: held | of which thin | ten or more | empty | Facet field: held | of which thin | Cells the rule can score | Within tolerance of the first review |\n|---|---|---|---|---|---|---|---|---|---|---|")
    summary = collections.OrderedDict()
    for dimension in DIMENSIONS:
        cells = [r for r in results if r["dimension"] == dimension]
        scorable = [r for r in cells if r["status"] == "full"]
        fielded = [r for r in cells if "field_verified" in r]
        held = [r for r in cells if (r["rows_verified"] or 0) > 0]
        s = summary[dimension] = {
            "cells": len(cells), "held_first_review": sum(1 for r in cells if r["critic_has_verified_row"]),
            "held_critic_rule": len(held), "thin_critic_rule": sum(1 for r in held if r["rows_verified"] < THIN_BELOW),
            "ten_or_more_critic_rule": sum(1 for r in held if r["rows_verified"] >= THIN_BELOW), "empty_critic_rule": len(cells) - len(held),
            "held_facet_field": sum(1 for r in fielded if r["field_verified"] > 0) if fielded else None,
            "thin_facet_field": sum(1 for r in fielded if 0 < r["field_verified"] < THIN_BELOW) if fielded else None,
            "scorable": len(scorable), "within_tolerance": sum(1 for r in scorable if r.get("within_tolerance")),
        }
        w("| %s | %d | %d | %d | %d | %d | %d | %s | %s | %d | %d |" % (dimension, s["cells"], s["held_first_review"], s["held_critic_rule"], s["thin_critic_rule"], s["ten_or_more_critic_rule"], s["empty_critic_rule"], s["held_facet_field"] if fielded else "no field", s["thin_facet_field"] if fielded else "", s["scorable"], s["within_tolerance"]))
    w("\nOCM and Propaedia cells show their code alone. Their category names belong to HRAF and Britannica and stay out of this repo.\n")
    w("\n## Differences from the First Review\n")
    if note:
        w(note)
    w("- The first review read 88,267 rows. The tables now hold %s, after the merge of the k12-full, history-forecast and round3-empty slices and 215 unfetched program rows. Counts rise wherever those slices add rows.\n- The `verified` flag was cleared on rows whose notes say inferred, recalled, from memory or not fetched, and courses and programs carry `page_fetched`, which this page counts as unverified. Verified counts fall in the cells those rows sat in, and the catalogue column reads zero.\n- Titles of Common Core, NGSS and CEFR rows were replaced by short labels, and catalogue sentences were removed, so some title keywords no longer match.\n- The frame records no keyword pattern for seven purpose cells, six kinds and seven modes. Their rule reads `title keywords` with no list. Cells marked `cip-part-only` are scored on the CIP half of the rule, and cells marked `no-pattern-in-frame` are left unscored by the critic rule.\n- Geography matches the original region text of a framework, kept in `region_raw`.\n- A tolerance of %d rows or %d%% of the first count, whichever is larger, decides the last column.\n" % (format(total, ","), TOLERANCE_ROWS, int(TOLERANCE_SHARE * 100)))
    for dimension in DIMENSIONS:
        cells = [r for r in results if r["dimension"] == dimension]
        w("\n## %s\n" % dimension.replace("_", " ").title().replace(" X ", " by ").replace("Isco08", "ISCO-08"))
        fielded = any("field_verified" in r for r in cells)
        w("| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status |%s\n|---|---|---|---|---|---|---|%s" % (" Facet field rows | Facet field verified | Stated |" if fielded else "", "---|---|---|" if fielded else ""))
        for r in cells:
            num = lambda v: "" if v is None else format(v, ",")
            line = "| %s | %s | %s | %s | %s | %s | %s |" % (r["cell"], num(r["critic_rows_verified"]), num(r["rows_verified"]), num(r["curated_verified"]), num(r["catalogue_verified"]), num(r["resource_verified"]), r["status"])
            if fielded:
                line += " %s | %s | %s |" % (num(r.get("field_rows")), num(r.get("field_verified")), num(r.get("field_stated")))
            w(line)
    return "\n".join(out) + "\n", summary


def main():
    if len(sys.argv) == 4 and sys.argv[1] == "strip":
        strip_frame(sys.argv[2], sys.argv[3])
        return
    tables, frame, target = locate()
    results, total, verified = score(tables, frame)
    text, summary = render(results, total, verified, validation_note(frame))
    with open(target, "w", encoding="utf-8") as fh:
        fh.write(text)
    with open(os.path.join(tables, "completeness.json"), "w", encoding="utf-8") as fh:
        json.dump({"rows": total, "verified": verified, "dimensions": summary, "cells": results}, fh, indent=1)
        fh.write("\n")
    print(json.dumps(summary))
    print("peak memory MB", resource.getrusage(resource.RUSAGE_SELF).ru_maxrss // 1024)


if __name__ == "__main__":
    main()
