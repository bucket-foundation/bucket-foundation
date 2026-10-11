import collections
import json
import os
import re
import subprocess
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.dirname(HERE)
CANDIDATES = [os.environ.get("PROGRESSIONS_TABLES"), os.path.join(PARENT, "tables"), os.path.join(HERE, "out")]
TABLES = next(p for p in CANDIDATES if p and os.path.exists(os.path.join(p, "stats.json")))
PACKAGE = PARENT if os.path.basename(TABLES) == "tables" else TABLES
ROW_TABLES = ["frameworks", "progression", "assessments", "books", "resources", "programs", "courses"]
LEVELS = {
    "early", "primary", "lower-secondary", "upper-secondary", "undergraduate-lower",
    "undergraduate-upper", "graduate", "professional-entry", "professional-advanced",
}
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")
HOME_PATH = re.compile(r"(?<![\w/.])(?:/home/|/Users/)[A-Za-z0-9_.-]+|(?<![\w/.])~/[A-Za-z0-9_.-]+")
URL_KEY = {"progression": "source_url", "courses": "source_url"}
US_COURSES = {
    "school-us-math-algebra-1", "school-us-math-geometry", "school-us-math-algebra-2",
    "school-us-math-precalculus", "school-us-math-calculus-1", "school-us-math-calculus-2",
}
CACHE = {}


def text_of(path):
    if path.endswith(".zst"):
        return subprocess.run(["zstd", "-dc", path], check=True, capture_output=True).stdout.decode("utf-8")
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def table(name):
    if name not in CACHE:
        plain = os.path.join(TABLES, name + ".jsonl")
        path = plain if os.path.exists(plain) else plain + ".zst"
        CACHE[name] = [json.loads(line) for line in text_of(path).splitlines() if line.strip()]
    return CACHE[name]


def all_ids():
    if "ids" not in CACHE:
        CACHE["ids"] = {r["id"]: name for name in ROW_TABLES + ["edges"] for r in table(name)}
    return CACHE["ids"]


def package_files():
    out = []
    for folder, _, names in os.walk(PACKAGE):
        if "__pycache__" in folder:
            continue
        for name in names:
            out.append(os.path.join(folder, name))
    return sorted(out)


class Identity(unittest.TestCase):
    def test_ids_unique_across_tables(self):
        seen = collections.Counter(r["id"] for name in ROW_TABLES + ["edges"] for r in table(name))
        self.assertEqual([i for i, n in seen.items() if n > 1], [])

    def test_ids_are_non_empty_strings(self):
        for name in ROW_TABLES + ["edges"]:
            for r in table(name):
                self.assertTrue(isinstance(r["id"], str) and r["id"], name)

    def test_stats_match_tables(self):
        stats = json.loads(text_of(os.path.join(TABLES, "stats.json")))
        for name in ROW_TABLES + ["edges"]:
            self.assertEqual(stats["tables"][name]["rows"], len(table(name)), name)


class Edges(unittest.TestCase):
    def test_every_endpoint_resolves_or_is_external(self):
        ids = all_ids()
        bad = []
        for e in table("edges"):
            if e["dst"] not in ids:
                bad.append(e["id"])
            elif e["external"]:
                if e["src"] is not None or not e["src_code"]:
                    bad.append(e["id"])
            elif e["src"] not in ids:
                bad.append(e["id"])
        self.assertEqual(bad, [])

    def test_row_references_resolve(self):
        ids = all_ids()
        frameworks = {r["id"] for r in table("frameworks")}
        bad = []
        for r in table("progression"):
            refs = r["prerequisites"] + r["corequisites"] + ([r["same_as"]] if r["same_as"] else [])
            bad += [(r["id"], x) for x in refs if x not in ids]
            if r["framework_id"] and r["framework_id"] not in frameworks:
                bad.append((r["id"], r["framework_id"]))
            for group in r["prerequisite_groups"] or []:
                bad += [(r["id"], a["id"]) for a in group if a.get("type") == "course" and a.get("id") and a["id"] not in ids]
        for r in table("courses"):
            bad += [(r["id"], x) for x in r["prerequisites"] if x not in ids]
            if r["framework_id"] and r["framework_id"] not in frameworks:
                bad.append((r["id"], r["framework_id"]))
        for r in table("programs"):
            bad += [(r["id"], x) for x in r["required_course_ids"] if x not in ids]
        self.assertEqual(bad, [])

    def test_every_listed_prerequisite_has_an_edge(self):
        have = {(e["src"], e["dst"]) for e in table("edges") if e["src"]}
        missing = [(p, r["id"]) for r in table("progression") for p in r["prerequisites"] + r["corequisites"] if (p, r["id"]) not in have]
        self.assertEqual(missing, [])

    def test_stated_flag_and_source_present(self):
        for e in table("edges"):
            self.assertIsInstance(e["stated"], bool)
            if e["stated"]:
                self.assertTrue(e["stated_basis"] and e["source_url"], e["id"])

    def test_no_cycle_among_stated_edges_outside_or_alternatives(self):
        children = collections.defaultdict(list)
        indegree = collections.Counter()
        nodes = set()
        for e in table("edges"):
            if not (e["stated"] and e["type"] == "prerequisite" and e["src"]):
                continue
            if e["group_size"] is not None and e["group_size"] > 1:
                continue
            children[e["src"]].append(e["dst"])
            indegree[e["dst"]] += 1
            nodes.update((e["src"], e["dst"]))
        queue = [x for x in nodes if indegree[x] == 0]
        done = 0
        while queue:
            x = queue.pop()
            done += 1
            for y in children[x]:
                indegree[y] -= 1
                if indegree[y] == 0:
                    queue.append(y)
        self.assertEqual(done, len(nodes))

    def test_listed_cycles_run_through_or_alternatives(self):
        ids = all_ids()
        for line in text_of(os.path.join(TABLES, "cycles.jsonl")).splitlines():
            row = json.loads(line)
            members = set(row["members"])
            self.assertTrue(members <= set(ids))
            inside = [e for e in table("edges") if e["stated"] and e["type"] == "prerequisite" and e["src"] in members and e["dst"] in members]
            self.assertTrue(any((e["group_size"] or 1) > 1 for e in inside), row["members"])

    def test_us_course_rows_are_unstated(self):
        rows = {r["id"]: r for r in table("progression")}
        for row_id in US_COURSES:
            self.assertIs(rows[row_id]["edges_stated"], False, row_id)
        for e in table("edges"):
            if e["dst"] in US_COURSES:
                self.assertFalse(e["stated"], e["id"])


class Normalisation(unittest.TestCase):
    def test_levels_on_nine_level_scale(self):
        for name in ROW_TABLES:
            for r in table(name):
                for key in ("level", "level_from", "level_to"):
                    if r.get(key) is not None:
                        self.assertIn(r[key], LEVELS, (name, r["id"]))

    def test_progression_rows_share_one_key_set(self):
        keys = {frozenset(k for k in r if k != "level_raw") for r in table("progression")}
        self.assertEqual(len(keys), 1)
        for key in ("notes", "edges_stated", "prerequisite_text", "prerequisite_groups", "external_prerequisites", "term_order"):
            self.assertIn(key, next(iter(keys)))
            self.assertIn(key, table("courses")[0])

    def test_old_field_names_are_gone(self):
        for name in ("progression", "courses"):
            for r in table(name):
                self.assertFalse({"prereq_text", "prereq_codes_outside_slice"} & set(r), r["id"])

    def test_round2_fields_groups_regenerated(self):
        rows = [r for r in table("progression") if r["slice"] == "round2-fields" and r["prerequisite_text"]]
        self.assertTrue(rows)
        for r in rows:
            self.assertIsInstance(r["prerequisite_groups"], list, r["id"])
            self.assertEqual(r["parse_status"], "parsed", r["id"])

    def test_catalogue_duplicates_removed(self):
        ids = all_ids()
        pattern = re.compile(r"^(round2-fields-(isu|uiuc|iowa)-|lhs-(isu|uiowa)-)")
        self.assertEqual([r["id"] for r in table("progression") if pattern.match(r["id"])], [])
        merged = [m for r in table("courses") for m in r["merged_ids"]]
        self.assertTrue(merged)
        self.assertEqual([m for m in merged if m in ids], [])

    def test_books_replace_slice_textbooks(self):
        self.assertFalse(os.path.exists(os.path.join(TABLES, "textbooks.jsonl")))
        self.assertTrue(all(r["source_ids"] for r in table("books")))


class Mapping(unittest.TestCase):
    def setUp(self):
        codes = [json.loads(line) for line in text_of(os.path.join(TABLES, "backbone_codes.jsonl")).splitlines()]
        self.cip = {c["code"] for c in codes if c["scheme"] == "cip2020"}
        self.soc = {c["code"] for c in codes if c["scheme"] != "cip2020"}

    def test_every_row_carries_a_cip_object(self):
        for name in ROW_TABLES:
            for r in table(name):
                cip = r["cip"]
                self.assertIsInstance(cip["mapping_verified"], bool)
                if cip["code"] is None:
                    self.assertEqual(cip["method"], "unmapped")
                else:
                    self.assertIn(cip["code"], self.cip, r["id"])
                    self.assertEqual(cip["grain"], {2: 2, 5: 4, 7: 6}[len(cip["code"])])

    def test_field_labelled_rows_are_all_mapped(self):
        for name in ("frameworks", "progression", "assessments"):
            self.assertEqual([r["id"] for r in table(name) if r["field"] and not r["cip"]["code"]], [], name)

    def test_soc_codes_exist(self):
        for name in ROW_TABLES:
            for r in table(name):
                if r["onet_soc"]:
                    self.assertIn(r["onet_soc"]["code"], self.soc, r["id"])

    def test_mapping_verified_only_where_source_states_code(self):
        for name in ROW_TABLES:
            for r in table(name):
                for key in ("cip", "onet_soc"):
                    m = r[key]
                    if m and m["mapping_verified"]:
                        self.assertEqual(m["method"], "source_states_code", r["id"])
                        self.assertIn(m["code"], r.get("topic") or "", r["id"])

    def test_field_map_codes_exist(self):
        lines = text_of(os.path.join(PACKAGE, "build", "field_map.tsv") if PACKAGE == PARENT else os.path.join(TABLES, "field_map.tsv")).splitlines()[1:]
        self.assertTrue(lines)
        for line in lines:
            label, cip, soc = (line.split("\t") + ["", ""])[:3]
            self.assertIn(cip, self.cip, label)
            if soc:
                self.assertIn(soc, self.soc, label)


class Hygiene(unittest.TestCase):
    def test_verified_rows_carry_a_url(self):
        for name in ROW_TABLES:
            key = URL_KEY.get(name, "url")
            bad = [r["id"] for r in table(name) if r["verified"] and not str(r.get(key) or "").startswith(("http://", "https://"))]
            self.assertEqual(bad, [], name)

    def test_no_email_address_or_home_path(self):
        for path in package_files():
            if path.endswith((".pyc", ".sqlite")):
                continue
            body = text_of(path)
            self.assertIsNone(EMAIL.search(body), path)
            self.assertIsNone(HOME_PATH.search(body), path)

    def test_no_dewey_or_sfia_text(self):
        for path in package_files():
            if not path.endswith((".jsonl", ".zst")):
                continue
            body = text_of(path)
            self.assertNotIn("Dewey Decimal", body, path)
            self.assertNotIn('"ddc', body, path)
            self.assertIsNone(re.search(r"SFIA level \d:", body), path)
            self.assertNotIn("1 Follow, 2 Assist", body, path)

    def test_course_descriptions_left_out(self):
        self.assertNotIn("description", table("courses")[0])

    def test_size_limits(self):
        total = 0
        for path in package_files():
            size = os.path.getsize(path)
            total += size
            if path.endswith(".jsonl"):
                self.assertLessEqual(size, 5 * 1024 * 1024, path)
        self.assertLess(total, 40 * 1024 * 1024)

    def test_raw_and_sqlite_left_out(self):
        for path in package_files():
            self.assertFalse(path.endswith(".sqlite"), path)
            self.assertNotIn(os.sep + "raw" + os.sep, path)


if __name__ == "__main__":
    unittest.main()
