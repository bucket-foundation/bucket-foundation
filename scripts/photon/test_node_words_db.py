import os
import subprocess
import sys
import unittest
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "research-os"))

import node_words as nw

DB_URL = os.environ.get("NODE_WORDS_DB_URL", nw.DEFAULT_DB_URL)
REQUIRE = os.environ.get("RESEARCH_OS_REQUIRE_DB") == "1"

def psql(sql):
    return subprocess.run(["psql", DB_URL, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], check=True, capture_output=True, text=True).stdout.strip()

def reachable():
    try:
        psql("select 1 from graph.node_words limit 1")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def row(node_id, lang, word, confidence=0.9):
    return {
        "node_id": node_id, "lang": lang, "word": word, "roman": "", "gloss": "light", "root_lang": "ine-pro",
        "root_form": "*lewk-", "root_gloss": "to shine", "chain": [{"lang": "ine-pro", "form": "*lewk-", "rel": "der", "gloss": "to shine"}],
        "root_texts": [], "source": nw.SOURCE, "en_term": "light", "sense": "visible light", "confidence": confidence,
        "root_confidence": confidence, "root_source": "wiktionary",
    }

class WriteRowsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not reachable():
            if REQUIRE:
                raise RuntimeError(f"graph.node_words is not reachable at {DB_URL}")
            raise unittest.SkipTest("no local database with graph.node_words")
        slug = "test-node-words-" + uuid.uuid4().hex[:12]
        cls.node_id = psql(f"insert into graph.nodes (slug, title, kind, branch) values ('{slug}', 'Light', 'concept', '02-physics') returning id").splitlines()[0]

    @classmethod
    def tearDownClass(cls):
        psql(f"delete from graph.nodes where id = '{cls.node_id}'")

    def count(self):
        return int(psql(f"select count(*) from graph.node_words where node_id = '{self.node_id}'"))

    def test_writing_twice_leaves_one_copy(self):
        rows = [row(self.node_id, "en", "light"), row(self.node_id, "la", "lūx", 0.6)]
        nw.write_rows(DB_URL, rows, [self.node_id])
        nw.write_rows(DB_URL, rows, [self.node_id])
        self.assertEqual(self.count(), 2)
        self.assertEqual(psql(f"select confidence from graph.node_words where node_id = '{self.node_id}' and lang = 'la'"), "0.6")

    def test_a_rerun_replaces_rows_that_went_away(self):
        nw.write_rows(DB_URL, [row(self.node_id, "en", "light"), row(self.node_id, "de", "Licht")], [self.node_id])
        nw.write_rows(DB_URL, [row(self.node_id, "en", "light")], [self.node_id])
        self.assertEqual(psql(f"select string_agg(lang, ',' order by lang) from graph.node_words where node_id = '{self.node_id}'"), "en")

    def test_a_malformed_node_id_is_refused_before_any_sql(self):
        with self.assertRaises(ValueError):
            nw.write_rows(DB_URL, [], ["x') or true --"])

    def test_hebrew_bible_verses_round_trip_as_jsonb(self):
        he = dict(row(self.node_id, "he", "אור"), root_lang="he", root_form="א־ו־ר", root_texts=[{
            "corpus": "Hebrew Bible", "source": "Original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb",
            "root": "א־ו־ר", "count": 179, "samples": [{"ref": "Genesis 1:3", "text": "וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר"}],
        }])
        nw.write_rows(DB_URL, [he], [self.node_id])
        got = psql(f"select root_texts->0->>'corpus', root_texts->0->'samples'->0->>'text' from graph.node_words where node_id = '{self.node_id}' and lang = 'he'")
        self.assertEqual(got, "Hebrew Bible|וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר")

if __name__ == "__main__":
    unittest.main()
