from __future__ import annotations

import glob
import gzip
import html
import json
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
COG = {"cog", "cognate", "cog+"}
CAL = {"cal", "calque", "clq", "cal+", "pcal", "partial calque", "sl", "semantic loan"}
AFF = {"af", "affix", "compound", "com", "suffix", "suf", "prefix", "pre", "confix", "con", "blend"}
ETYMON_REL = {"inh": "inh", "bor": "bor", "lbor": "bor", "slbor": "bor", "ubor": "bor", "obor": "bor",
              "der": "der", "uder": "der", "cal": "cal", "calque": "cal", "sl": "cal", "af": "af", "afeq": "af"}
TREE_REL = {"inherited": "inh", "bor": "bor", "lbor": "bor", "slbor": "bor", "ubor": "bor", "obor": "bor",
            "derived": "der", "from": "der", "uder": "der", "nominalization": "der", "deverbal": "der",
            "back-formation": "der", "clipping": "der", "root": "der", "denominal": "der",
            "affix": "af", "afeq": "af", "blend": "af", "univerbation": "af",
            "calque": "cal", "partial calque": "cal", "semantic loan": "cal"}
LINEAGE = {"inh", "bor", "der", "cal"}
LIGATURES = str.maketrans({"œ": "oe", "Œ": "Oe", "æ": "ae", "Æ": "Ae"})
ALWAYS_DROP = {"̄", "̆", "̑"}
ACCENT_LANGS = {"ru", "uk", "be", "bg", "mk", "sh", "orv", "cu", "rue", "sl"}
DOT_LANGS = {"ang", "enm"}
PROTO_ACCENT_LANGS = {"sla-pro", "ine-bsl-pro", "zle-ort"}
PROTO_ACCENTS = {"\u0300", "\u0301", "\u030f", "\u0311", "\u0303", "\u0302"}
LANG_CODE = re.compile(r"^[a-z]{2,3}(-[a-zA-Z]{2,5}){0,3}$")
TREE_DEC = json.JSONDecoder()


def classify(name: str) -> str | None:
    for rel, names in (("inh", INH), ("bor", BOR), ("der", DER), ("cog", COG), ("cal", CAL), ("af", AFF)):
        if name in names:
            return rel
    return None


def entry_name(lang: str, form: str) -> str:
    drop = set(ALWAYS_DROP)
    if lang in ACCENT_LANGS:
        drop |= {"́", "̀"}
    if lang in DOT_LANGS:
        drop.add("̇")
    if lang in PROTO_ACCENT_LANGS:
        drop |= PROTO_ACCENTS
    nfd = unicodedata.normalize("NFD", form)
    return unicodedata.normalize("NFC", "".join(ch for ch in nfd if ch not in drop))


def clean(form: str | None) -> str | None:
    if not form:
        return None
    form = html.unescape(form)
    cut = form.find("<")
    if cut >= 0:
        form = form[:cut]
    form = form.replace("[[", "").replace("]]", "").split(", ")[0].strip().translate(LIGATURES)
    if not form or form == "-" or len(form) > 80:
        return None
    return form


def langs_of(code: str | None) -> list[str]:
    if not code:
        return []
    return [c.strip() for c in code.split(",") if LANG_CODE.match(c.strip())]


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
            head = v.split("<")[0]
            lang, form = (head.split(":", 1) if ":" in head else (src_lang, head))
            form = clean(form)
            for lg in langs_of(lang):
                if form:
                    yield rel, lg, form, name
        return
    if name == "root":
        i = 3
        while str(i) in a:
            form = clean(a[str(i)])
            i += 1
            for lg in langs_of(a.get("2")):
                if form:
                    yield "root", lg, form, name
        return
    rel = classify(name)
    if rel is None:
        return
    if rel == "cog":
        form = clean(a.get("2"))
        for lg in langs_of(a.get("1")):
            if form:
                yield rel, lg, form, name
        return
    if rel == "af":
        i = 2
        while str(i) in a:
            form = clean(a[str(i)])
            i += 1
            if form:
                lang, sep, rest = form.partition(":")
                if sep and LANG_CODE.match(lang):
                    yield rel, lang, rest, name
                else:
                    yield rel, src_lang, form, name
        return
    form = clean(a.get("3")) or clean(a.get("4"))
    for lg in langs_of(a.get("2")):
        if form:
            yield rel, lg, form, name


def tree_edges(t: dict):
    e = t.get("expansion") or ""
    i = e.find('"terms" : [')
    if i < 0:
        return
    try:
        arr, _ = TREE_DEC.raw_decode(e[i + len('"terms" : '):])
    except ValueError:
        return
    stack = list(arr)
    while stack:
        node = stack.pop()
        sl, sf = node.get("lang"), clean(node.get("term") or node.get("alt"))
        for g in node.get("children") or ():
            rel = TREE_REL.get(g.get("keyword"))
            for s in g.get("terms") or ():
                stack.append(s)
                dl, df = s.get("lang"), clean(s.get("term") or s.get("alt"))
                if rel and sl and sf and dl and df:
                    yield sl, sf, rel, dl, df


def ipa_of(d: dict) -> str | None:
    for s in d.get("sounds") or ():
        if "ipa" in s:
            return s["ipa"][:120]
    return None


def form_of_map(src: str) -> dict:
    out: dict[tuple[str, str], str] = {}
    bad: set[tuple[str, str]] = set()
    with gzip.open(src, "rb") as fh:
        for line in fh:
            d = orjson.loads(line)
            lang, word = d.get("lang_code"), clean(d.get("word"))
            senses = d.get("senses") or ()
            if not lang or not word:
                continue
            if b'"form_of"' not in line or not senses:
                bad.add((lang, entry_name(lang, word)))
                continue
            lemmas = set()
            for s in senses:
                fo = s.get("form_of")
                if not fo:
                    lemmas = None
                    break
                lemmas.update(x.get("word") for x in fo if x.get("word"))
            key = (lang, entry_name(lang, word))
            if not lemmas or len(lemmas) != 1:
                bad.add(key)
                continue
            lemma = entry_name(lang, clean(next(iter(lemmas))) or word)
            if lemma != key[1]:
                if key in out and out[key] != lemma:
                    bad.add(key)
                out[key] = lemma
    for k in bad:
        out.pop(k, None)
    return out


SCHEMA = """
create table node(id integer primary key, lang text, form text, proto integer);
create table lexeme(node integer, pos text, ety integer, ipa text, page integer, cls text, cls_lang text);
create table edge(src integer, dst integer, rel text, tmpl text, page integer, ord integer);
create table sense(id integer primary key, en_word text, en_pos text, gloss text);
create table translation(sense integer, node integer);
create table page(id integer primary key, lang text, word text, pos text, ety integer);
create table meta(k text primary key, v text);
create table lang_anc(lang text, anc text, source text);
"""


def main(src: str, out: str, langdata: str) -> None:
    t0 = time.time()
    _, variety = parse_lua(langdata)

    def base_lang(lang: str) -> str:
        hops = 0
        while lang in variety and hops < 10:
            lang, hops = variety[lang], hops + 1
        return lang

    alias = form_of_map(src)
    print(f"form_of aliases {len(alias)} {time.time() - t0:.0f}s", file=sys.stderr, flush=True)
    if os.path.exists(out):
        os.remove(out)
    db = sqlite3.connect(out)
    db.executescript("pragma journal_mode=off; pragma synchronous=off;" + SCHEMA)
    ids: dict[tuple[str, str], int] = {}
    new_nodes: list = []
    senses: dict[tuple, int] = {}
    buf = {"lexeme": [], "edge": [], "translation": [], "page": [], "sense": []}

    def nid(lang: str, form: str) -> int:
        lang = base_lang(lang)
        form = entry_name(lang, form)
        form = alias.get((lang, form), form)
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

    n = 0
    with gzip.open(src, "rb") as fh:
        for line in fh:
            d = orjson.loads(line)
            lang, word = d.get("lang_code"), clean(d.get("word"))
            if not lang or not word:
                continue
            n += 1
            ety = d.get("etymology_number") or 0
            me = nid(lang, word)
            page = n
            buf["page"].append((page, lang, word, d.get("pos"), ety))
            cur = me
            first = first_lang = None
            seen = set()
            for k, t in enumerate(d.get("etymology_templates") or ()):
                for rel, alang, aform, tmpl in template_edges(t, lang):
                    a = nid(alang, aform)
                    if a == me or (rel, a) in seen:
                        continue
                    seen.add((rel, a))
                    if first is None and rel not in ("cog", "root"):
                        first, first_lang = rel, alang
                    if rel in LINEAGE:
                        buf["edge"].append((cur, a, rel, tmpl, page, k))
                        cur = a
                    else:
                        buf["edge"].append((me, a, "der" if rel == "root" else rel, tmpl, page, k))
                if t.get("name") in ("ety", "etymon") and (t.get("args") or {}).get("tree"):
                    for sl, sf, rel, dl, df in tree_edges(t):
                        s, a = nid(sl, sf), nid(dl, df)
                        if s != a:
                            buf["edge"].append((s, a, rel, "tree", page, 1000 + k))
            buf["lexeme"].append((me, d.get("pos"), ety, ipa_of(d), page, first, first_lang))
            if lang == "en":
                for tr in d.get("translations") or ():
                    tl, tw = tr.get("lang_code") or tr.get("code"), clean(tr.get("word"))
                    if not tl or not tw or tl == "en":
                        continue
                    sk = (word, d.get("pos"), tr.get("sense") or "")
                    s = senses.get(sk)
                    if s is None:
                        s = len(senses)
                        senses[sk] = s
                        buf["sense"].append((s, *sk))
                    buf["translation"].append((s, nid(tl, tw)))
            if n % 500000 == 0:
                flush()
                print(f"{n} entries {len(ids)} nodes {time.time() - t0:.0f}s", file=sys.stderr, flush=True)
    flush()
    del senses, alias
    db.execute("insert into meta values('entries',?)", (n,))
    db.execute("insert into meta values('source',?)", (os.path.basename(src),))
    db.commit()
    anc = ancestry(db, langdata)
    build_forest(db, len(ids), anc)
    db.close()


def parse_lua(langdata: str):
    block = re.compile(r'm\["([^"]+)"\]\s*=\s*\{(.*?)\n\}', re.S)
    lit = re.compile(r'^\s*"([^"]*)"\s*,?\s*$|^\s*(\d+|nil)\s*,?\s*$', re.M)
    direct: dict[str, set] = {}
    parent: dict[str, str] = {}
    family: dict[str, str] = {}
    for path in glob.glob(os.path.join(langdata, "*.lua")):
        etym = "etymology" in os.path.basename(path)
        text = open(path, encoding="utf-8").read()
        for code, body in block.findall(text):
            pos = [m.group(1) if m.group(1) is not None else m.group(2) for m in lit.finditer(body)]
            am = re.search(r'ancestors\s*=\s*"([^"]+)"', body)
            if am:
                direct.setdefault(code, set()).update(c.strip() for c in am.group(1).split(","))
            if etym and len(pos) >= 3 and pos[2]:
                parent[code] = pos[2]
            elif not etym and len(pos) >= 3 and pos[2]:
                family[code] = pos[2]
    fam_parent: dict[str, str] = {}
    fam_proto: dict[str, str] = {}
    for path in glob.glob(os.path.join(langdata, "*.fam")):
        for code, body in block.findall(open(path, encoding="utf-8").read()):
            pos = [m.group(1) if m.group(1) is not None else m.group(2) for m in lit.finditer(body)]
            if len(pos) >= 3 and pos[2]:
                fam_parent[code] = pos[2]
            pm = re.search(r'protoLanguage\s*=\s*"([^"]+)"', body)
            if pm:
                fam_proto[code] = pm.group(1)
            elif f"{code}-pro" in family:
                fam_proto[code] = f"{code}-pro"
    def default(code: str, fam: str, skip: set) -> None:
        f, hops = fam, 0
        while f and hops < 20:
            p = fam_proto.get(f)
            if p and p not in skip:
                direct[code] = {p}
                return
            f, hops = fam_parent.get(f), hops + 1

    for code, fam in family.items():
        if code not in direct:
            default(code, fam, {code})
    for code in parent:
        if code in direct:
            continue
        base, hops = parent[code], 0
        while base in parent and hops < 10:
            base, hops = parent[base], hops + 1
        if base in family:
            default(code, family[base], {code, base})
    return direct, parent


def ancestry(db: sqlite3.Connection, langdata: str) -> dict[str, set]:
    direct, parent = parse_lua(langdata)
    links: dict[str, set] = {}
    for code, a in direct.items():
        links.setdefault(code, set()).update(a)
        db.executemany("insert into lang_anc values(?,?,?)", ((code, x, "module") for x in a))
    for code, p in parent.items():
        links.setdefault(code, set()).add(p)
        db.execute("insert into lang_anc values(?,?,?)", (code, p, "variety_of"))
    q = """select s.lang, d.lang, count(*) from edge e join node s on s.id = e.src join node d on d.id = e.dst
           where e.rel = 'inh' and e.tmpl = 'tree' and s.lang != d.lang group by 1, 2 having count(*) >= 20"""
    for a, b, _ in db.execute(q).fetchall():
        links.setdefault(a, set()).add(b)
        db.execute("insert into lang_anc values(?,?,?)", (a, b, "observed_tree_inh"))
    closure: dict[str, set] = {}
    for code in list(links):
        seen, stack = set(), [code]
        while stack:
            x = stack.pop()
            for y in links.get(x, ()):
                if y not in seen and y != code:
                    seen.add(y)
                    stack.append(y)
        closure[code] = seen
    db.execute("create table lang_closure(lang text, anc text)")
    db.executemany("insert into lang_closure values(?,?)", ((a, b) for a, s in closure.items() for b in s))
    db.commit()
    return closure


def build_forest(db: sqlite3.Connection, n: int, anc: dict[str, set]) -> None:
    lang = [None] * n
    proto = np.zeros(n, np.int8)
    for i, lg, p in db.execute("select id, lang, proto from node"):
        lang[i] = lg
        proto[i] = p
    parent = np.full(n, -1, np.int64)
    via = np.zeros(n, np.int8)
    cut = off_line = proto_child = 0
    q = """select src, dst, rel from edge where rel in ('inh', 'der')
           order by page, rel = 'inh' desc, tmpl = 'root', ord"""
    for s, a, rel in db.execute(q):
        if parent[s] != -1 or s == a:
            continue
        ls, la = lang[s], lang[a]
        if rel == "der" and la == ls:
            continue
        if la != ls and la not in anc.get(ls, ()):
            off_line += rel == "inh"
            continue
        if proto[s] and not proto[a]:
            proto_child += 1
            continue
        x, steps = a, 0
        while x != -1 and x != s and steps < 200:
            x = parent[x]
            steps += 1
        if x == s or steps >= 200:
            cut += 1
            continue
        parent[s] = a
        via[s] = 1 if rel == "inh" else 2
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
    db.execute("create table forest(node integer primary key, parent integer, depth integer, root integer, via integer)")
    db.executemany("insert into forest values(?,?,?,?,?)",
                   ((i, int(parent[i]) if parent[i] != -1 else None, int(depth[i]), int(root[i]), int(via[i])) for i in range(n)))
    db.execute("insert into meta values('cycle_cuts',?)", (cut,))
    db.execute("insert into meta values('inh_off_line',?)", (off_line,))
    db.execute("insert into meta values('attested_parent_of_proto',?)", (proto_child,))
    db.execute("insert into meta values('der_descent_edges',?)", (int((via == 2).sum()),))
    for ix in ("create index node_lf on node(lang, form)", "create index edge_src on edge(src)",
               "create index edge_dst on edge(dst)", "create index lex_node on lexeme(node)",
               "create index tr_s on translation(sense)", "create index tr_n on translation(node)"):
        db.execute(ix)
    db.commit()


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
