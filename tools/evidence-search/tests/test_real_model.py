import json
import os
import unittest
from pathlib import Path
from unittest import mock

import numpy as np

from evidence_search import registry
from evidence_search.registry import model_entry, verify_model, verify_runtime

FIXTURES = Path(__file__).resolve().parent / "paraphrase-fixtures.json"
_, ENTRY = model_entry()
CACHED = not verify_model(ENTRY)
if os.environ.get("EVIDENCE_REQUIRE_MODEL") == "1" and not CACHED:
    raise RuntimeError("EVIDENCE_REQUIRE_MODEL=1 and the pinned model is not cached: " + "; ".join(verify_model(ENTRY)))

@unittest.skipUnless(CACHED, "the pinned model is not cached here")
class RealModel(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from evidence_search.encoder import Encoder

        cls.enc = Encoder()

    def test_runtime_matches_the_lock(self):
        self.assertEqual(verify_runtime(), [])

    def test_a_query_embedding_is_a_deterministic_unit_vector(self):
        a = self.enc.encode_query("why does the daytime sky look blue")
        b = self.enc.encode_query("why does the daytime sky look blue")
        self.assertEqual(a.shape, (384,))
        self.assertAlmostEqual(float(np.linalg.norm(a)), 1.0, places=5)
        np.testing.assert_allclose(a, b, atol=1e-6)

    def test_paraphrases_rank_a_relevant_source_first_where_keywords_do_not(self):
        f = json.loads(FIXTURES.read_text(encoding="utf-8"))
        ids = [d["id"] for d in f["docs"]]
        matrix = self.enc.encode([d["text"] for d in f["docs"]])
        changed = 0
        for q in f["queries"]:
            with self.subTest(q["query"]):
                scores = matrix @ self.enc.encode_query(q["query"])
                top = ids[int(np.argmax(scores))]
                self.assertIn(top, q["relevant"])
                if q["lexicalTop"] not in q["relevant"]:
                    self.assertNotEqual(top, q["lexicalTop"])
                    changed += 1
        self.assertGreaterEqual(changed, 1, "the fixtures hold a query keyword search gets wrong")

    def test_a_changed_file_stops_the_encoder(self):
        from evidence_search.encoder import Encoder, ModelUnavailable

        reg = registry.load_models()
        bad = json.loads(json.dumps(reg))
        bad["models"][reg["default"]]["files"]["tokenizer.json"] = "0" * 64
        with mock.patch.object(registry, "load_models", return_value=bad):
            with self.assertRaises(ModelUnavailable):
                Encoder()

if __name__ == "__main__":
    unittest.main()
