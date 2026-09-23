#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import unicodedata
import xml.etree.ElementTree as ET

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BRONZE = os.path.join(REPO_ROOT, "_intake", "oshb")
INDEX = os.path.join(BRONZE, "LexicalIndex.xml")
SILVER = os.path.join(BRONZE, "oshb.sqlite")
NS = "{http://openscriptures.github.com/morphhb/namespace}"
SOURCE = "Open Scriptures Hebrew Bible, HebrewLexicon LexicalIndex, CC BY 4.0"
DIFFER_ROOT = 0.7
ONLY_ROOT = 0.7
FINALS = str.maketrans("ךםןףץ", "כמנפצ")

def skeleton(text):
    s = unicodedata.normalize("NFD", text or "")
    return "".join(c for c in s if "א" <= c <= "ת").translate(FINALS)

def defective(skel):
    if len(skel) <= 2:
        return skel
    return skel[0] + "".join(c for c in skel[1:-1] if c not in "וי") + skel[-1]

def dashed(root):
    return "־".join(skeleton(root))

def parse(path=INDEX):
    entries = {}
    for e in ET.parse(path).getroot().iter(NS + "entry"):
        w = e.find(NS + "w")
        et = e.find(NS + "etym")
        d = e.find(NS + "def")
        pos = e.find(NS + "pos")
        entries[e.get("id")] = {
            "id": e.get("id"),
            "headword": (w.text or "") if w is not None else "",
            "pos": (pos.text or "") if pos is not None else "",
            "def": (d.text or "").strip() if d is not None else "",
            "etym_type": et.get("type") if et is not None else None,
            "etym_root": et.get("root") if et is not None else None,
            "parent": (et.text or "").split(",")[0].strip() if et is not None and et.get("type") == "sub" and et.text else None,
        }
    return entries

def root_of(entries, eid, depth=0):
    e = entries.get(eid)
    if not e:
        return None
    if e["etym_root"]:
        return e
    if e["parent"] and depth < 4:
        return root_of(entries, e["parent"], depth + 1)
    return None

class Oshb:
    def __init__(self, entries):
        self.entries = entries
        self.by_skeleton = {}
        self.by_defective = {}
        for eid, e in entries.items():
            main = root_of(entries, eid)
            if not main:
                continue
            key = skeleton(e["headword"])
            if key:
                self.by_skeleton.setdefault(key, {})[skeleton(main["etym_root"])] = main
                self.by_defective.setdefault(defective(key), {})[skeleton(main["etym_root"])] = main

    @classmethod
    def load(cls, path=INDEX):
        return cls(parse(path)) if os.path.exists(path) else None

    def lookup(self, word):
        key = skeleton(word)
        hits = self.by_skeleton.get(key, {})
        if not hits:
            hits = self.by_defective.get(defective(key), {})
        if len(hits) != 1:
            return None
        root, main = next(iter(hits.items()))
        gloss = main["def"] or next((e["def"] for e in self.entries.values() if e["parent"] == main["id"] and e["def"]), "")
        return {"root": root, "form": dashed(root), "gloss": gloss or None, "entry": main["id"]}

    def write_silver(self, path=SILVER):
        if os.path.exists(path):
            os.unlink(path)
        db = sqlite3.connect(path)
        with db:
            db.execute("create table entry (id text primary key, headword text, skeleton text, pos text, def text, root text)")
            rows = []
            for eid, e in self.entries.items():
                main = root_of(self.entries, eid)
                rows.append((eid, e["headword"], skeleton(e["headword"]), e["pos"], e["def"], main["etym_root"] if main else None))
            db.executemany("insert into entry values (?,?,?,?,?,?)", rows)
        db.close()

def apply(oshb, lang, word, root, root_conf, chain):
    if lang != "he" or oshb is None:
        return root, root_conf, "wiktionary", chain, None
    hit = oshb.lookup(word)
    if not hit:
        return root, root_conf, "wiktionary", chain, None
    root_lang, root_form, root_gloss = root
    wik = skeleton(root_form) if root_lang == "he" and root_form else ""
    step = {"lang": "he", "form": hit["form"], "rel": "oshb_root", "gloss": hit["gloss"] or ""}
    if wik and wik == hit["root"]:
        return root, root_conf, "both", chain, "agree"
    if wik:
        kept = [{"lang": root_lang, "form": root_form, "rel": "wiktionary_root", "gloss": root_gloss or ""}]
        return ("he", hit["form"], hit["gloss"]), min(root_conf, DIFFER_ROOT), "oshb", [step] + kept + list(chain), "differ"
    return ("he", hit["form"], hit["gloss"]), ONLY_ROOT, "oshb", [step] + list(chain), "only"

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--index", default=INDEX)
    ap.add_argument("--silver", default=SILVER)
    a = ap.parse_args(argv)
    o = Oshb.load(a.index)
    if o is None:
        raise SystemExit(f"no LexicalIndex.xml at {a.index}")
    o.write_silver(a.silver)
    unique = sum(1 for v in o.by_skeleton.values() if len(v) == 1)
    print(json.dumps({"entries": len(o.entries), "skeletons": len(o.by_skeleton), "unique": unique}))
    return 0

if __name__ == "__main__":
    sys.exit(main())
