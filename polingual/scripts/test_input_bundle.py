import bz2
import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path

import os

try:
    import jsonschema
except ImportError:
    jsonschema = None

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import input_bundle as ib

SCHEMA = json.loads((HERE.parent / "src/lib/input/input-bundle.schema.json").read_text())
SHIPPED = HERE.parent / "public/input"

LEX = {
    "casas": ([("plural of casa", "noun"), ("second-person singular present indicative of casar", "verb")], 500),
    "casa": ([("house", "noun")], 100),
    "casar": ([("to marry", "verb")], 900),
    "est": ([("east", "noun"), ("third-person singular present indicative of être", "verb")], 1000),
    "être": ([("to be", "verb")], 1010),
    "mais": ([("plural of mai", "noun"), ("but", "conj")], 1047),
    "mai": ([("May", "noun")], 2400),
    "fue": ([("third-person singular preterite indicative of ir", "verb")], 300),
    "ir": ([("to go", "verb")], 50),
    "ist": ([("third-person singular present of sein", "verb")], 150),
    "sein": ([("to be", "verb"), ("genitive of er", "pron")], 128),
    "er": ([("he", "pron")], 131),
    "himmel": ([("inflection of himmeln:", "verb")], 8151),
    "Himmel": ([("sky", "noun")], 6227),
    "die": ([("nominative feminine singular of der", "det")], 5),
    "Die": ([("the die", "noun")], 9000),
    "der": ([("the", "det")], 4),
    "le": ([("the", "article")], 10),
    "de": ([("of", "prep")], 11),
    "aujourd'hui": ([("today", "adv")], 400),
    "homme": ([("man", "noun")], 90),
    "chamo": ([("first-person singular present indicative of chamar", "verb")], None),
    "chamar": ([("to call", "verb")], None),
    "me": ([("me", "pron")], 20),
    "dormais": ([("first/second-person singular imperfect indicative of dormir", "verb")], None),
    "dormir": ([("to sleep", "verb")], 700),
    "veux": ([("inflection of vouloir:", "verb"), ("first/second-person singular present indicative", "verb")], 755),
    "vouloir": ([("to want", "verb")], 760),
    "muy": ([("apocopic form of mucho; very", "adv")], 259),
    "mucho": ([("much", "adv")], 200),
    "Tom": ([("a male given name", "name")], None),
    "tom": ([("tone", "noun")], None),
}


def lexicon(noun_caps=False, closed=None):
    return ib.Lexicon(lambda s: LEX.get(s, ([], None)), noun_caps=noun_caps, closed=closed)


def item(i, lemmas, n):
    toks = [{"surface": f"w{k}", "lemma": lemmas[k % len(lemmas)]} for k in range(n)]
    return {"id": f"s{i}", "tokens": toks, "lemmas": sorted(set(lemmas)),
            "source": {"name": "tatoeba", "sentenceIds": {"en": str(i)}, "authors": {"en": "u"}}}


class Tokenize(unittest.TestCase):
    def test_words_and_punctuation(self):
        self.assertEqual(ib.tokenize("Un niño, de 11 años."), ["Un", "niño", "de", "años"])

    def test_elision_splits(self):
        self.assertEqual(ib.tokenize("l'homme", lexicon().known), ["l'", "homme"])
        self.assertEqual(ib.tokenize("d’or"), ["d’", "or"])

    def test_known_apostrophe_word_stays_whole(self):
        self.assertEqual(ib.tokenize("aujourd'hui", lexicon().known), ["aujourd'hui"])

    def test_hyphen_clitic(self):
        self.assertEqual(ib.tokenize("chamo-me", lexicon().known), ["chamo", "me"])

    def test_sentence_initial_positions(self):
        got = ib.tokenize_with_position("¿Es Tom? «Sí», dijo. Ana vino")
        self.assertEqual(got, [("Es", True), ("Tom", False), ("Sí", True), ("dijo", False), ("Ana", True), ("vino", False)])


class Lemma(unittest.TestCase):
    def test_form_of_parsing(self):
        self.assertEqual(ib.lemma_of_meaning("plural of casa"), "casa")
        self.assertEqual(ib.lemma_of_meaning("inflection of poder:"), "poder")
        self.assertEqual(ib.lemma_of_meaning("nominative/accusative plural of Buch"), "Buch")
        self.assertIsNone(ib.lemma_of_meaning("forms the present perfect of certain verbs"))
        self.assertIsNone(ib.lemma_of_meaning("alternative form of suono"))
        self.assertIsNone(ib.lemma_of_meaning("apocopic form of mucho; very"))
        self.assertIsNone(ib.lemma_of_meaning("bear"))

    def test_inflection_maps_to_lemma(self):
        lex = lexicon()
        self.assertEqual(lex.lemma("fue"), ("ir", True))
        self.assertEqual(lex.lemma("chamo"), ("chamar", True))
        self.assertEqual(lex.lemma("dormais"), ("dormir", True))
        self.assertEqual(lex.lemma("veux"), ("vouloir", True))

    def test_rank_picks_between_pos_consistent_targets(self):
        self.assertEqual(lexicon().lemma("casas"), ("casa", True))

    def test_own_sense_needs_close_rank(self):
        self.assertEqual(lexicon().lemma("est"), ("être", True))
        self.assertEqual(lexicon().lemma("mais"), ("mais", True))
        self.assertEqual(lexicon().lemma("muy"), ("muy", True))

    def test_one_hop_only(self):
        self.assertEqual(lexicon(True).lemma("ist"), ("sein", True))

    def test_elision_lemma(self):
        self.assertEqual(lexicon().lemma("l'"), ("le", True))
        self.assertEqual(lexicon().lemma("d’"), ("de", True))

    def test_sentence_initial_lowercases(self):
        self.assertEqual(lexicon(True).lemma("Die", True), ("der", True))
        self.assertEqual(lexicon(True).lemma("Himmel", False), ("Himmel", True))

    def test_proper_noun_keeps_case(self):
        self.assertEqual(lexicon().lemma("Tom", True), ("Tom", True))
        self.assertEqual(lexicon().lemma("Zorglub", True), ("Zorglub", False))

    def test_closed_class_fallback(self):
        self.assertEqual(lexicon(closed={"a": "avoir"}).lemma("a"), ("avoir", True))

    def test_unknown_is_flagged(self):
        toks = ib.tokens_for("Zorglub casas", lexicon())
        self.assertEqual(toks[0], {"surface": "Zorglub", "lemma": "Zorglub", "unmapped": True})
        self.assertEqual(toks[1], {"surface": "casas", "lemma": "casa"})

    def test_coverage(self):
        c = ib.coverage([{"tokens": ib.tokens_for("casas casas Zorglub", lexicon())}])
        self.assertEqual((c["tokens"], c["tokensMapped"], c["types"], c["typesMapped"]), (3, 2, 2, 1))

    def test_golden_scoring_accepts_alternatives(self):
        rate, wrong = ib.golden_error_rate(lexicon(), [["fue", False, ["ser", "ir"]], ["casas", False, "casar"]])
        self.assertEqual((rate, [w[0] for w in wrong]), (0.5, ["casas"]))


class Units(unittest.TestCase):
    def test_episode_units_reach_min_tokens(self):
        units = ib.episode_units({"id": "v", "source_url": "u"}, [item(i, ["a"], 9) for i in range(13)])
        self.assertTrue(units and all(u["tokenCount"] >= ib.MIN_TOKENS for u in units))
        self.assertEqual(sum(len(u["itemIds"]) for u in units), 13)

    def test_short_episode_dropped(self):
        self.assertEqual(ib.episode_units({"id": "v", "source_url": "u"}, [item(0, ["a"], 10)]), [])

    def test_sentence_sets_share_target_and_size(self):
        filler = [item(100 + i, [f"f{i}"], 5) for i in range(200)]
        its = [item(i, ["gato", f"x{i}"], 9) for i in range(8)] + filler
        u = [u for u in ib.sentence_set_units("es", its) if u["targetLemmas"][0] == "gato"]
        self.assertEqual(len(u), 1)
        self.assertTrue(ib.SET_MIN <= len(u[0]["itemIds"]) <= ib.SET_MAX)
        self.assertGreaterEqual(u[0]["tokenCount"], ib.MIN_TOKENS)
        self.assertIn("tatoeba.org/en/sentences/show/0", u[0]["credit"])

    def test_items_belong_to_one_unit(self):
        filler = [item(100 + i, [f"f{i}"], 5) for i in range(200)]
        its = [item(i, ["gato", "perro"], 9) for i in range(12)] + filler
        ids = [i for u in ib.sentence_set_units("es", its) for i in u["itemIds"]]
        self.assertEqual(len(ids), len(set(ids)))

    def test_sentence_set_under_min_tokens_dropped(self):
        filler = [item(100 + i, [f"f{i}"], 5) for i in range(200)]
        its = [item(i, ["gato"], 4) for i in range(8)] + filler
        self.assertFalse([u for u in ib.sentence_set_units("es", its) if "gato" in u["targetLemmas"]])


def write_bz2(path, rows):
    with bz2.open(path, "wt", encoding="utf-8") as f:
        for r in rows:
            f.write("\t".join(r) + "\n")


@unittest.skipIf(jsonschema is None, "jsonschema missing: pip install -r polingual/scripts/requirements.txt")
class EndToEnd(unittest.TestCase):
    def test_fixture_build(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            sents = {str(100 + i): (f"El gato come pescado fresco en la casa {i}.", f"The cat eats fresh fish in house {i}.")
                     for i in range(6)}
            layers = {"sentences": {"pool": {en: {"t": {"en": e, "es": s}, "lv": {"es": 1}} for en, (s, e) in sents.items()}}}
            (d / "layers.json").write_text(json.dumps(layers))
            vids = d / "videos"
            vids.mkdir()
            cues = [{"start": i, "end": i + 1, "text": {"es": "El gato come pescado en la casa grande.", "en": "x"}} for i in range(12)]
            (vids / "abc.json").write_text(json.dumps({"id": "abc", "title": "T", "channel": "C", "license": "CC BY",
                                                        "source_url": "https://youtu.be/abc", "cues": cues}))
            (vids / "index.json").write_text("[]")
            tat = d / "tatoeba"
            tat.mkdir()
            write_bz2(tat / "eng_sentences_detailed.tsv.bz2", [[en, "eng", e, "anna", "\\N", "\\N"] for en, (_, e) in sents.items()])
            write_bz2(tat / "spa-eng_links.tsv.bz2", [[str(900 + i), en] for i, en in enumerate(sents)])
            write_bz2(tat / "spa_sentences_detailed.tsv.bz2",
                      [[str(900 + i), "spa", s, "luis", "\\N", "\\N"] for i, (s, _) in enumerate(sents.values())])
            idx = d / "index.sqlite"
            db = sqlite3.connect(idx)
            db.execute("create table photons (lang text, surface text, pos text, payload text)")
            for w, pos in [("el", "article"), ("gato", "noun"), ("pescado", "noun"), ("en", "prep"), ("la", "article"),
                           ("casa", "noun"), ("grande", "adj"), ("fresco", "adj")]:
                db.execute("insert into photons values ('es', ?, ?, ?)", (w, pos, json.dumps({"senses": [{"gloss": w + "-x", "pos": pos}]})))
            db.execute("insert into photons values ('es', 'come', 'verb', ?)",
                       (json.dumps({"senses": [{"gloss": "third-person singular present indicative of comer", "pos": "verb"}]}),))
            db.execute("insert into photons values ('es', 'comer', 'verb', ?)", (json.dumps({"senses": [{"gloss": "to eat", "pos": "verb"}]}),))
            db.commit()
            packs = d / "packs" / "es"
            packs.mkdir(parents=True)
            pack = sqlite3.connect(d / "pack.sqlite")
            pack.execute("create table words (id integer primary key, surface text, folded text, meaning text, pos text)")
            pack.commit()
            pack.close()
            subprocess.run(["zstd", "-qf", str(d / "pack.sqlite"), "-o", str(packs / "polingual-es.sqlite.zst")], check=True)
            out = d / "out"
            ib.main(["--langs", "es", "--packs", str(d / "packs"), "--index", str(idx), "--tatoeba", str(tat),
                     "--scratch", str(d / "scratch"), "--layers", str(d / "layers.json"), "--videos", str(vids), "--out", str(out)])
            manifest = json.loads((out / "manifest.json").read_text())
            self.assertEqual(set(manifest["inputs"]), {"layers", "videos", "index", "tatoeba", "packs"})
            bundle = json.loads((out / manifest["langs"]["es"]["file"]).read_text())
            jsonschema.validate(bundle, SCHEMA)
            kinds = Counter(u["kind"] for u in bundle["units"])
            self.assertEqual(kinds["episode"], 2)
            self.assertEqual(kinds["sentence_set"], 1)
            tat_item = next(i for i in bundle["items"] if i["source"]["name"] == "tatoeba")
            self.assertEqual(tat_item["source"]["authors"], {"en": "anna", "es": "luis"})
            self.assertTrue(tat_item["id"].startswith("tatoeba:es:9"))
            self.assertIn({"surface": "come", "lemma": "comer"}, tat_item["tokens"])
            self.assertEqual(bundle["tatoebaIdsMatched"], 6)

    def test_missing_paths_fail(self):
        with self.assertRaises(SystemExit):
            ib.parse(["--packs", "/nonexistent", "--index", "/nonexistent", "--tatoeba", "/x", "--scratch", "/tmp/x"])


@unittest.skipIf(jsonschema is None, "jsonschema missing: pip install -r polingual/scripts/requirements.txt")
class Shipped(unittest.TestCase):
    def test_shipped_bundles_match_schema(self):
        manifest = json.loads((SHIPPED / "manifest.json").read_text())
        for lang, entry in manifest["langs"].items():
            with self.subTest(lang=lang):
                bundle = json.loads((SHIPPED / entry["file"]).read_text())
                jsonschema.validate(bundle, SCHEMA)
                ids = [i for u in bundle["units"] for i in u["itemIds"]]
                self.assertEqual(len(ids), len(set(ids)))


LEX_ENV = ("PHOTONS_INDEX", "POLINGUAL_PACKS_DIR", "INPUT_SCRATCH_DIR")


@unittest.skipUnless(all(os.environ.get(k) for k in LEX_ENV), f"golden check needs {', '.join(LEX_ENV)}")
class GoldenRegression(unittest.TestCase):
    def test_error_does_not_exceed_recorded(self):
        gold = json.loads(ib.GOLDEN.read_text())
        a = ib.parse(["--golden"])
        a.scratch.mkdir(parents=True, exist_ok=True)
        for lang, limit in ib.GOLDEN_MAX_ERROR.items():
            with self.subTest(lang=lang):
                rate, wrong = ib.golden_error_rate(ib.open_lexicon(lang, a.packs, a.scratch, a.index), gold[lang])
                self.assertLessEqual(rate, limit, wrong)


if __name__ == "__main__":
    unittest.main()
