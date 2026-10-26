import json
import re
import unittest
import sqlite3
import sys
from unittest import mock
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import top_words  # noqa: E402
from top_words import junk_sense, majority_pos, replaceable  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "learning/app/polingual"
LEVELS = {"A1", "A2", "B1"}


def codes() -> list[str]:
    src = (ROOT / "src/lib/research-os/work-quiz/languages.ts").read_text()
    block = src.split("LANGUAGE_NAMES")[1].split("};")[0]
    return sorted(set(re.findall(r"^\s+([a-z]{2}):", block, re.M)))


def replaced(meaning: str, pos: str, senses: list[dict], pos_counts: dict[str, int], pins: dict | None = None) -> dict:
    db = sqlite3.connect(":memory:")
    db.execute("create table photons(surface, meaning_en, pos, ipa, payload, lang)")
    payload = json.dumps({"coreness": {"zipf": 5, "score": 1}, "senses": senses})
    db.execute("insert into photons values ('casa', ?, ?, '', ?, 'xx')", (meaning, pos, payload))
    with mock.patch.object(top_words, "PINS", pins or {}):
        return top_words.rank_index(db, "xx", 10, {("xx", "casa"): {"house": 500.0}}, {("xx", "casa"): pos_counts})[0]


class ReplacementRuleTest(unittest.TestCase):
    def test_replaces_when_majority_pos_agrees(self):
        row = replaced("dung", "verb", [{"gloss": "dung", "pos": "verb"}, {"gloss": "house", "pos": "noun"}], {"noun": 4, "verb": 1})
        self.assertEqual((row["meaning"], row["pos"]), ("house", "noun"))

    def test_refuses_on_pos_mismatch(self):
        row = replaced("dung", "noun", [{"gloss": "dung", "pos": "noun"}, {"gloss": "house", "pos": "adj"}], {"noun": 4})
        self.assertEqual((row["meaning"], row["pos"]), ("dung", "noun"))

    def test_skips_junk_senses(self):
        senses = [{"gloss": "dung", "pos": "noun"}, {"gloss": "house", "pos": "noun", "tags": ["archaic"]}]
        self.assertEqual(replaced("dung", "noun", senses, {"noun": 4})["meaning"], "dung")

    def test_pin_overrides_agreement(self):
        senses = [{"gloss": "dung", "pos": "noun"}, {"gloss": "house", "pos": "noun"}]
        row = replaced("dung", "noun", senses, {"noun": 4}, {("xx", "casa"): "home"})
        self.assertEqual((row["meaning"], row["pos"]), ("home", "noun"))


class CorpusTest(unittest.TestCase):
    def test_lists_pass_the_word_qa(self):
        import sys
        sys.path.insert(0, str(ROOT / "scripts/polingual"))
        from wordlist_qa import audit, defects
        for lang in codes():
            words = json.loads((DATA / f"top1000/{lang}.json").read_text())
            self.assertEqual(audit(lang, words)["full_list_flagged"], 0, lang)
        self.assertEqual(defects({"word": "kann", "meaning": "first/third-person singular present of können", "pos": "verb"}, "de"), ["gloss"])
        self.assertIn("proper", defects({"word": "Eind", "meaning": "a hamlet in Leudal, Limburg; a village", "pos": "noun"}, "nl"))
        self.assertIn("junk", defects({"word": "16-mal", "meaning": "sixteen times", "pos": "adv"}, "de"))

    def test_every_language_has_1000_tagged_words(self):
        for lang in codes():
            words = json.loads((DATA / f"top1000/{lang}.json").read_text())
            self.assertEqual(len(words), 1000, lang)
            self.assertEqual([w["rank"] for w in words], list(range(1, 1001)), lang)
            self.assertTrue(all(w["band"] in LEVELS and w["meaning"] for w in words), lang)

    def test_word_sources_are_recorded(self):
        index = json.loads((DATA / "top1000/index.json").read_text())
        for lang in codes():
            self.assertIn("license", index[lang]["frequency_source"], lang)

    def test_phrases_are_attributed(self):
        for lang in codes():
            phrases = json.loads((DATA / f"phrases/{lang}.json").read_text())
            self.assertGreaterEqual(len(phrases), 200, lang)
            for p in phrases:
                self.assertIn(p["band"], LEVELS)
                self.assertTrue(p["url"].startswith("https://") and p["license"] and p["author"] and p["english"], lang)

    def test_punjabi_deck_overrides_hold(self):
        subset = json.loads((DATA / "subset.json").read_text())
        pa = {w["c"]: w for w in subset["words"] if w["l"] == "pa"}
        self.assertEqual(pa["mouth"]["s"], "ਮੂੰਹ")
        self.assertNotIn("ਵਾਕ", {w["s"] for w in pa.values()})
        self.assertNotIn("young", pa)

    def test_every_punjabi_match_is_reviewed(self):
        subset = json.loads((DATA / "subset.json").read_text())
        rows = [line.split("\t") for line in (DATA / "sources/pa_review.tsv").read_text(encoding="utf-8").splitlines()[1:]]
        reviewed = {(r[0], r[1]) for r in rows if r[2] == "ok" and r[4]}
        shipped = {(w["c"], w["s"]) for w in subset["words"] if w["l"] == "pa"}
        self.assertEqual(shipped - reviewed, set())

    def test_gloss_pins_hold(self):
        rows = [line.split("\t") for line in (DATA / "sources/gloss_pins.tsv").read_text(encoding="utf-8").splitlines()[1:] if line]
        for lang, word, gloss in rows:
            words = {w["word"]: w["meaning"] for w in json.loads((DATA / f"top1000/{lang}.json").read_text())}
            if word in words:
                self.assertEqual(words[word], gloss, f"{lang} {word}")

    def test_replacement_matches_pos(self):
        senses = [{"gloss": "cousin", "pos": "noun"}, {"gloss": "first", "pos": "adj"}, {"gloss": "prime number", "pos": "noun"}]
        self.assertEqual(replaceable(senses, "noun"), ["cousin", "prime number"])
        self.assertEqual(replaceable(senses, "adj"), ["first"])

    def test_junk_senses_are_filtered(self):
        for sense in [{"gloss": "defective spelling of x", "pos": "noun"}, {"gloss": "Eye dialect spelling of was", "pos": "noun"}, {"gloss": "horse", "pos": "noun", "tags": ["obsolete"]}, {"gloss": "steed", "pos": "noun", "tags": ["archaic"]}]:
            self.assertTrue(junk_sense(sense), sense)
        self.assertFalse(junk_sense({"gloss": "horse", "pos": "noun", "tags": ["masculine"]}))
        self.assertEqual(replaceable([{"gloss": "thou", "pos": "noun", "tags": ["archaic"]}, {"gloss": "you", "pos": "noun"}], "noun"), ["you"])

    def test_majority_pos(self):
        self.assertEqual(majority_pos({"noun": 5, "adj": 2}, "adj"), "noun")
        self.assertEqual(majority_pos({}, "verb"), "verb")

    def test_majority_pos_tie(self):
        self.assertEqual(majority_pos({"noun": 3, "verb": 3}, "verb"), "verb")
        self.assertEqual(majority_pos({"noun": 3, "verb": 3}, "adj"), "noun")

    def test_replaced_gloss_takes_majority_pos(self):
        words = {w["word"]: w for w in json.loads((DATA / "top1000/ar.json").read_text())}
        self.assertEqual((words["غني"]["meaning"], words["غني"]["pos"]), ("rich, wealthy", "adj"))

    def test_punjabi_is_gurmukhi(self):
        words = json.loads((DATA / "top1000/pa.json").read_text())
        self.assertTrue(all(re.fullmatch(r"[਀-੿]+", w["word"]) for w in words))


if __name__ == "__main__":
    unittest.main()
