from __future__ import annotations

import gzip
import os
import re
import sqlite3
import sys
import time
import unicodedata

import numpy as np
import orjson

INH = {"inh", "inh+", "inherited", "inh-lite"}
BOR = {"bor", "bor+", "borrowed", "lbor", "learned borrowing", "slbor", "ubor", "obor", "lbor+", "slbor+"}
DER = {"der", "der+", "derived", "uder", "der-lite"}
COG = {"cog", "cognate", "ncog", "noncog", "cog+"}
CAL = {"cal", "calque", "clq", "cal+", "pcal", "partial calque", "sl", "semantic loan"}
AFF = {"af", "affix", "compound", "com", "suffix", "suf", "prefix", "pre", "confix", "con", "blend"}
ETYMON_REL = {"inh": "inh", "bor": "bor", "lbor": "bor", "slbor": "bor", "ubor": "bor", "obor": "bor",
              "der": "der", "uder": "der", "cal": "cal", "calque": "cal", "sl": "cal", "af": "af", "afeq": "af"}
LINEAGE = {"inh", "bor", "der", "cal"}
ANGLE = re.compile(r"<[^>]*>")


def classify(name: str) -> str | None:
    if name in INH:
        return "inh"
    if name in BOR:
        return "bor"
    if name in DER:
        return "der"
    if name in COG:
        return "cog"
    if name in CAL:
        return "cal"
    if name in AFF:
        return "af"
    return None


ALWAYS_DROP = {"\u0304", "\u0306", "\u0311"}
ACCENT_LANGS = {"ru", "uk", "be", "bg", "mk", "sh", "orv", "cu", "rue", "sl"}
DOT_LANGS = {"ang", "enm"}


def entry_name(lang: str, form: str) -> str:
    drop = set(ALWAYS_DROP)
    if lang in ACCENT_LANGS:
        drop |= {"\u0301", "\u0300"}
    if lang in DOT_LANGS:
        drop.add("\u0307")
    nfd = unicodedata.normalize("NFD", form)
    if not any(ch in drop for ch in nfd):
        return form
    return unicodedata.normalize("NFC", "".join(ch for ch in nfd if ch not in drop))


def clean(form: str | None) -> str | None:
    if not form:
        return None
    form = ANGLE.sub("", form).strip()
    if not form or form == "-" or len(form) > 80:
        return None
    return form


def template_edges(t: dict, src_lang: str):
    name = t.get("name", "")
    a = t.get("args") or {}
    if name in ("etymon", "ety"):
        rel = None
        i = 2
        while str(i) in a:
            v = a[str(i)]
            i += 1
            if v.startswith(":"):
                rel = ETYMON_REL.get(v[1:].split("<")[0])
                continue
            if rel is None:
                continue
            lang, _, form = v.partition(":") if ":" in v.split("<")[0] else (src_lang, "", v)
            form = clean(form)
            if form:
                yield rel, lang, form, name
        return
    rel = classify(name)
    if rel is None:
        return
    if rel == "cog":
        lang, form = a.get("1"), clean(a.get("2"))
        if lang and form:
            yield rel, lang, form, name
        return
    if rel == "af":
        i = 2
        while str(i) in a:
            form = clean(a[str(i)])
            i += 1
            if form:
                lang, sep, rest = form.partition(":")
                if sep and 1 < len(lang) < 12 and " " not in lang:
                    yield rel, lang, rest, name
                else:
                    yield rel, src_lang, form, name
        return
    lang, form = a.get("2"), clean(a.get("3"))
    if lang and form:
        yield rel, lang, form, name


def ipa_of(d: dict) -> str | None:
    for s in d.get("sounds") or ():
        if "ipa" in s:
            return s["ipa"][:120]
    return None


SCHEMA = """
create table node(id integer primary key, lang text, form text, proto integer);
create table lexeme(node integer, pos text, ety integer, ipa text, page integer, cls text);
create table edge(src integer, dst integer, rel text, tmpl text, page integer, ord integer);
create table sense(id integer primary key, en_word text, en_pos text, gloss text);
create table translation(sense integer, node integer);
create table page(id integer primary key, lang text, word text, pos text, ety integer);
create table meta(k text primary key, v text);
"""


def main(src: str, out: str) -> None:
    if os.path.exists(out):
        os.remove(out)
    db = sqlite3.connect(out)
    db.executescript("pragma journal_mode=off; pragma synchronous=off;" + SCHEMA)
    ids: dict[tuple[str, str], int] = {}
    new_nodes: list = []
    senses: dict[tuple, int] = {}
    buf = {"lexeme": [], "edge": [], "translation": [], "page": [], "sense": []}

    def nid(lang: str, form: str) -> int:
        form = entry_name(lang, form)
        k = (lang, form)
        i = ids.get(k)
        if i is None:
            i = len(ids)
            ids[k] = i
            new_nodes.append((i, lang, form, int(form.startswith("*") or lang.endswith("-pro"))))
        return i

    def flush() -> None:
        db.executemany("insert into node values(?,?,?,?)", new_nodes)
        new_nodes.clear()
        for t, rows in buf.items():
            if rows:
                db.executemany(f"insert into {t} values({','.join('?' * len(rows[0]))})", rows)
                rows.clear()
        db.commit()

    t0 = time.time()
    n = 0
    with gzip.open(src, "rb") as fh:
        for line in fh:
            d = orjson.loads(line)
            lang, word = d.get("lang_code"), d.get("word")
            if not lang or not word:
                continue
            n += 1
            ety = d.get("etymology_number") or 0
            me = nid(lang, word)
            page = n
            buf["page"].append((page, lang, word, d.get("pos"), ety))
            cur = me
            first = None
            seen = set()
            for k, t in enumerate(d.get("etymology_templates") or ()):
                for rel, alang, aform, tmpl in template_edges(t, lang):
                    a = nid(alang, aform)
                    if a == me or (rel, a) in seen:
                        continue
                    seen.add((rel, a))
                    if first is None and rel != "cog":
                        first = rel
                    if rel in LINEAGE:
                        buf["edge"].append((cur, a, rel, tmpl, page, k))
                        cur = a
                    else:
                        buf["edge"].append((me, a, rel, tmpl, page, k))
            buf["lexeme"].append((me, d.get("pos"), ety, ipa_of(d), page, first))
            if lang == "en":
                for tr in d.get("translations") or ():
                    tl, tw = tr.get("lang_code") or tr.get("code"), tr.get("word")
                    if not tl or not tw or tl == "en":
                        continue
                    sk = (word, d.get("pos"), tr.get("sense") or "")
                    s = senses.get(sk)
                    if s is None:
                        s = len(senses)
                        senses[sk] = s
                        buf["sense"].append((s, *sk))
                    buf["translation"].append((s, nid(tl, tw)))
            if n % 200000 == 0:
                flush()
                print(f"{n} entries {len(ids)} nodes {time.time() - t0:.0f}s", file=sys.stderr, flush=True)
    flush()
    del senses
    db.execute("insert into meta values('entries',?)", (n,))
    db.execute("insert into meta values('source',?)", (os.path.basename(src),))
    db.commit()
    build_forest(db, len(ids))
    db.close()


def build_forest(db: sqlite3.Connection, n: int) -> None:
    parent = np.full(n, -1, np.int64)
    cut = 0
    for s, a in db.execute("select src, dst from edge where rel='inh' order by page, ord"):
        if parent[s] != -1 or s == a:
            continue
        x, steps = a, 0
        while x != -1 and x != s and steps < 200:
            x = parent[x]
            steps += 1
        if x == s or steps >= 200:
            cut += 1
            continue
        parent[s] = a
    depth = np.full(n, -1, np.int64)
    root = np.full(n, -1, np.int64)
    for i in range(n):
        if depth[i] != -1:
            continue
        path = []
        x = i
        while x != -1 and depth[x] == -1:
            path.append(x)
            x = parent[x]
        d, r = (depth[x], root[x]) if x != -1 else (-1, path[-1])
        for y in reversed(path):
            d += 1
            depth[y] = d
            root[y] = r
    db.execute("create table forest(node integer primary key, parent integer, depth integer, root integer)")
    db.executemany("insert into forest values(?,?,?,?)",
                   ((i, int(parent[i]) if parent[i] != -1 else None, int(depth[i]), int(root[i])) for i in range(n)))
    db.execute("insert into meta values('cycle_cuts',?)", (cut,))
    for ix in ("create index node_lf on node(lang, form)", "create index edge_src on edge(src)",
               "create index edge_dst on edge(dst)", "create index lex_node on lexeme(node)",
               "create index tr_s on translation(sense)", "create index tr_n on translation(node)"):
        db.execute(ix)
    db.commit()


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
