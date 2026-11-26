#!/usr/bin/env python3
import argparse
import bz2
import hashlib
import json
import math
import os
import re
import sqlite3
import subprocess
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

from input_segment import VARIANTS, WORD_ANY, Segmenter, compounds, lookup_key

ROOT = Path(__file__).resolve().parents[2]
LAYERS = ROOT / "learning/app/corpus/lang-layers.json"
VIDEOS = ROOT / "polingual/public/videos"
OUT = ROOT / "polingual/public/input"
GOLDEN = Path(__file__).resolve().parent / "input_golden.json"
LANGS = ["es", "fr", "it", "pt", "de"]
NEW_LANGS = ["nl", "sv", "pl", "ru", "cs", "tr", "fi", "el", "id", "ar", "he", "hi", "fa", "ko", "ja", "zh", "th", "vi", "ta"]
ISO3 = {"es": "spa", "fr": "fra", "it": "ita", "pt": "por", "de": "deu", "nl": "nld", "sv": "swe", "pl": "pol",
        "ru": "rus", "cs": "ces", "tr": "tur", "fi": "fin", "el": "ell", "id": "ind", "ar": "ara", "he": "heb",
        "hi": "hin", "fa": "pes", "ko": "kor", "ja": "jpn", "zh": "cmn", "th": "tha", "vi": "vie", "ta": "tam"}
SEGMENTED = {"ja", "zh", "th", "ko"}
MIN_SENTENCES = 200
MAX_HELD_OUT_ERROR = 0.10
HELD_OUT = Path(__file__).resolve().parent / "input_heldout.json"
MIN_TOKENS = 40
SET_MIN, SET_MAX = 4, 6
TATOEBA_LICENSE = "CC-BY 2.0 FR"
TATOEBA_SHOW = "https://tatoeba.org/en/sentences/show/"
WORD = re.compile(r"[^\W\d_]+(?:['’\-][^\W\d_]+)*['’]?")
OPENERS = " \t\n¡¿«»\"'(“”„‚-–—"
ENDERS = ".!?…:"
FORM_WORDS = set("""
first second third first-person second-person third-person singular plural feminine masculine neuter
participle past present future perfect pluperfect preterite imperfect indicative subjunctive conditional
imperative infinitive gerund personal impersonal inflected inflection form the and or with
diminutive augmentative superlative comparative contraction genitive dative accusative nominative
strong weak mixed definite indefinite apocopic elative pronominal combined historic anterior
affirmative negative informal formal polite familiar active passive simple compound tense mood
""".split())
WIDE_FORM_WORDS = set("""
prepositional instrumental locative vocative partitive ablative illative inessive adessive allative essive
translative comitative abessive instructive imperfective perfective animate inanimate short long possessive
aspect case oblique construct state jussive dual paucal honorific humble polite plain attributive terminal
connective stem continuative conjunctive negative-form verbal adverbial transgressive status of
""".split())
FORM_HEADS = {"plural", "singular", "feminine", "masculine", "neuter", "participle", "gerund", "infinitive",
              "imperative", "indicative", "subjunctive", "conditional", "preterite", "imperfect", "present", "past",
              "future", "form", "inflection", "contraction", "diminutive", "augmentative", "superlative",
              "comparative", "apocopic", "genitive", "dative", "accusative", "nominative", "pronominal"}
ELISION_TAILS = ("e", "a", "o", "")
RANK_MARGIN = 200
STOP_SHARE = 0.05
INF = float("inf")
GOLDEN_MAX_ERROR = 0.10
MIN_UNITS = 20
MIN_TOKEN_SHARE = 0.90
BCP47 = {"zh": "zh-Hans"}
PACK_OF = {v: k for k, v in BCP47.items()}
LEMMA_EVALUATION = {
    "golden": "scripts/input_golden.json, 50 hand-checked tokens per language",
    "goldenTunedRules": True,
    "goldenMaxError": GOLDEN_MAX_ERROR,
    "heldOutMaxError": MAX_HELD_OUT_ERROR,
    "minUnits": MIN_UNITS,
    "minTokenShare": MIN_TOKEN_SHARE,
    "interval": "Wilson score, 95%",
    "heldOut": {"tokens": 100, "errors": 2, "examples": ["es nos mapped to no", "pt mostra"], "by": "critic round 2",
                "langs": ["es", "fr", "it", "pt", "de"]},
}
KAIKKI_CREDIT = ("Lemmas from Wiktionary via Kaikki (kaikki.org), CC BY-SA 3.0. Share-alike: lemma data and "
                 "works adapted from it are distributed under CC BY-SA 3.0 or a compatible license, with attribution.")
TATOEBA_CREDIT = ("Sentences from Tatoeba (tatoeba.org), CC-BY 2.0 FR. Each item keeps its Tatoeba sentence numbers and "
                  "authors; each unit carries a credit line.")
CLOSED_CLASS = {
    "es": {"a": "a", "al": "a"},
    "fr": {"a": "avoir"},
    "it": {"a": "a"},
    "pt": {"a": "a"},
    "de": {"im": "in"},
}
IT_ARTICULATED = {"de": "di", "a": "a", "da": "da", "ne": "in", "su": "su"}
FIXED = {
    "fr": {"ma": "mon", "ta": "ton", "sa": "son", "mes": "mon", "tes": "ton", "ses": "son",
           "nos": "notre", "vos": "votre", "leurs": "leur"},
    "it": {"i": "il", "l'": None, "l’": None, "d'": "di", "d’": "di",
           **{stem + tail: prep for stem, prep in IT_ARTICULATED.items()
              for tail in ("l", "llo", "lla", "ll'", "ll’", "i", "gli", "lle") if stem + tail != "dai"}},
}


PACK_FOLD = re.compile("[\u0300-\u036f\u0591-\u05c7\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]")


def fold(s):
    return PACK_FOLD.sub("", unicodedata.normalize("NFKD", s)).lower().strip()


def split_word(w, known):
    for sep in ("'", "’", "-"):
        if sep in w.strip(sep):
            head, _, tail = w.partition(sep)
            if len(head) > 3 and known(w):
                return [w]
            left = head + sep if sep != "-" else head
            return [p for p in [left] + split_word(tail, known) if p.strip(sep)]
    return [w.strip("-")]


def tokenize_with_position(text, known=lambda w: False):
    out = []
    for m in WORD.finditer(text):
        prev = text[: m.start()].rstrip(OPENERS)
        initial = not prev or prev[-1] in ENDERS
        for k, part in enumerate(split_word(m.group(0), known)):
            out.append((part, initial and k == 0))
    return out


def tokenize(text, known=lambda w: False):
    return [w for w, _ in tokenize_with_position(text, known)]


def is_tag_only(sense, vocab=FORM_WORDS):
    words = sense.lower().replace(",", " ").replace("/", " ").rstrip(":. ").split()
    return bool(words) and set(words) <= vocab


def lemma_of_meaning(sense, vocab=FORM_WORDS):
    head, sep, rest = sense.strip().partition(" of ")
    words = head.lower().replace(",", " ").replace("/", " ").split()
    heads = FORM_HEADS | (WIDE_FORM_WORDS if vocab is not FORM_WORDS else set())
    if not sep or not words or not set(words) <= vocab or not set(words) & heads:
        return None
    if words[0] == "apocopic" and ";" in rest:
        return None
    parts = rest.split()
    target = parts[0].strip(".,;:()'’“”") if parts else ""
    return target or None


class Lexicon:
    def __init__(self, lookup, noun_caps=False, closed=None, key=None, variants=None, wide=False, analyze=None,
                 fallback=None, fixed=None):
        self.lookup = lookup
        self.fixed = fixed or {}
        self.key = key or (lambda s: s)
        self.variants = variants
        self.vocab = FORM_WORDS | WIDE_FORM_WORDS if wide else FORM_WORDS
        self.analyze = analyze
        self.fallback = fallback
        self.names = set()
        self.closed = closed or {}
        self.noun_caps = noun_caps
        self.cache = {}

    def _find(self, cand):
        cand = self.key(cand)
        senses, rank = self.lookup(cand)
        return (cand, senses, rank) if senses else None

    def _entry(self, surface, initial=False):
        lower = surface.lower()
        cands = [lower[:-1] + t for t in ELISION_TAILS] if surface.endswith(("'", "’")) else []
        found = [e for e in map(self._find, dict.fromkeys(cands)) if e]
        if found:
            return found[0]
        low = self._find(lower)
        exact = self._find(surface) if surface != lower else None
        if surface == lower:
            return low or (None, [], None)
        if exact and (not initial or not low or low[2] is None) and any(p == "name" for _, p in exact[1]):
            return exact
        if initial and not self.noun_caps:
            return low or exact or (None, [], None)
        if initial and low and exact:
            low_rank = low[2] if low[2] is not None else INF
            exact_rank = exact[2] if exact[2] is not None else INF
            return low if low_rank <= exact_rank + RANK_MARGIN else exact
        if initial and low:
            return low
        return exact or low or (None, [], None)

    def learn_names(self, texts, min_count=2):
        seen = Counter()
        for text in texts:
            for s, initial, _ in (self.analyze or analyze_default)(text, self):
                if not initial and s[:1].isupper() and s[1:2].islower():
                    seen[s] += 1
        self.names = {s for s, n in seen.items() if n >= min_count}

    def known(self, surface):
        return self._entry(surface)[0] is not None

    def _forms(self, senses):
        return [(self.key(t), pos) for g, pos in senses for t in [lemma_of_meaning(g, self.vocab)] if t]

    def _base(self, found, senses, rank, depth=0):
        forms = self._forms(senses)
        if not forms:
            return found
        targets = {t for t, _ in forms}
        forms = [(t, pos) for t, pos in forms
                 if not any(u in targets and u != t and p == pos for u, p in self._forms(self._entry(t)[1]))]
        own = any((lemma_of_meaning(g, self.vocab) is None and not is_tag_only(g, self.vocab)) or g.lower().startswith("apocopic") and ";" in g
                  for g, _ in senses)
        choices = []
        for target, pos in dict.fromkeys(forms):
            t_found, t_senses, t_rank = self._entry(target)
            if not t_found:
                continue
            pos_match = any(p == pos and lemma_of_meaning(g, self.vocab) is None for g, p in t_senses)
            choices.append((not pos_match, t_rank if t_rank is not None else INF, t_found, t_rank))
        for *_, t_found, t_rank in sorted(choices):
            if own and (t_rank is None or rank is None or t_rank > rank + RANK_MARGIN):
                continue
            t_senses = self._entry(t_found)[1]
            if depth < 2 and t_senses and all(lemma_of_meaning(g, self.vocab) or is_tag_only(g, self.vocab)
                                             for g, _ in t_senses):
                return self._base(t_found, t_senses, t_rank, depth + 1)
            return t_found
        return found if own else forms[0][0]

    def lemma(self, surface, initial=False, hints=None):
        key = (surface, initial, tuple(hints or ()))
        if key not in self.cache and surface.lower() in self.fixed:
            fixed = self.fixed[surface.lower()]
            self.cache[key] = (fixed, True) if fixed else (surface, False)
        if key not in self.cache and surface in self.names and not self._find(surface):
            self.cache[key] = (surface, False)
        if key not in self.cache:
            found, senses, rank = None, [], None
            for h in hints or ():
                found, senses, rank = self._entry(h)
                if found:
                    break
            if found is None:
                found, senses, rank = self._entry(surface, initial)
            if found is None and self.fallback:
                for v in self.fallback(surface):
                    found, senses, rank = self._entry(v)
                    if found:
                        break
            if found is None and self.variants:
                for v in self.variants(surface):
                    found, senses, rank = self._entry(v)
                    if found:
                        break
            if found is None and surface.lower() in self.closed:
                self.cache[key] = (self.closed[surface.lower()], True)
            elif found is None:
                self.cache[key] = (surface, False)
            else:
                self.cache[key] = (self._base(found, senses, rank), True)
        return self.cache[key]


def sqlite_lookup(index_db, pack_db, lang):
    idx = sqlite3.connect(f"file:{index_db}?mode=ro", uri=True)
    pack = sqlite3.connect(f"file:{pack_db}?mode=ro", uri=True)

    def lookup(surface):
        senses, rank = [], None
        row = idx.execute(
            "select rowid, payload, pos from photons where lang = ? and surface = ? limit 1", (lang, surface)
        ).fetchone()
        if row:
            rank = row[0]
            for x in json.loads(row[1]).get("senses", []):
                if x.get("gloss"):
                    senses.append((x["gloss"], x.get("pos") or row[2]))
        rows = pack.execute(
            "select meaning, pos from words where folded = ? and surface = ? order by id limit 4", (fold(surface), surface)
        ).fetchall()
        for meaning, pos in rows:
            senses += [(m, pos) for m in meaning.split(" · ") if (m, pos) not in senses]
        return senses, rank

    return lookup


def analyze_default(text, lex):
    return [(s, i, None) for s, i in tokenize_with_position(text, lex.known)]


def analyzer(lang):
    if lang in SEGMENTED:
        seg = Segmenter(lang)
        if lang == "zh":
            return lambda text, lex: seg.split_unknown(seg(text), lex.known)
        return lambda text, lex: seg(text)

    def wide(text, lex):
        out = []
        for m in WORD_ANY.finditer(text):
            prev = text[: m.start()].rstrip(OPENERS)
            initial = not prev or prev[-1] in ENDERS
            parts = [m.group(0)] if lang in ("he", "ar", "fa") else split_word(m.group(0), lex.known)
            for k, part in enumerate(parts):
                out.append((part, initial and k == 0))
        if lang == "vi":
            out = compounds(out, lex.known)
        return [(s, i, None) for s, i in out]

    return wide


def tokens_for(text, lex):
    toks = []
    for s, initial, hints in (lex.analyze or analyze_default)(text, lex):
        lemma, mapped = lex.lemma(s, initial, hints)
        toks.append({"surface": s, "lemma": lemma, **({} if mapped else {"unmapped": True})})
    return toks


def make_item(id_, lang, kind, text, lex, source, license_, translation=None, media=None):
    toks = tokens_for(text, lex)
    item = {
        "id": id_, "lang": lang, "kind": kind, "text": text,
        "tokens": toks, "lemmas": sorted({t["lemma"] for t in toks}),
        "source": source, "license": license_,
    }
    if translation:
        item["translation"] = translation
    if media:
        item["media"] = media
    return item


def bz2_rows(path):
    with bz2.open(path, "rt", encoding="utf-8") as f:
        for line in f:
            yield line.rstrip("\n").split("\t")


def author(user):
    return None if user in ("", "\\N") else user


def tatoeba_meta(tatoeba_dir, lang, pool):
    wanted = {en_id: p["t"][lang].strip() for en_id, p in pool.items() if lang in p["t"]}
    cand = defaultdict(set)
    for r in bz2_rows(tatoeba_dir / f"{ISO3[lang]}-eng_links.tsv.bz2"):
        if len(r) >= 2 and r[1] in wanted:
            cand[r[0]].add(r[1])
    meta = {}
    for r in bz2_rows(tatoeba_dir / f"{ISO3[lang]}_sentences_detailed.tsv.bz2"):
        if len(r) >= 4 and r[0] in cand:
            for en_id in cand[r[0]]:
                if r[2].strip() == wanted[en_id] and en_id not in meta:
                    meta[en_id] = {"id": r[0], "author": author(r[3])}
    return meta


def tatoeba_en_authors(tatoeba_dir, en_ids):
    out = {}
    for r in bz2_rows(tatoeba_dir / "eng_sentences_detailed.tsv.bz2"):
        if len(r) >= 4 and r[0] in en_ids:
            out[r[0]] = author(r[3])
    return out


def tatoeba_items(lang, pool, lex, meta, en_authors):
    seen = set()
    for en_id in sorted(pool, key=int):
        t = pool[en_id]["t"]
        if lang not in t:
            continue
        m = meta.get(en_id, {})
        ids = {"en": en_id, **({lang: m["id"]} if m.get("id") else {})}
        authors = {"en": en_authors.get(en_id), **({lang: m.get("author")} if m.get("id") else {})}
        main_id = m.get("id", en_id)
        if main_id in seen:
            continue
        seen.add(main_id)
        item = make_item(
            f"tatoeba:{lang}:{main_id}", lang, "sentence", t[lang], lex,
            {"name": "tatoeba", "url": f"{TATOEBA_SHOW}{main_id}", "sentenceIds": ids, "authors": authors},
            TATOEBA_LICENSE, translation=t.get("en"),
        )
        lv = pool[en_id].get("lv", {}).get(lang)
        if lv:
            item["cefr"] = ["A1", "A2", "B1"][lv - 1]
        yield item


def video_items(lang, video, lex):
    for i, cue in enumerate(video["cues"]):
        text = cue["text"].get(lang)
        if not text:
            continue
        yield make_item(
            f"video:{video['id']}:{lang}:{i}", lang, "video_segment", text, lex,
            {"name": "youtube", "url": video["source_url"], "title": video["title"], "channel": video.get("channel")},
            video.get("license", "unknown"),
            translation=cue["text"].get("en") if lang != "en" else None,
            media={"videoId": video["id"], "start": cue["start"], "end": cue["end"]},
        )


def ntok(item):
    return len(item["tokens"])


def episode_units(video, items):
    units, cur = [], []
    for it in items:
        cur.append(it)
        if sum(map(ntok, cur)) >= MIN_TOKENS:
            units.append(cur)
            cur = []
    if cur:
        if units:
            units[-1].extend(cur)
        elif sum(map(ntok, cur)) >= MIN_TOKENS:
            units.append(cur)
    credit = f"{video.get('title', video['id'])}, {video.get('channel') or 'unknown channel'}, {video['source_url']}, {video.get('license', 'unknown')}"
    return [
        {"id": f"episode:{video['id']}:{n}", "kind": "episode", "itemIds": [i["id"] for i in u],
         "targetLemmas": [], "tokenCount": sum(map(ntok, u)), "credit": credit,
         "credits": [{"url": video["source_url"], "author": video.get("channel")}]}
        for n, u in enumerate(units)
    ]


def tatoeba_credits(items):
    credits = []
    for it in items:
        src = it["source"]
        for lang, sid in src["sentenceIds"].items():
            credits.append({"sentenceId": sid, "lang": lang, "author": src.get("authors", {}).get(lang),
                            "url": f"{TATOEBA_SHOW}{sid}"})
    return credits


def credit_line(credits):
    parts = [f"#{c['sentenceId']} by {c['author'] or 'unknown'} ({c['url']})" for c in credits]
    return f"Tatoeba sentences {', '.join(parts)}, {TATOEBA_LICENSE}"


def sentence_set_units(lang, items):
    df = Counter(l for it in items for l in set(it["lemmas"]))
    stop = {l for l, c in df.items() if c > max(SET_MAX, STOP_SHARE * len(items))}
    by_lemma = defaultdict(list)
    for it in items:
        for l in sorted(set(it["lemmas"]) - stop):
            by_lemma[l].append(it)
    units, used = [], set()
    for lemma in sorted(by_lemma, key=lambda l: (-len(by_lemma[l]), l)):
        pool = sorted((it for it in by_lemma[lemma] if it["id"] not in used), key=lambda it: (-ntok(it), it["id"]))
        chosen = []
        for it in pool:
            chosen.append(it)
            if len(chosen) >= SET_MIN and sum(map(ntok, chosen)) >= MIN_TOKENS:
                break
            if len(chosen) == SET_MAX:
                break
        total = sum(map(ntok, chosen))
        if len(chosen) < SET_MIN or total < MIN_TOKENS:
            continue
        shared = Counter(l for it in chosen for l in sorted(set(it["lemmas"]) - stop))
        targets = [lemma] + [l for l, c in shared.most_common() if c >= 2 and l != lemma][:2]
        used.update(it["id"] for it in chosen)
        credits = tatoeba_credits(chosen) if all(it["source"]["name"] == "tatoeba" for it in chosen) else []
        units.append({"id": f"set:{lang}:{lemma}", "kind": "sentence_set", "itemIds": [it["id"] for it in chosen],
                      "targetLemmas": targets, "tokenCount": total,
                      "credit": credit_line(credits) if credits else "", "credits": credits})
    return units


def coverage(items):
    toks = [t for it in items for t in it["tokens"]]
    types = {t["surface"].lower(): "unmapped" not in t for t in toks}
    mapped = sum("unmapped" not in t for t in toks)
    return {
        "tokens": len(toks), "tokensMapped": mapped,
        "tokenShare": round(mapped / len(toks), 4) if toks else 0,
        "types": len(types), "typesMapped": sum(types.values()),
        "typeShare": round(sum(types.values()) / len(types), 4) if types else 0,
    }


def build_lang(lang, lex, pool, videos, meta=None, en_authors=None):
    tat = list(tatoeba_items(lang, pool, lex, meta or {}, en_authors or {}))
    units = sentence_set_units(lang, tat)
    vid_items = []
    for v in videos:
        its = list(video_items(lang, v, lex))
        vid_items.extend(its)
        units.extend(episode_units(v, its))
    in_unit = {i for u in units for i in u["itemIds"]}
    items = [it for it in tat + vid_items if it["id"] in in_unit]
    return {
        "format": "polingual-input", "version": 1, "lang": lang,
        "attribution": [
            TATOEBA_CREDIT,
            KAIKKI_CREDIT,
        ],
        "coverage": coverage(tat + vid_items),
        "tatoebaIdsMatched": sum(1 for it in tat if len(it["source"]["sentenceIds"]) > 1),
        "tatoebaItems": len(tat),
        "items": items, "units": units,
    }


def open_lexicon(lang, packs, scratch, index_db):
    zst = packs / lang / f"polingual-{lang}.sqlite.zst"
    if not zst.exists():
        sys.exit(f"input_bundle: missing pack {zst}")
    db = scratch / f"{lang}.sqlite"
    if not db.exists():
        subprocess.run(["zstd", "-dqf", str(zst), "-o", str(db)], check=True)
    if lang in LANGS:
        return Lexicon(sqlite_lookup(index_db, db, lang), noun_caps=lang == "de", closed=CLOSED_CLASS.get(lang),
                       fixed=FIXED.get(lang))
    return Lexicon(sqlite_lookup(index_db, db, lang), closed=CLOSED_CLASS.get(lang), key=lookup_key(lang),
                   variants=VARIANTS.get(lang), wide=True, analyze=analyzer(lang), fallback=lemmatizer(lang))


def lemmatizer(lang):
    if lang in SEGMENTED or lang in ("ar", "he", "ta", "vi"):
        return None
    import simplemma
    from simplemma.strategies.dictionaries.dictionary_factory import SUPPORTED_LANGUAGES

    if lang not in SUPPORTED_LANGUAGES:
        return None

    def guesses(surface):
        g = simplemma.lemmatize(surface, lang=lang)
        if g == surface:
            return []
        return [g + ("mak" if any(v in "aıou" for v in g[-2:]) else "mek"), g] if lang == "tr" else [g]

    return guesses


def augment_pool(tatoeba_dir, lang, pool):
    missing = {en_id for en_id, p in pool.items() if lang not in p["t"]}
    links = defaultdict(set)
    for r in bz2_rows(tatoeba_dir / f"{ISO3[lang]}-eng_links.tsv.bz2"):
        if len(r) >= 2 and r[1] in missing:
            links[r[0]].add(r[1])
    best = {}
    for r in bz2_rows(tatoeba_dir / f"{ISO3[lang]}_sentences_detailed.tsv.bz2"):
        if len(r) >= 3 and r[0] in links:
            for en_id in links[r[0]]:
                if en_id not in best or int(r[0]) < int(best[en_id][0]):
                    best[en_id] = (r[0], r[2].strip())
    out = {}
    for en_id, p in pool.items():
        if en_id in best:
            p = {**p, "t": {**p["t"], lang: best[en_id][1]}}
        out[en_id] = p
    return out


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def write_bundle(bundle, out, part=""):
    body = json.dumps(bundle, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    digest = hashlib.sha256(body.encode()).hexdigest()[:12]
    prefix = f"{bundle['lang']}.{part + '.' if part else ''}"
    name = f"{prefix}{digest}.json"
    for old in out.glob(f"{prefix}*.json"):
        if old.name != name and re.fullmatch(re.escape(prefix) + r"[0-9a-f]{12}\.json", old.name):
            old.unlink()
    (out / name).write_text(body)
    return name


def lemma_alone(lex, surface, initial, context=None):
    if lex.analyze and context:
        for s, i, hints in lex.analyze(context, lex):
            if s == surface and i == initial:
                return lex.lemma(s, i, hints)[0]
    if lex.analyze:
        got = [t for t in lex.analyze(surface, lex) if t[0] == surface] or lex.analyze(surface, lex)
        if len(got) == 1 or got[0][0] == surface:
            return lex.lemma(surface, initial, got[0][2])[0]
    return lex.lemma(surface, initial)[0]


def golden_error_rate(lex, rows):
    wrong = [r[:3] for r in rows if lemma_alone(lex, *r[:2], *r[3:4]) not in (r[2] if isinstance(r[2], list) else [r[2]])]
    return len(wrong) / len(rows), wrong


def wilson(errors, n, z=1.96):
    if not n:
        return [0.0, 1.0]
    p = errors / n
    centre = (p + z * z / (2 * n)) / (1 + z * z / n)
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return [round(max(0.0, centre - half), 3), round(min(1.0, centre + half), 3)]


def error_report(lex, rows):
    rate, wrong = golden_error_rate(lex, rows)
    return {"tokens": len(rows), "errors": len(wrong), "error": round(rate, 3), "ci95": wilson(len(wrong), len(rows))}


def evaluate(lex, golden_rows, held_rows):
    out = {}
    if golden_rows:
        out["golden"] = error_report(lex, golden_rows)
    if held_rows:
        out["heldOut"] = {**error_report(lex, held_rows), "file": "scripts/input_heldout.json"}
    return out


def gate(lang, sentences, evaluation):
    if lang not in LANGS and sentences < MIN_SENTENCES:
        return f"{sentences} Tatoeba sentences linked to the English pool, below {MIN_SENTENCES}"
    if evaluation.get("golden", {}).get("error", 0) > GOLDEN_MAX_ERROR:
        return f"golden lemma error {evaluation['golden']['error']:.2f} above {GOLDEN_MAX_ERROR}"
    if lang not in LANGS and "heldOut" not in evaluation:
        return "no 50-token held-out set drawn"
    if lang not in LANGS and evaluation.get("heldOut", {}).get("error", 0) > MAX_HELD_OUT_ERROR:
        return f"held-out lemma error {evaluation['heldOut']['error']:.2f} above {MAX_HELD_OUT_ERROR}"
    return None


def ship_status(evaluation):
    upper = evaluation.get("heldOut", {}).get("ci95", [0, 0])[1]
    return "stable" if "heldOut" in evaluation and upper <= MAX_HELD_OUT_ERROR else "beta"


def display_forms(bundle):
    lang = PACK_OF.get(bundle["lang"], bundle["lang"])
    tag = BCP47.get(lang, lang)
    bundle["lang"] = tag
    if lang != "zh":
        for it in bundle["items"]:
            it["lang"] = tag
        return bundle
    from opencc import OpenCC
    simple = OpenCC("t2s").convert
    for it in bundle["items"]:
        it["lang"] = tag
        it["text"] = simple(it["text"])
        for t in it.get("tokens", []):
            t["surface"] = simple(t["surface"])
            t["display"] = simple(t["lemma"])
    return bundle


def write_sample(bundle, out):
    unit = bundle["units"][0] if bundle["units"] else None
    ids = set(unit["itemIds"]) if unit else set()
    sample = {**{k: v for k, v in bundle.items() if k not in ("items", "units")},
              "items": [it for it in bundle["items"] if it["id"] in ids], "units": [unit] if unit else []}
    (out / "sample").mkdir(exist_ok=True)
    (out / "sample" / f"{bundle['lang']}.json").write_text(
        json.dumps(sample, ensure_ascii=False, indent=1, sort_keys=True) + "\n")


def golden_lexicon(lang, a):
    lex = open_lexicon(lang, a.packs, a.scratch, a.index)
    if lang not in LANGS and a.tatoeba:
        pool = augment_pool(a.tatoeba, lang, json.loads(a.layers.read_text())["sentences"]["pool"])
        lex.learn_names(p["t"][lang] for p in pool.values() if lang in p["t"])
    return lex


def env_path(value, env):
    v = value or os.environ.get(env)
    return Path(v).expanduser() if v else None


def parse(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--langs", default=",".join(LANGS))
    ap.add_argument("--packs", help="dir of Polingual packs, or POLINGUAL_PACKS_DIR")
    ap.add_argument("--index", help="photons index.sqlite, or PHOTONS_INDEX")
    ap.add_argument("--tatoeba", help="dir from fetch_tatoeba.sh, or TATOEBA_DIR")
    ap.add_argument("--scratch", help="dir for unpacked packs, or INPUT_SCRATCH_DIR")
    ap.add_argument("--layers", default=str(LAYERS))
    ap.add_argument("--videos", default=str(VIDEOS))
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--bands-out", help="dir for band files kept out of git, or POLINGUAL_INPUT_BANDS_DIR")
    ap.add_argument("--golden", action="store_true")
    ap.add_argument("--ranks", help="dir of frequency rank tables, or POLINGUAL_RANKS_DIR; enables graded units")
    ap.add_argument("--graded-cap", type=int, default=None, help="max graded sets per band; default uses every usable set")
    a = ap.parse_args(argv)
    a.packs = env_path(a.packs, "POLINGUAL_PACKS_DIR")
    a.index = env_path(a.index, "PHOTONS_INDEX")
    a.tatoeba = env_path(a.tatoeba, "TATOEBA_DIR")
    a.scratch = env_path(a.scratch, "INPUT_SCRATCH_DIR")
    a.ranks = env_path(a.ranks, "POLINGUAL_RANKS_DIR")
    for name in ("packs", "index", "scratch") + (() if a.golden else ("tatoeba",)):
        p = getattr(a, name)
        if p is None:
            ap.error(f"--{name} is required (flag or env var)")
        if name != "scratch" and not p.exists():
            ap.error(f"--{name} {p} does not exist")
    a.layers, a.videos, a.out = Path(a.layers), Path(a.videos), Path(a.out)
    a.bands_out = env_path(a.bands_out, "POLINGUAL_INPUT_BANDS_DIR") or Path.home() / ".cache/polingual-input-bands"
    return a


def main(argv=None):
    a = parse(argv)
    a.scratch.mkdir(parents=True, exist_ok=True)
    langs = a.langs.split(",")
    if a.golden:
        gold = json.loads(GOLDEN.read_text())
        held = json.loads(HELD_OUT.read_text()) if HELD_OUT.exists() else {}
        for lang in langs:
            lex = golden_lexicon(lang, a)
            for name, rows in (("golden", gold.get(lang)), ("held-out", held.get(lang))):
                if rows:
                    rate, wrong = golden_error_rate(lex, rows)
                    print(f"{lang} {name} error {rate:.3f} ({len(wrong)}/{len(rows)}) {wrong}")
        return
    a.out.mkdir(parents=True, exist_ok=True)
    pool = json.loads(a.layers.read_text())["sentences"]["pool"]
    video_paths = [p for p in sorted(a.videos.glob("*.json")) if p.name != "index.json"]
    videos = [json.loads(p.read_text()) for p in video_paths]
    en_authors = tatoeba_en_authors(a.tatoeba, set(pool))
    manifest_path = a.out / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {"format": "polingual-input", "langs": {}}
    manifest["credits"] = [TATOEBA_CREDIT, KAIKKI_CREDIT]
    manifest["lemmaEvaluation"] = {**LEMMA_EVALUATION, "byLang": manifest.get("lemmaEvaluation", {}).get("byLang", {})}
    base = os.environ.get("NEXT_PUBLIC_POLINGUAL_INPUT_BASE") or manifest.get("bandBase")
    manifest["bandBase"] = None if base and re.match(r"https?://(127\.0\.0\.1|localhost)[:/]", base) else base
    manifest["bandBaseEnv"] = "NEXT_PUBLIC_POLINGUAL_INPUT_BASE"
    manifest.pop("bundleBase", None)
    manifest.pop("bundleBaseEnv", None)
    manifest.pop("tags", None)
    manifest["langTags"] = "BCP-47"
    inputs = manifest.setdefault("inputs", {})
    inputs["layers"] = sha(a.layers)
    inputs["videos"] = {p.name: sha(p) for p in video_paths}
    inputs["index"] = sha(a.index)
    inputs.setdefault("tatoeba", {})["eng_sentences_detailed"] = sha(a.tatoeba / "eng_sentences_detailed.tsv.bz2")
    inputs.setdefault("packs", {})
    held = json.loads(HELD_OUT.read_text()) if HELD_OUT.exists() else {}
    gold = json.loads(GOLDEN.read_text())
    manifest.pop("skipped", None)
    excluded = manifest.setdefault("excluded", {})
    by_lang = manifest["lemmaEvaluation"]["byLang"]
    for lang in langs:
        tag = BCP47.get(lang, lang)
        for key in {tag, lang}:
            manifest["langs"].pop(key, None)
            by_lang.pop(key, None)
        excluded.pop(tag, None)
        lex = open_lexicon(lang, a.packs, a.scratch, a.index)
        lang_pool = pool if lang in LANGS else augment_pool(a.tatoeba, lang, pool)
        if lang not in LANGS:
            lex.learn_names(p["t"][lang] for p in lang_pool.values() if lang in p["t"])
        n = sum(1 for p in lang_pool.values() if lang in p["t"])
        evaluation = evaluate(lex, gold.get(lang), held.get(lang))
        if evaluation:
            by_lang[tag] = evaluation
        reason = gate(lang, n, evaluation)
        if reason:
            excluded[tag] = reason
            print(lang, "excluded:", reason, file=sys.stderr)
            continue
        b = build_lang(lang, lex, lang_pool, videos, tatoeba_meta(a.tatoeba, lang, lang_pool), en_authors)
        graded = None
        if a.ranks:
            import graded_input
            graded = graded_input.extend_bundle(b, lang, lex, a.tatoeba, a.ranks, a.graded_cap)
            b, parts = graded_input.split_bands(display_forms(b))
            a.bands_out.mkdir(parents=True, exist_ok=True)
            graded["files"] = {}
            for band, chunks in parts.items():
                graded["files"][str(band)] = []
                for k, part in enumerate(chunks):
                    f = write_bundle(part, a.bands_out, f"b{band}.p{k}")
                    graded["files"][str(band)].append({"file": f, "units": len(part["units"]), "items": len(part["items"]),
                                                       "bytes": (a.bands_out / f).stat().st_size})
        b = display_forms(b) if graded is None else b
        name = write_bundle(b, a.out)
        inputs["packs"][lang] = sha(a.packs / lang / f"polingual-{lang}.sqlite.zst")
        for f in (f"{ISO3[lang]}-eng_links.tsv.bz2", f"{ISO3[lang]}_sentences_detailed.tsv.bz2"):
            inputs["tatoeba"][f.removesuffix(".tsv.bz2")] = sha(a.tatoeba / f)
        entry = {"tag": tag, "file": name, "pack": lang, "items": len(b["items"]), "units": len(b["units"]),
                 "coverage": b["coverage"],
                 "tatoebaIdsMatched": b["tatoebaIdsMatched"], "tatoebaItems": b["tatoebaItems"],
                 **({"graded": graded} if graded else {})}
        write_sample(b, a.out)
        if len(b["units"]) < MIN_UNITS or b["coverage"]["tokenShare"] < MIN_TOKEN_SHARE:
            excluded[tag] = (f"built with {len(b['units'])} units and token coverage {b['coverage']['tokenShare']}; "
                             f"needs {MIN_UNITS} units and {MIN_TOKEN_SHARE}")
            print(lang, "excluded:", excluded[tag], file=sys.stderr)
            continue
        entry["status"] = ship_status(evaluation) if lang in LANGS else "beta"
        if tag in by_lang:
            entry["lemmaError"] = by_lang[tag]
        manifest["langs"][tag] = entry
        print(lang, name, len(b["items"]), len(b["units"]), json.dumps(b["coverage"]), file=sys.stderr)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1, sort_keys=True) + "\n")


if __name__ == "__main__":
    main()
