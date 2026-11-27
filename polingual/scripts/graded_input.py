#!/usr/bin/env python3
import gzip
import json
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
import os
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import input_bundle as ib

ROOT = HERE.parents[1]
RANKS = Path(os.environ.get("POLINGUAL_RANKS_DIR", ROOT / "_intake/polingual-frequency"))
BANDS = [500, 1000, 2000, 4000, 8000]
MIN_COVERAGE, MAX_COVERAGE = 0.95, 0.98
SENT_MIN, SENT_MAX = 3, 25
CONTENT_RANK = 100
PER_BAND_CAP = None
NAMES = {
    "es": ["Ana", "Luis", "Marta", "Pablo"],
    "fr": ["Marie", "Paul", "Julie", "Luc"],
    "it": ["Anna", "Marco", "Giulia", "Luca"],
    "pt": ["Ana", "Pedro", "Maria", "João"],
    "de": ["Anna", "Max", "Lena", "Paul"],
}
TATOEBA_NAMES = ["Tom", "Mary", "John", "Ken", "Alice", "Bob", "Jim", "Jane", "Tony", "Mike", "Bill", "Jack",
                 "Sami", "Layla", "Maria", "Ziri", "Yanni", "Mennad", "Baya", "Skura", "Rima", "Muiriel", "Emily", "Paul"]


def fold(s):
    return unicodedata.normalize("NFC", s.strip()).casefold()


def next_band(k):
    return k * 2


def wordfreq_ranks(lang):
    import wordfreq

    best = {}
    try:
        table = wordfreq.get_frequency_dict(lang, "large")
    except LookupError:
        table = wordfreq.get_frequency_dict(lang, "best")
    for word, freq in table.items():
        k = fold(word)
        if k and freq > best.get(k, -1.0):
            best[k] = freq
    return {w: i + 1 for i, (w, _) in enumerate(sorted(best.items(), key=lambda kv: (-kv[1], kv[0])))}


def load_ranks(path, lang=None):
    ranks, heads = {}, []
    with gzip.open(path, "rt", encoding="utf-8") as f:
        next(f)
        for line in f:
            folded, srank, lemma, lrank, _ = line.rstrip("\n").split("\t")
            r = int(lrank) if lrank else int(srank) if srank else None
            if r is not None:
                ranks[folded] = r
                if folded == lemma and lrank:
                    heads.append((r, folded))
    if lang:
        for w, r in wordfreq_ranks(lang).items():
            if r < ranks.get(w, r + 1):
                if w not in ranks and w.isalpha():
                    heads.append((r, w))
                ranks[w] = r
    heads.sort()
    return ranks, heads


class Grader:
    def __init__(self, lex, ranks, names=()):
        self.lex = lex
        self.ranks = ranks
        self.names = {fold(n) for n in names}

    def rank(self, lemma):
        return self.ranks.get(fold(lemma))

    def classify(self, tokens):
        out = []
        for t in tokens:
            if fold(t["surface"]) in self.names:
                out.append(("name", 0))
            elif "unmapped" in t:
                out.append(("unknown", None))
            else:
                r = self.rank(t["lemma"])
                out.append(("word", r) if r is not None else ("unknown", None))
        return out

    def check(self, tokens, band, targets):
        tset = {fold(x) for x in targets}
        bad, hit = [], Counter()
        for t, (kind, r) in zip(tokens, self.classify(tokens)):
            if kind == "name":
                continue
            if fold(t["lemma"]) in tset:
                hit[fold(t["lemma"])] += 1
            elif kind == "unknown" or r > band:
                bad.append(t["surface"])
        new = sum(hit.values())
        cov = 1 - new / len(tokens) if tokens else 0
        return {"offending": sorted(set(bad)), "targetsUsed": sorted(hit), "coverage": round(cov, 4)}


def tatoeba_sentences(tdir, lang):
    iso = ib.ISO3[lang]
    rows = {}
    for r in ib.bz2_rows(tdir / f"{iso}_sentences_detailed.tsv.bz2"):
        if len(r) >= 4:
            rows[r[0]] = (r[2], ib.author(r[3]))
    link = {}
    for r in ib.bz2_rows(tdir / f"{iso}-eng_links.tsv.bz2"):
        if len(r) >= 2 and r[0] in rows and r[0] not in link:
            link[r[0]] = r[1]
    want = set(link.values())
    eng = {}
    for r in ib.bz2_rows(tdir / "eng_sentences_detailed.tsv.bz2"):
        if len(r) >= 4 and r[0] in want:
            eng[r[0]] = (r[2], ib.author(r[3]))
    for sid in sorted(rows, key=int):
        text, auth = rows[sid]
        en = eng.get(link.get(sid))
        yield sid, text, auth, link.get(sid) if en else None, en


def profile(sentences, lex, grader):
    out, seen = [], set()
    for sid, text, auth, en_id, en in sentences:
        key = text.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        toks = ib.tokens_for(text, lex)
        if not SENT_MIN <= len(toks) <= SENT_MAX:
            continue
        cls = grader.classify(toks)
        if any(k == "unknown" for k, _ in cls):
            continue
        lem = [(fold(t["lemma"]), r) for t, (k, r) in zip(toks, cls) if k == "word"]
        out.append({"sid": sid, "text": text, "auth": auth, "en_id": en_id, "en": en, "n": len(toks), "lem": lem})
    return out


def tatoeba_item(s, lang, lex):
    ids = {lang: s["sid"], **({"en": s["en_id"]} if s["en_id"] else {})}
    authors = {lang: s["auth"], **({"en": s["en"][1]} if s["en_id"] else {})}
    return ib.make_item(
        f"tatoeba:{lang}:{s['sid']}", lang, "sentence", s["text"], lex,
        {"name": "tatoeba", "url": f"{ib.TATOEBA_SHOW}{s['sid']}", "sentenceIds": ids, "authors": authors},
        ib.TATOEBA_LICENSE, translation=s["en"][0] if s["en"] else None,
    )


def token_window(occ):
    return max(ib.MIN_TOKENS, -(-occ * 100 // int(round((1 - MIN_COVERAGE) * 100)))), occ * 100 // int(round((1 - MAX_COVERAGE) * 100))


def band_sets(profiles, band, cap=PER_BAND_CAP, taken=None):
    hi = next_band(band)
    known, by_target = [], defaultdict(list)
    for p in profiles:
        over = {l for l, r in p["lem"] if r > band}
        if not over:
            known.append(p)
        elif len(over) == 1:
            (l,) = over
            if band < dict(p["lem"])[l] <= hi:
                by_target[l].append(p)
    content = defaultdict(list)
    for p in known:
        for l in {l for l, r in p["lem"] if r > CONTENT_RANK}:
            content[l].append(p)
    used = set(taken or ())
    sets = []
    rank_of = {l: r for p in profiles for l, r in p["lem"]}
    for target in sorted(by_target, key=lambda l: (rank_of[l], l)):
        if cap is not None and len(sets) >= cap:
            break
        cands = sorted((p for p in by_target[target] if p["sid"] not in used), key=lambda p: (-p["n"], p["sid"]))[:2]
        if not cands:
            continue
        occ = sum(1 for p in cands for l, _ in p["lem"] if l == target)
        lo, top = token_window(occ)
        chosen = list(cands)
        shared = Counter(l for p in cands for l, r in p["lem"] if r > CONTENT_RANK and l != target)
        pool = []
        for l, _ in shared.most_common():
            pool += content[l]
        pool += [p for l in sorted({l for p in cands for l, r in p["lem"] if l != target}, key=lambda l: -rank_of[l])
                 for p in content.get(l, [])[:20]]
        ids = {p["sid"] for p in chosen}
        for p in pool:
            if len(chosen) >= ib.SET_MAX or (sum(c["n"] for c in chosen) >= lo and len(chosen) >= ib.SET_MIN):
                break
            if p["sid"] in used or p["sid"] in ids or sum(c["n"] for c in chosen) + p["n"] > top:
                continue
            chosen.append(p)
            ids.add(p["sid"])
        total = sum(c["n"] for c in chosen)
        if not (ib.SET_MIN <= len(chosen) <= ib.SET_MAX and lo <= total <= top):
            continue
        used |= ids
        sets.append({"band": band, "target": target, "sentences": chosen, "tokens": total,
                     "coverage": round(1 - occ / total, 4)})
    return sets


def graded_tatoeba(profiles, lang, lex, cap=PER_BAND_CAP, taken=()):
    items, units, used = {}, [], set(taken)
    for band in BANDS:
        for s in band_sets(profiles, band, cap, used):
            used.update(p["sid"] for p in s["sentences"])
            its = [tatoeba_item(p, lang, lex) for p in s["sentences"]]
            for it in its:
                items[it["id"]] = it
            credits = ib.tatoeba_credits(its)
            units.append({"id": f"graded:{lang}:{band}:{s['target']}", "kind": "sentence_set",
                          "itemIds": [i["id"] for i in its], "targetLemmas": [s["target"]],
                          "tokenCount": sum(map(ib.ntok, its)), "credit": ib.credit_line(credits), "credits": credits,
                          "band": band, "coverage": s["coverage"]})
    return items, units



def band_report(units):
    out = defaultdict(Counter)
    for u in units:
        if "band" in u:
            out[str(u["band"])][u["kind"]] += 1
    return {b: dict(c) for b, c in sorted(out.items(), key=lambda kv: int(kv[0]))}


def extend_bundle(bundle, lang, lex, tatoeba_dir, ranks_dir, cap=PER_BAND_CAP):
    ranks, _ = load_ranks(Path(ranks_dir) / f"{lang}.tsv.gz", lang)
    grader = Grader(lex, ranks, NAMES.get(lang, []) + TATOEBA_NAMES)
    profiles = profile(tatoeba_sentences(Path(tatoeba_dir), lang), lex, grader)
    taken = {i for u in bundle["units"] for i in u["itemIds"]}
    items, units = graded_tatoeba(profiles, lang, lex, cap, {i.rsplit(":", 1)[1] for i in taken if i.startswith("tatoeba:")})
    have = {it["id"] for it in bundle["items"]}
    units = [u for u in units if not taken & set(u["itemIds"])]
    keep = {i for u in units for i in u["itemIds"]}
    bundle["items"] += [it for i, it in items.items() if i not in have and i in keep]
    bundle["units"] += units
    bundle["attribution"].append("Frequency bands from wordfreq (github.com/rspeer/wordfreq), CC-BY-SA 4.0.")
    return {"tatoebaSentencesUsable": len(profiles), "bands": band_report(bundle["units"])}


def compact_item(it):
    text, pos, toks = it["text"], 0, []
    for t in it["tokens"]:
        at = text.find(t["surface"], pos)
        if at < 0:
            raise ValueError(f"token {t['surface']!r} not in {it['id']}")
        pos = at + len(t["surface"])
        toks.append([at, len(t["surface"])] + ([] if t["lemma"] == t["surface"] else [t["lemma"]]))
    out = {k: v for k, v in it.items() if k not in ("tokens", "lemmas")}
    out["tok"] = toks
    return out


def expand_item(it):
    out = {k: v for k, v in it.items() if k != "tok"}
    out["tokens"] = [{"surface": it["text"][a:a + n], "lemma": rest[0] if rest else it["text"][a:a + n]}
                     for a, n, *rest in it["tok"]]
    out["lemmas"] = sorted({t["lemma"] for t in out["tokens"]})
    return out


MAX_PART_BYTES = 2_000_000


def size_of(obj):
    return len(json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode())


def split_bands(bundle, max_bytes=MAX_PART_BYTES):
    by_id = {it["id"]: it for it in bundle["items"]}
    groups, moved = defaultdict(list), set()
    for u in bundle["units"]:
        if "band" in u:
            groups[u["band"]].append((u, [compact_item(by_id[i]) for i in u["itemIds"]]))
            moved.update(u["itemIds"])
    parts = {}
    for band, members in sorted(groups.items()):
        shell = {"format": "polingual-input-band", "version": 1, "lang": bundle["lang"], "band": band,
                 "attribution": bundle["attribution"], "items": [], "units": []}
        chunks, cur, used = [], dict(shell, items=[], units=[]), size_of(shell)
        for u, its in members:
            add = size_of(u) + sum(size_of(i) for i in its) + len(its) + 2
            if cur["units"] and used + add > max_bytes:
                chunks.append(cur)
                cur, used = dict(shell, items=[], units=[]), size_of(shell)
            cur["units"].append(u)
            cur["items"] += its
            used += add
        if cur["units"]:
            chunks.append(cur)
        for n, c in enumerate(chunks):
            c["part"], c["parts"] = n, len(chunks)
        parts[band] = chunks
    base = {**bundle, "units": [u for u in bundle["units"] if "band" not in u],
            "items": [it for it in bundle["items"] if it["id"] not in moved]}
    return base, parts
