import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fill_thin_langs import better_gloss

ATHNA = [
    {"word": "أثناء", "pos": "noun", "senses": [{"glosses": ["plural of ثِنْي (ṯiny, “duplication; a single repetition of a thing; time”)"], "form_of": [{"word": "ثِنْي"}]}]},
    {"word": "أثناء", "pos": "prep", "senses": [{"glosses": ["during, in the course of"]}]},
]
AHAR = [{"word": "אחר־כך", "pos": "adv", "senses": [{"glosses": ["alternative form of אַחַר כָּךְ"], "form_of": [{"word": "אַחַר כָּךְ"}]}]}]
LEMMAS = {("he", "אחר כך"): [{"word": "אחר כך", "pos": "adv", "forms": [{"form": "אַחַר כָּךְ", "tags": ["canonical"]}],
                              "senses": [{"glosses": ["After, afterward, afterwards, later."]}]}]}
BOOKS = [{"word": "كتب", "pos": "noun", "senses": [{"glosses": ["plural of كِتَاب (kitāb, “book”)"]}]}]


def row(lang, word, pos, gloss):
    return ["id", lang, word, gloss, pos]


NAMES = [{"word": "أسماء", "pos": "noun", "senses": [{"glosses": ["plural of اِسْم (ism, “name”)"]}]},
         {"word": "أسماء", "pos": "name", "senses": [{"glosses": ["a female given name, Asma"]}]}]
PLURAL = [{"word": "גויים", "pos": "noun", "senses": [{"glosses": ["plural indefinite form of גּוֹי (goi)"], "form_of": [{"word": "גוי"}]}]}]
GOY = {("he", "גוי"): [{"word": "גוי", "pos": "noun", "senses": [{"glosses": ["A nation."]}]}]}


class ThinGlossTest(unittest.TestCase):
    def test_a_name_homograph_does_not_replace_the_plural(self):
        r = row("ar", "أسماء", "noun", NAMES[0]["senses"][0]["glosses"][0])
        self.assertEqual(better_gloss(r, {"entries": NAMES}, {}, {}, {}), ("name (plural)", "wiktionary-quoted"))

    def test_function_word_row_keeps_its_derived_sense(self):
        bi = [{"word": "בי", "pos": "prep", "senses": [{"glosses": ["Form of בְּ־ including first-person singular personal pronoun as object"], "form_of": [{"word": "ב"}]}]},
              {"word": "בי", "pos": "particle", "senses": [{"glosses": ["please"]}]}]
        lemmas = {}
        r = row("he", "בי", "prep", bi[0]["senses"][0]["glosses"][0])
        self.assertIsNone(better_gloss(r, {"entries": bi}, lemmas, {}, {}))

    def test_verb_and_adjective_rows_keep_their_own_meaning(self):
        for word, pos, gloss, lemma, meaning in (("בשל", "verb", "defective spelling of בישל", "בישל", "To cook: to prepare (food) for eating."),
                                                  ("הנה", "verb", "defective spelling of הינה", "הינה", "to cause enjoyment")):
            entries = [{"word": word, "pos": pos, "senses": [{"glosses": [gloss], "form_of": [{"word": lemma}]}]},
                       {"word": word, "pos": "prep", "senses": [{"glosses": ["Because of, here is"]}]}]
            lemmas = {("he", lemma): [{"word": lemma, "pos": pos, "senses": [{"glosses": [meaning]}]}]}
            got = better_gloss(row("he", word, pos, gloss), {"entries": entries}, lemmas, {}, {})
            self.assertEqual(got, (f"{meaning} ({gloss})", "wiktionary-lemma"))

    def test_inflection_carries_no_variant_note(self):
        r = row("he", "גויים", "noun", PLURAL[0]["senses"][0]["glosses"][0])
        self.assertEqual(better_gloss(r, {"entries": PLURAL}, GOY, {}, {})[0], "A nation. (plural)")

    def test_own_sense_of_the_spelling_wins_over_a_derived_plural(self):
        r = row("ar", "أثناء", "noun", ATHNA[0]["senses"][0]["glosses"][0])
        self.assertEqual(better_gloss(r, {"entries": ATHNA}, {}, {}, {}), ("during, in the course of", "wiktionary-sense"))

    def test_quoted_plural_kept_when_no_own_sense(self):
        r = row("ar", "كتب", "noun", BOOKS[0]["senses"][0]["glosses"][0])
        self.assertEqual(better_gloss(r, {"entries": BOOKS}, {}, {}, {}), ("book (plural)", "wiktionary-quoted"))

    def test_alternative_form_keeps_its_note(self):
        r = row("he", "אחר־כך", "adv", AHAR[0]["senses"][0]["glosses"][0])
        g, src = better_gloss(r, {"entries": AHAR}, LEMMAS, {}, {})
        self.assertEqual(g, "After, afterward, afterwards, later. (alternative form of אַחַר כָּךְ)")
        self.assertEqual(src, "wiktionary-lemma")


if __name__ == "__main__":
    unittest.main()
