#!/usr/bin/env python3
from __future__ import annotations

import argparse
import concurrent.futures as cf
import gzip
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import unicodedata
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SHIPPED = os.path.join(REPO_ROOT, "polingual", "data", "photons.json.gz")
MANIFEST = os.path.join(REPO_ROOT, "polingual", "data", "ipa-manifest.json")
CACHE = os.path.join(REPO_ROOT, "_intake", "polingual-ipa", "llm-cache")

IPA_COL = 5
SOURCE_COL = 9
PER_LIMIT = 0.15
LLM_BATCH = 150
LLM_WORKERS = 4

EPITRAN_CODES = {
    "ar": "ara-Arab", "cs": "ces-Latn", "de": "deu-Latn", "es": "spa-Latn", "fa": "fas-Arab",
    "fi": "fin-Latn", "fr": "fra-Latn", "hi": "hin-Deva", "id": "ind-Latn", "it": "ita-Latn",
    "ko": "kor-Hang", "nl": "nld-Latn", "pl": "pol-Latn", "pt": "por-Latn", "ru": "rus-Cyrl",
    "sv": "swe-Latn", "ta": "tam-Taml", "th": "tha-Thai", "tr": "tur-Latn", "vi": "vie-Latn",
}

LANG_NAMES = {
    "ar": "Arabic", "cs": "Czech", "de": "German", "el": "Modern Greek", "en": "English", "es": "Spanish",
    "fa": "Persian", "fi": "Finnish", "fr": "French", "he": "Modern Hebrew", "hi": "Hindi",
    "id": "Indonesian", "it": "Italian", "ja": "Japanese", "ko": "Korean", "la": "Classical Latin",
    "nl": "Dutch", "pl": "Polish", "pt": "Portuguese", "ru": "Russian", "sa": "Sanskrit",
    "sv": "Swedish", "ta": "Tamil", "th": "Thai", "tr": "Turkish", "vi": "Vietnamese", "zh": "Mandarin Chinese",
}

STRIP = re.compile(r"[ˈˌ.‿͜͡ˑ\-\s()\[\]/|‖]")


def normalize(ipa: str) -> str:
    first = re.split(r"[,;~]", ipa)[0]
    return STRIP.sub("", unicodedata.normalize("NFD", first)).replace("ɡ", "g").replace("ʼ", "")


def segments(ipa: str, ft) -> list[str]:
    s = normalize(ipa)
    segs = ft.ipa_segs(s) if ft else list(s)
    return segs or list(s)


def edit_distance(a: list[str], b: list[str]) -> int:
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        cur = [i] + [0] * len(b)
        for j, y in enumerate(b, 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x != y))
        prev = cur
    return prev[-1]


def load(path: str) -> list[list]:
    rows = json.loads(gzip.open(path).read())
    for r in rows:
        while len(r) < SOURCE_COL:
            r.append(None)
        if len(r) == SOURCE_COL:
            r.append("wiktionary" if r[IPA_COL] else None)
    return rows


def dump(rows: list) -> bytes:
    data = json.dumps(rows, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    out = io.BytesIO()
    with gzip.GzipFile(fileobj=out, mode="wb", mtime=0, filename="", compresslevel=9) as gz:
        gz.write(data)
    return out.getvalue()


def make_epitran(lang: str):
    import epitran

    return epitran.Epitran(EPITRAN_CODES[lang])


def epitran_ipa(epi, surface: str) -> str | None:
    try:
        out = epi.transliterate(surface).strip()
    except Exception:
        return None
    return f"/{out}/" if out and out != surface else None


def validate(rows: list, langs: list[str], ft) -> dict[str, dict]:
    report: dict[str, dict] = {}
    for lang in langs:
        if lang not in EPITRAN_CODES:
            continue
        epi = make_epitran(lang)
        errs = total = words = 0
        for r in rows:
            if r[1] != lang or r[SOURCE_COL] != "wiktionary" or " " in r[2]:
                continue
            hyp = epitran_ipa(epi, r[2].lower())
            if not hyp:
                continue
            ref = segments(r[IPA_COL], ft)
            errs += edit_distance(ref, segments(hyp, ft))
            total += len(ref)
            words += 1
        per = round(errs / total, 4) if total else None
        report[lang] = {"epitran": EPITRAN_CODES[lang], "words": words, "per": per, "ship": per is not None and per <= PER_LIMIT}
        print(f"{lang} {EPITRAN_CODES[lang]} words={words} PER={per}", file=sys.stderr)
    return report


def fill_epitran(rows: list, report: dict) -> None:
    epis = {lang: make_epitran(lang) for lang, v in report.items() if v["ship"]}
    for r in rows:
        if r[IPA_COL] or r[1] not in epis:
            continue
        ipa = epitran_ipa(epis[r[1]], r[2].lower())
        if ipa:
            r[IPA_COL], r[SOURCE_COL] = ipa, "epitran"


def llm_prompt(lang: str, words: list[str]) -> str:
    name = LANG_NAMES.get(lang, lang)
    return (
        f"Give the standard broad phonemic IPA for each {name} word below, the citation pronunciation "
        "a dictionary such as Wiktionary would list, with primary stress marked where the language marks it. "
        "Reply with one JSON object only, mapping each word exactly as given to its IPA wrapped in slashes. "
        "Use null for a word you cannot transcribe. No prose, no code fences.\n\n"
        + json.dumps(words, ensure_ascii=False)
    )


def parse_json(text: str) -> dict:
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < start:
        return {}
    try:
        data = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def llm_batch(lang: str, words: list[str], model: str) -> dict:
    key = hashlib.sha256(f"{model}|{lang}|{json.dumps(words, ensure_ascii=False)}".encode()).hexdigest()[:20]
    path = os.path.join(CACHE, f"{lang}-{key}.json")
    if os.path.exists(path):
        return json.load(open(path))
    proc = subprocess.run(
        ["claude", "-p", "--model", model, "--output-format", "text"],
        input=llm_prompt(lang, words), capture_output=True, text=True, timeout=900,
    )
    data = parse_json(proc.stdout)
    if data:
        os.makedirs(CACHE, exist_ok=True)
        with open(path, "w") as f:
            json.dump(data, f, ensure_ascii=False)
    else:
        print(f"llm batch {lang} {key} failed rc={proc.returncode}", file=sys.stderr)
    return data


def valid_llm_ipa(v) -> str | None:
    if not isinstance(v, str):
        return None
    v = v.strip()
    if len(v) < 3 or re.search(r"[A-Z0-9]", v):
        return None
    return v if v.startswith(("/", "[")) else f"/{v}/"


def fill_llm(rows: list, langs: list[str], model: str, limit: int | None) -> None:
    gaps: dict[str, list] = defaultdict(list)
    for r in rows:
        if not r[IPA_COL] and r[1] in langs:
            gaps[r[1]].append(r)
    jobs = []
    for lang, rs in gaps.items():
        rs = rs[:limit] if limit else rs
        for i in range(0, len(rs), LLM_BATCH):
            chunk = rs[i : i + LLM_BATCH]
            jobs.append((lang, chunk))
    print(f"llm jobs={len(jobs)} words={sum(len(c) for _, c in jobs)}", file=sys.stderr)
    with cf.ThreadPoolExecutor(LLM_WORKERS) as pool:
        futures = {pool.submit(llm_batch, lang, [r[2] for r in chunk], model): chunk for lang, chunk in jobs}
        for n, fut in enumerate(cf.as_completed(futures), 1):
            data = fut.result()
            for r in futures[fut]:
                ipa = valid_llm_ipa(data.get(r[2]))
                if ipa:
                    r[IPA_COL], r[SOURCE_COL] = ipa, "llm"
            if n % 20 == 0:
                print(f"llm {n}/{len(jobs)}", file=sys.stderr)


def coverage(rows: list) -> dict[str, dict]:
    total, by_src = Counter(), defaultdict(Counter)
    for r in rows:
        total[r[1]] += 1
        by_src[r[1]][r[SOURCE_COL] or "none"] += 1
    return {
        lang: {"rows": n, **{k: by_src[lang][k] for k in ("wiktionary", "epitran", "llm", "none")},
               "coverage": round(1 - by_src[lang]["none"] / n, 4)}
        for lang, n in sorted(total.items())
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--shipped", default=SHIPPED)
    ap.add_argument("--manifest", default=MANIFEST)
    ap.add_argument("--stage", choices=["validate", "epitran", "llm", "all"], default="all")
    ap.add_argument("--langs", default="")
    ap.add_argument("--model", default="sonnet")
    ap.add_argument("--llm-limit", type=int, default=None)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    try:
        import panphon

        ft = panphon.FeatureTable()
    except ImportError:
        ft = None
    rows = load(args.shipped)
    langs = [l for l in args.langs.split(",") if l] or sorted({r[1] for r in rows})
    manifest = json.load(open(args.manifest)) if os.path.exists(args.manifest) else {}
    manifest.setdefault("before", coverage(rows))

    if args.stage in ("validate", "epitran", "all"):
        manifest.setdefault("epitran_validation", {}).update(validate(rows, langs, ft))
    if args.stage in ("epitran", "all"):
        fill_epitran(rows, {k: v for k, v in manifest["epitran_validation"].items() if k in langs})
    if args.stage in ("llm", "all"):
        fill_llm(rows, langs, args.model, args.llm_limit)

    manifest.update({
        "column": IPA_COL,
        "source_column": SOURCE_COL,
        "source_field": "ipa_source",
        "sources": {
            "wiktionary": "Wiktionary via Kaikki, CC-BY-SA",
            "epitran": "epitran G2P (MIT), shipped only where phoneme error rate against Wiktionary IPA is at most 15%",
            "llm": f"claude -p ({args.model}), unreviewed machine transcription",
        },
        "per_limit": PER_LIMIT,
        "after": coverage(rows),
    })
    if args.dry_run:
        print(json.dumps(manifest["after"], indent=1))
        return 0
    blob = dump(rows)
    with open(args.shipped, "wb") as f:
        f.write(blob)
    manifest["shipped_sha256"] = hashlib.sha256(blob).hexdigest()
    with open(args.manifest, "w") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
