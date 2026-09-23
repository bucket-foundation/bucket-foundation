import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest
import uuid
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "photon"))

import node_words as nw  # noqa: E402
import roots_extract  # noqa: E402
import nsm_exponents as nsm  # noqa: E402
import nsm_spotcheck as spot  # noqa: E402

DB_URL = os.environ.get("RESEARCH_OS_TEST_DATABASE_URL", nw.DEFAULT_DB_URL)
TRANSLATIONS = [
    ("see", "verb", "perceive with the eyes", -1, "la", "videre", ""),
    ("see", "verb", "perceive with the eyes", -1, "la", "cernere", ""),
    ("see", "verb", "perceive with the eyes", -1, "la", "spectare", ""),
    ("see", "verb", "perceive with the eyes", -1, "de", "sehen", ""),
    ("see", "verb", "perceive with the eyes", 2, "ru", "видеть", "videtʹ"),
    ("see", "verb", "understand", 4, "la", "intellegere", ""),
    ("see", "verb", "understand", 4, "de", "verstehen", ""),
    ("see", "verb", "understand", 4, "ru", "понимать", "ponimatʹ"),
    ("see", "verb", "understand", 4, "fr", "comprendre", ""),
    ("see", "noun", "diocese", 0, "la", "dioecesis", ""),
    ("see", "verb", "perceive with the eyes", -1, "xx", "zzz", ""),
]
PRIME = {"id": "see", "label": "SEE", "category": "mental predicates", "english": ["see"],
         "sense": {"en_word": "see", "en_pos": "verb", "gloss_pattern": "perceive with the eyes"}}


def fixture():
    fd, path = tempfile.mkstemp(suffix=".sqlite")
    os.close(fd)
    db = sqlite3.connect(path)
    db.executescript(roots_extract.SCHEMA)
    db.executemany("insert into translation (en_word, en_pos, sense, sense_idx, lang, word, roman) values (?,?,?,?,?,?,?)", TRANSLATIONS)
    db.executemany("insert into word (lang, word, pos, ety, gloss, roman) values (?,?,?,0,?,?)", [
        ("la", "videre", "verb", "to see", ""), ("de", "sehen", "verb", "to see", ""), ("ru", "видеть", "verb", "to see", "videtʹ"),
        ("en", "see", "verb", "to perceive with the eyes", ""), ("fr", "comprendre", "verb", "to understand", ""),
    ])
    db.executemany("insert into etym (lang, word, rel, anc_lang, anc_form, anc_gloss, ord, ety) values (?,?,?,?,?,?,?,0)", [
        ("la", "videre", "inh", "itc-pro", "*weidēō", "", 0), ("la", "videre", "inh", "ine-pro", "*weyd-", "to see", 1),
    ])
    db.commit()
    db.close()
    return path


class SenseSelection(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = fixture()
        cls.db = nw.Roots(cls.path)
        cls.targets = {"la", "de", "ru", "fr", "en"}

    @classmethod
    def tearDownClass(cls):
        cls.db.db.close()
        os.unlink(cls.path)

    def senses(self, pos="verb"):
        return nsm.group_senses(nsm.translation_rows(self.db, "see", pos), self.targets)

    def test_pattern_hit_ignores_sense_idx_sentinel(self):
        chosen, matched = nsm.select_sense(self.senses(), "perceive with the eyes")
        self.assertTrue(matched)
        self.assertEqual(chosen["sense"], "perceive with the eyes")
        self.assertEqual(chosen["langs"], {"la", "de", "ru"})

    def test_fallback_takes_the_sense_with_most_languages(self):
        chosen, matched = nsm.select_sense(self.senses(), "no such gloss")
        self.assertFalse(matched)
        self.assertEqual(chosen["sense"], "understand")

    def test_no_rows_selects_nothing(self):
        self.assertEqual(nsm.select_sense([], "x"), (None, False))

    def test_other_parts_of_speech_and_languages_are_left_out(self):
        senses = self.senses("noun")
        self.assertEqual([s["sense"] for s in senses], ["diocese"])
        self.assertNotIn("xx", {r["lang"] for s in self.senses() for r in s["rows"]})

    def test_two_words_per_language_at_most(self):
        chosen, _m = nsm.select_sense(self.senses(), "perceive with the eyes")
        picks = nsm.pick_words(chosen)
        self.assertEqual([w["word"] for w in picks["la"]], ["videre", "cernere"])

    def test_confidence_by_sense_and_breadth(self):
        self.assertEqual(nsm.confidence_for(True, 30), nsm.MATCHED)
        self.assertEqual(nsm.confidence_for(True, 30, proxy=True), nsm.PROXY)
        self.assertEqual(nsm.confidence_for(False, 30), nsm.FALLBACK)
        self.assertEqual(nsm.confidence_for(False, 3), nsm.THIN_FALLBACK)
        self.assertGreaterEqual(nsm.MATCHED, nsm.UNCERTAIN_BELOW)
        self.assertTrue(nsm.HIDE_BELOW <= nsm.PROXY < nsm.UNCERTAIN_BELOW)
        self.assertLess(nsm.FALLBACK, nsm.HIDE_BELOW)
        self.assertEqual((nsm.HIDE_BELOW, nsm.UNCERTAIN_BELOW), (nw.HIDE_BELOW, nw.UNCERTAIN_BELOW))

    def test_rows_carry_rank_root_and_english(self):
        meta, rows = nsm.prime_rows(PRIME, self.db, self.targets, "run-1")
        self.assertEqual(meta, {"sense": "perceive with the eyes", "sense_match": True, "langs": 3})
        la = [r for r in rows if r["lang"] == "la"]
        self.assertEqual([(r["word"], r["rank"]) for r in la], [("videre", 1), ("cernere", 2)])
        self.assertEqual((la[0]["root_lang"], la[0]["root_form"], la[0]["root_gloss"]), ("ine-pro", "*weyd-", "to see"))
        self.assertEqual(next(r for r in rows if r["lang"] == "ru")["roman"], "videtʹ")
        self.assertEqual([r["word"] for r in rows if r["lang"] == "en"], ["see"])
        self.assertTrue(all(r["confidence"] <= nsm.MATCHED and r["run_id"] == "run-1" for r in rows))
        self.assertEqual(next(r for r in rows if r["lang"] == "en")["confidence"], nsm.MATCHED)

    def test_fallback_rows_are_marked(self):
        prime = dict(PRIME, sense=dict(PRIME["sense"], gloss_pattern="no such gloss"))
        meta, rows = nsm.prime_rows(prime, self.db, self.targets, "run-1")
        self.assertFalse(meta["sense_match"])
        self.assertTrue(rows and all(not r["sense_match"] and r["confidence"] <= nsm.THIN_FALLBACK for r in rows))

    def test_prime_with_no_lookup_has_no_rows(self):
        meta, rows = nsm.prime_rows(dict(PRIME, sense=None), self.db, self.targets, "run-1")
        self.assertEqual((meta["sense_match"], rows), (None, []))

    def test_literals_escape_quotes(self):
        self.assertEqual(nsm.lit("don't"), "'don''t'")
        self.assertEqual(nsm.lit(["a", "b'"]), "array['a','b''']::text[]")
        self.assertEqual(nsm.lit([]), "'{}'::text[]")
        self.assertEqual((nsm.lit(None), nsm.lit(True), nsm.lit(0.6)), ("null", "true", "0.6"))


class Seed(unittest.TestCase):
    def test_the_seed_holds_the_65_primes_of_2014(self):
        seed = nsm.load_seed()
        ids = [p["id"] for p in seed["primes"]]
        self.assertEqual(len(ids), 65)
        self.assertIn("be_someones", ids)
        self.assertNotIn("mine", ids)
        self.assertEqual(len({p["category"] for p in seed["primes"]}), 16)
        self.assertIn("Goddard", seed["citation"])

    def test_every_chart_names_every_prime(self):
        ids = {p["id"] for p in nsm.load_seed()["primes"]}
        with open(spot.CHARTS, encoding="utf-8") as f:
            charts = json.load(f)
        for lang, c in charts["charts"].items():
            self.assertEqual(set(c["exponents"]), ids, lang)


class Spotcheck(unittest.TestCase):
    def test_allolexes_parentheses_and_function_words(self):
        self.assertTrue(spot.matches("moi", "JE~ME~MOI"))
        self.assertTrue(spot.matches("peut-être", "PEUT-ÊTRE (QUE)"))
        self.assertTrue(spot.matches("stesso", "LO STESSO"))
        self.assertTrue(spot.matches("au-dessus de", "AU-DESSUS"))
        self.assertTrue(spot.matches("ne ... pas", "NE…PAS"))
        self.assertTrue(spot.matches("quelqu’un", "QUELQU'UN"))
        self.assertFalse(spot.matches("genre", "TYPE"))
        self.assertFalse(spot.matches("", "TYPE"))


def db_ready():
    if urlparse(DB_URL).hostname not in ("127.0.0.1", "localhost", "::1"):
        return False
    try:
        r = subprocess.run(["psql", DB_URL, "-At", "-c", "select to_regclass('graph.nsm_exponents') is not null"], capture_output=True, text=True, timeout=10)
    except (OSError, subprocess.TimeoutExpired):
        return False
    return r.returncode == 0 and r.stdout.strip() == "t"


@unittest.skipUnless(db_ready() or os.environ.get("RESEARCH_OS_REQUIRE_DB") == "1", "no local stack with graph.nsm_exponents")
class Rerun(unittest.TestCase):
    def psql(self, sql):
        return subprocess.run(["psql", DB_URL, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], capture_output=True, text=True, check=True).stdout.strip()

    def test_rerun_replaces_the_prime_rows(self):
        pid = "zz_test_" + "".join(chr(97 + int(c, 16)) for c in uuid.uuid4().hex[:8])
        prime = {"id": pid, "label": "TEST", "category": "test", "english": ["test"], "sense": None}
        row = {"prime_id": pid, "lang": "la", "word": "videre", "rank": 1, "roman": None, "sense": "s", "sense_match": True,
               "confidence": 0.6, "root_lang": None, "root_form": None, "root_gloss": None, "source": nsm.SOURCE, "run_id": "r1"}
        insert_prime = nsm.prime_sql(prime, 199, {"sense": "s", "sense_match": True})
        try:
            self.psql(insert_prime)
            for run_id, words in (("r1", ["videre", "cernere"]), ("r2", ["videre"])):
                sql = [f"delete from graph.nsm_exponents where prime_id = '{pid}';"]
                for i, w in enumerate(words, start=1):
                    r = dict(row, word=w, rank=i, run_id=run_id)
                    sql.append("insert into graph.nsm_exponents (" + ", ".join(nsm.ROW_COLUMNS) + ") values (" + ", ".join(nsm.lit(r[c]) for c in nsm.ROW_COLUMNS) + ");")
                subprocess.run(["psql", DB_URL, "-q", "-1", "-v", "ON_ERROR_STOP=1", "-f", "-"], input="\n".join(sql), text=True, check=True)
            self.assertEqual(self.psql(f"select string_agg(word || ':' || run_id, ',') from graph.nsm_exponents where prime_id = '{pid}'"), "videre:r2")
            self.psql(insert_prime)
            self.assertEqual(self.psql(f"select count(*) from graph.nsm_primes where id = '{pid}'"), "1")
        finally:
            self.psql(f"delete from graph.nsm_primes where id = '{pid}'")

    def test_loaded_primes_match_the_seed(self):
        n = self.psql("select count(*) from graph.nsm_primes where id not like 'zz_test_%'")
        if n == "0":
            self.skipTest("the loader has not run against this stack")
        self.assertEqual(n, "65")


if __name__ == "__main__":
    unittest.main()
