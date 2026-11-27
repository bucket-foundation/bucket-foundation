#!/usr/bin/env python3
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import g2p_rules as g2p
from fill_ipa import IPA_COL, held_out, MANIFEST, PER_LIMIT, REPO_ROOT, SHIPPED, SOURCE_COL, dump, edit_distance, load, segments

READING_COL = 10
DICTS = os.path.join(REPO_ROOT, "_intake", "polingual-dicts")
RAW = os.path.join(REPO_ROOT, "_intake", "kaikki-raw", "raw-wiktextract-data.jsonl.gz")
SUBSET = os.path.join(DICTS, "kaikki-thin.jsonl")
LEMMAS = os.path.join(DICTS, "kaikki-lemmas.jsonl")
IPA_LANGS = ["he", "hi", "ja", "ko", "vi", "fa", "ta", "la", "sa", "zh"]
GLOSS_LANGS = ["he", "ta", "th", "ko", "ar", "zh", "ja"]
READING_LANGS = ["ja", "zh", "ko", "th", "he", "ar", "ta", "hi", "fa"]
SUBSET_LANGS = sorted(set(IPA_LANGS + GLOSS_LANGS + READING_LANGS))

FORM_OF = re.compile(
    r"^(?:[\w-]+ ){0,4}(?:form|spelling|romanization|transliteration|abbreviation|synonym|misspelling|plural|participle|inflection|"
    r"kyūjitai|shinjitai|clipping|contraction|initialism|degree|ellipsis|variant) of\b",
    re.I,
)
QUOTED = re.compile(r"“([^”]{2,80})”")
VARIANT_OF = re.compile(r"^(?:alternative|defective|plene|excessive|archaic|obsolete|nonstandard) (?:form|spelling) of\b", re.I)
FUNCTION_POS = {"prep", "conj", "particle", "det", "pron"}
CONTENT_POS = {"verb", "adj"}

JMDICT_ATTR = "JMdict and KANJIDIC by the Electronic Dictionary Research and Development Group, CC BY-SA 4.0"
CEDICT_ATTR = "CC-CEDICT by MDBG, CC BY-SA 4.0"


def is_form_of(gloss: str | None) -> bool:
    return not gloss or len(gloss.strip()) < 2 or bool(FORM_OF.search(gloss))


def wanted(rows: list) -> dict[str, set]:
    want: dict[str, set] = defaultdict(set)
    for r in rows:
        if r[1] in SUBSET_LANGS:
            want[r[1]].add(r[2])
    return want


def stream_raw(want: dict[str, set], out_path: str) -> int:
    n = 0
    with gzip.open(RAW, "rt") as src, open(out_path, "w") as out:
        for line in src:
            if '"lang_code"' not in line:
                continue
            e = json.loads(line)
            lc = e.get("lang_code")
            if lc not in want or e.get("word") not in want[lc]:
                continue
            keep = {k: e.get(k) for k in ("word", "lang_code", "pos", "forms", "head_templates", "sounds")}
            keep["senses"] = [{"glosses": s.get("glosses"), "tags": s.get("tags"), "form_of": s.get("form_of")} for s in e.get("senses") or []]
            out.write(json.dumps(keep, ensure_ascii=False) + "\n")
            n += 1
    return n


def read_jsonl(path: str) -> dict[tuple[str, str], list]:
    out: dict[tuple[str, str], list] = defaultdict(list)
    if os.path.exists(path):
        for line in open(path):
            e = json.loads(line)
            out[(e["lang_code"], e["word"])].append(e)
    return out


def forms(e: dict, tag: str) -> list[str]:
    return [f["form"] for f in e.get("forms") or [] if tag in (f.get("tags") or [])]


def is_kana(s: str) -> bool:
    return bool(s) and all("぀" <= c <= "ヿ" or c in "ー・ " for c in s)


def ja_reading(e: dict) -> str | None:
    if is_kana(e["word"]):
        return e["word"]
    for h in e.get("head_templates") or []:
        if h.get("name", "").startswith("ja-"):
            for k in ("1", "2", "3"):
                v = (h.get("args") or {}).get(k, "")
                v = re.sub(r"[\^.%\- ]", "", v)
                if is_kana(v):
                    return v
    for f in e.get("forms") or []:
        if f.get("ruby"):
            parts = [p[1] if len(p) > 1 else p[0] for p in f["ruby"]]
            joined = "".join(parts)
            if is_kana(joined):
                return joined
    return None


def zh_pinyin(e: dict) -> str | None:
    for s in e.get("sounds") or []:
        if s.get("zh_pron") and "Pinyin" in (s.get("tags") or []) and "Mandarin" in (s.get("tags") or []):
            return re.sub(r"\(.*?\)", "", s["zh_pron"]).split(",")[0].strip()
    return None


def entry_reading(lang: str, e: dict) -> str | None:
    if lang == "ja":
        return ja_reading(e)
    if lang == "ko":
        h = forms(e, "hangeul")
        return h[0] if h else (e["word"] if g2p.ko_syllables(e["word"]) else None)
    if lang == "zh":
        return zh_pinyin(e)
    if lang in ("he", "fa", "ar", "hi", "ta", "th"):
        r = forms(e, "romanization")
        return r[0] if r else None
    if lang == "la":
        c = forms(e, "canonical")
        return c[0] if c else e["word"]
    return e["word"]


def pick(entries: list, pos: str | None, fn) -> str | None:
    ordered = sorted(entries, key=lambda e: e.get("pos") != pos)
    for e in ordered:
        v = fn(e)
        if v:
            return v
    return None


def load_jmdict(path: str) -> dict[str, dict]:
    out: dict[str, dict] = {}
    root = ET.parse(gzip.open(path)).getroot()
    for ent in root.iter("entry"):
        kebs = [k.findtext("keb") for k in ent.findall("k_ele")]
        rebs = [(r.findtext("reb"), [x.text for x in r.findall("re_restr")], r.find("re_nokanji") is not None) for r in ent.findall("r_ele")]
        pri = len(ent.findall(".//ke_pri")) + len(ent.findall(".//re_pri"))
        glosses = []
        for s in ent.findall("sense"):
            g = [x.text for x in s.findall("gloss") if x.text]
            if g:
                glosses.append(", ".join(g[:3]))
        if not glosses:
            continue
        for keb in kebs:
            reading = next((r for r, restr, nok in rebs if not nok and (not restr or keb in restr)), None)
            if reading and (keb not in out or out[keb]["pri"] < pri):
                out[keb] = {"reading": reading, "gloss": "; ".join(glosses[:3]), "pri": pri}
        for reb, _, _ in rebs:
            if reb not in out or (out[reb]["pri"] < pri and out[reb]["reading"] == reb):
                out[reb] = {"reading": reb, "gloss": "; ".join(glosses[:3]), "pri": pri}
    return out


def load_kanjidic(path: str) -> dict[str, dict]:
    out = {}
    root = ET.parse(gzip.open(path)).getroot()
    for c in root.iter("character"):
        lit = c.findtext("literal")
        rm = c.find("reading_meaning")
        if rm is None:
            continue
        kun = [r.text for r in rm.iter("reading") if r.get("r_type") == "ja_kun"]
        on = [r.text for r in rm.iter("reading") if r.get("r_type") == "ja_on"]
        mean = [m.text for m in rm.iter("meaning") if m.get("m_lang") is None]
        reading = (kun[0].split(".")[0].replace("-", "") if kun else g2p.to_hiragana(on[0]) if on else None)
        if reading and mean:
            out[lit] = {"reading": reading, "gloss": ", ".join(mean[:3])}
    return out


def load_cedict(path: str) -> dict[str, dict]:
    out = {}
    line_re = re.compile(r"^(\S+) (\S+) \[([^\]]+)\] /(.+)/$")
    for line in gzip.open(path, "rt"):
        m = line_re.match(line.strip())
        if not m:
            continue
        trad, simp, py, defs = m.groups()
        senses = [d for d in defs.split("/") if d and not d.startswith(("variant of", "old variant", "see ", "CL:", "surname "))]
        for w in (trad, simp):
            if w in out:
                continue
            out[w] = {"pinyin": py, "gloss": "; ".join(senses[:3]) if senses else None}
    return out


def ipa_from_reading(lang: str, reading: str | None, word: str) -> str | None:
    fn = {
        "ja": g2p.ja_ipa, "ko": g2p.ko_ipa, "he": g2p.he_ipa, "hi": lambda _: g2p.hi_ipa(word), "sa": lambda _: g2p.sa_ipa(word),
        "vi": lambda _: g2p.vi_ipa(word), "la": g2p.la_ipa, "ta": lambda _: g2p.ta_ipa(word), "zh": g2p.py_ipa, "fa": fa_ipa,
    }[lang]
    if reading is None and lang not in ("hi", "sa", "vi", "ta"):
        return None
    try:
        return fn(reading)
    except (KeyError, IndexError, ValueError):
        return None


FA_MAP = [("kh", "x"), ("sh", "ʃ"), ("ch", "t͡ʃʰ"), ("zh", "ʒ"), ("gh", "ɢ"), ("aw", "ow"), ("ow", "ow"), ("ay", "ej"), ("â", "ɒː"), ("ā", "ɒː"),
          ("ē", "iː"), ("ō", "uː"), ("ī", "iː"), ("ū", "uː"), ("x", "x"), ("j", "d͡ʒ"), ("y", "j"), ("q", "q"), ("'", "ʔ"), ("ʼ", "ʔ"),
          ("g", "ɡ"), ("r", "ɹ"), ("w", "v"), ("e", "e"), ("i", "e"), ("o", "o"), ("u", "o"), ("a", "æ"), ("č", "t͡ʃʰ"), ("š", "ʃ"),
          ("ž", "ʒ"), ("ġ", "ɢ"), ("ḵ", "x"), ("p", "pʰ"), ("t", "t̪ʰ"), ("k", "kʰ"), ("d", "d̪"), ("h", "ɦ"), ("ḥ", "ɦ")]
FA_MODERN = {"i": "iː", "u": "uː"}


def fa_ipa(tr: str | None) -> str | None:
    if not tr:
        return None
    s = unicodedata.normalize("NFC", tr.split("/")[0].split(",")[0].strip().lower())
    modern = "â" in s or (not re.search(r"[āēōīū]", s) and bool(re.search(r"[eo]", s)))
    out = []
    i = 0
    while i < len(s):
        if modern and s[i] in FA_MODERN:
            out.append(FA_MODERN[s[i]])
            i += 1
            continue
        for a, b in FA_MAP:
            if s.startswith(a, i):
                out.append(b)
                i += len(a)
                break
        else:
            c = s[i]
            if c.isalpha() and c.isascii():
                out.append(c)
            elif c in " -":
                out.append(" ")
            elif c in "́̀":
                pass
            else:
                return None
            i += 1
    res = re.sub(r"(^| )(?=[æɒeiouː])", r"\1ʔ", "".join(out).strip())
    res = re.sub(r"æ(?=$| )", "e", res)
    return "/" + res + "/"


REF_TAG = {"fa": "Iran", "he": "Modern-Israeli"}
VARIANT = {"fa": "iranian", "he": "modern-israeli"}
VARIANTS = os.path.join(REPO_ROOT, "polingual", "data", "ipa-variants.json.gz")


def tagged_ref(lang: str, entries: list) -> str | None:
    for e in entries:
        for s in e.get("sounds") or []:
            if s.get("ipa") and REF_TAG[lang] in (s.get("tags") or []):
                return s["ipa"]
    return None



def resolve(rows: list, kk: dict, jm: dict, kd: dict, ce: dict) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for r in rows:
        lang = r[1]
        if lang not in SUBSET_LANGS:
            continue
        entries = kk.get((lang, r[2]), [])
        reading, rsrc = None, None
        if lang in ("ja", "ko", "zh", "he", "fa", "ar", "hi", "ta", "la", "th"):
            reading = pick(entries, r[4], lambda e: entry_reading(lang, e))
            rsrc = "wiktionary" if reading else None
        if lang == "ja" and not reading:
            hit = jm.get(r[2]) or (kd.get(r[2]) if len(r[2]) == 1 else None)
            if hit:
                reading, rsrc = hit["reading"], "jmdict" if r[2] in jm else "kanjidic"
        if lang == "zh" and not reading and r[2] in ce:
            reading, rsrc = ce[r[2]]["pinyin"], "cedict"
        out[r[0]] = {"reading": reading, "reading_source": rsrc, "entries": entries}
    return out


def romanize(lang: str, r: list, info: dict) -> str | None:
    rd = info["reading"]
    if lang == "ja":
        return g2p.ja_romaji(rd) if rd else None
    if lang == "zh":
        return g2p.py_marks(rd) if rd and re.search(r"\d", rd) else rd
    if lang == "ko":
        if rd:
            from_kk = pick(info["entries"], r[4], lambda e: (forms(e, "romanization") or [None])[0])
            return from_kk or g2p.ko_rr(rd)
        return None
    if lang == "th":
        return pick(info["entries"], r[4], lambda e: (forms(e, "romanization") or [None])[0]) or (g2p.th_rtgs(r[IPA_COL]) if r[IPA_COL] else None)
    if lang == "ta":
        return rd or g2p.ta_iso(r[2])
    return rd


def validate(rows: list, res: dict, ft) -> dict[str, dict]:
    errs, total, words, skipped = Counter(), Counter(), Counter(), Counter()
    h_errs, h_total = Counter(), Counter()
    held = {r[0] for lang in IPA_LANGS for r in held_out(rows, lang)}
    worst: dict[str, list] = defaultdict(list)
    for r in rows:
        lang = r[1]
        if lang not in IPA_LANGS or r[SOURCE_COL] != "wiktionary":
            continue
        info = res[r[0]]
        if info["reading_source"] not in (None, "wiktionary"):
            continue
        ref = r[IPA_COL]
        if lang in REF_TAG:
            ref = tagged_ref(lang, info["entries"])
            if not ref:
                continue
        hyp = ipa_from_reading(lang, info["reading"], r[2])
        if not hyp:
            skipped[lang] += 1
            continue
        a, b = segments(ref, ft, lang), segments(hyp, ft, lang)
        d = edit_distance(a, b)
        errs[lang] += d
        total[lang] += len(a)
        if r[0] in held:
            h_errs[lang] += d
            h_total[lang] += len(a)
        words[lang] += 1
        if d and len(worst[lang]) < 400:
            worst[lang].append((d / max(len(a), 1), r[2], info["reading"], ref, hyp))
    report = {}
    for lang in IPA_LANGS:
        per = round(errs[lang] / total[lang], 4) if total[lang] else None
        hper = round(h_errs[lang] / h_total[lang], 4) if h_total[lang] else None
        ok = per is not None and hper is not None and max(per, hper) <= PER_LIMIT and words[lang] >= 100
        report[lang] = {"words": words[lang], "no_reading": skipped[lang], "per": per, "per_held_out_300": hper, "ship": ok}
        print(f"rules {lang} words={words[lang]} skipped={skipped[lang]} PER={per} held_out={hper}", file=sys.stderr)
    validate.worst = worst
    return report


def lemma_targets(rows: list, kk: dict) -> dict[str, set]:
    want: dict[str, set] = defaultdict(set)
    for r in rows:
        if r[1] not in GLOSS_LANGS or not is_form_of(r[3]):
            continue
        m = LEMMA_IN_GLOSS.search(r[3] or "")
        if m:
            t = lemma_text(m.group(1))
            want[r[1]].update({t, strip_marks(t)})
        for e in kk.get((r[1], r[2]), []):
            for s in e.get("senses") or []:
                for f in s.get("form_of") or []:
                    if f.get("word"):
                        want[r[1]].add(f["word"])
            if r[1] == "ko":
                for h in forms(e, "hangeul"):
                    want["ko"].add(h)
    return want


def first_gloss(entries: list, pos: str | None = None) -> str | None:
    for e in sorted(entries, key=lambda e: e.get("pos") != pos):
        for s in e.get("senses") or []:
            g = (s.get("glosses") or [None])[-1]
            if g and not is_form_of(g) and not s.get("form_of"):
                return g
    return None


LEMMA_IN_GLOSS = re.compile(r"\bof\s+([^(,:;“]+)")
UNPOINTED_LANGS = ("ar", "he", "ta")


def lemma_text(s: str) -> str:
    return re.sub(r"(\s+[A-Za-z]{1,2})+$", "", s.strip())


def strip_marks(w: str) -> str:
    return unicodedata.normalize("NFC", "".join(c for c in unicodedata.normalize("NFD", w) if not unicodedata.combining(c) and c != "\u0640"))


def lemma_gloss(r: list, info: dict, lemmas: dict) -> str | None:
    lang = r[1]
    targets = []
    m = LEMMA_IN_GLOSS.search(r[3] or "")
    if m:
        targets.append(lemma_text(m.group(1)))
    if lang in HOMOGRAPH_LANGS:
        if not targets:
            return None
        entries = lemmas.get((lang, strip_marks(targets[0])), [])
        if len(vocalized_forms(entries)) != 1:
            return None
        return first_gloss(entries)
    for e in info["entries"]:
        targets += [f.get("word") for s in e.get("senses") or [] for f in s.get("form_of") or [] if f.get("word")]
        if lang == "ko":
            targets += forms(e, "hangeul")
    for t in targets:
        for key in (t, strip_marks(t)):
            g = first_gloss(lemmas.get((lang, key), []))
            if g:
                return g
    return None


HOMOGRAPH_LANGS = ("ar", "he")


def vocalized_forms(entries: list) -> set[str]:
    out = set()
    for e in entries:
        if not first_gloss([e]):
            continue
        canon = forms(e, "canonical")
        out.add(canon[0] if canon else e["word"])
    return out


def better_gloss(r: list, info: dict, lemmas: dict, jm: dict, ce: dict) -> tuple[str, str] | None:
    lang, gloss = r[1], r[3]
    if not is_form_of(gloss):
        return None
    kind = re.match(r"^(?:[\w-]+ )*?(plural|dual)\b", gloss or "", re.I)
    plural = f" ({kind.group(1).lower()})" if kind else ""
    m = QUOTED.search(gloss or "")
    if lang in UNPOINTED_LANGS:
        own = first_gloss([e for e in info["entries"] if e.get("pos") in FUNCTION_POS]) if lang in HOMOGRAPH_LANGS and r[4] not in FUNCTION_POS | CONTENT_POS else None
        if own:
            return own, "wiktionary-sense"
        note = f" ({gloss.strip()})" if VARIANT_OF.match(gloss or "") else ""
        if m:
            return m.group(1) + plural + note, "wiktionary-quoted"
        g = lemma_gloss(r, info, lemmas)
        if g:
            return g + plural + note, "wiktionary-lemma"
        return None
    g = first_gloss(info["entries"], r[4])
    if g:
        return g, "wiktionary-sense"
    if m:
        return m.group(1), "wiktionary-quoted"
    g = lemma_gloss(r, info, lemmas)
    if g:
        return g, "wiktionary-lemma"
    if lang == "ja" and r[2] in jm:
        return jm[r[2]]["gloss"], "jmdict"
    if lang == "zh" and r[2] in ce and ce[r[2]]["gloss"]:
        return ce[r[2]]["gloss"], "cedict"
    return None


def coverage(rows: list) -> dict[str, dict]:
    total, src, readings, weak = Counter(), defaultdict(Counter), Counter(), Counter()
    for r in rows:
        total[r[1]] += 1
        src[r[1]][r[SOURCE_COL] or "none"] += 1
        readings[r[1]] += bool(len(r) > READING_COL and r[READING_COL])
        weak[r[1]] += is_form_of(r[3])
    return {
        l: {"rows": n, "ipa": n - src[l]["none"], "ipa_coverage": round(1 - src[l]["none"] / n, 4), "ipa_sources": dict(src[l]),
            "readings": readings[l], "form_of_glosses": weak[l]}
        for l, n in sorted(total.items()) if l in SUBSET_LANGS
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--shipped", default=SHIPPED)
    ap.add_argument("--manifest", default=MANIFEST)
    ap.add_argument("--stage", choices=["extract", "lemmas", "validate", "all"], default="all")
    ap.add_argument("--dump-worst", default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    rows = load(args.shipped)
    for r in rows:
        while len(r) <= READING_COL:
            r.append(None)
    if args.stage == "extract":
        print(stream_raw(wanted(rows), SUBSET))
        return 0
    kk = read_jsonl(SUBSET)
    if args.stage == "lemmas":
        print(stream_raw(lemma_targets(rows, kk), LEMMAS))
        return 0
    lemmas = read_jsonl(LEMMAS)
    jm = load_jmdict(os.path.join(DICTS, "JMdict_e.gz"))
    kd = load_kanjidic(os.path.join(DICTS, "kanjidic2.xml.gz"))
    ce = load_cedict(os.path.join(DICTS, "cedict.txt.gz"))
    try:
        import panphon

        ft = panphon.FeatureTable()
    except ImportError:
        ft = None
    res = resolve(rows, kk, jm, kd, ce)
    before = coverage(rows)
    report = validate(rows, res, ft)
    if args.dump_worst:
        with open(args.dump_worst, "w") as f:
            for lang, w in validate.worst.items():
                for x in sorted(w, reverse=True)[:60]:
                    f.write(f"{lang}\t" + "\t".join(str(v) for v in x) + "\n")
    if args.stage == "validate":
        return 0

    ship = {l for l, v in report.items() if v["ship"]}
    gloss_src, modern_ref = Counter(), Counter()
    variants: dict[str, dict] = {}
    for r in rows:
        lang = r[1]
        if lang not in SUBSET_LANGS:
            continue
        info = res[r[0]]
        if lang in REF_TAG and r[SOURCE_COL] == "wiktionary":
            ref = tagged_ref(lang, info["entries"])
            if ref and ref != r[IPA_COL]:
                variants[r[0]] = {"variant": VARIANT[lang], "previous": r[IPA_COL]}
                r[IPA_COL] = ref
                modern_ref[lang] += 1
        if not r[IPA_COL] and lang in ship:
            ipa = ipa_from_reading(lang, info["reading"], r[2])
            if ipa:
                r[IPA_COL] = ipa
                r[SOURCE_COL] = {"jmdict": "jmdict", "kanjidic": "jmdict", "cedict": "cedict"}.get(info["reading_source"], "rules")
        if lang in READING_LANGS:
            r[READING_COL] = romanize(lang, r, info)
        if lang in GLOSS_LANGS:
            g = better_gloss(r, info, lemmas, jm, ce)
            if g:
                r[3] = g[0]
                gloss_src[f"{lang}:{g[1]}"] += 1

    manifest = json.load(open(args.manifest)) if os.path.exists(args.manifest) else {}
    manifest["rules_validation"] = report
    manifest["thin_langs"] = {
        "before": before,
        "after": coverage(rows),
        "gloss_replacements": dict(sorted(gloss_src.items())),
        "wiktionary_ipa_switched_to_modern": {"rows": dict(modern_ref), "total": sum(modern_ref.values()),
                                               "variants": VARIANT, "sidecar": "polingual/data/ipa-variants.json.gz",
                                               "sidecar_fields": "photon id to the variant tag and the previous Wiktionary IPA"},
        "reading_column": READING_COL,
        "reading_field": "reading",
        "reading_sources": {
            "ja": "Hepburn romaji from the Wiktionary kana reading, else JMdict or KANJIDIC",
            "zh": "Hanyu Pinyin from Wiktionary, else CC-CEDICT",
            "ko": "Revised Romanization from Wiktionary, else computed from Hangul",
            "th": "Wiktionary romanization, else RTGS computed from the Wiktionary IPA",
            "ta": "Wiktionary romanization, else ISO 15919 computed from the Tamil script",
            "he": "Wiktionary romanization", "ar": "Wiktionary romanization", "fa": "Wiktionary romanization", "hi": "Wiktionary romanization",
        },
        "attribution": [JMDICT_ATTR, CEDICT_ATTR],
    }
    manifest.setdefault("sources", {}).update({
        "rules": "spelling or Wiktionary romanization through scripts/photon/g2p_rules.py, shipped only where phoneme error rate against Wiktionary IPA is at most 15%",
        "jmdict": "kana reading from JMdict or KANJIDIC (EDRDG, CC BY-SA 4.0) through the Japanese kana rules",
        "cedict": "pinyin from CC-CEDICT (CC BY-SA 4.0) through the pinyin rules",
    })
    manifest["modern_reference_note"] = "Hebrew and Persian rows now carry the Wiktionary IPA tagged Modern-Israeli and Iran where Wiktionary has one, and the rules are scored against those, since the first listed Wiktionary IPA was often Tiberian, Biblical or Classical."
    if args.dry_run:
        print(json.dumps(manifest["thin_langs"]["after"], indent=1, ensure_ascii=False))
        return 0
    blob = dump(rows)
    with open(args.shipped, "wb") as f:
        f.write(blob)
    with open(VARIANTS, "wb") as f:
        f.write(dump(dict(sorted(variants.items()))))
    manifest["shipped_sha256"] = hashlib.sha256(blob).hexdigest()
    with open(args.manifest, "w") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
