#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sqlite3
import subprocess
import sys
import tempfile
import unicodedata

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ROOTS_DB = os.path.join(REPO_ROOT, "_intake", "photons", "roots.sqlite")
QURAN = os.path.join(REPO_ROOT, "_intake", "sacred-history-corpus", "work", "tanzil-quran-simple.txt")
QURAN_DATA = os.path.join(REPO_ROOT, "_intake", "sacred-history-corpus", "work", "tanzil-quran-data.js")
DEFAULT_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

SOURCE = "Wiktionary via Kaikki.org, CC BY-SA 4.0"
QURAN_SOURCE = "Tanzil Quran Text, tanzil.net, verbatim"
KINDS = ("concept", "law", "derivation")
LANG_ALIASES = {"cmn": "zh"}
MIN_LANGS = 3
SCIENCE_TOPICS = {
    "physics", "natural-sciences", "physical-sciences", "sciences", "chemistry", "mathematics",
    "biology", "astronomy", "computing", "biochemistry", "geometry", "algebra", "optics",
    "thermodynamics", "mechanics", "electromagnetism", "statistics", "logic", "genetics",
    "medicine", "neuroscience", "cytology", "computer-science", "quantum-mechanics",
}
SCIENCE_WORDS = (
    "physic", "chemi", "science", "mathemat", "biolog", "study of", "geometr", "gravitation", "force", "energy",
    "matter", "particle", "radiation", "molecul", "atom", "cell", "electr", "quantum", "wave", "logic",
)
SCIENCE_WORD_RE = re.compile(r"\b(" + "|".join(SCIENCE_WORDS) + ")", re.I)
GENERIC = {
    "law", "theorem", "equation", "principle", "theory", "effect", "function", "problem", "model",
    "method", "hypothesis", "rule", "number", "constant", "bridge", "concept", "idea", "system",
    "process", "limit", "property", "relation", "state", "class", "basics", "introduction",
    "fate", "nature", "origin", "structure", "history", "role", "picture", "view", "scale", "case",
}
STOP = {
    "the", "a", "an", "of", "and", "or", "in", "on", "to", "for", "with", "as", "by", "at", "from",
    "its", "is", "are", "how", "why", "what", "across", "into", "between", "via", "vs", "versus",
}
ARABIC_PREFIXES = ("وال", "فال", "بال", "لل", "ال", "و", "ف", "ب", "ل")
ARABIC_SUFFIXES = ("", "ا", "ه", "ها", "هم", "هن", "كم", "نا", "ات", "ين", "ون", "ي", "ك")


def strip_marks(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def word_key(s):
    k = strip_marks(s).replace("ـ", "").lower().strip()
    return unicodedata.normalize("NFC", k)


def arabic_skeleton(s):
    k = re.sub("[\u064b-\u065f\u0670\u06d6-\u06ed\u0640]", "", unicodedata.normalize("NFC", s))
    k = k.replace("\u0671", "\u0627")
    return re.sub("[^\u0621-\u064a]", "", k)


def singular(w):
    out = [w]
    if w.endswith("ies"):
        out.append(w[:-3] + "y")
    if w.endswith("ches") or w.endswith("shes") or w.endswith("xes") or w.endswith("ses"):
        out.append(w[:-2])
    if w.endswith("s") and not w.endswith("ss"):
        out.append(w[:-1])
    if w.endswith("ia"):
        out.append(w[:-1] + "on")
    if w.endswith("a") and len(w) > 4:
        out.append(w[:-1] + "um")
    return out


def head_terms(title):
    t = re.sub(r"\s+", " ", title or "").strip()
    t = re.sub(r"^(bridge|canon bridge)\s*:\s*", "", t, flags=re.I)
    segs = [x.strip() for x in re.split(r"\s[\u2014\u2013-]\s|:|\(|,|;|&|\+|\band\b|\bvs\.?\b|\bacross\b|\bas\b|\bfrom\b|\bin\b|\bfor\b|\bwith\b|\bto\b|\bvia\b|\bwhen\b|\binstead\b", t, flags=re.I) if x and x.strip()]
    seg = segs[0] if segs else ""
    if re.fullmatch(r"[A-Z0-9-]{2,6}", seg) and len(segs) > 1:
        seg = segs[1]
    seg = re.sub(r"^(the|a|an)\s+", "", seg, flags=re.I)
    seg = seg.replace("’", "'")
    words = [w for w in re.findall(r"[A-Za-zÀ-ÿ'\-]+", seg)]
    words = [re.sub(r"'s$", "", w) for w in words]
    if len(words) > 1:
        words = [w for w in words if not (w.isupper() and len(w) <= 5)] or words
    low = [w.lower() for w in words]
    cands = []

    def add(x):
        x = x.strip().lower()
        if x and x not in cands and x not in STOP:
            cands.append(x)

    if low:
        phrase = " ".join(low)
        add(phrase)
        for s in singular(low[-1])[1:]:
            add(" ".join(low[:-1] + [s]))
    if "of" in low:
        i = low.index("of")
        pre, post = low[:i], low[i + 1:]
        if post:
            add(" ".join(post))
        if pre:
            for s in singular(pre[-1]):
                if s not in GENERIC:
                    add(s)
        for w in post:
            if w not in STOP:
                for s in singular(w):
                    add(s)
    content = [w for w in low if w not in STOP and w != "of" and not w.isdigit()]
    for w in reversed(content):
        if w in GENERIC:
            continue
        for s in singular(w):
            if s not in GENERIC:
                add(s)
    for w in reversed(content):
        for s in singular(w):
            add(s)
    return cands


def tokens(text):
    return {w for w in re.findall(r"[a-z]+", (text or "").lower()) if len(w) > 2 and w not in STOP}


def rank_senses(rows, context):
    ctx = tokens(context)
    senses = {}
    for r in rows:
        key = (r["sense_idx"], r["sense"])
        s = senses.setdefault(key, {"sense": r["sense"], "idx": r["sense_idx"], "topics": set(), "langs": set(), "rows": []})
        s["topics"].update(t for t in (r["topics"] or "").split(",") if t)
        s["langs"].add(r["lang"])
        s["rows"].append(r)
    scored = []
    for s in senses.values():
        score = 0.0
        if s["topics"] & SCIENCE_TOPICS:
            score += 2
        if SCIENCE_WORD_RE.search(s["sense"] or ""):
            score += 1.5
        score += 1.5 * len(tokens(s["sense"]) & ctx)
        score += min(len(s["langs"]), 60) / 20
        if s["idx"] == 0:
            score += 0.5
        s["score"] = score
        scored.append(s)
    scored.sort(key=lambda s: (-s["score"], s["idx"] if s["idx"] >= 0 else 99))
    return scored


def pick_words(ranked, targets):
    if not ranked:
        return {}
    floor = ranked[0]["score"] * 0.6
    out = {}
    for s in ranked:
        if s is not ranked[0] and s["score"] < floor:
            break
        for r in s["rows"]:
            lang = LANG_ALIASES.get(r["lang"], r["lang"])
            if lang in targets and lang not in out:
                out[lang] = dict(r, lang=lang, sense=s["sense"])
    return out


def quran_refs(data_path):
    text = open(data_path, encoding="utf-8").read()
    block = text[text.index("QuranData.Sura"):]
    block = block[:block.index("];")]
    refs = []
    for sura, m in enumerate(re.finditer(r"\[(\d+),\s*(\d+),", block), start=1):
        ayas = int(m.group(2))
        for a in range(1, ayas + 1):
            refs.append((sura, a))
    return refs


def load_quran(path, data_path):
    refs = quran_refs(data_path)
    ayahs = []
    with open(path, encoding="utf-8") as f:
        for i, line in enumerate(f):
            line = line.rstrip("\n")
            if not line or line.startswith("#") or i >= len(refs):
                continue
            sk = [arabic_skeleton(tok) for tok in line.split()]
            ayahs.append((f"{refs[i][0]}:{refs[i][1]}", line, sk))
    return ayahs


def token_matches(tok, skel):
    for p in ("",) + ARABIC_PREFIXES:
        if p and not tok.startswith(p):
            continue
        rest = tok[len(p):]
        for s in ARABIC_SUFFIXES if len(skel) > 3 else ("", "\u0627"):
            if s and not rest.endswith(s):
                continue
            stem = rest[: len(rest) - len(s)] if s else rest
            if stem == skel:
                return True
    return False


def quran_hits(ayahs, word, limit=3):
    skel = arabic_skeleton(word)
    if len(skel) < 3:
        return None
    hits = []
    for ref, line, toks in ayahs:
        n = sum(1 for t in toks if token_matches(t, skel))
        if n:
            hits.append((n, ref, line))
    if not hits:
        return None
    top = sorted(hits, key=lambda h: -h[0])[:limit]
    order = {ref: i for i, (_n, ref, _l) in enumerate(hits)}
    top.sort(key=lambda h: order[h[1]])
    return {"corpus": "Quran", "source": QURAN_SOURCE, "skeleton": skel, "count": len(hits), "samples": [{"ref": r, "text": l} for _n, r, l in top]}


FORM_OF_RE = re.compile(
    r"\b(singular|plural|nominative|genitive|accusative|dative|ablative|vocative|locative|instrumental|inflection|participle|"
    r"spelling|clipping|romanization|abbreviation|superlative|comparative|verbal noun|diminutive|alternative form|"
    r"alternative spelling|form|person|tense|feminine|masculine|neuter|defective|synonym|misspelling|obsolete)\b[^;]*\bof\b",
    re.I,
)


def is_form_gloss(g):
    return bool(g) and bool(FORM_OF_RE.search(g))


CJK_RE = re.compile(r"^[\u3400-\u9fff\uf900-\ufaff]+$")


class Roots:
    def __init__(self, path):
        self.db = sqlite3.connect(path)
        self.db.row_factory = sqlite3.Row
        self.langs = {r[0] for r in self.db.execute("select distinct lang from word")}
        self.has_text_gloss = bool(self.db.execute("select name from sqlite_master where name = 'text_gloss'").fetchone())
        self.ensure_keys()

    def ensure_keys(self):
        have = self.db.execute("select name from sqlite_master where name = 'word_key'").fetchone()
        if have:
            return
        self.db.create_function("wkey", 1, word_key, deterministic=True)
        with self.db:
            self.db.execute("create table word_key as select distinct lang, wkey(word) as key, word from word")
            self.db.execute("create index word_key_ix on word_key (lang, key)")
            self.db.execute("create index if not exists word_lw on word (lang, word)")
            self.db.execute("create index if not exists etym_lw on etym (lang, word)")
            self.db.execute("create index if not exists word_root_lw on word_root (lang, word)")

    def translations(self, en_word):
        return [dict(r) for r in self.db.execute("select * from translation where en_word = ? order by rowid", (en_word,))]

    def resolve(self, lang, word):
        if lang not in self.langs or not word:
            return None
        if self.db.execute("select 1 from word where lang = ? and word = ? limit 1", (lang, word)).fetchone():
            return word
        r = self.db.execute("select word from word_key where lang = ? and key = ? limit 1", (lang, word_key(word))).fetchone()
        return r[0] if r else None

    def entry(self, lang, word):
        rows = self.db.execute(
            "select pos, gloss, roman, ipa from word where lang = ? and word = ? order by case pos when 'noun' then 0 when 'character' then 1 when 'verb' then 2 when 'adj' then 3 else 4 end",
            (lang, word),
        ).fetchall()
        if not rows:
            return None
        for r in rows:
            if r["gloss"] and not is_form_gloss(r["gloss"]):
                return dict(r)
        return dict(rows[0])

    def text_gloss(self, form):
        if not self.has_text_gloss:
            return ""
        r = self.db.execute("select gloss from text_gloss where form = ? order by n desc limit 1", (form,)).fetchone()
        return r[0] if r else ""

    def root_gloss(self, lang, form):
        r = self.db.execute("select gloss from root where lang = ? and form = ? and gloss != ''", (lang, form)).fetchone()
        if r:
            return r[0]
        if lang in ("he", "ar") and (" " in form or "\u05be" in form):
            return ""
        resolved = self.resolve(lang, form)
        if resolved:
            e = self.entry(lang, resolved)
            if e and e["gloss"] and not is_form_gloss(e["gloss"]):
                return e["gloss"]
        return self.text_gloss(form)

    def chain(self, lang, word, depth=0, seen=None):
        seen = seen if seen is not None else {(lang, word)}
        steps = []
        for r in self.db.execute("select rel, anc_lang, anc_form, anc_gloss from etym where lang = ? and word = ? order by ord", (lang, word)):
            if r["anc_form"].lstrip("*").startswith("-"):
                break
            key = (r["anc_lang"], r["anc_form"])
            if key in seen:
                continue
            seen.add(key)
            gloss = r["anc_gloss"] or self.root_gloss(r["anc_lang"], r["anc_form"])
            steps.append({"lang": r["anc_lang"], "form": r["anc_form"], "rel": r["rel"], "gloss": gloss})
        if steps and depth < 5:
            last = steps[-1]
            if not last["lang"].endswith("-pro"):
                resolved = self.resolve(last["lang"], last["form"])
                if resolved and (last["lang"], resolved) not in seen:
                    seen.add((last["lang"], resolved))
                    steps.extend(self.chain(last["lang"], resolved, depth + 1, seen))
        return steps

    def word_roots(self, lang, word):
        return [dict(r) for r in self.db.execute("select root_lang, root_form, kind from word_root where lang = ? and word = ?", (lang, word))]


def han_parts(word, db):
    out = []
    for ch in word:
        gloss = ((db.entry("zh", ch) or {}).get("gloss") or "") or ((db.entry("ja", ch) or {}).get("gloss") or "")
        comps = [r["root_form"] for r in db.word_roots("zh", ch) if r["kind"] == "component"]
        out.append({"lang": "zh", "form": ch, "rel": "character", "gloss": gloss, "components": [{"form": c, "gloss": db.root_gloss("zh", c)} for c in comps]})
    return out


def short(g):
    g = (g or "").split(";")[0].split(":")[0].strip()
    return g[:60]


def choose_root(lang, word, chain, roots, db):
    protos = [c for c in chain if c["lang"].endswith("-pro") and not c["form"].lstrip("*").startswith("-")]
    semitic = [r for r in roots if r["kind"] == "root" and r["root_lang"] in ("he", "ar") and r["root_lang"] == lang]
    if semitic:
        r = semitic[0]
        gloss = db.root_gloss(r["root_lang"], r["root_form"])
        glossed_proto = [c for c in protos if c["gloss"]]
        if gloss or not glossed_proto:
            return r["root_lang"], r["root_form"], gloss
    sa = [r for r in roots if r["kind"] == "root" and r["root_lang"] == "sa"]
    if sa:
        return "sa", sa[0]["root_form"], db.root_gloss("sa", sa[0]["root_form"])
    declared = [r for r in roots if r["kind"] == "root" and r["root_lang"].endswith("-pro") and not r["root_form"].lstrip("*").startswith("-")]
    for r in declared:
        if not any(c["lang"] == r["root_lang"] and c["form"] == r["root_form"] for c in protos):
            protos.append({"lang": r["root_lang"], "form": r["root_form"], "gloss": db.root_gloss(r["root_lang"], r["root_form"])})
    if protos:
        glossed = [c for c in protos if c["gloss"] or db.root_gloss(c["lang"], c["form"])]
        c = (glossed or protos)[-1]
        return c["lang"], c["form"], c["gloss"] or db.root_gloss(c["lang"], c["form"])
    if lang in ("zh", "ja") and CJK_RE.match(word):
        if len(word) > 1:
            parts = han_parts(word, db)
            return "zh", " + ".join(p["form"] for p in parts), " + ".join(short(p["gloss"]) or "?" for p in parts)
        comps = [r for r in db.word_roots("zh", word) if r["kind"] == "component"]
        if comps:
            return "zh", " + ".join(r["root_form"] for r in comps), " + ".join(short(db.root_gloss("zh", r["root_form"])) or "?" for r in comps)
    foreign = [c for c in chain if c["lang"] != lang and (c["lang"] != "en" or lang == "en") and c.get("rel") not in ("character", "part")]
    if foreign:
        c = foreign[-1]
        return c["lang"], c["form"], c["gloss"]
    native = [c for c in chain if c["lang"] == lang and c.get("rel") not in ("form", "character", "part") and c["gloss"] and not is_form_gloss(c["gloss"])]
    if native:
        c = native[-1]
        return c["lang"], c["form"], c["gloss"]
    return None, None, None


def analyze(lang, word, db):
    resolved = db.resolve(lang, word)
    if not resolved:
        return None, [], (None, None, None)
    chain = db.chain(lang, resolved)
    roots = db.word_roots(lang, resolved)
    for c in chain:
        if c["lang"] == lang and not roots:
            base = db.resolve(lang, c["form"])
            if base:
                roots = db.word_roots(lang, base)
    for r in roots:
        if r["kind"] == "root" and r["root_lang"] == lang and lang in ("he", "ar"):
            chain = [{"lang": lang, "form": r["root_form"], "rel": "root", "gloss": db.root_gloss(lang, r["root_form"])}] + chain
            break
    if lang in ("zh", "ja") and CJK_RE.match(resolved):
        chain = chain + han_parts(resolved, db)
    return resolved, chain, choose_root(lang, resolved, chain, roots, db)


PHRASE_STOP = {"de", "la", "le", "les", "des", "du", "da", "do", "della", "del", "di", "the", "of", "der", "die", "das", "des", "van", "het", "el", "los", "las", "tou", "ha"}


def analyze_word(lang, word, db):
    resolved, chain, root = analyze(lang, word, db)
    if root[1] or " " not in word.strip():
        return resolved, chain, root
    parts = []
    for tok in word.split():
        if tok.lower() in PHRASE_STOP or len(word_key(tok)) < 3:
            continue
        r2, c2, root2 = analyze(lang, tok, db)
        if root2[1]:
            parts.append((tok, c2, root2))
    if not parts:
        return resolved, chain, root
    chain = chain + [{"lang": lang, "form": tok, "rel": "part", "gloss": "", "chain": c2} for tok, c2, _r in parts]
    langs = [r[0] for _t, _c, r in parts]
    return resolved, chain, (langs[0] if len(set(langs)) == 1 else "mixed", " + ".join(r[1] for _t, _c, r in parts), " + ".join(short(r[2]) or "?" for _t, _c, r in parts))


def display_gloss(entry, t):
    g = (entry or {}).get("gloss") or ""
    if g and not is_form_gloss(g):
        return g
    return t.get("sense") or g


def is_name_title(title, db):
    t = (title or "").strip()
    if not re.fullmatch(r"[A-Z][a-zà-ÿ]+", t):
        return False
    return bool(db.db.execute("select 1 from word where lang = 'en' and word = ? and pos = 'name' limit 1", (t,)).fetchone())


def translations_for(term, db, targets):
    trs = db.translations(term)
    nouns = [t for t in trs if t["en_pos"] == "noun"]
    if " " not in term:
        trs = nouns
    elif nouns:
        trs = nouns
    langs = {LANG_ALIASES.get(t["lang"], t["lang"]) for t in trs} & targets
    return trs if len(langs) >= MIN_LANGS else []


def node_rows(node, db, ayahs, targets):
    context = " ".join([node.get("title") or "", node.get("summary") or ""])
    if is_name_title(node.get("title"), db):
        return None, []
    for term in head_terms(node.get("title") or ""):
        trs = translations_for(term, db, targets)
        if trs:
            break
    else:
        return None, []
    ranked = rank_senses(trs, context)
    picks = pick_words(ranked, targets)
    en = db.resolve("en", term)
    if en:
        picks.setdefault("en", {"lang": "en", "word": en, "roman": "", "sense": ranked[0]["sense"] if ranked else ""})
    rows = []
    for lang, t in sorted(picks.items()):
        surface = t["word"]
        resolved, chain, (root_lang, root_form, root_gloss) = analyze_word(lang, surface, db)
        entry = db.entry(lang, resolved) if resolved else None
        texts = []
        if lang == "ar" and ayahs:
            q = quran_hits(ayahs, surface)
            if q:
                texts.append(q)
        rows.append({
            "node_id": node["id"], "lang": lang, "word": surface,
            "roman": t.get("roman") or (entry or {}).get("roman") or "",
            "gloss": display_gloss(entry, t),
            "root_lang": root_lang, "root_form": root_form, "root_gloss": root_gloss or None,
            "chain": chain, "root_texts": texts, "source": SOURCE, "en_term": term, "sense": t.get("sense") or "",
        })
    return term, rows


def fetch_nodes(db_url):
    sql = (
        "select coalesce(json_agg(t order by t.slug), '[]'::json) from (select id, slug, title, kind, summary from graph.nodes "
        "where visibility = 'public' and superseded_by is null and kind in ('concept','law','derivation')) t"
    )
    out = subprocess.run(["psql", db_url, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], check=True, capture_output=True, text=True).stdout
    return json.loads(out.strip() or "[]")


COLUMNS = ["node_id", "lang", "word", "roman", "gloss", "root_lang", "root_form", "root_gloss", "chain", "root_texts", "source", "en_term", "sense"]


def write_rows(db_url, rows, node_ids):
    with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        for r in rows:
            w.writerow([json.dumps(r[c], ensure_ascii=False) if c in ("chain", "root_texts") else ("" if r[c] is None else r[c]) for c in COLUMNS])
        path = f.name
    ids = ",".join("'" + i + "'" for i in node_ids) or "null"
    try:
        subprocess.run(
            ["psql", db_url, "-1", "-v", "ON_ERROR_STOP=1",
             "-c", f"delete from graph.node_words where source = '{SOURCE}' and node_id in ({ids})",
             "-c", f"\\copy graph.node_words ({', '.join(COLUMNS)}) from '{path}' with (format csv, null '')"],
            check=True,
        )
    finally:
        os.unlink(path)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--roots", default=ROOTS_DB)
    ap.add_argument("--quran", default=QURAN)
    ap.add_argument("--quran-data", default=QURAN_DATA)
    ap.add_argument("--db-url", default=os.environ.get("NODE_WORDS_DB_URL", DEFAULT_DB_URL))
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--show", default="")
    a = ap.parse_args(argv)
    db = Roots(a.roots)
    targets = set(db.langs)
    ayahs = load_quran(a.quran, a.quran_data) if os.path.exists(a.quran) and os.path.exists(a.quran_data) else []
    nodes = fetch_nodes(a.db_url)
    if a.show:
        nodes = [n for n in nodes if a.show.lower() in (n["title"] or "").lower()]
    if a.limit:
        nodes = nodes[: a.limit]
    all_rows, linked, terms = [], [], {}
    for n in nodes:
        term, rows = node_rows(n, db, ayahs, targets)
        if rows:
            linked.append(n["id"])
            terms[n["title"]] = term
            all_rows.extend(rows)
    by_lang = {}
    for r in all_rows:
        by_lang[r["lang"]] = by_lang.get(r["lang"], 0) + 1
    print(f"nodes {len(nodes)} linked {len(linked)} rows {len(all_rows)}")
    print("rows by lang", dict(sorted(by_lang.items(), key=lambda x: -x[1])))
    print("with root", sum(1 for r in all_rows if r["root_form"]), "with root gloss", sum(1 for r in all_rows if r["root_gloss"]), "with quran", sum(1 for r in all_rows if r["root_texts"]))
    if a.show:
        for r in all_rows:
            print(json.dumps({k: r[k] for k in ("lang", "word", "roman", "gloss", "root_lang", "root_form", "root_gloss")}, ensure_ascii=False))
            if r["root_texts"]:
                print("   quran", r["root_texts"][0]["count"], [s["ref"] for s in r["root_texts"][0]["samples"]])
    if not a.dry_run:
        write_rows(a.db_url, all_rows, [n["id"] for n in nodes])
        print("written")
    return 0


if __name__ == "__main__":
    sys.exit(main())
