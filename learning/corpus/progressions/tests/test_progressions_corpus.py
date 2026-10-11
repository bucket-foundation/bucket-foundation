import collections
import json
import os
import re
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.dirname(HERE)
CANDIDATES = [os.environ.get("PROGRESSIONS_TABLES"), os.path.join(PARENT, "tables"), os.path.join(HERE, "public")]
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
FLAG = {"courses": "page_fetched", "programs": "page_fetched"}
SENTENCE_KEYS = {"prerequisite_text", "corequisite_text", "requirements_text", "recommended_text", "prerequisite_trailing_text", "description", "text"}
LABEL_KEYS = {"notes", "title", "program", "page_title", "department", "institution"}
UNSOURCED = re.compile(r"\binfer\w*|\brecall\w*|from memory|not fetched|unfetched", re.I)
CCSS_ROW = re.compile(r"^((?:K|\d)\.[A-Z]+\.[A-Z]\.\d+[a-z]?|[A-Z]-[A-Z]+\.[A-Z]): (.+)$")
NEW_SLICES = ["k12-full", "history-occupations", "history-technology", "history-forecast", "lifespan", "beyond-school", "world", "round3-empty"]
SIDE_TABLES = ["activities", "occupation_history", "technologies"]
FACET_TABLES = ["progression", "frameworks", "assessments", "programs", "courses"]
TEXT_LIMITS = {"topic": 240, "name": 200, "title": 300, "notes": 700, "subfield": 120, "typical_age_or_year": 80, "program": 200, "page_title": 200, "body": 200, "department": 200}
LABEL_SYSTEMS = {"australia-v9", "england-nc", "head-start-elof"}
LOCAL_CORPUS = os.environ.get("PROGRESSIONS_SLICES") or os.path.join(os.path.expanduser("~"), "agfarms", ".learning-corpus", "progressions")
sys.path.insert(0, HERE if os.path.exists(os.path.join(HERE, "facets.py")) else os.path.join(PARENT, "build"))
import facets as FC  # noqa: E402
CACHE = {}


def walk(value, key=None):
    if isinstance(value, dict):
        for k, v in value.items():
            yield from walk(v, k)
    elif isinstance(value, list):
        for v in value:
            yield from walk(v, key)
    else:
        yield key, value


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
        for key in ("notes", "edges_stated", "prerequisite_groups", "external_prerequisites", "term_order"):
            self.assertIn(key, next(iter(keys)))
            self.assertIn(key, table("courses")[0])

    def test_old_field_names_are_gone(self):
        for name in ("progression", "courses"):
            for r in table(name):
                self.assertFalse({"prereq_text", "prereq_codes_outside_slice"} & set(r), r["id"])

    def test_round2_fields_groups_regenerated(self):
        rows = [r for r in table("progression") if r["slice"] == "round2-fields" and r["parse_status"]]
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
            self.assertEqual([r["id"] for r in table(name) if r["field"] and not r["cip"]["code"] and r["slice"] not in NEW_SLICES], [], name)

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


class Rights(unittest.TestCase):
    def test_catalogue_rows_hold_no_free_text_sentence(self):
        for name in ("courses", "programs"):
            for r in table(name):
                for key, value in walk(r):
                    self.assertNotIn(key, SENTENCE_KEYS, r["id"])
                    if isinstance(value, str) and key not in LABEL_KEYS and not value.startswith("http"):
                        self.assertLessEqual(len(value.split()), 12, (r["id"], key))

    def test_no_prerequisite_sentence_in_any_table(self):
        for name in ROW_TABLES:
            for r in table(name):
                self.assertNotIn("prerequisite_text", r, r["id"])
                self.assertFalse(str(r.get("notes") or "").startswith("Catalogue prerequisite text"), r["id"])
                for group in r.get("prerequisite_groups") or []:
                    for atom in group:
                        self.assertNotIn("text", atom, r["id"])

    def test_common_core_rows_hold_code_label_and_link(self):
        rows = [r for r in table("progression") if r["framework_id"] == "school-fw-ccss-math" and CCSS_ROW.match(r["topic"])]
        self.assertEqual(len(rows), 371)
        for r in rows:
            label = CCSS_ROW.match(r["topic"]).group(2)
            self.assertLessEqual(len(label.split()), 8, r["id"])
            self.assertTrue(r["standard_url"].startswith("https://www.thecorestandards.org/Math/Content/"), r["id"])
        for r in table("progression"):
            if r["framework_id"] == "school-fw-ccss-math":
                self.assertLessEqual(len(r["topic"].split()), 14, r["id"])

    def test_no_verbatim_standards_text(self):
        for r in table("progression"):
            self.assertIsNone(re.search(r"<[a-z/][^>]*>|&[a-z]+;", r["topic"] or ""), r["id"])
            self.assertNotIn("First standard:", r["topic"] or "", r["id"])
            if r["framework_id"] in ("school-fw-ccss-math", "school-fw-ccss-ela", "school-fw-ngss-appendix-e") or r["id"].startswith("r2ae-cefr-"):
                self.assertLessEqual(len((r["topic"] or "").split()), 16, r["id"])

    def test_sfia_attribute_terms_removed(self):
        for r in table("frameworks"):
            if "sfia" in r["id"]:
                self.assertIsNone(re.search(r"autonomy|influence|complexity|Follow|Assist", r["notes"] or ""), r["id"])


class Flags(unittest.TestCase):
    def test_catalogue_tables_use_page_fetched(self):
        for name in ("courses", "programs"):
            for r in table(name):
                self.assertNotIn("verified", r, r["id"])
                self.assertIsInstance(r["page_fetched"], bool)
        for name in ("frameworks", "progression", "assessments", "books", "resources"):
            self.assertNotIn("page_fetched", table(name)[0])

    def test_unfetched_programs_are_flagged_and_empty(self):
        rows = [r for r in table("programs") if not r["page_fetched"]]
        self.assertEqual(len(rows), 215)
        for r in rows:
            self.assertEqual(r["requirement_rows"] + r["plan_by_term"] + r["required_courses"], [], r["id"])

    def test_inferred_or_recalled_rows_are_unverified(self):
        for name in ("frameworks", "progression", "assessments", "books", "resources"):
            bad = [r["id"] for r in table(name) if r["verified"] and UNSOURCED.search(r["notes"] or "")]
            self.assertEqual(bad, [], name)


class Facets(unittest.TestCase):
    def test_catalogue_course_rule(self):
        out = FC.assign("courses", {"slice": "catalogues", "cip": {"code": "27.0101"}})
        self.assertEqual((out["region"], out["mode"], out["life_stage"], out["purpose"], out["language"]), ("US", "school", "tertiary", "school", "en"))
        self.assertEqual((out["era_from"], out["era_to"], out["kind"], out["kind_method"]), (2026, 2026, None, "none"))
        self.assertEqual(out["region_method"], "rule")

    def test_positional_levels_give_no_life_stage(self):
        out = FC.assign("progression", {"slice": "everyday", "level": "primary", "field": "chess", "cip": {"code": "36.0103"}})
        self.assertEqual((out["life_stage"], out["life_stage_method"], out["purpose"], out["mode"]), (None, "none", "play", "play"))

    def test_level_rules(self):
        self.assertEqual(FC.assign("progression", {"slice": "school", "level": "early", "cip": {"code": "27.01"}})["life_stage"], "early-childhood")
        self.assertEqual(FC.assign("progression", {"slice": "trades-technical", "level": "professional-entry", "cip": {"code": "46.0302"}})["purpose"], "work")
        self.assertEqual(FC.assign("progression", {"slice": "trades-technical", "level": "professional-entry", "cip": {"code": "46.0302"}})["kind"], "procedural")
        self.assertEqual(FC.assign("frameworks", {"slice": "school", "level_from": "early", "level_to": "graduate", "cip": {"code": "27.01"}})["life_stage"], None)

    def test_region_codes(self):
        self.assertEqual([FC.region_code(x) for x in ("US-TX", "England", "US and Canada", "global", "Mesopotamia", "", None, "DE")], ["US", "GB", "international", "international", None, None, None, "DE"])

    def test_stated_values_win_and_bad_values_fall_back(self):
        out = FC.assign("frameworks", {"slice": "x", "cip": {"code": None}}, {"purpose": "civic", "era_from": -2000, "era_to": -1600, "kind": "guesswork", "region": "Japan"})
        self.assertEqual((out["purpose"], out["purpose_method"], out["era_from"], out["era_to"], out["era_to_method"]), ("civic", "stated", -2000, -1600, "stated"))
        self.assertEqual((out["kind"], out["kind_method"], out["region"], out["language"], out["language_method"]), (None, "none", "JP", "ja", "rule"))

    def test_inherited_region_and_era(self):
        out = FC.assign("progression", {"slice": "school", "level": "primary", "cip": {"code": "27.01"}}, {}, {"region": "GB", "era_from": 2014, "era_to": None})
        self.assertEqual((out["region"], out["region_method"], out["era_from"], out["language"]), ("GB", "rule", 2014, "en"))

    def test_every_row_carries_all_facets(self):
        for name in FACET_TABLES:
            for r in table(name):
                for f in FC.FACETS:
                    self.assertIn(r[f + "_method"], ("stated", "rule", "none"), r["id"])
                    self.assertEqual(r[f] is None, r[f + "_method"] == "none", (r["id"], f))
                    if f in FC.VOCAB and r[f] is not None:
                        self.assertIn(r[f], FC.VOCAB[f], r["id"])
                if r["region"] is not None:
                    self.assertIsNotNone(re.fullmatch(r"[A-Z]{2}|international", r["region"]), r["id"])

    def test_catalogue_rows_follow_the_rule(self):
        for r in table("courses"):
            self.assertEqual((r["region"], r["mode"], r["life_stage"]), ("US", "school", "tertiary"), r["id"])


class NewSlices(unittest.TestCase):
    def test_loaded_and_pending_cover_the_list(self):
        stats = json.loads(text_of(os.path.join(TABLES, "stats.json")))
        self.assertEqual(sorted(set(stats["slices_loaded"]) & set(NEW_SLICES)) + sorted(stats["slices_pending"]), sorted(NEW_SLICES, key=lambda s: (s in stats["slices_pending"], s)))

    def test_free_text_stays_under_the_limit_per_field(self):
        for name in ROW_TABLES + SIDE_TABLES:
            for r in table(name):
                for key, value in walk(r):
                    if isinstance(value, str) and not str(key).endswith("url"):
                        self.assertLessEqual(len(value), TEXT_LIMITS.get(key, 300), (r["id"], key))

    def test_k12_labels_follow_the_licence_of_each_system(self):
        rows = [r for r in table("progression") if r["slice"] == "k12-full" and r["subfield"] != "AP course" and r["field"] != "career and technical education"]
        self.assertTrue(rows)
        kept = 0
        for r in rows:
            self.assertTrue(r["source_licence"], r["id"])
            self.assertIsNone(re.search(r"not fetched|names only", r["source_licence"]), r["id"])
            if r["system"] in LABEL_SYSTEMS:
                kept += 1
                self.assertIsNotNone(re.search(r"public domain|CC BY 4.0|Open Government Licence", r["source_licence"]), r["id"])
            else:
                self.assertLessEqual(len((r["topic"] or "").split()), 6, r["id"])
        self.assertTrue(kept)

    def test_restricted_k12_rows_hold_no_run_of_source_words(self):
        source = os.path.join(LOCAL_CORPUS, "k12-full", "standards.jsonl")
        if not os.path.exists(source):
            self.skipTest("slice files are off the repo")
        committed = {r["id"]: r["topic"] or "" for r in table("progression") if r["slice"] == "k12-full"}
        checked = 0
        with open(source, encoding="utf-8") as fh:
            for n, line in enumerate(fh):
                if n % 25:
                    continue
                r = json.loads(line)
                words = str(r.get("label") or "").split()
                if r.get("system") in LABEL_SYSTEMS or len(words) <= 6 or r["id"] not in committed:
                    continue
                checked += 1
                for i in range(len(words) - 6):
                    self.assertNotIn(" ".join(words[i:i + 7]), committed[r["id"]], r["id"])
        self.assertTrue(checked)

    def test_cte_rows_take_purpose_work(self):
        self.assertEqual(FC.assign("progression", {"slice": "k12-full", "level": "upper-secondary", "field": "career and technical education", "cip": {"code": None}})["purpose"], "work")
        rows = [r for r in table("progression") if r["slice"] == "k12-full" and r["field"] == "career and technical education"]
        self.assertTrue(rows)
        self.assertEqual({r["purpose"] for r in rows}, {"work"})

    def test_technologies_carry_evidence(self):
        rows = table("technologies")
        self.assertTrue(rows)
        for r in rows:
            self.assertIn(r["evidence"], ("wikidata-id-only", "curated-source"), r["id"])
            if r["evidence"] == "wikidata-id-only":
                self.assertFalse(r["verified"], r["id"])
                self.assertIsNotNone(re.search(r"technolog|invention|\btool|machine|technique|process", " ".join(r["classes"]), re.I), r["id"])
            if r["verified"]:
                self.assertTrue(r["source_url"], r["id"])

    def test_withheld_scheme_cells_hold_codes_alone(self):
        frame = os.path.join(PARENT, "completeness", "frame.jsonl")
        scored = json.loads(text_of(os.path.join(TABLES, "completeness.json")))["cells"]
        cells = [json.loads(line) for line in text_of(frame).splitlines() if line.strip()] if os.path.exists(frame) else []
        seen = 0
        for cell in cells + scored:
            if cell["cell"].startswith(("ocm:", "propaedia:")):
                seen += 1
                self.assertIsNone(cell.get("label"), cell["cell"])
                self.assertNotIn("adjudication", cell)
        self.assertTrue(seen)
        source = os.path.join(LOCAL_CORPUS, "completeness-frame.jsonl")
        if not os.path.exists(source) or not os.path.exists(frame):
            return
        names = [c["label"] for c in (json.loads(line) for line in text_of(source).splitlines() if line.strip()) if c["cell"].startswith(("ocm:", "propaedia:")) and len(str(c["label"]).split()) >= 3]
        self.assertTrue(names)
        for path in (os.path.join(PARENT, "README.md"), os.path.join(PARENT, "COMPLETENESS.md"), os.path.join(PARENT, "COVERAGE.md"), os.path.join(TABLES, "completeness.json")):
            body = text_of(path)
            for name in names:
                self.assertNotIn(name, body, (path, name))
        labels = [json.loads(line).get("label") for line in text_of(frame).splitlines() if line.strip()]
        for name in names:
            self.assertNotIn(name, labels)

    def test_completeness_counts_thin_cells_and_strict_verified(self):
        scored = json.loads(text_of(os.path.join(TABLES, "completeness.json")))
        for d in scored["dimensions"].values():
            self.assertEqual(d["held_critic_rule"], d["thin_critic_rule"] + d["ten_or_more_critic_rule"])
        self.assertTrue(all((c.get("catalogue_verified") or 0) == 0 for c in scored["cells"]))
        if os.path.exists(os.path.join(PARENT, "COMPLETENESS.md")):
            self.assertIn("3.1 of 10", text_of(os.path.join(PARENT, "COMPLETENESS.md")).split("\n")[2])

    def test_outline_of_cultural_materials_holds_no_label(self):
        rows = table("activities")
        for r in rows:
            if r["scheme"] == "OCM":
                self.assertIsNone(r["label"], r["id"])
                self.assertTrue(r["source_url"], r["id"])
            if r["scheme"].startswith("ICATUS") and r["level"] != "major division":
                self.assertIsNone(r["label"], r["id"])

    def test_side_tables_have_unique_ids_and_years(self):
        seen = set(all_ids())
        for name in SIDE_TABLES:
            for r in table(name):
                self.assertNotIn(r["id"], seen, r["id"])
                seen.add(r["id"])
                for key in ("era_from", "era_to"):
                    self.assertTrue(r.get(key) is None or isinstance(r[key], int), r["id"])

    def test_completeness_scores_every_frame_cell(self):
        frame = os.path.join(PARENT, "completeness", "frame.jsonl")
        frame = frame if os.path.exists(frame) else os.path.join(PARENT, "completeness-frame.jsonl")
        cells = [json.loads(line) for line in text_of(frame).splitlines() if line.strip()]
        scored = json.loads(text_of(os.path.join(TABLES, "completeness.json")))
        self.assertEqual(len(cells), 441)
        self.assertEqual([(c["dimension"], c["cell"]) for c in scored["cells"]], [(c["dimension"], c["cell"]) for c in cells])


class Hygiene(unittest.TestCase):
    def test_verified_rows_carry_a_url(self):
        for name in ROW_TABLES:
            key = URL_KEY.get(name, "url")
            flag = FLAG.get(name, "verified")
            bad = [r["id"] for r in table(name) if r[flag] and not str(r.get(key) or "").startswith(("http://", "https://"))]
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
