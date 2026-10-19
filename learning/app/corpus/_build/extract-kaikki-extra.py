#!/usr/bin/env python3
import importlib.util
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(os.path.dirname(HERE))
CORE = os.path.join(APP, "corpus", "lang-core.json")
OUT = os.path.join(HERE, "gold", "kaikki-extra.json")

EXTRA = ["he", "la", "grc", "fa", "tr", "vi", "th", "id", "ta", "sa", "cs",
         "ang", "got", "non", "cop", "egy", "akk", "sux"]
NON_LATIN = {"he", "grc", "fa", "th", "ta", "sa", "got", "cop", "egy", "akk", "sux"}


def load_base():
    spec = importlib.util.spec_from_file_location("kaikki", os.path.join(HERE, "extract-kaikki-translations.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def tidy(word, lang):
    if not word:
        return None
    w = re.sub(r"[\u200e\u200f]", "", word).split("\\")[-1].strip()
    if lang in NON_LATIN:
        w = re.split(r"\s+[A-Za-z]", w)[0].strip()
        w = re.split(r"[,;:]| or ", w)[0].strip()
    if lang == "grc":
        w = w.lstrip("*")
    return w or None


def main():
    k = load_base()
    atoms = json.load(open(CORE, encoding="utf-8"))["atoms"]
    concepts = {c["id"]: c for c in json.load(open(k.CONCEPTS, encoding="utf-8"))["concepts"]}
    want = {a["id"] for a in atoms}
    markers = re.compile('"word": "(' + "|".join(re.escape(w) for w in want) + ')"')
    found = {}
    with open(k.ENGLISH, encoding="utf-8") as f:
        for line in f:
            if not markers.search(line):
                continue
            try:
                d = json.loads(line)
            except ValueError:
                continue
            if d.get("word") in want:
                found.setdefault(d["word"], []).append(d)
    families = {"noun": {"noun", "name", "proper noun"}, "verb": {"verb"}, "adj": {"adj", "adjective"},
                "num": {"num", "numeral", "number"}, "adv": {"adv", "adverb"}, "name": {"name", "proper noun"}}
    overrides = json.load(open(k.OVERRIDES, encoding="utf-8")).get("overrides", {})
    gold = {l: {} for l in EXTRA}
    for a in atoms:
        c = concepts.get(a["id"], {"id": a["id"], "pos": "noun", "sense": ""})
        hint = c.get("sense", "")
        pos = families.get(c["pos"], {c["pos"]})
        matched = [e for e in found.get(a["id"], []) if e.get("pos") in pos]
        if not matched:
            continue
        cands = sorted(((e, k.gather_translations(e, hint)) for e in matched), key=lambda et: -len(et[1]))
        translations = cands[0][1]
        for lang in EXTRA:
            w = overrides.get(a["id"], {}).get(lang) or tidy(k.pick_translation(translations, lang, hint), lang)
            if w:
                gold[lang][a["id"]] = w
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(gold, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, sort_keys=True, indent=0)
    for lang in EXTRA:
        print(f"{lang}: {len(gold[lang])}/{len(atoms)}")


if __name__ == "__main__":
    main()
