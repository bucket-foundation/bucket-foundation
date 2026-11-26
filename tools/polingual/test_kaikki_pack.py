import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "polingual" / "scripts"))

import kaikki_pack as kp

ENTRIES = [
    {"word": "ਪਾਣੀ", "pos": "noun", "sounds": [{"ipa": "/pɑːɳiː/"}], "senses": [{"glosses": ["water"]}, {"glosses": ["liquid", "fluid"]}],
     "forms": [{"form": "ਪਾਣੀਆਂ", "tags": ["plural"]}, {"form": "pāṇī", "tags": ["romanization"]}, {"form": "ਪਾਣੀ", "tags": ["canonical"]}]},
    {"word": "pāṇī", "pos": "romanization", "senses": [{"glosses": ["romanization of ਪਾਣੀ"]}]},
    {"word": "ਘਰ", "pos": "noun", "senses": [{"glosses": ["house"]}], "forms": [{"form": "ਪਾਣੀ", "tags": ["oblique"]}]},
    {"word": "ਜਾ", "pos": "verb", "senses": [{"glosses": ["go"]}], "forms": [{"form": "ਗਿਆ", "tags": ["past"]}]},
    {"word": "ਗਿਆਨ", "pos": "noun", "senses": [{"glosses": ["knowledge"]}], "forms": [{"form": "ਗਿਆ", "tags": ["oblique"]}]},
    {"word": "ਬਿਨਾ", "pos": "postp", "senses": [{}]},
]


class KaikkiPackTest(unittest.TestCase):
    def rows(self):
        with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False, encoding="utf-8") as fh:
            fh.write("\n".join(json.dumps(e, ensure_ascii=False) for e in ENTRIES))
        return kp.kaikki_rows(fh.name)

    def test_lemmas_and_forms(self):
        rows = {r[0]: r for r in self.rows()}
        self.assertEqual(rows["ਪਾਣੀ"][3], "water · fluid")
        self.assertEqual(rows["ਪਾਣੀ"][1], "/pɑːɳiː/")
        self.assertEqual(rows["ਪਾਣੀਆਂ"][3], "inflection of ਪਾਣੀ")
        self.assertNotIn("pāṇī", rows)
        self.assertNotIn("ਬਿਨਾ", rows)
        self.assertEqual(len([r for r in self.rows() if r[0] == "ਪਾਣੀ"]), 1)

    def test_shared_form_is_one_row_naming_every_lemma(self):
        shared = [r for r in self.rows() if r[0] == "ਗਿਆ"]
        self.assertEqual(len(shared), 1)
        self.assertEqual(shared[0][3], "inflection of ਜਾ · inflection of ਗਿਆਨ")

    def test_form_row_maps_to_its_lemma(self):
        import input_bundle as ib
        rows = {r[0]: r for r in self.rows()}
        for vocab in (ib.FORM_WORDS, ib.FORM_WORDS | ib.WIDE_FORM_WORDS):
            self.assertEqual(ib.lemma_of_meaning(rows["ਪਾਣੀਆਂ"][3], vocab), "ਪਾਣੀ")
        self.assertEqual([ib.lemma_of_meaning(m) for m in rows["ਗਿਆ"][3].split(" · ")], ["ਜਾ", "ਗਿਆਨ"])

    def test_merge_keeps_old_surfaces(self):
        old = [("ਪਾਣੀ", "", "noun", "old water", "functional", "word", None)]
        merged = kp.merge(old, self.rows())
        self.assertEqual(merged[0][3], "old water")
        self.assertEqual(sum(r[0] == "ਪਾਣੀ" for r in merged), 1)
        self.assertIn("ਘਰ", {r[0] for r in merged})


if __name__ == "__main__":
    unittest.main()
