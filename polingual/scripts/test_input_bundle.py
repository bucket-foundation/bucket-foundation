import bz2
import importlib.util
import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
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
import input_segment as seg

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


class RomanceLemma(unittest.TestCase):
    ROWS = {
        "donna": ([("third-person singular past historic of donner", "verb")], None),
        "donner": ([("to give", "verb")], 300),
        "apparue": ([("feminine singular of apparu", "verb")], None),
        "apparu": ([("past participle of apparaître", "verb")], None),
        "apparaître": ([("to appear", "verb")], 900),
        "livres": ([("plural of livre", "noun"), ("second-person singular present of livrer", "verb")], 600),
        "livre": ([("book", "noun"), ("inflection of livrer:", "verb")], 200),
        "livrer": ([("to deliver", "verb")], 900),
    }

    def lex(self, lang):
        return ib.Lexicon(lambda s: self.ROWS.get(s, ([], None)), fixed=ib.FIXED[lang])

    def test_past_historic(self):
        self.assertEqual(self.lex("fr").lemma("donna"), ("donner", True))

    def test_participle_chain(self):
        self.assertEqual(self.lex("fr").lemma("apparue")[0], "apparaître")

    def test_own_sense_target_kept(self):
        self.assertEqual(self.lex("fr").lemma("livres")[0], "livre")

    def test_forms_pointing_at_each_other_keep_a_lemma(self):
        rows = {"ab": ([("plural of ba", "noun")], None), "ba": ([("plural of ab", "noun")], None),
                "xs": ([("plural of ab", "noun"), ("plural of ba", "noun")], None)}
        lex = ib.Lexicon(lambda s: rows.get(s, ([], None)))
        self.assertIn(lex.lemma("xs")[0], {"ab", "ba"})

    def test_fixed_closed_class(self):
        fr, it = self.lex("fr"), self.lex("it")
        self.assertEqual(fr.lemma("sa")[0], "son")
        self.assertEqual(it.lemma("nei")[0], "in")
        self.assertEqual(it.lemma("dell'")[0], "di")
        self.assertEqual(it.lemma("I", True)[0], "il")

    def test_ambiguous_italian_forms_not_forced(self):
        rows = {"gli": ([("to him", "pron"), ("the", "article")], 50), "dai": ([("second-person singular present indicative of dare", "verb")], 60),
                "dare": ([("to give", "verb")], 70)}
        it = ib.Lexicon(lambda s: rows.get(s, ([], None)), fixed=ib.FIXED["it"])
        self.assertEqual(it.lemma("gli")[0], "gli")
        self.assertEqual(it.lemma("dai")[0], "dare")
        self.assertEqual(it.lemma("l'"), ("l'", False))

    def test_stable_needs_upper_bound_under_gate(self):
        self.assertEqual(ib.ship_status({"heldOut": {"ci95": [0.01, 0.085]}}), "stable")
        self.assertEqual(ib.ship_status({"heldOut": {"ci95": [0.01, 0.105]}}), "beta")
        self.assertEqual(ib.ship_status({}), "beta")


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


class CyclicForms(unittest.TestCase):
    def test_mutual_form_targets_keep_surface(self):
        lex_data = {
            "xa": ([("plural of pa", "noun"), ("plural of qa", "noun")], 10),
            "pa": ([("plural of qa", "noun")], 20),
            "qa": ([("plural of pa", "noun")], 30),
        }
        lex = ib.Lexicon(lambda s: lex_data.get(s, ([], None)))
        self.assertEqual(lex.lemma("xa"), ("xa", True))


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
            args = ["--langs", "es", "--packs", str(d / "packs"), "--index", str(idx), "--tatoeba", str(tat),
                    "--scratch", str(d / "scratch"), "--layers", str(d / "layers.json"), "--videos", str(vids), "--out", str(out)]
            (d / "golden.json").write_text("{}")
            no_golden = mock.patch.object(ib, "GOLDEN", d / "golden.json")
            no_golden.start()
            self.addCleanup(no_golden.stop)
            no_held = mock.patch.object(ib, "HELD_OUT", d / "golden.json")
            no_held.start()
            self.addCleanup(no_held.stop)
            ib.main(args)
            manifest = json.loads((out / "manifest.json").read_text())
            self.assertNotIn("es", manifest["langs"])
            self.assertIn("needs 20 units", manifest["excluded"]["es"])
            self.assertTrue((out / "sample" / "es.json").exists())
            with mock.patch.object(ib, "MIN_UNITS", 1):
                ib.main(args)
            manifest = json.loads((out / "manifest.json").read_text())
            self.assertNotIn("es", manifest["excluded"])
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
            path = SHIPPED / entry["file"]
            if not path.exists():
                continue
            with self.subTest(lang=lang):
                bundle = json.loads(path.read_text())
                jsonschema.validate(bundle, SCHEMA)
                ids = [i for u in bundle["units"] for i in u["itemIds"]]
                self.assertEqual(len(ids), len(set(ids)))


class Scripts(unittest.TestCase):
    def test_lookup_keys_strip_marks(self):
        self.assertEqual(seg.lookup_key("ar")("كَتَبَ"), "كتب")
        self.assertEqual(seg.lookup_key("he")("שָׁלוֹם"), "שלום")
        self.assertEqual(seg.lookup_key("ru")("идти́"), "идти")
        self.assertEqual(seg.lookup_key("ru")("ёж"), "ёж")
        self.assertEqual(seg.lookup_key("tr")("İki".lower()), "iki")

    def test_clitic_variants(self):
        self.assertIn("كتاب", seg.ar_variants("والكتاب"))
        self.assertIn("مدرسة", seg.ar_variants("مدرستي"))
        self.assertIn("בית", seg.he_variants("והבית"))
        self.assertIn("ayah", seg.id_variants("ayahku"))

    def test_word_regex_keeps_marks(self):
        self.assertEqual([m.group(0) for m in seg.WORD_ANY.finditer("عليّ أن أنام.")], ["عليّ", "أن", "أنام"])
        self.assertEqual([m.group(0) for m in seg.WORD_ANY.finditer("मैं एक माँ हूँ।")], ["मैं", "एक", "माँ", "हूँ"])

    def test_compounds_join_known_syllables(self):
        known = {"hôm qua", "trời"}.__contains__
        got = seg.compounds([("Hôm", True), ("qua", False), ("trời", False)], lambda w: known(w.lower()))
        self.assertEqual(got, [("Hôm qua", True), ("trời", False)])

    def test_names_stay_unmapped(self):
        lex = lexicon()
        lex.names = {"Casas"}
        self.assertEqual(lex.lemma("Casas", True), ("Casas", False))

    def test_augment_pool_fills_missing_lang(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            with bz2.open(d / "ces-eng_links.tsv.bz2", "wt") as f:
                f.write("50\t1\n51\t1\n52\t2\n")
            with bz2.open(d / "ces_sentences_detailed.tsv.bz2", "wt") as f:
                f.write("51\tces\tDruhá.\tx\n50\tces\tPrvní.\ty\n")
            pool = {"1": {"t": {"en": "One."}}, "2": {"t": {"en": "Two."}}}
            got = ib.augment_pool(d, "cs", pool)
            self.assertEqual(got["1"]["t"]["cs"], "První.")
            self.assertNotIn("cs", got["2"]["t"])
            self.assertNotIn("cs", pool["1"]["t"])


class Policy(unittest.TestCase):
    def test_wilson_interval(self):
        self.assertEqual(ib.wilson(0, 50), [0.0, 0.071])
        lo, hi = ib.wilson(5, 50)
        self.assertLess(lo, 0.1)
        self.assertGreater(hi, 0.1)

    def test_gate(self):
        ok = {"golden": {"error": 0.04}, "heldOut": {"error": 0.06}}
        self.assertIsNone(ib.gate("ru", 5000, ok))
        self.assertIn("golden", ib.gate("ar", 1200, {"golden": {"error": 0.24}, "heldOut": {"error": 0.1}}))
        self.assertIn("held-out", ib.gate("tr", 5000, {"golden": {"error": 0.06}, "heldOut": {"error": 0.14}}))
        self.assertIn("held-out set", ib.gate("pl", 2000, {"golden": {"error": 0.1}}))
        self.assertIsNone(ib.gate("de", 5000, {"golden": {"error": 0.04}, "heldOut": {"error": 0.11, "ci95": [0.063, 0.186]}}))
        self.assertIn("below 200", ib.gate("ta", 35, ok))
        self.assertEqual(ib.GOLDEN_MAX_ERROR, 0.10)

    def test_shipped_manifest_policy(self):
        manifest = json.loads((SHIPPED / "manifest.json").read_text())
        for tag, entry in manifest["langs"].items():
            with self.subTest(tag=tag):
                self.assertGreaterEqual(entry["units"], ib.MIN_UNITS)
                self.assertGreaterEqual(entry["coverage"]["tokenShare"], ib.MIN_TOKEN_SHARE)
                ev = manifest["lemmaEvaluation"]["byLang"].get(tag)
                if ev:
                    self.assertLessEqual(ev["golden"]["error"], ib.GOLDEN_MAX_ERROR)
                if ev and "heldOut" in ev:
                    self.assertGreaterEqual(ev["heldOut"]["tokens"], 50)
                else:
                    self.assertIn(tag, manifest["lemmaEvaluation"]["heldOut"]["langs"])
        self.assertNotIn("ar", manifest["langs"])
        for tag, entry in manifest["langs"].items():
            ev = manifest["lemmaEvaluation"]["byLang"].get(tag, {})
            self.assertEqual(entry["status"], ib.ship_status(ev) if entry["pack"] in ib.LANGS else "beta")
            self.assertIn("ci95", entry["lemmaError"]["heldOut"])
        self.assertEqual(manifest["bandBaseEnv"], "NEXT_PUBLIC_POLINGUAL_INPUT_BASE")
        self.assertIsNone(manifest["bandBase"])
        self.assertTrue(any("Share-alike" in c for c in manifest["credits"]))

    @unittest.skipIf(importlib.util.find_spec("opencc") is None, "opencc missing")
    def test_zh_display_simplified_lemma_traditional(self):
        bundle = {"lang": "zh", "items": [{"id": "x", "lang": "zh", "text": "我們喜歡音樂。",
                  "tokens": [{"surface": "我們", "lemma": "我們"}, {"surface": "音樂", "lemma": "音樂"}],
                  "lemmas": ["我們", "音樂"]}], "units": []}
        got = ib.display_forms(bundle)
        it = got["items"][0]
        self.assertEqual(got["lang"], "zh-Hans")
        self.assertEqual(it["text"], "我们喜欢音乐。")
        self.assertEqual(it["tokens"][1], {"surface": "音乐", "lemma": "音樂", "display": "音乐"})
        self.assertEqual(it["lemmas"], ["我們", "音樂"])


LEX_ENV = ("PHOTONS_INDEX", "POLINGUAL_PACKS_DIR", "INPUT_SCRATCH_DIR", "TATOEBA_DIR")


@unittest.skipUnless(all(os.environ.get(k) for k in LEX_ENV), f"golden check needs {', '.join(LEX_ENV)}")
class GoldenRegression(unittest.TestCase):
    def test_error_does_not_exceed_recorded(self):
        gold = json.loads(ib.GOLDEN.read_text())
        a = ib.parse(["--golden"])
        a.scratch.mkdir(parents=True, exist_ok=True)
        manifest = json.loads((SHIPPED / "manifest.json").read_text())
        for tag, entry in manifest["langs"].items():
            lang = entry.get("pack", tag)
            with self.subTest(lang=lang):
                rate, wrong = ib.golden_error_rate(ib.golden_lexicon(lang, a), gold[lang])
                self.assertLessEqual(rate, ib.GOLDEN_MAX_ERROR, wrong)


if __name__ == "__main__":
    unittest.main()


class SimplemmaLangsTest(unittest.TestCase):
    def test_pinned_list_matches_installed_simplemma(self):
        try:
            from simplemma.strategies.dictionaries.dictionary_factory import SUPPORTED_LANGUAGES
        except ImportError:
            self.skipTest("simplemma missing")
        self.assertEqual(ib.SIMPLEMMA_LANGS, frozenset(SUPPORTED_LANGUAGES))

    def test_unsupported_language_has_no_lemmatizer(self):
        self.assertIsNone(ib.lemmatizer("pa"))
        self.assertIsNone(ib.lemmatizer("sa"))
