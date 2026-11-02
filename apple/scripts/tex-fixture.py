#!/usr/bin/env python3
import json
import os
import re
import sys
import urllib.request

BASE = "https://www.bucket.foundation/academy-app/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "BucketKit", "Tests", "BucketKitTests", "Fixtures", "tex-live.json")
WHOLE = {"equation", "eq"}
PROSE = {"answer", "core", "deep", "summary", "title", "prompt"}


def get(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "Bucket fixture script"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def main():
    index = get("corpus/index.json")
    math, prose = set(), set()
    counts = {"decks": 0, "segments": 0, "math_whole": 0, "prose": 0, "lesson": 0}

    def walk(o, key):
        if isinstance(o, dict):
            for k, v in o.items():
                walk(v, k)
        elif isinstance(o, list):
            for v in o:
                walk(v, key)
        elif isinstance(o, str) and "\\" in o:
            counts["segments"] += 1
            if key in WHOLE:
                counts["math_whole"] += 1
                math.add(o)
                return
            if key == "lesson":
                counts["lesson"] += 1
            elif key in PROSE:
                counts["prose"] += 1
                prose.add(o)
            for m in re.findall(r"\$\$(.+?)\$\$", o, re.S):
                math.add(m.strip())
            rest = re.sub(r"\$\$.+?\$\$", " ", o, flags=re.S).replace("\\$", " ")
            for m in re.findall(r"(?<!\$)\$([^$\n]+?)\$(?!\$)", rest):
                if "\\" in m or re.search(r"[\^_=]", m):
                    math.add(m)

    for d in index["decks"]:
        if d["id"].startswith("lang-"):
            continue
        walk(get(d["file"]), "")
        counts["decks"] += 1
    counts["math_pieces"] = len(math)
    counts["prose_strings"] = len(prose)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"counts": counts, "math": sorted(math), "prose": sorted(prose)}, f, ensure_ascii=False, indent=0)
    json.dump(counts, sys.stdout)
    print()


if __name__ == "__main__":
    main()
