import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gloss_pins import apply_pin, load_pins  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "learning/app/polingual/top1000/ar.json"
APPLE = ROOT / "apple/Shared/Corpus/top1000/ar.json"


def rows(path: Path) -> dict[str, dict]:
    return {w["word"]: w for w in json.loads(path.read_text(encoding="utf-8"))}


class GlossPinTest(unittest.TestCase):
    def test_pin_file_reads_optional_pos_and_ipa(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "pins.tsv"
            p.write_text("lang\tword\tgloss\tpos\tipa\nfr\tvoix\tvoice\nar\tفقط\tonly\tadv\t/fa.qatˤ/\n", encoding="utf-8")
            pins = load_pins(p)
        self.assertEqual(pins[("fr", "voix")], {"meaning": "voice"})
        self.assertEqual(pins[("ar", "فقط")], {"meaning": "only", "pos": "adv", "ipa": "/fa.qatˤ/"})

    def test_regenerated_arabic_rows_match_shipped(self):
        pins = {w: p for (lang, w), p in load_pins().items() if lang == "ar"}
        self.assertGreaterEqual(len(pins), 80)
        for path, with_pos in ((WEB, True), (APPLE, False)):
            shipped = rows(path)
            for word, pin in pins.items():
                stale = {**shipped[word], "meaning": "to be wrong"}
                if with_pos and "pos" in pin:
                    stale["pos"] = "noun"
                if "ipa" in pin:
                    stale["ipa"] = "/x/"
                self.assertEqual(apply_pin(stale, pin, with_pos), shipped[word], f"{path.name} {word}")

    def test_common_arabic_words_keep_their_common_meaning(self):
        expected = {"فقط": "only", "أكثر": "more, most", "أفضل": "better, best", "مش": "not (colloquial)", "حار": "hot, spicy"}
        for path in (WEB, APPLE):
            shipped = rows(path)
            for word, meaning in expected.items():
                self.assertEqual(shipped[word]["meaning"], meaning, f"{path.name} {word}")


if __name__ == "__main__":
    unittest.main()
