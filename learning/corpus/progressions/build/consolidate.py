import collections
import csv
import json
import os
import re
import sqlite3
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.dirname(HERE)
OUT = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.join(HERE, "out")
sys.path.insert(0, os.path.join(ROOT, "catalogues", "scripts"))
import prereq as PR  # noqa: E402

SLICES = [
    "school", "university-stem", "university-other", "career", "interview", "arts-media",
    "land-health-service", "trades-technical", "everyday", "round2-fields", "round2-occupations",
    "round2-arts-everyday",
]
LEVELS = [
    "early", "primary", "lower-secondary", "upper-secondary", "undergraduate-lower",
    "undergraduate-upper", "graduate", "professional-entry", "professional-advanced",
]
LEVEL_ALIASES = {"undergraduate": ("undergraduate-lower", "undergraduate-upper")}
VOCATIONAL_SLICES = {"career", "trades-technical", "round2-occupations"}
PROFESSIONAL = {"professional-entry", "professional-advanced"}
ZSTD_ABOVE = 5 * 1024 * 1024
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+")
HOME_PATH = re.compile(r"(?<![\w/.])(?:/home/|/Users/)[A-Za-z0-9_.-]+|~/[A-Za-z0-9_.-]+")
SIX_US_COURSES = {
    "school-us-math-algebra-1", "school-us-math-geometry", "school-us-math-algebra-2",
    "school-us-math-precalculus", "school-us-math-calculus-1", "school-us-math-calculus-2",
}
NEGATIVE = re.compile(
    r"infer|from memory|recalled|convention|ordinal|assum|not stated|does not state|states no|"
    r"no prerequisite|without prerequisites|not read|not fetched|not confirmed|unverified|advisory",
    re.I,
)
POSITIVE = re.compile(
    r"\bstate[sd]?\b|frontmatter|prereq line|prerequisite text|coherence map|\brequires?\b|corequisite",
    re.I,
)
INSTITUTION_PREFIX = {
    "isu": "Iowa State ", "uiuc": "Illinois ", "iowa": "Iowa ", "odu": "Old Dominion ",
    "kent": "Kent State ", "nwhsu": "Northwestern Health Sciences ",
}
CATALOGUE_KEY = {"isu": "isu", "uiuc": "uiuc", "iowa": "uiowa", "uiowa": "uiowa"}
PR.NUM["odu"] = r"\d{3}[A-Z]{0,2}"
PR.NUM["kent"] = r"\d{5}"
SEGMENT = re.compile(r"(Pre/corequisites?:|Corequisites?:)", re.I)
SFIA_NOTE = "Text withheld: SFIA is proprietary and its wording stays out of this corpus."
SFIA_FRAMEWORK_NOTE = "Seven levels of responsibility. A skill at a level is the unit a role profile cites. Licence terms confirmed at https://sfia-online.org/en/about-sfia/licensing-sfia; copying framework text onto another site needs a licence."
UNSOURCED = re.compile(r"\binfer\w*|\brecall\w*|from memory|not fetched|unfetched", re.I)
PUBLIC = os.path.abspath(sys.argv[3]) if len(sys.argv) > 3 else os.path.join(HERE, "public")
SENTENCE_KEYS = {"prerequisite_text", "corequisite_text", "requirements_text", "recommended_text", "prerequisite_trailing_text", "description"}
CCSS_CODE = re.compile(r"^((K|\d)\.([A-Z]+)\.([A-Z])\.(\d+)([a-z]?)): ")
NGSS_LABEL = {
    "PS1": "matter", "PS2": "forces and motion", "PS3": "energy", "PS4": "waves", "LS1": "organisms",
    "LS2": "ecosystems", "LS3": "heredity", "LS4": "evolution", "ESS1": "space", "ESS2": "earth systems",
    "ESS3": "earth and people", "ETS1": "engineering design",
}
CCSS_CLUSTER = re.compile(r"^(([A-Z])-([A-Z]+)\.([A-Z])): ")
MAX_WORDS = 12


def read_jsonl(path):
    rows = []
    if not os.path.exists(path):
        return rows
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def scrub(value):
    if isinstance(value, str):
        return HOME_PATH.sub("[path removed]", EMAIL.sub("[email removed]", value))
    if isinstance(value, list):
        return [scrub(v) for v in value]
    if isinstance(value, dict):
        return {k: scrub(v) for k, v in value.items()}
    return value


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def norm_level(value):
    if value in LEVELS:
        return value, None, None
    if value in LEVEL_ALIASES:
        low, high = LEVEL_ALIASES[value]
        return low, high, value
    return None, None, value


class Backbone:
    def __init__(self):
        db = sqlite3.connect(os.path.join(ROOT, "backbone", "backbone.sqlite"))
        self.cip = {}
        for code, label, level, attrs in db.execute(
            "select code, label, level, attrs from fields where scheme = 'cip2020'"
        ):
            action = json.loads(attrs or "{}").get("action", "")
            self.cip[code] = {"code": code, "title": label, "grain": {"series-2-digit": 2, "group-4-digit": 4, "program-6-digit": 6}[level], "action": action}
        self.soc = {}
        for code, title, level, scheme, parent in db.execute(
            "select code, title, level, scheme, parent_id from occupations where scheme in ('soc2018', 'onet31')"
        ):
            self.soc[code] = {"code": code, "title": title, "grain": "onet" if scheme == "onet31" else level, "parent": (parent or "").split(":")[-1] or None}
        self.crosswalk = collections.defaultdict(set)
        for src, dst in db.execute("select src, dst from edges where type = 'major_to_occupation'"):
            self.crosswalk[dst.split(":")[1]].add(src.split(":")[1])
        db.close()

    def cip_for_soc(self, soc_code):
        detailed = soc_code.split(".")[0]
        codes = sorted(self.crosswalk.get(detailed, ()))
        if not codes:
            return None
        for width in (7, 5, 2):
            prefixes = {c[:width] for c in codes}
            if len(prefixes) == 1:
                code = prefixes.pop()
                if code in self.cip:
                    return code
        return None

    def minor_group(self, soc_code):
        code = soc_code.split(".")[0]
        seen = 0
        while code and seen < 6:
            node = self.soc.get(code)
            if node is None:
                return None
            if node["grain"] == "minor":
                return code
            if node["grain"] == "major":
                return None
            code = node["parent"]
            seen += 1
        return None

    def rows(self):
        out = []
        for code in sorted(self.cip):
            node = self.cip[code]
            out.append({"scheme": "cip2020", "code": code, "title": node["title"], "grain": node["grain"], "action": node["action"]})
        for code in sorted(self.soc):
            node = self.soc[code]
            out.append({"scheme": "onet31" if node["grain"] == "onet" else "soc2018", "code": code, "title": node["title"], "grain": node["grain"], "parent": node["parent"], "minor_group": self.minor_group(code)})
        return out


class Mapper:
    def __init__(self, backbone):
        self.backbone = backbone
        self.labels = {}
        with open(os.path.join(HERE, "field_map.tsv"), encoding="utf-8") as fh:
            for row in csv.DictReader(fh, delimiter="\t"):
                if row["cip"] not in backbone.cip:
                    raise SystemExit("field_map.tsv: unknown CIP code %s for %s" % (row["cip"], row["label"]))
                if row["onet_soc"] and row["onet_soc"] not in backbone.soc:
                    raise SystemExit("field_map.tsv: unknown SOC code %s for %s" % (row["onet_soc"], row["label"]))
                self.labels[row["label"]] = (row["cip"], row["onet_soc"] or None)
        self.unmapped = collections.Counter()

    def cip(self, code, method):
        if not code or code not in self.backbone.cip:
            return {"code": None, "grain": None, "method": "unmapped", "mapping_verified": False}
        return {"code": code, "grain": self.backbone.cip[code]["grain"], "method": method, "mapping_verified": False}

    def soc(self, code, method, verified=False):
        if not code or code not in self.backbone.soc:
            return None
        return {"code": code, "grain": self.backbone.soc[code]["grain"], "minor_group": self.backbone.minor_group(code), "method": method, "mapping_verified": verified}

    def label(self, slice_name, label, occupational):
        hit = self.labels.get("%s|%s" % (slice_name, label)) or self.labels.get(label)
        if hit is None:
            self.unmapped[(slice_name, str(label))] += 1
            return self.cip(None, None), None
        return self.cip(hit[0], "field_label"), (self.soc(hit[1], "field_label") if occupational else None)


def stated_from_notes(notes):
    notes = notes or ""
    if NEGATIVE.search(notes):
        return False, "notes_negative"
    if POSITIVE.search(notes):
        return True, "notes_positive"
    return False, "no_statement"


def course_code(key, topic):
    sep = ":" if key == "uiowa" else " "
    m = re.match(r"([A-Z][A-Z &]*?)" + re.escape(sep) + "(" + PR.NUM[key] + r")\b", topic)
    return m.group(1) + sep + m.group(2) if m else None


def reparse(inst, text, subjects):
    parts = SEGMENT.split(text)
    segments = [("prerequisite", parts[0])]
    for i in range(1, len(parts) - 1, 2):
        kind = "prerequisite_or_concurrent" if parts[i].lower().startswith("pre") else "corequisite"
        segments.append((kind, parts[i + 1]))
    groups, flags, statuses = [], set(), set()
    for kind, body in segments:
        body = body.strip(" .;")
        if not body:
            continue
        parsed = PR.parse(inst, body, subjects)
        statuses.add(parsed["status"])
        flags.update(parsed["flags"])
        for group in parsed["groups"]:
            atoms = []
            for atom in group:
                atom = dict(atom)
                if atom["type"] == "course":
                    if kind == "prerequisite_or_concurrent":
                        atom["concurrent"] = True
                    if kind == "corequisite":
                        atom["corequisite"] = True
                atoms.append(atom)
            groups.append(atoms)
    status = "parsed" if statuses <= {"parsed", "empty"} else sorted(statuses - {"parsed", "empty"})[0]
    return groups, sorted(flags), status


class Build:
    def __init__(self):
        self.backbone = Backbone()
        self.mapper = Mapper(self.backbone)
        self.stats = collections.OrderedDict()
        self.repairs = collections.OrderedDict()
        self.ids = {}
        self.alias = {}
        self.edges = []
        self.edge_keys = set()

    def claim(self, row_id, table):
        if row_id in self.ids:
            raise SystemExit("duplicate id %s in %s and %s" % (row_id, self.ids[row_id], table))
        self.ids[row_id] = table

    def add_edge(self, src, dst, kind, stated, basis, source_url, table, slice_name, src_code=None, group_index=None, group_size=None, min_grade=None, ambiguous=False):
        key = (src or "ext:%s" % src_code, dst, kind, group_index)
        if key in self.edge_keys or src == dst:
            return
        self.edge_keys.add(key)
        self.edges.append({
            "src": src, "src_code": src_code, "external": src is None, "dst": dst, "type": kind,
            "stated": bool(stated), "stated_basis": basis, "source_url": source_url,
            "group_index": group_index, "group_size": group_size, "min_grade": min_grade,
            "ambiguous_grouping": bool(ambiguous), "dst_table": table, "slice": slice_name,
        })

    def load_courses(self):
        raw = read_jsonl(os.path.join(ROOT, "catalogues", "courses.jsonl"))
        self.course_by_code = {}
        self.courses = []
        for r in raw:
            level, level_to, level_raw = norm_level(r["level"])
            groups = []
            for group in r["prerequisite_groups"]:
                groups.append([dict(a) for a in group])
            row = {
                "id": r["id"], "slice": "catalogues", "institution": r["institution"], "institution_key": r["institution_key"],
                "department": r["department"], "subject": r["subject"], "number": r["number"], "code": r["code"],
                "title": r["title"], "credits_text": r["credits_text"], "credits_min": r["credits_min"], "credits_max": r["credits_max"],
                "level": level, "field": None, "subfield": None, "framework_id": None,
                "prerequisites": list(r["prerequisites"]), "prerequisite_groups": groups,
                "prerequisite_text": r["prerequisite_text"] or None,
                "external_prerequisites": list(r["external_prerequisites"]),
                "concurrent_allowed": r["concurrent_allowed"], "corequisite_text": r["corequisite_text"] or None,
                "corequisite_groups": r["corequisite_groups"], "requirements_text": r["requirements_text"] or None,
                "requirements_course_codes": r["requirements_course_codes"], "recommended_text": r["recommended_text"] or None,
                "prerequisite_trailing_text": r["prerequisite_trailing_text"] or None,
                "cross_listed": r["cross_listed"], "dual_listed": r["dual_listed"],
                "parse_status": r["parse_status"], "parse_flags": r["parse_flags"],
                "edges_stated": True if (r["prerequisites"] or r["external_prerequisites"]) else None,
                "term_order": None, "notes": None, "merged_ids": [],
                "source_url": r["source_url"], "page_fetched": bool(r["verified"]),
                "cip": self.mapper.cip(r["cip_code"], "catalogue_department"), "onet_soc": None,
            }
            row = scrub(row)
            self.claim(row["id"], "courses")
            self.course_by_code[(r["institution_key"], r["code"])] = row
            self.courses.append(row)
        for row in self.courses:
            for group in row["prerequisite_groups"]:
                for atom in group:
                    if atom.get("type") == "course":
                        hit = self.course_by_code.get((row["institution_key"], atom["code"]))
                        atom["id"] = hit["id"] if hit else None
        kept = 0
        for e in read_jsonl(os.path.join(ROOT, "catalogues", "edges.jsonl")):
            if e["type"] not in ("prerequisite", "prerequisite_or_concurrent", "corequisite"):
                continue
            src = e["src"] if e["src_in_catalogue"] and e["src"] in self.ids else None
            self.add_edge(src, e["dst"], e["type"], True, "catalogue_sentence", e["source_url"], "courses", "catalogues", src_code=e["src_code"], group_index=e["group_index"], group_size=e["group_size"], min_grade=e["min_grade"], ambiguous=e.get("ambiguous"))
            kept += 1
        self.stats["catalogue_edges_read"] = kept

    def load_slices(self):
        self.frameworks, self.progression, self.assessments, self.slice_textbooks = [], [], [], []
        raw = {}
        for s in SLICES:
            raw[s] = read_jsonl(os.path.join(ROOT, s, "progression.jsonl"))
        merged = collections.Counter()
        for s in ("round2-fields", "land-health-service"):
            keep = []
            for r in raw[s]:
                parts = r["id"].split("-")
                inst = parts[2] if s == "round2-fields" else parts[1]
                key = CATALOGUE_KEY.get(inst)
                hit = None
                if key:
                    topic = r["topic"][len(INSTITUTION_PREFIX[inst]):] if s == "round2-fields" else r["topic"]
                    code = course_code(key, topic)
                    hit = self.course_by_code.get((key, code)) if code else None
                if hit is None:
                    keep.append(r)
                    continue
                self.alias[r["id"]] = hit["id"]
                hit["merged_ids"].append(r["id"])
                hit["field"] = hit["field"] or r["field"]
                hit["subfield"] = hit["subfield"] or r["subfield"]
                hit["framework_id"] = hit["framework_id"] or r["framework_id"]
                if r.get("term_order") is not None:
                    hit["term_order"] = r["term_order"]
                    hit["notes"] = scrub(r.get("notes"))
                merged[s] += 1
            raw[s] = keep
        self.repairs["courses_merged_into_catalogues"] = dict(merged)
        same_as = 0
        for s in SLICES:
            for r in read_jsonl(os.path.join(ROOT, s, "frameworks.jsonl")):
                self.frameworks.append(self.framework_row(s, r))
            for r in read_jsonl(os.path.join(ROOT, s, "assessments.jsonl")):
                self.assessments.append(self.assessment_row(s, r))
            for r in read_jsonl(os.path.join(ROOT, s, "textbooks.jsonl")):
                r["slice"] = s
                self.slice_textbooks.append(r)
        framework_ids = {f["id"] for f in self.frameworks}
        for c in self.courses:
            if c["framework_id"] and c["framework_id"] not in framework_ids:
                c["framework_id"] = None
        subjects = collections.defaultdict(set)
        code_index = {}
        for r in raw["round2-fields"]:
            inst = r["id"].split("-")[2]
            if inst in PR.NUM:
                for m in re.finditer(r"\b([A-Z]{2,5})\s+" + PR.NUM[inst] + r"\b", (r.get("prereq_text") or "") + " " + r["topic"]):
                    subjects[inst].add(m.group(1))
                code = course_code(inst, r["topic"][len(INSTITUTION_PREFIX[inst]):])
                if code:
                    code_index[(inst, code)] = r["id"]
        reparsed = collections.Counter()
        pending = []
        for s in SLICES:
            for r in raw[s]:
                row = self.progression_row(s, r, subjects, code_index, reparsed)
                if s == "university-stem" and "-uiuc-" in r["id"]:
                    code = course_code("uiuc", re.sub(r"^(Illinois|UIUC)\s+", "", r["topic"]))
                    hit = self.course_by_code.get(("uiuc", code)) if code else None
                    if hit:
                        row["same_as"] = hit["id"]
                        same_as += 1
                pending.append(row)
        self.repairs["round2_fields_rows_reparsed"] = dict(reparsed)
        self.repairs["university_stem_rows_linked_to_catalogue"] = same_as
        for row in pending:
            if row["framework_id"] and row["framework_id"] not in framework_ids:
                row["notes"] = ((row["notes"] or "") + " Framework id %s has no framework row." % row["framework_id"]).strip()
                row["framework_id"] = None
                self.repairs["framework_ids_unresolved"] = self.repairs.get("framework_ids_unresolved", 0) + 1
            self.progression.append(row)
        self.progression_edges()

    def occupational(self, slice_name, *levels):
        return slice_name in VOCATIONAL_SLICES or any(lv in PROFESSIONAL for lv in levels)

    def clear_inferred(self, row):
        if row["verified"] and UNSOURCED.search(row.get("notes") or ""):
            row["verified"] = False
            key = "verified_cleared_notes_say_inferred_or_recalled"
            self.repairs.setdefault(key, collections.Counter())[self.ids.get(row["id"], "row")] += 1

    def demote_unsourced(self, row, url_key):
        if row["verified"] and not row.get(url_key):
            row["verified"] = False
            row["notes"] = ((row.get("notes") or "") + " Verified flag cleared: the row has no URL.").strip()
            self.repairs["verified_cleared_no_url"] = self.repairs.get("verified_cleared_no_url", 0) + 1

    def sfia(self, row, text_key):
        blob = "%s %s" % (row.get("id", ""), row.get(text_key, ""))
        if "sfia" not in blob.lower():
            return
        m = re.search(r"level (\d)", row.get(text_key) or "", re.I)
        if text_key == "topic" and m:
            row["topic"] = "SFIA level %s" % m.group(1)
        row["notes"] = SFIA_NOTE if text_key == "topic" else SFIA_FRAMEWORK_NOTE + " " + SFIA_NOTE
        self.repairs["sfia_rows_redacted"] = self.repairs.get("sfia_rows_redacted", 0) + 1

    def framework_row(self, s, r):
        r = scrub(r)
        low, _, raw_low = norm_level(r.get("level_from"))
        high, _, raw_high = norm_level(r.get("level_to"))
        cip, soc = self.mapper.label(s, r.get("field"), self.occupational(s, low, high))
        row = {
            "id": r["id"], "slice": s, "name": r["name"], "body": r.get("body"), "region": r.get("region"),
            "field": r.get("field"), "level_from": low, "level_to": high, "year": r.get("year"), "url": r.get("url"),
            "licence": r.get("licence"), "verified": bool(r.get("verified")), "notes": r.get("notes"),
            "cip": cip, "onet_soc": soc,
        }
        if raw_low or raw_high:
            row["level_raw"] = [raw_low, raw_high]
        self.sfia(row, "name")
        self.demote_unsourced(row, "url")
        self.claim(row["id"], "frameworks")
        self.clear_inferred(row)
        return row

    def assessment_row(self, s, r):
        r = scrub(r)
        level, level_to, level_raw = norm_level(r.get("level"))
        cip, soc = self.mapper.label(s, r.get("field"), self.occupational(s, level))
        row = {
            "id": r["id"], "slice": s, "name": r["name"], "body": r.get("body"), "field": r.get("field"),
            "level": level, "content_outline": r.get("content_outline") or [], "url": r.get("url"),
            "verified": bool(r.get("verified")), "notes": r.get("notes"), "cip": cip, "onet_soc": soc,
        }
        if level_raw:
            row["level_raw"] = level_raw
        self.demote_unsourced(row, "url")
        self.claim(row["id"], "assessments")
        self.clear_inferred(row)
        return row

    def progression_row(self, s, r, subjects, code_index, reparsed):
        r = scrub(r)
        level, _, level_raw = norm_level(r.get("level"))
        notes = r.get("notes")
        text = r.get("prereq_text") or r.get("prerequisite_text")
        if not text and s == "university-other" and (notes or "").startswith("Catalogue prerequisite text: "):
            text = notes[len("Catalogue prerequisite text: "):].split(".. ")[0].rstrip(".")
        external = list(r.get("prereq_codes_outside_slice") or r.get("external_prerequisites") or [])
        groups = None
        corequisites = []
        prerequisites = list(r.get("prerequisites") or [])
        parse_status = None
        parse_flags = []
        if r.get("prerequisite_groups") is not None:
            groups = [[{"type": "course", "id": pid} for pid in g] for g in r["prerequisite_groups"]]
        inst = r["id"].split("-")[2] if s == "round2-fields" else None
        if s == "round2-fields" and text and inst in PR.NUM:
            groups, parse_flags, parse_status = reparse(inst, text, subjects[inst])
            prerequisites, external, corequisites = [], [], []
            own = code_index.get((inst, course_code(inst, r["topic"][len(INSTITUTION_PREFIX[inst]):]) or ""))
            for group in groups:
                for atom in group:
                    if atom["type"] != "course":
                        continue
                    atom["id"] = code_index.get((inst, atom["code"]))
                    if atom["id"] == own and own:
                        atom["self_reference"] = True
                        continue
                    if atom["id"] is None:
                        if atom["code"] not in external:
                            external.append(atom["code"])
                    elif atom.get("corequisite"):
                        if atom["id"] not in corequisites:
                            corequisites.append(atom["id"])
                    elif atom["id"] not in prerequisites:
                        prerequisites.append(atom["id"])
            reparsed[parse_status] += 1
            notes = "Prerequisite groups regenerated from prerequisite_text with the catalogue parser."
        if "edges_stated" in r:
            stated, basis = bool(r["edges_stated"]), "slice_flag"
            if r["id"] in SIX_US_COURSES:
                if stated:
                    self.repairs["school_us_course_rows_set_unstated"] = self.repairs.get("school_us_course_rows_set_unstated", 0) + 1
                stated, basis = False, "repair_summary_correction"
        elif not prerequisites and not external and not corequisites:
            stated, basis = None, None
        elif s == "round2-fields" and parse_status:
            stated, basis = True, "catalogue_sentence"
        elif text and s in ("land-health-service", "university-other"):
            stated, basis = True, "catalogue_sentence"
        elif s == "university-stem":
            stated, basis = (False, "notes_negative") if re.search(r"infer", notes or "", re.I) else (True, "catalogue_sentence")
        else:
            stated, basis = stated_from_notes(notes)
        profile = {k: r[k] for k in sorted(r) if k.startswith(("onet_", "bls_"))} or None
        occupational = self.occupational(s, level)
        cip, soc = self.mapper.label(s, r.get("field"), occupational)
        m = re.search(r"O\*NET-SOC (\d\d-\d{4}\.\d\d)", r.get("topic") or "")
        if m and m.group(1) in self.backbone.soc:
            soc = self.mapper.soc(m.group(1), "source_states_code", True)
            crosswalk = self.backbone.cip_for_soc(m.group(1))
            if crosswalk:
                cip = self.mapper.cip(crosswalk, "cip_soc_crosswalk")
        row = {
            "id": r["id"], "slice": s, "field": r.get("field"), "subfield": r.get("subfield"), "level": level,
            "topic": r.get("topic"), "prerequisites": prerequisites, "prerequisite_groups": groups,
            "prerequisite_text": text or None, "external_prerequisites": external, "corequisites": corequisites,
            "edges_stated": stated, "edges_stated_basis": basis, "term_order": r.get("term_order"),
            "typical_age_or_year": r.get("typical_age_or_year"), "framework_id": r.get("framework_id"),
            "source_url": r.get("source_url"), "verified": bool(r.get("verified")), "notes": notes,
            "same_as": None, "occupation_profile": profile, "parse_status": parse_status, "parse_flags": parse_flags,
            "cip": cip, "onet_soc": soc,
        }
        if level_raw:
            row["level_raw"] = level_raw
        self.sfia(row, "topic")
        self.demote_unsourced(row, "source_url")
        self.claim(row["id"], "progression")
        self.clear_inferred(row)
        return row

    def progression_edges(self):
        dangling = 0
        for row in self.progression:
            resolved = []
            position = {}
            if row["prerequisite_groups"]:
                for gi, group in enumerate(row["prerequisite_groups"]):
                    size = len([a for a in group if a.get("type") == "course" and not a.get("self_reference")])
                    for atom in group:
                        if atom.get("type") != "course" or atom.get("self_reference"):
                            continue
                        if atom.get("id"):
                            atom["id"] = self.alias.get(atom["id"], atom["id"])
                        kind = "corequisite" if atom.get("corequisite") else "prerequisite_or_concurrent" if atom.get("concurrent") else "prerequisite"
                        position.setdefault(atom.get("id") or "ext:%s" % atom.get("code"), []).append((gi, size, kind, atom.get("min_grade")))
            for pid in row["prerequisites"] + row["corequisites"]:
                target = self.alias.get(pid, pid)
                if target not in self.ids:
                    dangling += 1
                    if pid not in row["external_prerequisites"]:
                        row["external_prerequisites"].append(pid)
                    continue
                if target not in resolved:
                    resolved.append(target)
                places = position.get(target) or [(None, None, "corequisite" if pid in row["corequisites"] else "prerequisite", None)]
                for gi, size, kind, grade in places:
                    self.add_edge(target, row["id"], kind, row["edges_stated"], row["edges_stated_basis"], row["source_url"], "progression", row["slice"], group_index=gi, group_size=size, min_grade=grade, ambiguous="mixed_and_or_no_parentheses" in row["parse_flags"])
            row["prerequisites"] = [p for p in resolved if self.alias.get(p, p) not in {self.alias.get(c, c) for c in row["corequisites"]}]
            row["corequisites"] = [self.alias.get(c, c) for c in row["corequisites"] if self.alias.get(c, c) in self.ids]
            for code in row["external_prerequisites"]:
                places = position.get("ext:%s" % code) or [(None, None, "prerequisite", None)]
                for gi, size, kind, grade in places:
                    self.add_edge(None, row["id"], kind, row["edges_stated"], row["edges_stated_basis"], row["source_url"], "progression", row["slice"], src_code=code, group_index=gi, group_size=size, min_grade=grade)
        self.repairs["prerequisite_ids_moved_to_external"] = dangling

    def load_books(self):
        adoption = collections.defaultdict(list)
        for a in read_jsonl(os.path.join(ROOT, "round2-books", "adoption.jsonl")):
            adoption[a["book_id"]].append({k: v for k, v in a.items() if k != "book_id"})
        self.books = []
        by_title = {}
        for r in read_jsonl(os.path.join(ROOT, "round2-books", "books.jsonl")):
            r = scrub(r)
            confirmed = r.get("confirmed") or None
            levels = [lv for lv in r.get("levels") or [] if lv in LEVELS]
            fields = r.get("fields") or []
            cip = self.mapper.cip(None, None)
            for label in fields:
                cip, _ = self.mapper.label("books", label, False)
                if cip["code"]:
                    break
            row = {
                "id": r["book_id"], "slice": "round2-books", "title": r["title"], "authors": r.get("authors_claimed") or [],
                "editions_claimed": r.get("editions_claimed") or [], "fields": fields,
                "level": min(levels, key=LEVELS.index) if levels else None, "levels": levels, "roles": r.get("roles") or [],
                "source_ids": r.get("source_ids") or [], "source_slices": r.get("source_slices") or [],
                "status": r.get("status"), "verified": bool(r.get("verified")), "slice_verified": bool(r.get("slice_verified")),
                "url": (confirmed or {}).get("api_url"), "confirmed": confirmed, "is_open_title": r.get("is_open_title"),
                "open_licence_claimed": r.get("open_licence_claimed") or [], "licence_checked": r.get("licence_checked"),
                "adoption_count": r.get("adoption_count") or 0, "adoption": adoption.get(r["book_id"], []),
                "format": None, "notes": None, "cip": cip, "onet_soc": None,
            }
            self.demote_unsourced(row, "url")
            self.claim(row["id"], "books")
            self.clear_inferred(row)
            self.books.append(row)
            by_title[slug(row["title"])] = row
        covered = {sid for b in self.books for sid in b["source_ids"]}
        added = folded = 0
        for r in self.slice_textbooks:
            if r["id"] in covered:
                continue
            r = scrub(r)
            hit = by_title.get(slug(r["title"]))
            if hit:
                hit["source_ids"].append(r["id"])
                if r["slice"] not in hit["source_slices"]:
                    hit["source_slices"].append(r["slice"])
                folded += 1
                continue
            level, _, _ = norm_level(r.get("level"))
            cip, _ = self.mapper.label(r["slice"], r.get("field"), False)
            authors = r.get("authors")
            row = {
                "id": r["id"], "slice": r["slice"], "title": r["title"],
                "authors": authors if isinstance(authors, list) else [authors] if authors else [],
                "editions_claimed": [r["edition_or_year"]] if r.get("edition_or_year") else [], "fields": [r.get("field")] if r.get("field") else [],
                "level": level, "levels": [level] if level else [], "roles": [r["role"]] if r.get("role") else [],
                "source_ids": [r["id"]], "source_slices": [r["slice"]], "status": "unchecked",
                "verified": bool(r.get("verified")), "slice_verified": bool(r.get("verified")), "url": r.get("url"),
                "confirmed": None, "is_open_title": bool(r.get("open_licence")),
                "open_licence_claimed": [r["open_licence"]] if r.get("open_licence") else [], "licence_checked": None,
                "adoption_count": 0, "adoption": [], "format": r.get("format"),
                "notes": r.get("adoption_evidence"), "cip": cip, "onet_soc": None,
            }
            self.demote_unsourced(row, "url")
            self.claim(row["id"], "books")
            self.clear_inferred(row)
            self.books.append(row)
            by_title[slug(row["title"])] = row
            added += 1
        self.repairs["slice_textbooks_absent_from_books_added"] = added
        self.repairs["slice_textbooks_absent_from_books_folded"] = folded
        self.stats["slice_textbook_rows_replaced"] = len(self.slice_textbooks) - added

    def load_resources(self):
        self.resources = []
        dropped = 0
        bad_cip = 0
        for r in read_jsonl(os.path.join(ROOT, "resources", "resources.jsonl")):
            if EMAIL.search(r.get("url") or ""):
                dropped += 1
                continue
            r = scrub(r)
            level, level_to, level_raw = norm_level(r.get("level"))
            code = r.get("cip_code_guess") or None
            if code and code not in self.backbone.cip:
                bad_cip += 1
                code = code[:2] if code.endswith(".00") and code[:2] in self.backbone.cip else None
            row = {
                "id": r["id"], "slice": "resources", "title": r["title"], "provider": r.get("provider"), "kind": r.get("kind"),
                "field": r.get("field"), "level": level, "level_to": level_to, "level_raw": level_raw,
                "language": r.get("language"), "licence": r.get("licence"), "cost": r.get("cost"), "url": r.get("url"),
                "prerequisites_stated": r.get("prerequisites_stated"), "verified": bool(r.get("verified")), "notes": None,
                "cip": self.mapper.cip(code, "resource_field_guess"), "onet_soc": None,
            }
            self.demote_unsourced(row, "url")
            self.claim(row["id"], "resources")
            self.resources.append(row)
        self.repairs["resources_dropped_email_in_url"] = dropped
        self.repairs["resources_cip_guess_moved_to_series"] = bad_cip

    def load_programs(self):
        self.programs = []
        seen = collections.Counter()
        for r in read_jsonl(os.path.join(ROOT, "catalogues", "programs.jsonl")):
            r = scrub(r)
            base = "prog-%s-%s" % (r["institution_key"], slug("%s %s" % (r["program"], r.get("degree") or "")))
            seen[base] += 1
            row_id = base if seen[base] == 1 else "%s-%d" % (base, seen[base])
            required = []
            for code in r.get("required_courses") or []:
                hit = self.course_by_code.get((r["institution_key"], code))
                if hit and hit["id"] not in required:
                    required.append(hit["id"])
            row = {
                "id": row_id, "slice": "catalogues", "institution": r["institution"], "institution_key": r["institution_key"],
                "program": r["program"], "degree": r.get("degree") or None, "page_title": r.get("page_title"),
                "required_courses": r.get("required_courses") or [], "required_course_ids": required,
                "requirement_rows": r.get("requirement_rows") or [], "plan_by_term": r.get("plan_by_term") or [],
                "award_level": r.get("award_level"), "source_section": r.get("source_section"),
                "url": r.get("url"), "page_fetched": bool(r.get("verified")) and bool(r.get("url")), "notes": None,
                "cip": dict(self.mapper.cip(r.get("cip_code"), r.get("cip_method") or "catalogue_program"), reported_in_ipeds=r.get("cip_reported_in_ipeds"), score=r.get("cip_score")),
                "onet_soc": None,
            }
            self.claim(row["id"], "programs")
            self.programs.append(row)
        for r in read_jsonl(os.path.join(ROOT, "catalogues", "programs_not_fetched.jsonl")):
            r = scrub(r)
            base = "prog-%s-unfetched-%s" % (r["institution_key"], slug(re.sub(r"^https?://[^/]+/", "", r["url"])))
            seen[base] += 1
            row = {
                "id": base if seen[base] == 1 else "%s-%d" % (base, seen[base]), "slice": "catalogues",
                "institution": r["institution"], "institution_key": r["institution_key"], "program": None, "degree": None,
                "page_title": None, "required_courses": [], "required_course_ids": [], "requirement_rows": [], "plan_by_term": [],
                "award_level": None, "source_section": None, "url": r["url"], "page_fetched": False, "notes": r.get("reason"),
                "cip": dict(self.mapper.cip(None, None), reported_in_ipeds=None, score=None), "onet_soc": None,
            }
            self.claim(row["id"], "programs")
            self.programs.append(row)

    def cycles(self):
        graph = collections.defaultdict(list)
        for i, e in enumerate(self.edges):
            if e["stated"] and e["type"] == "prerequisite" and e["src"]:
                graph[e["src"]].append((e["dst"], i))

        def components(allowed):
            index, low, on, stack, out = {}, {}, set(), [], []
            counter = [0]
            for root in list(graph):
                if root in index:
                    continue
                work = [(root, iter(graph[root]))]
                index[root] = low[root] = counter[0]
                counter[0] += 1
                stack.append(root)
                on.add(root)
                while work:
                    node, it = work[-1]
                    advanced = False
                    for nxt, ei in it:
                        if not allowed(self.edges[ei]):
                            continue
                        if nxt not in index:
                            index[nxt] = low[nxt] = counter[0]
                            counter[0] += 1
                            stack.append(nxt)
                            on.add(nxt)
                            work.append((nxt, iter(graph.get(nxt, []))))
                            advanced = True
                            break
                        if nxt in on:
                            low[node] = min(low[node], index[nxt])
                    if advanced:
                        continue
                    work.pop()
                    if work:
                        low[work[-1][0]] = min(low[work[-1][0]], low[node])
                    if low[node] == index[node]:
                        comp = []
                        while True:
                            x = stack.pop()
                            on.discard(x)
                            comp.append(x)
                            if x == node:
                                break
                        if len(comp) > 1:
                            out.append(sorted(comp))
            return out

        demoted = 0
        for _ in range(20):
            hard = components(lambda e: e["group_size"] is None or e["group_size"] == 1)
            if not hard:
                break
            for comp in hard:
                members = set(comp)
                for e in self.edges:
                    if e["stated"] and e["type"] == "prerequisite" and e["src"] in members and e["dst"] in members and e["dst_table"] == "progression" and e["group_size"] is None:
                        e["stated"] = False
                        e["stated_basis"] = "cycle_demoted"
                        demoted += 1
            graph.clear()
            for i, e in enumerate(self.edges):
                if e["stated"] and e["type"] == "prerequisite" and e["src"]:
                    graph[e["src"]].append((e["dst"], i))
        self.repairs["stated_edges_demoted_in_cycles"] = demoted
        self.hard_cycles = components(lambda e: e["group_size"] is None or e["group_size"] == 1)
        self.cycle_rows = [{"members": comp, "size": len(comp), "through_or_alternative": True} for comp in components(lambda e: True)]

    def short(self, value):
        return value if isinstance(value, str) and len(value.split()) <= MAX_WORDS else None

    def strip_atoms(self, groups):
        return [[{k: v for k, v in atom.items() if k != "text"} for atom in group] for group in groups or []] if groups is not None else None

    def public_row(self, name, row):
        row = {k: v for k, v in row.items() if k not in SENTENCE_KEYS}
        if name in ("courses", "progression"):
            row["prerequisite_groups"] = self.strip_atoms(row.get("prerequisite_groups"))
        if name == "courses":
            row["corequisite_groups"] = self.strip_atoms(row.get("corequisite_groups"))
        if name == "programs":
            row["requirement_rows"] = [dict({k: v for k, v in item.items() if k != "title"}, section=self.short(item.get("section"))) for item in row["requirement_rows"]]
            plan = []
            for term in row["plan_by_term"]:
                term = dict(term)
                if isinstance(term.get("items"), list):
                    term["items"] = [dict({k: v for k, v in item.items() if k != "text"}, label=None if item.get("codes") else self.short(item.get("text"))) for item in term["items"]]
                plan.append(term)
            row["plan_by_term"] = plan
        if name == "progression":
            row["standard_url"] = None
            topic = row["topic"] or ""
            if (row["notes"] or "").startswith("Catalogue prerequisite text: "):
                row["notes"] = "Edges read from the catalogue prerequisite sentence, which stays off the repo."
            m = CCSS_CODE.match(topic) if row["framework_id"] == "school-fw-ccss-math" else None
            if m:
                row["topic"] = "%s: %s" % (m.group(1), self.ccss[m.group(1)])
                row["standard_url"] = "https://www.thecorestandards.org/Math/Content/%s/" % "/".join(x for x in m.group(2, 3, 4, 5, 6) if x)
            elif row["framework_id"] == "school-fw-ccss-math" and CCSS_CLUSTER.match(topic):
                c = CCSS_CLUSTER.match(topic)
                row["topic"] = "%s: %s" % (c.group(1), self.ccss[c.group(1)])
                row["standard_url"] = "https://www.thecorestandards.org/Math/Content/HS%s/%s/%s/" % c.group(2, 3, 4)
            elif row["framework_id"] == "school-fw-ccss-math":
                row["standard_url"] = "https://www.thecorestandards.org/Math/"
            elif row["framework_id"] == "school-fw-ccss-ela":
                row["topic"] = re.sub(r"\. First standard:.*$", "", topic, flags=re.S)
                row["standard_url"] = "https://www.thecorestandards.org/ELA-Literacy/"
            elif row["framework_id"] == "school-fw-ngss-appendix-e":
                head = re.match(r"NGSS ([A-Z]+\d), (grades [^:]+):", topic)
                if head:
                    codes = sorted(set(re.findall(r"\b[A-Z]{2,3}\d\.[A-Z]\b", topic)))
                    row["topic"] = "NGSS %s %s, %s: %s" % (head.group(1), NGSS_LABEL[head.group(1)], head.group(2), ", ".join(codes))
                    row["standard_url"] = "https://www.nextgenscience.org/"
            elif row["id"].startswith("r2ae-cefr-") and ":" in topic:
                row["topic"] = "CEFR " + topic.split(":")[0]
        return row

    def write(self):
        with open(os.path.join(HERE, "ccss_labels.tsv"), encoding="utf-8") as fh:
            self.ccss = {r["code"]: r["label"] for r in csv.DictReader(fh, delimiter="\t")}
        self.finish_edges()
        self.write_to(OUT, False)
        self.write_to(PUBLIC, True)

    def finish_edges(self):
        self.edges.sort(key=lambda e: (e["dst"], e["src"] or "~" + (e["src_code"] or ""), e["type"], -1 if e["group_index"] is None else e["group_index"]))
        for n, e in enumerate(self.edges, 1):
            e["id"] = "edge-%06d" % n
            self.claim(e["id"], "edges")
        self.edges = [dict([("id", e["id"])] + [(k, v) for k, v in e.items() if k != "id"]) for e in self.edges]

    def write_to(self, OUT, public):
        os.makedirs(OUT, exist_ok=True)
        for name in os.listdir(OUT):
            if name.endswith((".jsonl", ".zst", ".json", ".tsv")):
                os.remove(os.path.join(OUT, name))
        tables = collections.OrderedDict([
            ("frameworks", self.frameworks), ("progression", self.progression), ("edges", self.edges),
            ("assessments", self.assessments), ("books", self.books), ("resources", self.resources),
            ("programs", self.programs), ("courses", self.courses),
        ])
        counts = collections.OrderedDict()
        files = collections.OrderedDict()
        for name, rows in tables.items():
            path = os.path.join(OUT, name + ".jsonl")
            with open(path, "w", encoding="utf-8") as fh:
                for row in rows:
                    fh.write(json.dumps(self.public_row(name, row) if public else row, ensure_ascii=False, sort_keys=False) + "\n")
            entry = collections.OrderedDict(rows=len(rows))
            if name == "edges":
                entry["stated"] = sum(1 for r in rows if r["stated"])
                entry["stated_share"] = round(entry["stated"] / len(rows), 4)
                entry["external"] = sum(1 for r in rows if r["external"])
                entry["by_type"] = dict(collections.Counter(r["type"] for r in rows).most_common())
            else:
                flag = "page_fetched" if name in ("courses", "programs") else "verified"
                entry[flag] = sum(1 for r in rows if r[flag])
                entry[flag + "_share"] = round(entry[flag] / len(rows), 4)
                entry["cip_mapped"] = sum(1 for r in rows if r["cip"]["code"])
                entry["cip_mapping_verified"] = sum(1 for r in rows if r["cip"]["mapping_verified"])
                entry["cip_grain"] = {str(k): v for k, v in sorted(collections.Counter(r["cip"]["grain"] for r in rows if r["cip"]["code"]).items())}
                entry["onet_soc_mapped"] = sum(1 for r in rows if r["onet_soc"])
                entry["onet_soc_mapping_verified"] = sum(1 for r in rows if r["onet_soc"] and r["onet_soc"]["mapping_verified"])
            counts[name] = entry
            size = os.path.getsize(path)
            if size > ZSTD_ABOVE:
                subprocess.run(["zstd", "-q", "-19", "-T0", "--rm", "-f", path], check=True)
                path += ".zst"
            files[os.path.basename(path)] = os.path.getsize(path)
        with open(os.path.join(OUT, "cycles.jsonl"), "w", encoding="utf-8") as fh:
            for row in self.cycle_rows:
                fh.write(json.dumps(row) + "\n")
        with open(os.path.join(OUT, "backbone_codes.jsonl"), "w", encoding="utf-8") as fh:
            for row in self.backbone.rows():
                fh.write(json.dumps(row, ensure_ascii=False) + "\n")
        with open(os.path.join(HERE, "field_map.tsv"), encoding="utf-8") as src, open(os.path.join(OUT, "field_map.tsv"), "w", encoding="utf-8") as dst:
            dst.write(src.read())
        with open(os.path.join(OUT, "cip_soc_crosswalk.jsonl"), "w", encoding="utf-8") as fh:
            for soc_code in sorted(self.backbone.crosswalk):
                for cip_code in sorted(self.backbone.crosswalk[soc_code]):
                    fh.write(json.dumps({"cip": cip_code, "soc": soc_code}) + "\n")
        for extra in ("cycles.jsonl", "backbone_codes.jsonl", "cip_soc_crosswalk.jsonl", "field_map.tsv"):
            files[extra] = os.path.getsize(os.path.join(OUT, extra))
        self.stats["tables"] = counts
        self.stats["files_bytes"] = files
        self.stats["total_bytes"] = sum(files.values())
        self.stats["repairs"] = {k: dict(v) if isinstance(v, collections.Counter) else v for k, v in self.repairs.items()}
        self.stats["unmapped_field_labels"] = [{"slice": s, "label": label, "rows": n} for (s, label), n in sorted(self.mapper.unmapped.items())]
        self.stats["cycles"] = {"components_through_or_alternatives": len(self.cycle_rows), "components_on_mandatory_edges": len(self.hard_cycles)}
        with open(os.path.join(OUT, "stats.json"), "w", encoding="utf-8") as fh:
            json.dump(self.stats, fh, indent=1, ensure_ascii=False)
            fh.write("\n")

    def run(self):
        self.load_courses()
        self.load_slices()
        self.load_books()
        self.load_resources()
        self.load_programs()
        self.cycles()
        self.write()
        if self.hard_cycles:
            raise SystemExit("cycle on mandatory stated edges: %s" % self.hard_cycles[:3])
        print(json.dumps({k: v["rows"] for k, v in self.stats["tables"].items()}), self.stats["total_bytes"])


if __name__ == "__main__":
    Build().run()
