import collections
import filecmp
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
PACKAGE = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(PACKAGE, "build"))
import alignlib as A  # noqa: E402

TABLES = os.path.join(PACKAGE, "tables")
DERIVED = ["atom_levels.jsonl", "edge_agreement.jsonl", "atom_careers.jsonl", "gaps.jsonl", "stats.json", "QUALITY.json"]
ROW_TABLES = ["alignments.jsonl", "atom_levels.jsonl", "edge_agreement.jsonl", "atom_resources.jsonl", "atom_careers.jsonl", "gaps.jsonl"]
READERS = ["packages", "src", "scripts", "learning/app", "learning/corpus/progressions"]
REVIEW_PACKER = "packages/bkt/src/pack/alignment-review.ts"
ALIGNMENT_KEYS = {
    "schema", "id", "progression_id", "table", "framework_id", "course_code", "field", "cip", "level", "atom",
    "match", "score", "method", "rows_collapsed", "prerequisites", "prerequisite_source", "source_url",
    "status", "verified", "verification", "note",
}
RESOURCE_KEYS = {
    "atom", "resource_id", "url", "licence", "licence_verified", "kind", "level", "cip", "score", "method", "status", "verified",
}
TEXT_KEYS = {"topic", "title", "subfield", "label", "text", "name", "summary", "description", "notes"}
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")
HOME_PATH = re.compile(r"(?<![\w/.])(?:/home/|/Users/)[A-Za-z0-9_.-]+")
CACHE = {}


def table(name):
    if name not in CACHE:
        CACHE[name] = list(A.read_jsonl(os.path.join(TABLES, name)))
    return CACHE[name]


def atoms():
    if "atoms" not in CACHE:
        CACHE["atoms"] = A.load_atoms()
    return CACHE["atoms"]


def corpus_levels():
    if "corpus" not in CACHE:
        rows = {}
        for name in ("progression", "courses"):
            for row in A.read_jsonl(os.path.join(A.CORPUS, f"{name}.jsonl.zst")):
                label, kind = A.row_label(name, row)
                rows[row["id"]] = (name, row.get("level"), (row.get("cip") or {}).get("code"), label, kind)
        CACHE["corpus"] = rows
    return CACHE["corpus"]


class Rules(unittest.TestCase):
    def test_split_label_strips_a_code_prefix(self):
        self.assertEqual(A.split_label("3.MD.C.7d: area of joined rectangles"), ("area of joined rectangles", False))
        self.assertEqual(A.split_label("MIT 8.228 Relativity II"), ("Relativity II", True))
        self.assertEqual(A.split_label("Illinois CHEM 104 General Chemistry II"), ("General Chemistry II", True))
        self.assertEqual(A.split_label("Limits and continuity"), ("Limits and continuity", False))

    def test_tokens_fold_case_plural_and_accents(self):
        self.assertEqual(A.tokens("Vector spaces"), A.tokens("vector space"))
        self.assertEqual(A.tokens("The Schrödinger equation"), frozenset({"schrodinger", "equation"}))
        self.assertEqual(A.tokens("Introduction to Topology"), frozenset({"topology"}))

    def test_relation_rules(self):
        self.assertEqual(A.relation("Groups", "Groups", "topic")[0], "exact")
        self.assertEqual(A.relation("Groups", "Groups", "course")[0], "exact")
        self.assertEqual(A.relation("Chain rule", "Calculus I", "course"), ("broader", "course-title"))
        self.assertEqual(A.relation("Probability", "Statistics and Probability", "strand")[0], "broader")
        self.assertEqual(A.relation("Shannon entropy", "Entropy", "topic"), ("broader", "label-inside-atom-title"))
        self.assertEqual(A.relation("Groups", "Groups, Rings and Modules", "topic"), ("broader", "label-lists-several"))
        self.assertEqual(A.relation("Greedy algorithms", "Greedy Algorithms with Sorting", "topic")[0], "narrower")
        self.assertEqual(A.relation("Huffman coding", "Prefix sums", "topic"), ("related", "embedding-only"))

    def test_thresholds_are_stricter_for_school_rows(self):
        limits = {"threshold": 0.68, "school_threshold": 0.72}
        self.assertTrue(A.accepts(0.68, "graduate", limits))
        self.assertTrue(A.accepts(0.68, None, limits))
        self.assertFalse(A.accepts(0.71, "upper-secondary", limits))
        self.assertTrue(A.accepts(0.72, "primary", limits))
        self.assertFalse(A.accepts(0.679, "undergraduate-lower", limits))

    def test_licence_rule(self):
        for licence in ("CC BY", "CC BY-NC-SA 4.0, unverified", "CC0", "Public domain in the USA", "MIT", "Copyright SEP, free to read"):
            self.assertTrue(A.licence_linkable(licence), licence)
        for licence in ("Proprietary", "unstated", "All rights reserved", "Mixed", "Per channel", "CK-12 licence", "", None):
            self.assertFalse(A.licence_linkable(licence), licence)
        self.assertFalse(A.licence_linkable("CC BY", "unknown"))
        self.assertTrue(A.licence_linkable("CC BY-NC-SA 4.0", "CC-BY-NC-SA-4.0"))

    def test_edge_queue_names_no_finding(self):
        self.assertEqual(A.edge_queue([1], []), "review-later")
        self.assertEqual(A.edge_queue([], [1]), "review-first")
        self.assertEqual(A.edge_queue([1], [1]), "review-second")
        self.assertEqual(A.edge_queue([], []), "no-corpus-path")

    def test_lexical_check(self):
        lesson = "Faraday found that a changing magnetic flux drives an electric current."
        self.assertTrue(A.lexical_check("Faraday's law", lesson, "Electricity and Magnetism", "course")[0])
        self.assertFalse(A.lexical_check("Faraday's law", lesson, "Organic Chemistry", "course")[0])
        self.assertEqual(A.lexical_check("Faraday's law", lesson, "Physics II", "course"), (False, "label-generic"))
        self.assertFalse(A.lexical_check("Hashing and data structures", "stacks and queues", "Stacks", "topic")[0])
        self.assertTrue(A.lexical_check("Greedy algorithms", "", "Greedy Algorithms with Sorting", "topic")[0])

    def test_level_band(self):
        rule = {"level_from": ["undergraduate-lower"], "level_to": ["graduate"]}
        self.assertTrue(A.in_band(rule, "graduate"))
        self.assertFalse(A.in_band(rule, "upper-secondary"))
        self.assertFalse(A.in_band(rule, "professional-entry"))
        self.assertFalse(A.in_band(rule, None))

    def test_reachable_follows_chains_and_skips_the_start(self):
        forward = {"a": {"b"}, "b": {"c"}, "c": {"a"}}
        self.assertEqual(A.reachable(forward, "a"), {"b", "c"})

    def test_level_summary_reports_mode_and_spread(self):
        rows = [
            {"match": "broader", "level": "graduate", "score": 0.7},
            {"match": "broader", "level": "graduate", "score": 0.7},
            {"match": "exact", "level": "undergraduate-lower", "score": 0.8},
            {"match": "related", "level": "early", "score": 0.9},
        ]
        got = A.level_summary(rows)
        self.assertEqual(got["level"], "graduate")
        self.assertEqual(got["level_first"], "undergraduate-lower")
        self.assertEqual(got["spread"], 2)
        self.assertEqual(got["level_schema_rule"], "undergraduate-lower")
        self.assertIsNone(A.level_summary([rows[3]]))

    def test_field_rule(self):
        rule = {"cip": ["27", "30.08"], "field": ["meta-learning"]}
        self.assertTrue(A.in_field(rule, "27.0501", None))
        self.assertTrue(A.in_field(rule, None, "meta-learning"))
        self.assertFalse(A.in_field(rule, "30.01", "science"))


class Alignments(unittest.TestCase):
    def test_every_science_atom_appears(self):
        seen = {row["atom"] for row in table("alignments.jsonl")}
        self.assertEqual(seen, {atom["atom"] for atom in atoms()})
        self.assertEqual(len(atoms()), 487)

    def test_ids_are_unique_and_follow_the_schema(self):
        rows = table("alignments.jsonl")
        self.assertEqual(len({row["id"] for row in rows}), len(rows))
        for row in rows:
            self.assertEqual(set(row), ALIGNMENT_KEYS)
            self.assertEqual(row["schema"], A.SCHEMA)
            deck_slug = row["atom"].split(":", 1)[1]
            self.assertEqual(row["id"], f"align:{row['progression_id'] or 'none'}~{deck_slug}")
            self.assertIn(row["match"], A.MATCHES)

    def test_nothing_is_verified(self):
        for name in ("alignments.jsonl", "atom_resources.jsonl", "atom_levels.jsonl", "edge_agreement.jsonl", "atom_careers.jsonl"):
            for row in table(name):
                self.assertIs(row["verified"], False, name)
        for row in table("alignments.jsonl"):
            self.assertEqual(row["verification"]["status"], "asserted")
            self.assertEqual(row["verification"]["by"], "agent")

    def test_a_verified_row_names_a_reviewer(self):
        for row in table("alignments.jsonl"):
            if row["verification"]["status"] == "verified":
                self.assertNotEqual(row["verification"]["by"], "agent")
                self.assertTrue(row["verification"]["at"])

    def test_rows_join_to_the_corpus_and_copy_its_level(self):
        corpus = corpus_levels()
        for row in table("alignments.jsonl"):
            if row["progression_id"] is None:
                self.assertEqual(row["match"], "none")
                continue
            name, level, cip = corpus[row["progression_id"]][:3]
            self.assertEqual((row["table"], row["level"], row["cip"]), (name, level, cip))
            self.assertIn(row["level"], A.LEVELS + [None])

    def test_rows_sit_in_the_field_of_their_deck(self):
        rules = A.deck_fields()
        for row in table("alignments.jsonl"):
            if row["progression_id"]:
                deck = row["atom"].split(":")[1].split("/")[0]
                self.assertTrue(A.in_field(rules[deck], row["cip"], row["field"]), row["id"])

    def test_scores_clear_the_stated_threshold(self):
        limits = A.thresholds()
        for row in table("alignments.jsonl"):
            if row["progression_id"]:
                self.assertTrue(A.accepts(row["score"], row["level"], limits), row["id"])

    def test_accepted_links_pass_the_band_relation_and_lexical_rules(self):
        rules, corpus = A.deck_fields(), corpus_levels()
        by_atom = {atom["atom"]: atom for atom in atoms()}
        for row in table("alignments.jsonl"):
            if not row["progression_id"]:
                continue
            atom = by_atom[row["atom"]]
            label, kind = corpus[row["progression_id"]][3:]
            self.assertIn(row["match"], A.ACCEPTED_MATCHES, row["id"])
            self.assertTrue(A.in_band(rules[atom["deck"]], row["level"]), row["id"])
            if row["match"] != "exact":
                self.assertTrue(A.lexical_check(atom["title"], atom["statement"], label, kind)[0], row["id"])

    def test_method_names_the_repo_model_and_a_rule(self):
        for row in table("alignments.jsonl"):
            self.assertRegex(row["method"], r"^embedding:BAAI/bge-small-en-v1\.5\+rule:[a-z-]+(\+lexical:[a-z-]+)?$")

    def test_no_source_text_is_copied(self):
        for name in ("alignments.jsonl", "atom_resources.jsonl", "atom_levels.jsonl", "edge_agreement.jsonl", "atom_careers.jsonl", "gaps.jsonl"):
            for row in table(name):
                self.assertFalse(TEXT_KEYS & set(row), name)
        for row in table("alignments.jsonl"):
            self.assertEqual(row["note"], "")

    def test_no_email_or_home_path(self):
        for folder in ("tables", "review", "build"):
            for name in os.listdir(os.path.join(PACKAGE, folder)):
                path = os.path.join(PACKAGE, folder, name)
                if os.path.isfile(path):
                    text = open(path, encoding="utf-8").read()
                    self.assertIsNone(EMAIL.search(text), name)
                    self.assertIsNone(HOME_PATH.search(text), name)

    def test_no_occupation_history_value_is_read(self):
        for name in os.listdir(os.path.join(PACKAGE, "build")):
            if name.endswith(".py"):
                source = open(os.path.join(PACKAGE, "build", name), encoding="utf-8").read()
                self.assertNotIn("occupation_history", source)
                self.assertNotIn("ipums", source.lower())


class Status(unittest.TestCase):
    def test_every_row_of_every_table_is_marked_unreviewed(self):
        for name in ROW_TABLES:
            rows = table(name)
            self.assertTrue(rows, name)
            for row in rows:
                self.assertEqual(row.get("status"), "unreviewed-proposal", name)

    def test_every_table_has_a_quality_note(self):
        notes = json.load(open(os.path.join(TABLES, "QUALITY.json"), encoding="utf-8"))
        self.assertEqual(set(notes), set(ROW_TABLES))
        for name, note in notes.items():
            self.assertEqual(note["status"], "unreviewed-proposal")
            self.assertIn("review queue", note["quality_note"])
            self.assertEqual(note["independent_sample_first_build"]["links"], 40)
        self.assertEqual(json.load(open(os.path.join(TABLES, "stats.json"), encoding="utf-8"))["status"], "unreviewed-proposal")

    def test_only_the_staff_review_packer_reads_this_folder(self):
        found = subprocess.run(
            ["git", "grep", "-l", "-I", "-e", "corpus/alignment", "-e", "atom_levels", "-e", "edge_agreement", "--", *READERS],
            cwd=A.REPO, capture_output=True, text=True,
        )
        self.assertEqual(set(found.stdout.split()) - {REVIEW_PACKER}, set())
        packer = open(os.path.join(A.REPO, REVIEW_PACKER), encoding="utf-8").read()
        self.assertIn('if (env[REVIEW_FLAG] !== "1" || !existsSync(links)) return EMPTY_REVIEW;', packer)
        self.assertIn('export const REVIEW_FLAG = "BKT_INCLUDE_STAFF_DATA";', packer)

    def test_readme_opens_with_the_status_and_the_independent_sample(self):
        head = open(os.path.join(PACKAGE, "README.md"), encoding="utf-8").read().split("## Files")[0]
        self.assertIn("unreviewed proposal", head)
        self.assertIn("Do not use", head)
        self.assertLess(head.index("Critic"), head.index("Builder"))
        self.assertIn("16, 40% | 13, 32% | 11, 28%", head)


class Resources(unittest.TestCase):
    def test_links_come_from_open_licensed_corpus_rows(self):
        wanted = {row["resource_id"]: row for row in table("atom_resources.jsonl")}
        registry = A.registry_by_host()
        found = 0
        for row in A.read_jsonl(os.path.join(A.CORPUS, "resources.jsonl.zst")):
            link = wanted.get(row["id"])
            if link:
                found += 1
                self.assertEqual((link["url"], link["licence"]), (row["url"], row["licence"]))
                self.assertTrue(A.licence_linkable(row["licence"], registry.get(A.host_of(row["url"]))))
        self.assertEqual(found, len(wanted))

    def test_links_carry_no_text_and_stay_in_the_matched_families(self):
        families = collections.defaultdict(set)
        for row in table("alignments.jsonl"):
            if row["match"] in A.LEVEL_MATCHES and row["cip"]:
                families[row["atom"]].add(A.cip_family(row["cip"]))
        per_atom = collections.Counter()
        for row in table("atom_resources.jsonl"):
            self.assertEqual(set(row), RESOURCE_KEYS)
            per_atom[row["atom"]] += 1
            family = A.cip_family(row["cip"])
            self.assertTrue(any(family.startswith(f) or f.startswith(family) for f in families[row["atom"]]))
            self.assertGreaterEqual(row["score"], A.thresholds()["threshold"])
        self.assertLessEqual(max(per_atom.values()), 5)


class Derived(unittest.TestCase):
    def test_derived_tables_rebuild_from_the_committed_alignments(self):
        with tempfile.TemporaryDirectory() as out:
            subprocess.run([sys.executable, os.path.join(PACKAGE, "build", "derive.py"), "--out", out], check=True)
            for name in DERIVED:
                self.assertTrue(filecmp.cmp(os.path.join(out, name), os.path.join(TABLES, name), shallow=False), name)

    def test_one_level_row_per_atom_on_the_nine_level_scale(self):
        rows = table("atom_levels.jsonl")
        self.assertEqual([row["atom"] for row in rows], [atom["atom"] for atom in atoms()])
        for row in rows:
            self.assertIn(row["level"], A.LEVELS + [None])
            if row["level"]:
                self.assertLessEqual(A.LEVEL_RANK[row["level_first"]], A.LEVEL_RANK[row["level"]])
                self.assertLessEqual(A.LEVEL_RANK[row["level"]], A.LEVEL_RANK[row["level_last"]])
                self.assertEqual(row["spread"], A.LEVEL_RANK[row["level_last"]] - A.LEVEL_RANK[row["level_first"]])

    def test_edge_report_covers_the_820_deck_edges(self):
        rows = table("edge_agreement.jsonl")
        want = {(f"atom:{a['deck']}/{r}", a["atom"]) for a in atoms() for r in a["requires"]}
        self.assertEqual(len(rows), 820)
        self.assertEqual({(row["prerequisite"], row["dependent"]) for row in rows}, want)
        for row in rows:
            self.assertNotIn("verdict", row)
            self.assertIn(row["queue"], {"review-first", "review-second", "review-later", "no-corpus-path"})
            self.assertEqual(row["queue"], A.edge_queue(row["forward_pairs"], row["reverse_pairs"]))

    def test_edge_examples_are_stated_corpus_paths(self):
        forward = A.stated_edges()
        for row in table("edge_agreement.jsonl"):
            for before, after in row["forward_examples"] + row["reverse_examples"]:
                self.assertIn(after, A.reachable(forward, before))

    def test_career_codes_exist_in_the_backbone(self):
        cip, soc = set(), set()
        for row in A.read_jsonl(os.path.join(A.CORPUS, "backbone_codes.jsonl")):
            (cip if row["scheme"] == "cip2020" else soc).add(row["code"])
        for row in table("atom_careers.jsonl"):
            for family in row["cip_families"]:
                self.assertIn(family["cip"], cip)
            for group in row["soc_minor_groups"]:
                self.assertIn(group["soc"], soc)

    def test_gap_families_hold_no_aligned_atom(self):
        covered = {A.cip_family(r["cip"]) for r in table("alignments.jsonl") if r["match"] in A.LEVEL_MATCHES and r["cip"]}
        families = [row for row in table("gaps.jsonl") if row["kind"] == "family"]
        self.assertTrue(families)
        self.assertFalse({row["cip_family"] for row in families} & covered)
        count = list(range(1, len(families) + 1))
        self.assertEqual([row["rank_rows"] for row in families], count)
        self.assertEqual(sorted(row["rank_share_of_field"] for row in families), count)
        self.assertEqual([row["rows"] for row in families], sorted((row["rows"] for row in families), reverse=True))
        by_share = sorted(families, key=lambda row: row["rank_share_of_field"])
        self.assertEqual([r["share_of_field"] for r in by_share], sorted((r["share_of_field"] for r in by_share), reverse=True))
        for row in families:
            self.assertTrue(0 < row["share_of_field"] <= 1)


class Review(unittest.TestCase):
    def test_sample_holds_60_judged_rows_across_decks_and_bands(self):
        rows = list(A.read_jsonl(os.path.join(PACKAGE, "review", "sample-60.jsonl")))
        self.assertEqual(len(rows), 60)
        self.assertEqual(collections.Counter(row["band"] for row in rows).most_common(1)[0][1], 10)
        self.assertEqual(len({row["atom"].split("/")[0] for row in rows}), 8)
        for row in rows:
            self.assertIn(row["judgement"], {"right", "partly", "wrong"})
            self.assertEqual(row["judged_by"], "agent")

    def test_thresholds_cut_the_wrong_rate_in_the_sample(self):
        limits = A.thresholds()
        rows = list(A.read_jsonl(os.path.join(PACKAGE, "review", "sample-60.jsonl")))
        kept = [row for row in rows if A.accepts(row["score"], row["row_level"], limits)]
        dropped = [row for row in rows if not A.accepts(row["score"], row["row_level"], limits)]
        wrong = lambda group: sum(1 for row in group if row["judgement"] == "wrong") / len(group)
        self.assertLess(wrong(kept), 0.15)
        self.assertGreater(wrong(dropped), 0.5)

    def test_blind_sample_holds_five_links_per_deck_judged_without_scores(self):
        rows = list(A.read_jsonl(os.path.join(PACKAGE, "review", "blind-40.jsonl")))
        self.assertEqual(len(rows), 40)
        self.assertEqual(set(collections.Counter(row["atom"].split("/")[0] for row in rows).values()), {5})
        links = {(row["atom"], row["progression_id"]) for row in table("alignments.jsonl")}
        for row in rows:
            self.assertIs(row["blind_to_score"], True)
            self.assertIn(row["judgement"], {"right", "partly", "wrong"})
            self.assertIn((row["atom"], row["progression_id"]), links)

    def test_readme_states_the_counts_in_stats(self):
        stats = json.load(open(os.path.join(TABLES, "stats.json"), encoding="utf-8"))
        readme = open(os.path.join(PACKAGE, "README.md"), encoding="utf-8").read()
        for deck, counts in stats["decks"].items():
            self.assertIn(f"| {deck} | {counts['atoms']} | {counts['matched']} | {counts['unmatched']} |", readme)
        edges = stats["edges"]["all"]
        self.assertIn(f"| All | {edges['review-first']} | {edges['review-second']} | {edges['review-later']} | {edges['no-corpus-path']} |", readme)
        blind = stats["blind_tightened"]
        self.assertIn(f"| 40 | {blind['right']}, 40% | {blind['partly']}, 45% | {blind['wrong']}, 15% |", readme)


if __name__ == "__main__":
    unittest.main()
