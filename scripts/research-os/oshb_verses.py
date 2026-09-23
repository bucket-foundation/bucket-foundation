#!/usr/bin/env python3
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import oshb  # noqa: E402

WLC = os.path.join(oshb.BRONZE, "wlc")
REPO = "https://github.com/openscriptures/morphhb.git"
COMMIT = "3d15126fb1ef74867fc1434be1942e837932691f"
SOURCE = "Original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb"
CORPUS = "Hebrew Bible"
SAMPLES = 3
OSIS = "{http://www.bibletechnologies.net/2003/OSIS/namespace}"
CANTILLATION = re.compile("[֑-֯]")
TIGHT = {"־", "׃"}
BOOKS = [
    ("Gen", "Genesis"), ("Exod", "Exodus"), ("Lev", "Leviticus"), ("Num", "Numbers"), ("Deut", "Deuteronomy"),
    ("Josh", "Joshua"), ("Judg", "Judges"), ("Ruth", "Ruth"), ("1Sam", "1 Samuel"), ("2Sam", "2 Samuel"),
    ("1Kgs", "1 Kings"), ("2Kgs", "2 Kings"), ("1Chr", "1 Chronicles"), ("2Chr", "2 Chronicles"), ("Ezra", "Ezra"),
    ("Neh", "Nehemiah"), ("Esth", "Esther"), ("Job", "Job"), ("Ps", "Psalms"), ("Prov", "Proverbs"),
    ("Eccl", "Ecclesiastes"), ("Song", "Song of Songs"), ("Isa", "Isaiah"), ("Jer", "Jeremiah"), ("Lam", "Lamentations"),
    ("Ezek", "Ezekiel"), ("Dan", "Daniel"), ("Hos", "Hosea"), ("Joel", "Joel"), ("Amos", "Amos"),
    ("Obad", "Obadiah"), ("Jonah", "Jonah"), ("Mic", "Micah"), ("Nah", "Nahum"), ("Hab", "Habakkuk"),
    ("Zeph", "Zephaniah"), ("Hag", "Haggai"), ("Zech", "Zechariah"), ("Mal", "Malachi"),
]
BOOK_NAME = dict(BOOKS)
BOOK_ORDER = {b: i for i, (b, _n) in enumerate(BOOKS)}

def strongs(lemma):
    out = []
    for part in (lemma or "").split("/"):
        m = re.match(r"\s*(\d+)", part)
        if m:
            out.append(str(int(m.group(1))))
    return out

def clean(text):
    return CANTILLATION.sub("", (text or "").replace("/", ""))

def ref_name(osis_id):
    book, chapter, verse = osis_id.split(".")
    return f"{BOOK_NAME.get(book, book)} {chapter}:{verse}"

def verse_text(verse):
    out = ""
    for child in verse:
        tag = child.tag.replace(OSIS, "")
        if tag == "w":
            t = clean(child.text)
            out += t if not out or out[-1] in TIGHT else " " + t
        elif tag == "seg":
            t = child.text or ""
            out += t if t in TIGHT or not out else " " + t
    return out.strip()

def load(folder=WLC):
    verses = []
    for path in glob.glob(os.path.join(folder, "*.xml")):
        book = os.path.basename(path)[:-4]
        if book not in BOOK_ORDER:
            continue
        for v in ET.parse(path).getroot().iter(OSIS + "verse"):
            osis_id = v.get("osisID")
            _b, chapter, number = osis_id.split(".")
            nums = set()
            for w in v.findall(OSIS + "w"):
                nums.update(strongs(w.get("lemma")))
            verses.append({"osis": osis_id, "order": (BOOK_ORDER[book], int(chapter), int(number)), "text": verse_text(v), "strongs": nums})
    verses.sort(key=lambda x: x["order"])
    return verses

class Verses:
    def __init__(self, verses, entries):
        self.verses = verses
        self.by_strong = {}
        for i, v in enumerate(verses):
            for s in v["strongs"]:
                self.by_strong.setdefault(s, []).append(i)
        self.root_strongs = {}
        self.word_strongs = {}
        for eid, e in entries.items():
            main = oshb.root_of(entries, eid)
            if not main or not e.get("strong"):
                continue
            root = oshb.skeleton(main["etym_root"])
            self.root_strongs.setdefault(root, set()).add(e["strong"])
            for key in {oshb.skeleton(e["headword"]), oshb.defective(oshb.skeleton(e["headword"]))}:
                self.word_strongs.setdefault((key, root), set()).add(e["strong"])

    @classmethod
    def load(cls, folder=WLC, index=oshb.INDEX):
        if not os.path.isdir(folder) or not os.path.exists(index):
            return None
        verses = load(folder)
        return cls(verses, oshb.parse(index)) if verses else None

    def hits(self, word, root_form, limit=SAMPLES):
        root = oshb.skeleton(root_form)
        nums = self.root_strongs.get(root)
        if not nums:
            return None
        key = oshb.skeleton(word)
        own = self.word_strongs.get((key, root)) or self.word_strongs.get((oshb.defective(key), root)) or set()
        found = set()
        for s in nums:
            found.update(self.by_strong.get(s, ()))
        if not found:
            return None
        def rank(i):
            v = self.verses[i]
            return (0 if v["strongs"] & own else 1, len(v["text"]), v["order"])
        top = sorted(sorted(found, key=rank)[:limit], key=lambda i: self.verses[i]["order"])
        return {
            "corpus": CORPUS,
            "source": SOURCE,
            "root": oshb.dashed(root),
            "count": len(found),
            "samples": [{"ref": ref_name(self.verses[i]["osis"]), "text": self.verses[i]["text"]} for i in top],
        }

def write_silver(verses, path=oshb.SILVER):
    db = sqlite3.connect(path)
    with db:
        db.execute("drop table if exists verse")
        db.execute("drop table if exists lemma_verse")
        db.execute("create table verse (ref text primary key, book text, chapter integer, verse integer, text text)")
        db.execute("create table lemma_verse (strong text, ref text)")
        db.executemany("insert into verse values (?,?,?,?,?)", [(v["osis"], *v["osis"].split(".")[:1], v["order"][1], v["order"][2], v["text"]) for v in verses])
        db.executemany("insert into lemma_verse values (?,?)", [(s, v["osis"]) for v in verses for s in sorted(v["strongs"])])
        db.execute("create index lemma_verse_strong on lemma_verse (strong)")
    db.close()

def fetch(dest=WLC, commit=COMMIT):
    with tempfile.TemporaryDirectory() as tmp:
        for cmd in (["git", "init", "-q", tmp], ["git", "-C", tmp, "fetch", "-q", "--depth", "1", REPO, commit], ["git", "-C", tmp, "checkout", "-q", "FETCH_HEAD"]):
            subprocess.run(cmd, check=True)
        os.makedirs(dest, exist_ok=True)
        for path in glob.glob(os.path.join(tmp, "wlc", "*.xml")) + [os.path.join(tmp, "LICENSE.md")]:
            shutil.copy(path, dest)
    with open(os.path.join(dest, "SOURCE.txt"), "w", encoding="utf-8") as f:
        f.write(f"openscriptures/morphhb commit {commit}, wlc/*.xml and LICENSE.md\n")

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--wlc", default=WLC)
    ap.add_argument("--silver", default=oshb.SILVER)
    ap.add_argument("--fetch", action="store_true")
    a = ap.parse_args(argv)
    if a.fetch or not glob.glob(os.path.join(a.wlc, "*.xml")):
        fetch(a.wlc)
    verses = load(a.wlc)
    write_silver(verses, a.silver)
    print(json.dumps({"verses": len(verses), "strongs": len({s for v in verses for s in v["strongs"]}), "commit": COMMIT}))
    return 0

if __name__ == "__main__":
    sys.exit(main())
