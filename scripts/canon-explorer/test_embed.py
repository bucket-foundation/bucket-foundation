import json
import pathlib
import sys
import unittest

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import embed  # noqa: E402


class RankFromStoredVectors(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads(embed.OUT_JSON.read_text())
        self.vecs = embed.load_vectors(self.manifest)

    def test_rank_recomputes_from_bin(self):
        order = embed.rank_order(self.vecs.astype(np.float64))
        ranks = [0] * len(order)
        for r, idx in enumerate(order):
            ranks[idx] = r
        self.assertEqual(ranks, [it["rank"] for it in self.manifest["items"]])

    def test_rank_version_matches_source(self):
        self.assertEqual(self.manifest["rank_version"], embed.RANK_VERSION)
        self.assertEqual(self.manifest["rankSourceSha256"], embed.rank_source_sha())

    def test_inputs_unchanged(self):
        self.assertEqual(self.manifest["inputSha256"], embed.input_sha(embed.load_items()))


if __name__ == "__main__":
    unittest.main()
