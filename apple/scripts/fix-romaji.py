#!/usr/bin/env python3
import json
import pathlib
import re
import sys

CORPUS = pathlib.Path(__file__).resolve().parent.parent / "Shared" / "Corpus" / "lang-layers.json"
SYLLABIC_N = re.compile(r"m(?=[bmp])")


def hanbun(roman):
    return SYLLABIC_N.sub("n", roman)


def main(path):
    corpus = json.loads(path.read_text(encoding="utf-8"))
    changed = 0
    for reading in corpus["readings"].values():
        ja = reading.get("ja")
        if ja and "roman" in ja and hanbun(ja["roman"]) != ja["roman"]:
            ja["roman"] = hanbun(ja["roman"])
            changed += 1
    for sentence in corpus["sentences"]["pool"].values():
        roman = sentence.get("r", {})
        if "ja" in roman and hanbun(roman["ja"]) != roman["ja"]:
            roman["ja"] = hanbun(roman["ja"])
            changed += 1
    path.write_text(json.dumps(corpus, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{changed} romaji fields rewritten")


if __name__ == "__main__":
    main(pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else CORPUS)
