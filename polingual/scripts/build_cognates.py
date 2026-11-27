#!/usr/bin/env python3
import argparse
import gzip
import hashlib
import json
import os
import sqlite3
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get("POLINGUAL_INPUT_BANDS_DIR", Path.home() / ".cache/polingual-input-bands"))
MANIFEST = ROOT / "polingual/public/input/manifest.json"
GRAPH = Path(os.environ.get("ROOT_GRAPH_DIR", ROOT / "_intake/root-graph")) / "graph-v4.sqlite"
RANKS = Path(os.environ.get("POLINGUAL_RANKS_DIR", ROOT / "_intake/polingual-frequency"))
TOP = 10_000
PER_LANG = 3
MAX_DEPTH = 64
EXCLUDED_ANCESTOR_LANGS = {"ine-pro"}
LINK_RELS = ("bor", "cal")
RULE = ("shared source: the forest ancestor chains of both words meet at a node outside Proto-Indo-European, or a "
        "bor or cal edge from one chain reaches, through its target's chain, a node of the other chain; the words share a "
        "translation sense")
CREDIT = "Etymology and translations from Wiktionary via Kaikki (kaikki.org), CC BY-SA 4.0"


def nfc(s):
    return unicodedata.normalize("NFC", s)


def top_lemmas(path, top=TOP):
    best = {}
    with gzip.open(path, "rt", encoding="utf-8") as f:
        next(f)
        for line in f:
            _, _, lemma, lrank, _ = line.rstrip("\n").split("\t")
            if lemma and lrank and not lemma.startswith("-") and not lemma.endswith("-"):
                r = int(lrank)
                if r < best.get(lemma, r + 1):
                    best[lemma] = r
    return {w: r for w, r in best.items() if r <= top}


class Graph:
    def __init__(self, db):
        self.db = db
        self.chains = {}
        self.extended = {}
        self.linked = {}
        self.langs = {}
        self.by_en = defaultdict(list)
        self.en_of = {}
        for sid, w in db.execute("select id, en_word from sense"):
            if w:
                self.by_en[nfc(w)].append(sid)
                self.en_of[sid] = w

    def node(self, lang, form):
        r = self.db.execute("select id from node where lang = ? and form = ?", (lang, nfc(form))).fetchone()
        return r[0] if r else None

    def lang(self, n):
        if n not in self.langs:
            r = self.db.execute("select lang from node where id = ?", (n,)).fetchone()
            self.langs[n] = r[0] if r else None
        return self.langs[n]

    def chain(self, n):
        if n not in self.chains:
            out, x = [], n
            for _ in range(MAX_DEPTH):
                if x is None or x in out:
                    break
                out.append(x)
                p = self.db.execute("select parent from forest where node = ?", (x,)).fetchone()
                x = p[0] if p else None
            self.chains[n] = out
        return self.chains[n]

    def ancestors(self, n):
        if n not in self.extended:
            self.extended[n] = {x for x in self.chain(n) if self.lang(x) not in EXCLUDED_ANCESTOR_LANGS}
        return self.extended[n]

    def links(self, n):
        if n not in self.linked:
            q = f"select dst from edge where src = ? and rel in ({','.join('?' * len(LINK_RELS))})"
            hops = {b for x in self.chain(n) for (b,) in self.db.execute(q, (x, *LINK_RELS))}
            self.linked[n] = {y for b in hops for y in self.chain(b) if self.lang(y) not in EXCLUDED_ANCESTOR_LANGS}
        return self.linked[n]

    def senses(self, n, lang, lemma):
        if lang == "en":
            return self.by_en.get(nfc(lemma), [])
        return [s for (s,) in self.db.execute("select sense from translation where node = ?", (n,))]

    def renderings(self, sense, langs):
        foreign = [l for l in langs if l != "en"]
        q = f"select n.id, n.lang, n.form from translation t join node n on n.id = t.node where t.sense = ? and n.lang in ({','.join('?' * len(foreign))})"
        out = self.db.execute(q, (sense, *foreign)).fetchall() if foreign else []
        if "en" in langs:
            w = self.en_of.get(sense)
            m = self.node("en", w) if w else None
            if m is not None:
                out.append((m, "en", w))
        return out


def shared_source(g, a, b):
    pa, pb = g.ancestors(a), g.ancestors(b)
    return bool(pa & pb or g.links(a) & pb or g.links(b) & pa)


def cognates_for(g, lang, lemma, held):
    n = g.node(lang, lemma)
    if n is None:
        return {}
    others = sorted(l for l in held if l != lang)
    out = defaultdict(list)
    for s in g.senses(n, lang, lemma):
        for m, l, form in g.renderings(s, others):
            if form in held[l] and form not in out[l] and len(out[l]) < PER_LANG and shared_source(g, n, m):
                out[l].append(form)
    return {l: sorted(v, key=lambda f: (held[l][f], f)) for l, v in sorted(out.items()) if v}


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 22), b""):
            h.update(chunk)
    return h.hexdigest()


def build(db_path, ranks_dir, langs, out_dir, top=TOP, graph_sha=None):
    db = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    g = Graph(db)
    held = {l: top_lemmas(ranks_dir / f"{l}.tsv.gz", top) for l in langs}
    out_dir.mkdir(parents=True, exist_ok=True)
    summary = {}
    for lang in langs:
        found = {}
        for lemma in sorted(held[lang], key=lambda w: (held[lang][w], w)):
            c = cognates_for(g, lang, lemma, held)
            if c:
                found[lemma] = c
        doc = {"format": "polingual-cognates", "lang": lang, "rule": RULE, "top": top, "perLang": PER_LANG,
               "graph": "graph-v4.sqlite", "graphSha256": graph_sha, "credit": CREDIT, "cognates": found}
        body = (json.dumps(doc, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode()
        name = f"cognates.{lang}.{hashlib.sha256(body).hexdigest()[:12]}.json"
        (out_dir / name).write_bytes(body)
        summary[lang] = {"file": name, "bytes": len(body), "lemmas": len(found)}
        print(lang, name, len(found), file=sys.stderr)
    return summary


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--langs", required=True)
    ap.add_argument("--graph", default=str(GRAPH))
    ap.add_argument("--ranks", default=str(RANKS))
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--manifest", default=str(MANIFEST))
    ap.add_argument("--top", type=int, default=TOP)
    a = ap.parse_args(argv)
    summary = build(Path(a.graph), Path(a.ranks), a.langs.split(","), Path(a.out), a.top, file_sha256(a.graph))
    record(Path(a.manifest), summary)


def record(manifest_path, summary):
    m = json.loads(manifest_path.read_text())
    m["cognates"] = {**m.get("cognates", {}), **summary}
    manifest_path.write_text(json.dumps(m, ensure_ascii=False, indent=1, sort_keys=True) + "\n")


if __name__ == "__main__":
    main()
