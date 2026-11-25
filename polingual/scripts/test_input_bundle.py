import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import input_bundle as ib

LEX = {
    "casas": (["plural of casa"], 500),
    "casa": (["house"], 100),
    "est": (["east", "third-person singular present indicative of être"], 1000),
    "être": (["to be"], 1010),
    "mais": (["plural of mai", "but"], 1047),
    "mai": (["May"], 2400),
    "fue": (["third-person singular preterite indicative of ir"], 300),
    "ir": (["to go"], 50),
    "ist": (["third-person singular present of sein"], 150),
    "sein": (["to be", "genitive of er"], 128),
    "er": (["he"], 131),
    "himmel": (["inflection of himmeln:"], 8151),
    "Himmel": (["sky"], 6227),
    "le": (["the"], 10),
    "de": (["of"], 11),
    "aujourd'hui": (["today"], 400),
    "homme": (["man"], 90),
    "chamo": (["first-person singular present indicative of chamar"], None),
    "chamar": (["to call"], None),
    "me": (["me"], 20),
}


def lexicon(keep_case=False):
    return ib.Lexicon(lambda s: LEX.get(s, ([], None)), keep_case=keep_case)


def item(i, lemmas, n):
    toks = [{"surface": f"w{k}", "lemma": lemmas[k % len(lemmas)]} for k in range(n)]
    return {"id": f"s{i}", "tokens": toks, "lemmas": sorted(set(lemmas))}


class Tokenize(unittest.TestCase):
    def test_words_and_punctuation(self):
        self.assertEqual(ib.tokenize("Un niño, de 11 años."), ["Un", "niño", "de", "años"])

    def test_elision_splits(self):
        lex = lexicon()
        self.assertEqual(ib.tokenize("l'homme", lex.known), ["l'", "homme"])
        self.assertEqual(ib.tokenize("d’or"), ["d’", "or"])

    def test_known_apostrophe_word_stays_whole(self):
        self.assertEqual(ib.tokenize("aujourd'hui", lexicon().known), ["aujourd'hui"])

    def test_hyphen_clitic(self):
        self.assertEqual(ib.tokenize("chamo-me", lexicon().known), ["chamo", "me"])


class Lemma(unittest.TestCase):
    def test_form_of_parsing(self):
        self.assertEqual(ib.lemma_of_meaning("plural of casa"), "casa")
        self.assertEqual(ib.lemma_of_meaning("inflection of poder:"), "poder")
        self.assertIsNone(ib.lemma_of_meaning("forms the present perfect of certain verbs"))
        self.assertIsNone(ib.lemma_of_meaning("alternative form of suono"))
        self.assertIsNone(ib.lemma_of_meaning("bear"))

    def test_inflection_maps_to_lemma(self):
        lex = lexicon()
        self.assertEqual(lex.lemma("casas"), ("casa", True))
        self.assertEqual(lex.lemma("fue"), ("ir", True))
        self.assertEqual(lex.lemma("chamo"), ("chamar", True))

    def test_frequency_picks_verb_over_homograph(self):
        self.assertEqual(lexicon().lemma("est"), ("être", True))
        self.assertEqual(lexicon().lemma("mais"), ("mais", True))

    def test_one_hop_only(self):
        self.assertEqual(lexicon(True).lemma("ist"), ("sein", True))

    def test_elision_lemma(self):
        self.assertEqual(lexicon().lemma("l'"), ("le", True))
        self.assertEqual(lexicon().lemma("d’"), ("de", True))

    def test_german_case_follows_frequency(self):
        self.assertEqual(lexicon(True).lemma("Himmel"), ("Himmel", True))

    def test_unknown_is_flagged(self):
        self.assertEqual(lexicon().lemma("Zorglub"), ("zorglub", False))
        toks = ib.tokens_for("Zorglub casas", lexicon())
        self.assertEqual(toks[0], {"surface": "Zorglub", "lemma": "zorglub", "unmapped": True})
        self.assertEqual(toks[1], {"surface": "casas", "lemma": "casa"})

    def test_coverage(self):
        its = [{"tokens": ib.tokens_for("casas casas Zorglub", lexicon())}]
        c = ib.coverage(its)
        self.assertEqual((c["tokens"], c["tokensMapped"], c["types"], c["typesMapped"]), (3, 2, 2, 1))


class Units(unittest.TestCase):
    def test_episode_units_reach_min_tokens(self):
        its = [item(i, ["a"], 9) for i in range(13)]
        units = ib.episode_units("v", its)
        self.assertTrue(units)
        self.assertTrue(all(u["tokenCount"] >= ib.MIN_TOKENS for u in units))
        self.assertEqual(sum(len(u["itemIds"]) for u in units), 13)

    def test_short_episode_dropped(self):
        self.assertEqual(ib.episode_units("v", [item(0, ["a"], 10)]), [])

    def test_sentence_sets_share_target_and_size(self):
        filler = [item(100 + i, [f"f{i}"], 5) for i in range(200)]
        its = [item(i, ["gato", f"x{i}"], 9) for i in range(8)] + filler
        units = [u for u in ib.sentence_set_units("es", its) if u["targetLemmas"][0] == "gato"]
        self.assertEqual(len(units), 1)
        u = units[0]
        self.assertTrue(ib.SET_MIN <= len(u["itemIds"]) <= ib.SET_MAX)
        self.assertGreaterEqual(u["tokenCount"], ib.MIN_TOKENS)

    def test_sentence_set_under_min_tokens_dropped(self):
        filler = [item(100 + i, [f"f{i}"], 5) for i in range(200)]
        its = [item(i, ["gato"], 4) for i in range(8)] + filler
        self.assertFalse([u for u in ib.sentence_set_units("es", its) if "gato" in u["targetLemmas"]])


if __name__ == "__main__":
    unittest.main()
