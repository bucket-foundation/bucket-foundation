import gzip
import json
import re
import sqlite3
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

import pandas as pd
from rapidfuzz.distance import Levenshtein

ROOT = Path(__file__).resolve().parent.parent
TRACES = ROOT / "data" / "settles.acl16.learning_traces.13m.csv.gz"
ROOTS = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "agfarms/bucket-foundation/_intake/photons/roots.sqlite"
OUT = ROOT / "data" / "lexeme_features.csv"
SUMMARY = ROOT / "results" / "features_summary.json"

LANGS = ("en", "es", "fr", "de", "it", "pt")
ETYM_RELS = ("inh", "bor", "der", "lbor", "from", "uder", "root")
EXCLUDED_ANCESTORS = ("ine-pro",)
IPA_DROP = re.compile(r"[/\[\]ˈˌ.ː()‿\s\-]")


def fold(s):
    s = s.lower().replace("ß", "ss")
    s = "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))
    return re.sub(r"[^a-z]", "", s)


def ned(a, b):
    if not a or not b:
        return None
    return Levenshtein.distance(a, b) / max(len(a), len(b))


def lemma_of(lexeme_string):
    surface, _, rest = lexeme_string.partition("/")
    lemma = rest.split("<", 1)[0]
    if not lemma or lemma.startswith("*"):
        lemma = surface.split("<", 1)[0]
    return lemma.lower()


def first_ipa(raw):
    if not raw:
        return ""
    return IPA_DROP.sub("", raw.split(",")[0]).lower()


def load_lexemes():
    seen = {}
    with gzip.open(TRACES, "rt") as fh:
        for chunk in pd.read_csv(fh, usecols=["learning_language", "ui_language", "lexeme_id", "lexeme_string"], chunksize=2_000_000):
            for row in chunk.drop_duplicates("lexeme_id").itertuples(index=False):
                seen.setdefault((row.lexeme_id, row.ui_language), (row.learning_language, row.lexeme_string))
    return seen


def main():
    lexemes = load_lexemes()
    db = sqlite3.connect(ROOTS)
    trans_l2en = defaultdict(set)
    trans_en2l = defaultdict(set)
    q = "select en_word, lang, word from translation where lang in (%s)" % ",".join("?" * 5)
    for en_word, lang, word in db.execute(q, LANGS[1:]):
        if en_word and word:
            trans_l2en[(lang, word.lower())].add(en_word.lower())
            trans_en2l[(lang, en_word.lower())].add(word.lower())
    ancestors = defaultdict(set)
    q = "select lang, word, anc_lang, anc_form from etym where lang in (%s) and rel in (%s)" % (",".join("?" * 6), ",".join("?" * len(ETYM_RELS)))
    for lang, word, anc_lang, anc_form in db.execute(q, LANGS + ETYM_RELS):
        if anc_lang and anc_form and anc_lang not in EXCLUDED_ANCESTORS:
            ancestors[(lang, word.lower())].add((anc_lang, fold(anc_form) or anc_form))
    ipa = {}
    q = "select lang, word, ipa from word where lang in (%s) and ipa is not null and ipa != ''" % ",".join("?" * 6)
    for lang, word, raw in db.execute(q, LANGS):
        ipa.setdefault((lang, word.lower()), first_ipa(raw))

    def anc(lang, word):
        return ancestors.get((lang, word), set()) | {(lang, fold(word))}

    rows = []
    for (lexeme_id, ui), (learn, lexeme_string) in lexemes.items():
        lemma = lemma_of(lexeme_string)
        if ui == "en":
            translations = trans_l2en.get((learn, lemma), set())
        else:
            translations = trans_en2l.get((ui, lemma), set())
        orth = [ned(fold(lemma), fold(t)) for t in translations]
        orth = [x for x in orth if x is not None]
        lemma_ipa = ipa.get((learn, lemma), "")
        phon = [ned(lemma_ipa, ipa.get((ui, t), "")) for t in translations]
        phon = [x for x in phon if x is not None]
        lemma_anc = anc(learn, lemma)
        etym = any(lemma_anc & anc(ui, t) for t in translations)
        rows.append({
            "lexeme_id": lexeme_id,
            "ui_language": ui,
            "learning_language": learn,
            "lemma": lemma,
            "lemma_len": len(fold(lemma)) or len(lemma),
            "n_translations": len(translations),
            "orth_sim": 1 - min(orth) if orth else None,
            "phon_sim": 1 - min(phon) if phon else None,
            "etym_cognate": int(etym) if translations else None,
        })
    df = pd.DataFrame(rows)
    df.to_csv(OUT, index=False)
    summary = {}
    for (ui, learn), g in df.groupby(["ui_language", "learning_language"]):
        summary[f"{ui}->{learn}"] = {
            "lexemes": int(len(g)),
            "with_translation": int((g.n_translations > 0).sum()),
            "with_phon": int(g.phon_sim.notna().sum()),
            "etym_cognate_rate": float(g.etym_cognate.mean()),
            "orth_sim_mean": float(g.orth_sim.mean()),
        }
    SUMMARY.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
