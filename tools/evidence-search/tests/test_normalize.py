"""The Python side of nfc-lf/1 against the fixtures the TypeScript side also reads."""

import json
import unittest
from pathlib import Path

from evidence_search.normalize import NORMALIZATION, OffsetError, byte_slice, char_to_byte, normalize_text, sha256_hex

FIXTURES = Path(__file__).resolve().parents[3] / "src" / "lib" / "research-os" / "evidence" / "normalization-fixtures.json"


class NormalizeFixtures(unittest.TestCase):
    def setUp(self):
        self.fx = json.loads(FIXTURES.read_text(encoding="utf-8"))

    def test_name_matches(self):
        self.assertEqual(self.fx["normalization"], NORMALIZATION)

    def test_every_case(self):
        self.assertEqual(len(self.fx["cases"]), 8)
        for c in self.fx["cases"]:
            with self.subTest(c["name"]):
                n = normalize_text(c["raw"])
                self.assertEqual(n, c["normalized"])
                self.assertEqual(len(n.encode("utf-8")), c["bytes"])
                self.assertEqual(sha256_hex(c["raw"]), c["originalSha256"])
                self.assertEqual(sha256_hex(n), c["normalizedSha256"])
                for s in c["spans"]:
                    self.assertEqual(byte_slice(n, s["start"], s["end"]), s["text"])

    def test_split_offsets_are_refused(self):
        checked = 0
        for c in self.fx["cases"]:
            for off in c["insideCharacter"]:
                with self.assertRaises(OffsetError):
                    byte_slice(c["normalized"], off, c["bytes"])
                with self.assertRaises(OffsetError):
                    byte_slice(c["normalized"], 0, off)
                checked += 1
        self.assertGreaterEqual(checked, 10)

    def test_bounds(self):
        for start, end in [(2, 1), (0, 4), (-1, 2)]:
            with self.assertRaises(OffsetError):
                byte_slice("abc", start, end)
        self.assertEqual(byte_slice("abc", 3, 3), "")
        self.assertEqual(char_to_byte("a\U0001F324b", 2), 5)


if __name__ == "__main__":
    unittest.main()
