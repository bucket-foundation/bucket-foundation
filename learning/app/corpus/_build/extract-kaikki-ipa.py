#!/usr/bin/env python3
import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(os.path.dirname(HERE))
CORE = os.path.join(APP, "corpus", "lang-core.json")
OUT = os.path.join(HERE, "gold", "kaikki-ipa.json")
KAIKKI = os.environ.get("KAIKKI_CACHE", os.path.expanduser("~/agfarms/bucket-foundation/_intake/photons/kaikki-cache"))
DUMPS = {"he": "Hebrew.jsonl"}
POINTS = re.compile(r"[\u05b0-\u05c7]")
SKIP_TAGS = {"Biblical-Hebrew", "Tiberian", "Ashkenazi", "Sephardi", "Yemenite", "Mizrahi", "Samaritan", "archaic", "obsolete"}


def nfc(s):
    return unicodedata.normalize("NFC", s or "")


def main():
    core = json.load(open(CORE, encoding="utf-8"))
    out = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}
    for lang, dump in DUMPS.items():
        words = {nfc(a["forms"][lang]["word"]) for a in core["atoms"] if lang in a["forms"]}
        found = {}
        pointed = {}
        with open(os.path.join(KAIKKI, dump), encoding="utf-8") as f:
            for line in f:
                d = json.loads(line)
                forms = {nfc(d.get("word"))} | {nfc(x.get("form")) for x in d.get("forms", []) if "canonical" in (x.get("tags") or [])}
                hits = forms & words
                if not hits:
                    continue
                canon = [nfc(x.get("form")) for x in d.get("forms", []) if "canonical" in (x.get("tags") or [])]
                for w in hits:
                    if w == nfc(d.get("word")) and not POINTS.search(w) and canon and POINTS.search(canon[0]):
                        pointed.setdefault(w, canon[0])
                for s in d.get("sounds", []) or []:
                    ipa = (s.get("ipa") or "").strip("/[] ")
                    tags = set(s.get("tags") or [])
                    if not ipa or tags & SKIP_TAGS or "Modern-Israeli-Hebrew" not in tags and tags:
                        continue
                    for w in hits:
                        found.setdefault(w, ipa.split(",")[0].strip())
        out[lang] = dict(sorted(found.items()))
        out[f"{lang}-pointed"] = dict(sorted(pointed.items()))
        print(f"{lang}: {len(found)}/{len(words)}", file=sys.stderr)
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, sort_keys=True, indent=0)


if __name__ == "__main__":
    main()
