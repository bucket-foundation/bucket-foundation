import json, re, sys, unicodedata, zlib
from collections import defaultdict
from pathlib import Path

LANGS = "es fr it pt de nl sv pl fi ru el ar hi ja zh ko he fa tr cs id vi th ta la grc sa ang".split()
KAIKKI = {"zh": "cmn"}
NO_FREQ = {"th", "la", "grc", "sa", "ang"}
STRIP_MARKS = {"ru": "̀́", "la": "̄̆", "ang": "̄", "sa": "", "fi": "", "cs": ""}
UNSPACED = {"ja", "zh", "th"}


def freq_list(lang, n):
    if lang in NO_FREQ:
        return {}
    from wordfreq import top_n_list
    try:
        return {w: i for i, w in enumerate(top_n_list(lang, n))}
    except LookupError:
        return {}


def clean_word(lang, w):
    w = re.sub(r"\s*\([^)]*\)", "", w).strip()
    marks = STRIP_MARKS.get(lang)
    if marks:
        w = unicodedata.normalize("NFC", "".join(c for c in unicodedata.normalize("NFD", w) if c not in marks))
    return w


def key(w):
    return w.lower().strip(" .,!?¡¿;:\"'«»“”")


def short_gloss(glosses):
    out = []
    for g in glosses:
        g = re.sub(r"\s+", " ", g).strip().rstrip(".")
        if not g or re.search(r"\b(form|plural|participle|tense|singular|person|inflection|spelling|romanization) of\b", g):
            continue
        if len(g) > 70:
            g = g[:70].rsplit(" ", 1)[0] + "…"
        if g not in out:
            out.append(g)
        if len(out) == 2:
            break
    return "; ".join(out)


def romans(lang, rs):
    out = []
    for r in rs:
        r = re.sub(r"\s*\([^)]*\)", "", r).strip()
        if not r or any(c.isdigit() for c in r) or len(r) > 40:
            continue
        if r not in out:
            out.append(r)
    return ",".join(out[:2])


def load_english(path, en_rank):
    fwd = defaultdict(lambda: defaultdict(list))
    forms = {}
    heads = {}
    for line in open(path, encoding="utf-8"):
        e = json.loads(line)
        w = e["w"]
        toks = w.lower().split()
        if len(toks) == 1:
            r = en_rank.get(w.lower())
            if r is None:
                continue
        else:
            if len(toks) > 4 or any(t not in en_rank or en_rank[t] > 30000 for t in toks):
                continue
            r = 60000 + max(en_rank[t] for t in toks)
        heads[w] = min(heads.get(w, r), r)
        for f in e.get("f") or []:
            if " " not in f and f.lower() in en_rank and f.lower() != w.lower():
                forms.setdefault(f.lower(), w)
        for o in e.get("o") or []:
            if w.lower() != o.lower():
                forms.setdefault(w.lower(), o)
        for code, tw, sense, rom in e.get("t") or []:
            lang = "zh" if code == "cmn" else code
            if lang not in LANGS:
                continue
            tw = clean_word(lang, tw)
            if tw and tw not in fwd[lang][w]:
                fwd[lang][w].append(tw)
    return fwd, forms, heads


def build(dl, out, budget):
    out.mkdir(parents=True, exist_ok=True)
    en_rank = freq_list("en", 60000)
    fwd, en_forms, heads = load_english(dl / "en.jsonl", en_rank)
    en_lines = [f"{w}\t\t" for w in sorted(heads, key=heads.get)]
    en_lines += [f"{f}\t>{l}" for f, l in en_forms.items() if f not in heads or heads.get(f, 0) > 60000]
    write(out / "en.tsv", en_lines)
    report = {}
    for lang in LANGS:
        rank = freq_list(lang, 60000)
        inv = defaultdict(list)
        for e, ws in fwd[lang].items():
            for w in ws:
                inv[key(w)].append((heads[e], e))
        entries = {}
        forms = {}
        src = dl / f"kk_{lang}.jsonl"
        if src.exists():
            for line in open(src, encoding="utf-8"):
                e = json.loads(line)
                w = clean_word(lang, e["w"] or "")
                if not w:
                    continue
                k = key(w)
                if e.get("o") and not short_gloss(e.get("g") or []):
                    forms.setdefault(k, (w, clean_word(lang, e["o"][0].split(" /")[0].strip())))
                    continue
                g = short_gloss(e.get("g") or [])
                cur = entries.get(k)
                if cur:
                    if g and g not in cur["g"] and cur["g"].count(";") < 2:
                        cur["g"] = f"{cur['g']}; {g}" if cur["g"] else g
                    if not cur["r"]:
                        cur["r"] = romans(lang, e.get("r") or [])
                else:
                    entries[k] = {"w": w, "g": g, "r": romans(lang, e.get("r") or [])}
                for f in e.get("f") or []:
                    f = clean_word(lang, f)
                    if not f or " " in f or f.isascii() and lang in ("ja", "zh", "ko"):
                        continue
                    if key(f) != k:
                        forms.setdefault(key(f), (f, w))
        for k, pairs in inv.items():
            if k not in entries:
                entries[k] = {"w": k, "g": "", "r": ""}

        def score(k):
            r = rank.get(k)
            if r is not None:
                return r
            if k in inv:
                return 70000 + min(p[0] for p in inv[k])
            return 200000 + len(k)

        lines = []
        size = 0
        chosen = set()
        for k in sorted(entries, key=score):
            e = entries[k]
            eng = [p[1] for p in sorted(set(inv.get(k, [])))][:4]
            if not eng and not e["g"]:
                continue
            line = f"{e['w']}\t{'|'.join(eng)}\t{e['g'] if not eng else ''}\t{e['r']}".rstrip("\t")
            size += len(line.encode()) + 1
            if size > budget:
                break
            lines.append(line)
            chosen.add(k)
        form_budget = budget // 3
        fsize = 0
        for k in sorted(forms, key=lambda k: rank.get(k, 10**6)):
            if k in chosen:
                continue
            f, lemma = forms[k]
            if key(lemma) not in chosen:
                continue
            if rank and k not in rank:
                continue
            line = f"{f}\t>{lemma}"
            fsize += len(line.encode()) + 1
            if fsize > form_budget:
                break
            lines.append(line)
        rev = []
        for e, ws in sorted(fwd[lang].items(), key=lambda x: heads[x[0]]):
            rev.append(f"={e}\t{'|'.join(ws[:3])}")
        write(out / f"{lang}.tsv", lines + rev)
        report[lang] = (len(lines), len(rev))
        print(lang, len(lines), len(rev), file=sys.stderr)
    return report


def write(path, lines):
    raw = ("\n".join(lines) + "\n").encode()
    c = zlib.compressobj(9, zlib.DEFLATED, -15)
    path.with_suffix(".tsv.z").write_bytes(c.compress(raw) + c.flush())
    if path.exists():
        path.unlink()


if __name__ == "__main__":
    build(Path(sys.argv[1]), Path(sys.argv[2]), int(sys.argv[3]) if len(sys.argv) > 3 else 900_000)
