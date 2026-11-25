#!/usr/bin/env python3
import argparse
import hashlib
import json
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
PACKS = Path.home() / "agfarms/.polingual-packs"
LANGS = ["es", "fr", "it", "pt", "de"]
MIN_TOKENS = 40
SET_MIN, SET_MAX = 4, 6
TATOEBA_LICENSE = "CC-BY 2.0 FR"
WORD = re.compile(r"[^\W\d_]+(?:['’\-][^\W\d_]+)*['’]?")
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


def tokenize(text, known=lambda w: False):
    out = []
    for m in WORD.finditer(text):
        out.extend(split_word(m.group(0), known))
    return out


def lemma_of_meaning(sense):
    head, sep, rest = sense.strip().partition(" of ")
    words = head.lower().replace(",", " ").split()
    if not sep or not words or not set(words) <= FORM_WORDS or not set(words) & FORM_HEADS:
        return None
    parts = rest.split()
    target = parts[0].strip(".,;:()'’“”") if parts else ""
    return target or None


class Lexicon:
    def __init__(self, lookup, keep_case=False):
        self.lookup = lookup
        self.keep_case = keep_case
        self.cache = {}

    def _entry(self, surface):
        cands = [surface.lower(), surface, surface[:1].upper() + surface[1:].lower()]
        if surface.endswith(("'", "’")):
            cands = [surface[:-1].lower() + t for t in ELISION_TAILS] + cands
        found = []
        for i, cand in enumerate(dict.fromkeys(cands)):
            senses, rank = self.lookup(cand)
            if senses:
                found.append((rank if rank is not None else float("inf"), i, cand, senses, rank))
        if not found:
            return None, [], None
        _, _, cand, senses, rank = min(found)
        return cand, senses, rank

    def known(self, surface):
        return self._entry(surface)[0] is not None

    def _base(self, found, senses, rank, hops):
        targets = [t for t in map(lemma_of_meaning, senses) if t]
        if not targets or hops == 0:
            return found
        own = any(lemma_of_meaning(x) is None for x in senses)
        resolved = [self._entry(t) for t in dict.fromkeys(targets)]
        resolved = sorted((r for r in resolved if r[0]), key=lambda r: r[2] if r[2] is not None else float("inf"))
        for t_found, t_senses, t_rank in resolved:
            if own and (t_rank is None or rank is None or t_rank > rank + RANK_MARGIN):
                continue
            return self._base(t_found, t_senses, t_rank, hops - 1)
        return found if own else targets[0]

    def lemma(self, surface):
        if surface not in self.cache:
            found, senses, rank = self._entry(surface)
            if found is None:
                self.cache[surface] = (surface.lower(), False)
            else:
                base = self._base(found, senses, rank, 1)
                keep = self.keep_case and base[:1].isupper()
                self.cache[surface] = (base if keep else base.lower(), True)
        return self.cache[surface]


def sqlite_lookup(index_db, pack_db, lang):
    idx = sqlite3.connect(f"file:{index_db}?mode=ro", uri=True) if index_db else None
    pack = sqlite3.connect(f"file:{pack_db}?mode=ro", uri=True) if pack_db else None

    def lookup(surface):
        senses, rank = [], None
        if idx:
            row = idx.execute(
                "select rowid, payload from photons where lang = ? and surface = ? limit 1", (lang, surface)
            ).fetchone()
            if row:
                rank = row[0]
                senses = [x["gloss"] for x in json.loads(row[1]).get("senses", []) if x.get("gloss")]
        if pack:
            rows = pack.execute(
                "select meaning from words where folded = ? and surface = ? order by id limit 4", (fold(surface), surface)
            ).fetchall()
            senses += [m for r in rows for m in r[0].split(" · ") if m not in senses]
        return senses, rank

    return lookup


def tokens_for(text, lex):
    toks = []
    for s in tokenize(text, lex.known):
        lemma, mapped = lex.lemma(s)
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


def tatoeba_items(lang, pool, lex):
    for en_id in sorted(pool, key=int):
        t = pool[en_id]["t"]
        if lang not in t:
            continue
        lv = pool[en_id].get("lv", {}).get(lang)
        item = make_item(
            f"tatoeba:{lang}:{en_id}", lang, "sentence", t[lang], lex,
            {"name": "tatoeba", "url": f"https://tatoeba.org/en/sentences/show/{en_id}", "sentenceIds": {"en": en_id}},
            TATOEBA_LICENSE, translation=t.get("en"),
        )
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


def episode_units(video_id, items):
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
    return [
        {"id": f"episode:{video_id}:{n}", "kind": "episode", "itemIds": [i["id"] for i in u],
         "targetLemmas": [], "tokenCount": sum(map(ntok, u))}
        for n, u in enumerate(units)
    ]


def sentence_set_units(lang, items):
    df = Counter(l for it in items for l in set(it["lemmas"]))
    stop = {l for l, c in df.items() if c > STOP_SHARE * max(len(items), 1)}
    by_lemma = defaultdict(list)
    for it in items:
        for l in set(it["lemmas"]) - stop:
            by_lemma[l].append(it)
    units, used = [], set()
    for lemma in sorted(by_lemma, key=lambda l: (-len(by_lemma[l]), l)):
        pool = sorted(by_lemma[lemma], key=lambda it: (it["id"] in used, -ntok(it), it["id"]))
        if len(pool) < SET_MIN:
            continue
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
        shared = Counter(l for it in chosen for l in set(it["lemmas"]) - stop)
        targets = [lemma] + [l for l, c in shared.most_common() if c >= 2 and l != lemma][:2]
        used.update(it["id"] for it in chosen)
        units.append({"id": f"set:{lang}:{lemma}", "kind": "sentence_set", "itemIds": [it["id"] for it in chosen],
                      "targetLemmas": targets, "tokenCount": total})
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


def build_lang(lang, lex, pool, videos):
    tat = list(tatoeba_items(lang, pool, lex))
    units = sentence_set_units(lang, tat)
    vid_items = []
    for v in videos:
        its = list(video_items(lang, v, lex))
        vid_items.extend(its)
        units.extend(episode_units(v["id"], its))
    in_unit = {i for u in units for i in u["itemIds"]}
    items = [it for it in tat + vid_items if it["id"] in in_unit]
    return {
        "format": "polingual-input", "version": 1, "lang": lang,
        "attribution": [
            "Sentences from Tatoeba (tatoeba.org), CC-BY 2.0 FR. Each item keeps its English Tatoeba sentence number.",
            "Lemmas from Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0.",
        ],
        "coverage": coverage(tat + vid_items),
        "items": items, "units": units,
    }


def open_lexicon(lang, packs, scratch, index_db):
    db = scratch / f"{lang}.sqlite"
    if not db.exists():
        subprocess.run(["zstd", "-dqf", str(packs / lang / f"polingual-{lang}.sqlite.zst"), "-o", str(db)], check=True)
    return Lexicon(sqlite_lookup(index_db if index_db.exists() else None, db, lang), keep_case=lang == "de")


def write_bundle(bundle, out):
    body = json.dumps(bundle, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    digest = hashlib.sha256(body.encode()).hexdigest()[:12]
    name = f"{bundle['lang']}.{digest}.json"
    for old in out.glob(f"{bundle['lang']}.*.json"):
        if old.name != name:
            old.unlink()
    (out / name).write_text(body)
    return name


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--langs", default=",".join(LANGS))
    ap.add_argument("--packs", type=Path, default=PACKS)
    ap.add_argument("--index", type=Path, default=Path.home() / "agfarms/bucket-foundation/_intake/photons/index.sqlite")
    ap.add_argument("--scratch", type=Path, required=True)
    ap.add_argument("--out", type=Path, default=OUT)
    a = ap.parse_args(argv)
    a.scratch.mkdir(parents=True, exist_ok=True)
    a.out.mkdir(parents=True, exist_ok=True)
    pool = json.load(open(LAYERS))["sentences"]["pool"]
    videos = [json.load(open(p)) for p in sorted(VIDEOS.glob("*.json")) if p.name != "index.json"]
    manifest_path = a.out / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {"format": "polingual-input", "langs": {}}
    for lang in a.langs.split(","):
        b = build_lang(lang, open_lexicon(lang, a.packs, a.scratch, a.index), pool, videos)
        name = write_bundle(b, a.out)
        manifest["langs"][lang] = {"file": name, "items": len(b["items"]), "units": len(b["units"]), "coverage": b["coverage"]}
        print(lang, name, len(b["items"]), len(b["units"]), json.dumps(b["coverage"]), file=sys.stderr)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1, sort_keys=True) + "\n")


if __name__ == "__main__":
    main()
