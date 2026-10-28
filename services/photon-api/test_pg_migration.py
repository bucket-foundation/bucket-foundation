import os
import re
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))

class PgMigrationTest(unittest.TestCase):
    def test_ipa_index_matches_query_expression(self):
        src = open(os.path.join(HERE, "server_pg.py"), encoding="utf-8").read()
        strip = re.search(r'^IPA_STRIP = "(.*)"$', src, re.M).group(1)
        expr = f"translate(coalesce(ipa,''), '{strip}', '')"
        sql = open(os.path.join(HERE, "migrations", "001_search_indexes.sql"), encoding="utf-8").read()
        self.assertIn(f"(({expr}) gin_trgm_ops)", sql)
        self.assertIn("lower(meaning_en) gin_trgm_ops", sql)
        self.assertNotIn("CREATE INDEX IF", sql)
        self.assertNotIn("on_event(\"startup\")", src)

if __name__ == "__main__":
    unittest.main()
