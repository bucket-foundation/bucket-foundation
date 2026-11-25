#!/usr/bin/env python3
import argparse
import bz2
import hashlib
import json
import os
import re
import sqlite3
import subprocess
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LAYERS = ROOT / "learning/app/corpus/lang-layers.json"
VIDEOS = ROOT / "polingual/public/videos"
OUT = ROOT / "polingual/public/input"
GOLDEN = Path(__file__).resolve().parent / "input_golden.json"
LANGS = ["es", "fr", "it", "pt", "de"]
ISO3 = {"es": "spa", "fr": "fra", "it": "ita", "pt": "por", "de": "deu"}
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
strong weak mixed definite indefinite apocopic elative pronominal combined
affirmative negative informal formal polite familiar active passive simple compound tense mood
""".split())
FORM_HEADS = {"plural", "singular", "feminine", "masculine", "neuter", "participle", "gerund", "infinitive",
              "imperative", "indicative", "subjunctive", "conditional", "preterite", "imperfect", "present", "past",
              "future", "form", "inflection", "contraction", "diminutive", "augmentative", "superlative",
              "comparative", "apocopic", "genitive", "dative", "accusative", "nominative", "pronominal"}
ELISION_TAILS = ("e", "a", "o", "")
RANK_MARGIN = 200
STOP_SHARE = 0.05
INF = float("inf")
GOLDEN_MAX_ERROR = {"es": 0.0, "fr": 0.02, "it": 0.0, "pt": 0.08, "de": 0.04}
LEMMA_EVALUATION = {
    "golden": "scripts/input_golden.json, 50 hand-checked tokens per language",
    "goldenTunedRules": True,
    "goldenError": GOLDEN_MAX_ERROR,
    "heldOut": {"tokens": 100, "errors": 2, "examples": ["es nos mapped to no", "pt mostra"], "by": "critic round 2"},
}
CLOSED_CLASS = {
    "es": {"a": "a", "al": "a"},
    "fr": {"a": "avoir"},
    "it": {"a": "a"},
    "pt": {"a": "a"},
    "de": {"im": "in"},
}


def fold(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s.lower()) if not unicodedata.combining(c))


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


def is_tag_only(sense):
    words = sense.lower().replace(",", " ").replace("/", " ").rstrip(":. ").split()
    return bool(words) and set(words) <= FORM_WORDS


def lemma_of_meaning(sense):
    head, sep, rest = sense.strip().partition(" of ")
    words = head.lower().replace(",", " ").replace("/", " ").split()
    if not sep or not words or not set(words) <= FORM_WORDS or not set(words) & FORM_HEADS:
        return None
    if words[0] == "apocopic" and ";" in rest:
        return None
    parts = rest.split()
    target = parts[0].strip(".,;:()'’“”") if parts else ""
    return target or None


class Lexicon:
    def __init__(self, lookup, noun_caps=False, closed=None):
        self.lookup = lookup
        self.closed = closed or {}
        self.noun_caps = noun_caps
        self.cache = {}

    def _find(self, cand):
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

    def known(self, surface):
        return self._entry(surface)[0] is not None

    def _base(self, found, senses, rank):
        forms = [(t, pos) for g, pos in senses for t in [lemma_of_meaning(g)] if t]
        if not forms:
            return found
        own = any((lemma_of_meaning(g) is None and not is_tag_only(g)) or g.lower().startswith("apocopic") and ";" in g
                  for g, _ in senses)
        choices = []
        for target, pos in dict.fromkeys(forms):
            t_found, t_senses, t_rank = self._entry(target)
            if not t_found:
                continue
            pos_match = any(p == pos and lemma_of_meaning(g) is None for g, p in t_senses)
            choices.append((not pos_match, t_rank if t_rank is not None else INF, t_found, t_rank))
        for *_, t_found, t_rank in sorted(choices):
            if own and (t_rank is None or rank is None or t_rank > rank + RANK_MARGIN):
                continue
            return t_found
        return found if own else forms[0][0]

    def lemma(self, surface, initial=False):
        key = (surface, initial)
        if key not in self.cache:
            found, senses, rank = self._entry(surface, initial)
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


def tokens_for(text, lex):
    toks = []
    for s, initial in tokenize_with_position(text, lex.known):
        lemma, mapped = lex.lemma(s, initial)
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
            "Sentences from Tatoeba (tatoeba.org), CC-BY 2.0 FR. Each item keeps its Tatoeba sentence numbers and authors; each unit carries a credit line.",
            "Lemmas from Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0.",
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
    return Lexicon(sqlite_lookup(index_db, db, lang), noun_caps=lang == "de", closed=CLOSED_CLASS.get(lang))


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def write_bundle(bundle, out):
    body = json.dumps(bundle, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    digest = hashlib.sha256(body.encode()).hexdigest()[:12]
    name = f"{bundle['lang']}.{digest}.json"
    for old in out.glob(f"{bundle['lang']}.*.json"):
        if old.name != name:
            old.unlink()
    (out / name).write_text(body)
    return name


def golden_error_rate(lex, rows):
    wrong = [r for r in rows if lex.lemma(r[0], r[1])[0] not in (r[2] if isinstance(r[2], list) else [r[2]])]
    return len(wrong) / len(rows), wrong


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
    ap.add_argument("--golden", action="store_true")
    a = ap.parse_args(argv)
    a.packs = env_path(a.packs, "POLINGUAL_PACKS_DIR")
    a.index = env_path(a.index, "PHOTONS_INDEX")
    a.tatoeba = env_path(a.tatoeba, "TATOEBA_DIR")
    a.scratch = env_path(a.scratch, "INPUT_SCRATCH_DIR")
    for name in ("packs", "index", "scratch") + (() if a.golden else ("tatoeba",)):
        p = getattr(a, name)
        if p is None:
            ap.error(f"--{name} is required (flag or env var)")
        if name != "scratch" and not p.exists():
            ap.error(f"--{name} {p} does not exist")
    a.layers, a.videos, a.out = Path(a.layers), Path(a.videos), Path(a.out)
    return a


def main(argv=None):
    a = parse(argv)
    a.scratch.mkdir(parents=True, exist_ok=True)
    langs = a.langs.split(",")
    if a.golden:
        gold = json.loads(GOLDEN.read_text())
        for lang in langs:
            rate, wrong = golden_error_rate(open_lexicon(lang, a.packs, a.scratch, a.index), gold[lang])
            print(f"{lang} golden error {rate:.3f} ({len(wrong)}/{len(gold[lang])}) {wrong}")
        return
    a.out.mkdir(parents=True, exist_ok=True)
    pool = json.loads(a.layers.read_text())["sentences"]["pool"]
    video_paths = [p for p in sorted(a.videos.glob("*.json")) if p.name != "index.json"]
    videos = [json.loads(p.read_text()) for p in video_paths]
    en_authors = tatoeba_en_authors(a.tatoeba, set(pool))
    manifest_path = a.out / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {"format": "polingual-input", "langs": {}}
    manifest["lemmaEvaluation"] = LEMMA_EVALUATION
    inputs = manifest.setdefault("inputs", {})
    inputs["layers"] = sha(a.layers)
    inputs["videos"] = {p.name: sha(p) for p in video_paths}
    inputs["index"] = sha(a.index)
    inputs["tatoeba"] = {"eng_sentences_detailed": sha(a.tatoeba / "eng_sentences_detailed.tsv.bz2")}
    inputs.setdefault("packs", {})
    for lang in langs:
        lex = open_lexicon(lang, a.packs, a.scratch, a.index)
        b = build_lang(lang, lex, pool, videos, tatoeba_meta(a.tatoeba, lang, pool), en_authors)
        name = write_bundle(b, a.out)
        inputs["packs"][lang] = sha(a.packs / lang / f"polingual-{lang}.sqlite.zst")
        for f in (f"{ISO3[lang]}-eng_links.tsv.bz2", f"{ISO3[lang]}_sentences_detailed.tsv.bz2"):
            inputs["tatoeba"][f.removesuffix(".tsv.bz2")] = sha(a.tatoeba / f)
        manifest["langs"][lang] = {"file": name, "items": len(b["items"]), "units": len(b["units"]),
                                   "coverage": b["coverage"],
                                   "tatoebaIdsMatched": b["tatoebaIdsMatched"], "tatoebaItems": b["tatoebaItems"]}
        print(lang, name, len(b["items"]), len(b["units"]), b["tatoebaIdsMatched"], b["tatoebaItems"],
              json.dumps(b["coverage"]), file=sys.stderr)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1, sort_keys=True) + "\n")


if __name__ == "__main__":
    main()
