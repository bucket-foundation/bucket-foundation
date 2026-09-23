#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import multiprocessing as mp
import os
import re
import sqlite3
import sys
import time

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CACHE_DIR = os.path.join(REPO_ROOT, "_intake", "photons", "kaikki-cache")
OUT_DB = os.path.join(REPO_ROOT, "_intake", "photons", "roots.sqlite")

PRIORITY = [
    "Hebrew", "Arabic", "Sanskrit", "Chinese", "Latin", "Ancient_Greek",
    "Akkadian", "Sumerian", "Egyptian", "Coptic", "Gothic", "Old_English",
    "Old_Norse", "English", "Greek", "Persian", "Hindi", "Tamil", "Japanese",
    "Korean", "Russian", "German", "French", "Spanish", "Italian", "Portuguese",
    "Dutch", "Swedish", "Polish", "Czech", "Turkish", "Finnish", "Indonesian",
    "Thai", "Vietnamese",
]

CHAIN_RELS = {
    "inh": "inh", "inh+": "inh", "inh-lite": "inh", "der": "der", "der+": "der",
    "der-lite": "der", "uder": "der", "bor": "bor", "bor+": "bor", "lbor": "bor",
    "slbor": "bor", "ubor": "bor", "obor": "bor", "lw": "bor", "psm": "bor",
    "calque": "calque", "cal": "calque", "sl": "calque",
}
ETYMON_RELS = {
    "inh": "inh", "der": "der", "bor": "bor", "lbor": "bor", "slbor": "bor",
    "ubor": "bor", "obor": "bor", "af": "af", "root": "root", "calque": "calque",
    "cal": "calque", "psm": "bor", "uder": "der", "unc": "der", "dbt": "der",
}
KEYWORD_RELS = {
    "inherited": "inh", "derived": "der", "borrowed": "bor", "learned borrowing": "bor",
    "semi-learned borrowing": "bor", "orthographic borrowing": "bor", "calque": "calque",
    "affix": "af", "compound": "af", "partial calque": "calque", "semantic loan": "calque",
}
AFFIX_TEMPLATES = {"af", "affix", "suf", "suffix", "pre", "prefix", "com", "compound", "con", "confix", "surf", "blend", "univ"}
TEXT_GLOSS_RE = re.compile(r"(\*?[^\s,;:()“”]+) \((?:[^()“”]*?, )?“([^”]+)”\)")
SEMITIC_ROOT_TEMPLATES = {"he-rootbox": "he", "he-root": "he", "he-root-link": "he", "ar-rootbox": "ar", "ar-root": "ar"}

def clean(s):
    if not isinstance(s, str):
        return ""
    return s.strip()

def template_gloss(args, pos_key="5"):
    for k in ("t", "gloss", pos_key):
        v = clean(args.get(k))
        if v:
            return v
    return ""

def is_proto(lang):
    return lang.endswith("-pro")

def is_affix(term, lang):
    t = term.lstrip("*")
    if t.startswith("-"):
        return True
    return t.endswith("-") and not is_proto(lang)

def parse_etymon_spec(spec):
    out = []
    pos = 0
    n = len(spec)

    def read_term(i, rel):
        j = i
        while j < n and spec[j] not in "<>":
            j += 1
        head = spec[i:j]
        if ":" not in head:
            return None, j
        lang, term = head.split(":", 1)
        node = {"lang": lang.strip(), "term": term.strip(), "rel": rel, "gloss": "", "parents": []}
        while j < n and spec[j] == "<":
            k = spec.find(":", j)
            if k < 0:
                break
            key = spec[j + 1:k]
            if key == "ety":
                m = spec.find("<", k)
                depth_end = m if m >= 0 else n
                sub_rel = ETYMON_RELS.get(spec[k + 1:depth_end].strip(), spec[k + 1:depth_end].strip())
                j = depth_end + 1
                while j < n:
                    child, j = read_term(j, sub_rel)
                    if child:
                        node["parents"].append(child)
                    if j < n and spec[j] == ",":
                        j += 1
                        continue
                    break
                depth = 1
                while j < n and depth > 0:
                    if spec[j] == ">":
                        depth -= 1
                    j += 1
            else:
                depth = 1
                m = k + 1
                while m < n and depth > 0:
                    if spec[m] == "<":
                        depth += 1
                    elif spec[m] == ">":
                        depth -= 1
                    m += 1
                val = spec[k + 1:m - 1]
                if key in ("t", "gloss") and not node["gloss"]:
                    node["gloss"] = val.strip()
                if key == "id" and not node["gloss"]:
                    node["id"] = val.strip()
                j = m
        return node, j

    while pos < n:
        node, pos = read_term(pos, "")
        if node:
            out.append(node)
        while pos < n and spec[pos] in ", >":
            pos += 1
        if node is None:
            break
    return out

TOKEN_RE = re.compile(r'"((?:[^"\\]|\\.)*)"|([\[\]{}:,])|(-?\d+(?:\.\d+)?|true|false|null)|(\s+)')

def tolerant_tree(fragment):
    start = fragment.find('"terms" : [')
    if start < 0:
        return None
    s = fragment[start:]
    base = {"kind": "obj", "val": {}, "key": None, "expect_value": False}
    stack = [base]

    def attach(value):
        top = stack[-1]
        if top["kind"] == "list":
            top["val"].append(value)
        else:
            if top["key"] is not None and top["expect_value"]:
                top["val"][top["key"]] = value
            top["key"] = None
            top["expect_value"] = False

    pos = 0
    last_root = None
    while pos < len(s):
        m = TOKEN_RE.match(s, pos)
        if not m:
            break
        pos = m.end()
        if m.group(4):
            continue
        if m.group(1) is not None:
            text = m.group(1).replace('\\"', '"')
            top = stack[-1]
            if top["kind"] == "obj" and not top["expect_value"]:
                top["key"] = text
            else:
                attach(text)
            continue
        p = m.group(2)
        if p is None:
            attach(m.group(3))
            continue
        if p == ":":
            stack[-1]["expect_value"] = True
        elif p == ",":
            pass
        elif p == "{":
            stack.append({"kind": "obj", "val": {}, "key": None, "expect_value": False})
        elif p == "[":
            stack.append({"kind": "list", "val": [], "key": None, "expect_value": False})
        elif p in "}]":
            want = "obj" if p == "}" else "list"
            if len(stack) > 1 and stack[-1]["kind"] == want:
                done = stack.pop()
                attach(done["val"])
            elif len(stack) == 1:
                done = stack[0]
                if want == "obj" and done["kind"] == "obj":
                    last_root = done["val"]
                    stack[0] = {"kind": "list", "val": [done["val"]], "key": None, "expect_value": False}
                elif want == "list" and done["kind"] == "list":
                    stack[0] = {"kind": "obj", "val": {"_list": done["val"]}, "key": None, "expect_value": False}
                else:
                    break
            else:
                break
    return last_root

def groups_of(node):
    ch = node.get("children")
    if ch is None:
        ch = node.get("_list")
    return [g for g in ch or [] if isinstance(g, dict)]

def terms_of(group):
    t = group.get("terms")
    if t is None:
        t = group.get("_list")
    return [x for x in t or [] if isinstance(x, dict)]

def subtree_depth(term, seen=0):
    if seen > 40:
        return 0
    best = 0
    for g in groups_of(term):
        for t in terms_of(g):
            if isinstance(t, dict):
                best = max(best, 1 + subtree_depth(t, seen + 1))
    return best

def tree_main_chain(root):
    chain = []
    node = root
    guard = 0
    while isinstance(node, dict) and guard < 40:
        guard += 1
        groups = groups_of(node)
        best = None
        best_key = None
        for g in groups:
            rel = KEYWORD_RELS.get(clean(g.get("keyword")), clean(g.get("keyword")) or "der")
            for t in terms_of(g):
                if not t.get("term"):
                    continue
                key = (0 if is_affix(t.get("term", ""), t.get("lang", "")) else 1, subtree_depth(t))
                if best_key is None or key > best_key:
                    best, best_key = (t, rel), key
        if not best or best_key[0] == 0:
            break
        t, rel = best
        chain.append({"lang": clean(t.get("lang")), "term": clean(t.get("term")), "rel": rel, "gloss": clean(t.get("id"))})
        node = t
    return chain

def spec_main_chain(nodes):
    chain = []
    cur = nodes
    guard = 0
    while cur and guard < 40:
        guard += 1
        pick = None
        for n in cur:
            if not is_affix(n["term"], n["lang"]):
                pick = n
                break
        if pick is None:
            break
        chain.append({"lang": pick["lang"], "term": pick["term"], "rel": pick["rel"] or "der", "gloss": pick.get("gloss") or pick.get("id", "")})
        cur = pick["parents"]
    return chain

def affix_step(name, args):
    lang = clean(args.get("1"))
    comps = []
    i = 2
    while clean(args.get(str(i))) or clean(args.get(str(i + 1))):
        form = clean(args.get(str(i)))
        k = i - 1
        gloss = clean(args.get("t" + str(k))) or clean(args.get("gloss" + str(k)))
        clang = clean(args.get("lang" + str(k))) or lang
        if form:
            comps.append((clang, form, gloss))
        i += 1
    if name in ("pre", "prefix") and len(comps) > 1:
        comps = comps[1:]
    for clang, form, gloss in comps:
        if not is_affix(form, clang):
            return {"lang": clang, "term": form, "rel": "af", "gloss": gloss}
    return None

def text_glosses(text):
    out = {}
    for m in TEXT_GLOSS_RE.finditer(text or ""):
        form, gloss = m.group(1), m.group(2).strip()
        if form not in out and gloss and len(gloss) < 120:
            out[form] = gloss
    return out

def first_gloss(entry):
    for s in entry.get("senses") or []:
        gl = s.get("glosses") or s.get("raw_glosses")
        if gl:
            g = clean(gl[-1] if len(gl) > 1 else gl[0])
            if g:
                return g
    return ""

def sense_text(entry):
    out = []
    for sense in (entry.get("senses") or [])[:8]:
        g = clean((sense.get("glosses") or [""])[-1])
        if g:
            out.append(g)
    return "; ".join(out)[:400]

def romanization(entry):
    for f in entry.get("forms") or []:
        if "romanization" in (f.get("tags") or []):
            return clean(f.get("form"))
    for h in entry.get("head_templates") or []:
        tr = clean((h.get("args") or {}).get("tr"))
        if tr:
            return tr
    return ""

def first_ipa(entry):
    for s in entry.get("sounds") or []:
        if s.get("ipa"):
            return clean(s["ipa"])
    return ""

def split_zh(word):
    return clean(word.split(" /")[0].split("／")[0])

def extract_entry(entry, with_translations):
    lang = clean(entry.get("lang_code"))
    word = clean(entry.get("word"))
    if not lang or not word:
        return None
    pos = clean(entry.get("pos"))
    gloss = first_gloss(entry)
    rows = {"word": [(lang, word, pos, gloss, romanization(entry), first_ipa(entry))], "etym": [], "root": [], "word_root": [], "translation": [], "text_gloss": []}
    tg = text_glosses(entry.get("etymology_text"))
    for form, g in tg.items():
        rows["text_gloss"].append((form, g))
    if pos == "root" and gloss:
        rows["root"].append((lang, word, gloss))
    templates = entry.get("etymology_templates") or []
    chain = []
    affix = None
    tree_chain = None
    for t in templates:
        name = t.get("name") or ""
        args = t.get("args") or {}
        if name == "etymon":
            rel = clean(args.get("2")).lstrip(":")
            spec = clean(args.get("3"))
            if rel == "root":
                form = spec.split("<")[0]
                if form:
                    rows["word_root"].append((lang, word, lang, form, "root"))
                continue
            if args.get("tree") and tree_chain is None:
                root = tolerant_tree(t.get("expansion") or "")
                if root:
                    tc = tree_main_chain(root)
                    if tc:
                        tree_chain = tc
                        continue
            if spec and tree_chain is None:
                nodes = parse_etymon_spec(spec)
                for n in nodes:
                    n["rel"] = ETYMON_RELS.get(rel, rel or "der")
                sc = spec_main_chain(nodes)
                if sc:
                    tree_chain = sc
        elif name in CHAIN_RELS:
            anc_lang = clean(args.get("2"))
            form = clean(args.get("3")) or clean(args.get("4"))
            if anc_lang and form and form != "-":
                chain.append({"lang": anc_lang, "term": form, "rel": CHAIN_RELS[name], "gloss": template_gloss(args)})
        elif name in AFFIX_TEMPLATES:
            if affix is None:
                affix = affix_step(name, args)
        elif name in SEMITIC_ROOT_TEMPLATES:
            form = clean(args.get("1"))
            if form:
                rows["word_root"].append((lang, word, SEMITIC_ROOT_TEMPLATES[name], form, "root"))
        elif name == "root":
            anc_lang = clean(args.get("2"))
            for k in ("3", "4", "5"):
                form = clean(args.get(k))
                if anc_lang and form:
                    rows["word_root"].append((lang, word, anc_lang, form, "root"))
        elif name == "sa-root":
            form = clean(args.get("1"))
            if form:
                rows["word_root"].append((lang, word, "sa", form, "root"))
                g = template_gloss(args, "2")
                if g:
                    rows["root"].append(("sa", form, g))
        elif name == "Han compound":
            i = 1
            while clean(args.get(str(i))):
                comp = clean(args.get(str(i)))
                g = clean(args.get("t" + str(i)))
                rows["word_root"].append((lang, word, lang, comp, "component"))
                if g:
                    rows["root"].append((lang, comp, g))
                i += 1
    final = tree_chain if tree_chain else chain
    if not final and affix:
        final = [affix]
    if not final:
        for sense in entry.get("senses") or []:
            base = next((clean(f.get("word")) for f in sense.get("form_of") or [] if clean(f.get("word"))), "")
            if base and base != word:
                final = [{"lang": lang, "term": base, "rel": "form", "gloss": ""}]
                break
    for c in final:
        if c["term"] in tg:
            c["gloss"] = tg[c["term"]]
    seen = set()
    for ordn, c in enumerate(final):
        key = (c["lang"], c["term"])
        if key in seen:
            continue
        seen.add(key)
        rows["etym"].append((lang, word, c["rel"], c["lang"], c["term"], c["gloss"], ordn))
        if c["gloss"] and is_proto(c["lang"]):
            rows["root"].append((c["lang"], c["term"], c["gloss"]))
    for c in chain:
        if c["gloss"] and is_proto(c["lang"]) and (c["lang"], c["term"]) not in seen:
            rows["root"].append((c["lang"], c["term"], c["gloss"]))
    if final:
        deepest = final[-1]
        if is_proto(deepest["lang"]):
            rows["word_root"].append((lang, word, deepest["lang"], deepest["term"], "proto"))
    ety = entry.get("etymology_number") or 0
    rows["word"] = [(lang, word, pos, ety, gloss, romanization(entry), first_ipa(entry), sense_text(entry))]
    rows["etym"] = [r + (ety,) for r in rows["etym"]]
    rows["word_root"] = [r + (ety,) for r in rows["word_root"]]
    if with_translations:
        tr_seen = set()
        pools = [(-1, None, entry.get("translations") or [])]
        for i, s in enumerate(entry.get("senses") or []):
            if s.get("translations"):
                pools.append((i, ",".join(s.get("topics") or []), s["translations"]))
        for idx, topics, trs in pools:
            for tr in trs:
                tl = clean(tr.get("lang_code") or tr.get("code"))
                tw = clean(tr.get("word"))
                if not tl or not tw:
                    continue
                if tl in ("zh", "cmn", "yue", "wuu", "nan", "hak", "lzh"):
                    tw = split_zh(tw)
                sense = clean(tr.get("sense"))
                k = (sense, tl, tw)
                if k in tr_seen:
                    continue
                tr_seen.add(k)
                rows["translation"].append((word, pos, sense, idx, topics or "", tl, tw, clean(tr.get("roman"))))
    return rows

def process_batch(args):
    lines, with_translations = args
    agg = {"word": [], "etym": [], "root": [], "word_root": [], "translation": [], "text_gloss": []}
    bad = 0
    for raw in lines:
        try:
            entry = json.loads(raw)
        except ValueError:
            bad += 1
            continue
        r = extract_entry(entry, with_translations)
        if not r:
            continue
        for k, v in r.items():
            agg[k].extend(v)
    return agg, bad

SCHEMA = """
create table if not exists word (lang text, word text, pos text, ety integer, gloss text, roman text, ipa text, senses text, primary key (lang, word, pos, ety));
create table if not exists etym (lang text, word text, rel text, anc_lang text, anc_form text, anc_gloss text, ord integer, ety integer, primary key (lang, word, ety, anc_lang, anc_form));
create table if not exists root (lang text, form text, gloss text, n integer default 1, primary key (lang, form));
create table if not exists word_root (lang text, word text, root_lang text, root_form text, kind text, ety integer, primary key (lang, word, ety, root_lang, root_form));
create table if not exists translation (en_word text, en_pos text, sense text, sense_idx integer, topics text, lang text, word text, roman text);
create table if not exists text_gloss (form text, gloss text, n integer default 1, primary key (form, gloss));
create table if not exists progress (file text primary key, offset integer, lines integer, done integer, updated real);
create table if not exists ar_root_gloss (root text primary key, form text, gloss text, entry text);
"""
INDEXES = """
create index if not exists translation_en on translation (en_word);
create index if not exists translation_lang_word on translation (lang, word);
create index if not exists word_root_root on word_root (root_lang, root_form);
create index if not exists etym_anc on etym (anc_lang, anc_form);
"""

def open_db(path):
    db = sqlite3.connect(path)
    db.execute("pragma journal_mode=wal")
    db.execute("pragma synchronous=normal")
    db.executescript(SCHEMA)
    return db

def write_rows(db, agg):
    db.executemany("insert or ignore into word values (?,?,?,?,?,?,?,?)", agg["word"])
    db.executemany("insert or ignore into etym values (?,?,?,?,?,?,?,?)", agg["etym"])
    db.executemany(
        "insert into root (lang, form, gloss) values (?,?,?) on conflict (lang, form) do update set n = n + 1, gloss = case when root.gloss = '' then excluded.gloss else root.gloss end",
        agg["root"],
    )
    db.executemany("insert or ignore into word_root values (?,?,?,?,?,?)", agg["word_root"])
    db.executemany("insert into translation values (?,?,?,?,?,?,?,?)", agg["translation"])
    db.executemany("insert into text_gloss (form, gloss) values (?,?) on conflict (form, gloss) do update set n = n + 1", agg["text_gloss"])

def run_file(db, pool, path, workers, batch_bytes, translations):
    name = os.path.basename(path)
    row = db.execute("select offset, lines, done from progress where file = ?", (name,)).fetchone()
    if row and row[2]:
        print(f"{name}: already done", flush=True)
        return
    offset, nlines = (row[0], row[1]) if row else (0, 0)
    total = os.path.getsize(path)
    t0 = time.time()
    with open(path, "rb") as fh:
        fh.seek(offset)
        it = iter_batches(fh, batch_bytes)
        while True:
            window = []
            for _ in range(workers * 2):
                try:
                    window.append(next(it))
                except StopIteration:
                    break
            if not window:
                break
            results = pool.map(process_batch, [(lines, translations) for lines, _ in window])
            with db:
                for (lines, end), (agg, _bad) in zip(window, results):
                    write_rows(db, agg)
                    nlines += len(lines)
                    offset = end
                db.execute(
                    "insert into progress values (?,?,?,0,?) on conflict (file) do update set offset = excluded.offset, lines = excluded.lines, updated = excluded.updated",
                    (name, offset, nlines, time.time()),
                )
            rate = (offset / max(time.time() - t0, 1e-6)) / 1e6
            print(f"{name}: {offset / total:6.1%} {nlines} lines {rate:.1f} MB/s", flush=True)
    with db:
        db.execute("update progress set done = 1 where file = ?", (name,))
    print(f"{name}: done, {nlines} lines in {time.time() - t0:.0f}s", flush=True)

def iter_batches(fh, max_bytes):
    while True:
        lines = []
        size = 0
        while size < max_bytes:
            raw = fh.readline()
            if not raw:
                break
            lines.append(raw)
            size += len(raw)
        if not lines:
            return
        yield lines, fh.tell()

def print_counts(db):
    print("lang      words    etym   roots  word_root  translations_to")
    langs = [r[0] for r in db.execute("select lang from word group by lang order by count(*) desc")]
    tcounts = dict(db.execute("select lang, count(*) from translation group by lang"))
    for lang in langs:
        w = db.execute("select count(*) from word where lang = ?", (lang,)).fetchone()[0]
        e = db.execute("select count(distinct word) from etym where lang = ?", (lang,)).fetchone()[0]
        r = db.execute("select count(*) from root where lang = ?", (lang,)).fetchone()[0]
        wr = db.execute("select count(*) from word_root where lang = ?", (lang,)).fetchone()[0]
        print(f"{lang:8} {w:8} {e:7} {r:7} {wr:9} {tcounts.get(lang, 0):9}")
    proto = db.execute("select count(*) from root where lang like '%-pro'").fetchone()[0]
    print("proto roots with gloss:", proto)
    for t in ("word", "etym", "root", "word_root", "translation", "text_gloss"):
        print(t, db.execute(f"select count(*) from {t}").fetchone()[0])

AR_LETTERS = re.compile("[\u0621-\u064a]")
AR_FORMS = ["I", "Iq", "II", "IIq", "III", "IIIq", "IV", "IVq", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"]
AR_BASE_FORMS = {"I", "Iq"}
AR_HAMZA = str.maketrans("أإؤئآ", "ءءءءء")
AR_GLOSS_SKIP = ("form ", "verbal noun of", "alternative form", "alternative spelling", "active participle of", "passive participle of")
AR_GLOSS_CAP = 60

def ar_root_key(text):
    return "".join(AR_LETTERS.findall(text or "")).translate(AR_HAMZA)

def ar_verb_root(entry):
    for t in entry.get("etymology_templates", []) + entry.get("head_templates", []):
        args = t.get("args", {}) or {}
        if t.get("name") in ("ar-rootbox", "ar-root"):
            key = ar_root_key("".join(args.get(k, "") for k in ("1", "2", "3", "4")))
            if key:
                return key
        if t.get("name") == "etymon":
            for v in args.values():
                if isinstance(v, str) and "<id:root>" in v:
                    key = ar_root_key(v.split("<")[0])
                    if key:
                        return key
    return ""

def ar_verb_form(entry):
    for t in entry.get("head_templates", []):
        if t.get("name") == "ar-verb":
            head = ((t.get("args", {}) or {}).get("1", "") or "").split("/")[0].split(".")[0].split("-")[0].strip()
            return head if head in AR_FORMS else ""
    return ""

def ar_short_gloss(gloss):
    g = re.sub(r"\s*\([^)]*\)", "", gloss or "").strip()
    g = g.split(";")[0]
    parts = [p.strip() for p in g.split(",") if p.strip()]
    return ", ".join(parts[:2])[:AR_GLOSS_CAP].rstrip(" ,")

def ar_first_gloss(entry):
    for sense in entry.get("senses", []):
        for g in (sense.get("glosses") or [])[:1]:
            if g and not g.lower().startswith(AR_GLOSS_SKIP):
                short = ar_short_gloss(g)
                if short:
                    return short
    return ""

def ar_root_glosses(lines):
    best = {}
    for line in lines:
        if '"pos": "verb"' not in line:
            continue
        entry = json.loads(line)
        if entry.get("pos") != "verb":
            continue
        root, form = ar_verb_root(entry), ar_verb_form(entry)
        gloss = ar_first_gloss(entry) if root and form else ""
        if not gloss:
            continue
        rank = 0 if form in AR_BASE_FORMS else AR_FORMS.index(form)
        if root not in best or rank < best[root][0]:
            best[root] = (rank, form, gloss, entry.get("word", ""))
    return {root: (form, gloss, word) for root, (_r, form, gloss, word) in best.items()}

def write_ar_root_gloss(db, glosses):
    with db:
        db.execute("delete from ar_root_gloss")
        db.executemany("insert into ar_root_gloss values (?,?,?,?)", [(r, f, g, w) for r, (f, g, w) in sorted(glosses.items())])

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=CACHE_DIR)
    ap.add_argument("--out", default=OUT_DB)
    ap.add_argument("--langs", default="")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--batch-mb", type=float, default=4)
    ap.add_argument("--counts", action="store_true")
    ap.add_argument("--ar-root-gloss", action="store_true")
    a = ap.parse_args(argv)
    db = open_db(a.out)
    if a.ar_root_gloss:
        with open(os.path.join(a.cache, "Arabic.jsonl"), encoding="utf-8") as fh:
            glosses = ar_root_glosses(fh)
        write_ar_root_gloss(db, glosses)
        print(json.dumps({"roots": len(glosses), "base_form": sum(1 for f, _g, _w in glosses.values() if f in AR_BASE_FORMS)}))
        return 0
    if a.counts:
        print_counts(db)
        return 0
    available = {os.path.splitext(f)[0] for f in os.listdir(a.cache) if f.endswith(".jsonl")}
    wanted = [x for x in a.langs.split(",") if x] or [x for x in PRIORITY if x in available] + sorted(available - set(PRIORITY))
    with mp.Pool(a.workers) as pool:
        for lang in wanted:
            path = os.path.join(a.cache, lang + ".jsonl")
            if not os.path.exists(path):
                print(f"{lang}: missing", file=sys.stderr)
                continue
            run_file(db, pool, path, a.workers, int(a.batch_mb * 1e6), lang == "English")
    db.executescript(INDEXES)
    print_counts(db)
    return 0

if __name__ == "__main__":
    sys.exit(main())
