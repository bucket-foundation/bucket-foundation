#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(__file__))
from common import DB_PATH, PHOTONS_DIR, REPO_ROOT, SEM_DIM, SEMANTIC_BIN  # noqa: E402

CORPUS_DIR = os.path.join(REPO_ROOT, "learning", "app", "corpus")
OUT_JSON = os.path.join(PHOTONS_DIR, "all.json")
MAX_BYTES = 50 * 1024 * 1024
MEANING_CAP = 240
CROSS_K = 12
SAME_K = 8

TOKEN_SPLIT = re.compile(r"[\s,.!?¿¡;:\"'()\[\]{}«»„“”‘’…。、！？،؟]+")


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.strip().lower())
    return "".join(ch for ch in s if not unicodedata.combining(ch))


def add(out: dict, lang: str, surface, gloss: str | None, concept: str | None) -> None:
    if not isinstance(surface, str):
        return
    surface = surface.strip()
    if not surface or not lang:
        return
    key = (lang, surface)
    cur = out.get(key)
    if cur is None:
        out[key] = {"gloss": gloss, "concept": concept}
    else:
        cur["gloss"] = cur["gloss"] or gloss
        cur["concept"] = cur["concept"] or concept


def add_with_tokens(out: dict, lang: str, text, gloss: str | None, concept: str | None) -> None:
    if not isinstance(text, str):
        return
    add(out, lang, text, gloss, concept)
    parts = [t for t in TOKEN_SPLIT.split(text) if t]
    if len(parts) > 1:
        for t in parts:
            add(out, lang, t, None, None)


def deck_words(corpus_dir: str) -> dict:
    out: dict = {}
    load = lambda name: json.load(open(os.path.join(corpus_dir, name), encoding="utf-8"))
    core = load("lang-core.json")
    for atom in core.get("atoms", []):
        gloss = atom.get("gloss")
        for lang, f in (atom.get("forms") or {}).items():
            add_with_tokens(out, lang, (f or {}).get("word"), gloss, atom.get("id"))
    phrases = load("lang-phrases.json")
    for ph in phrases.get("phrases", []):
        for lang, text in (ph.get("forms") or {}).items():
            add_with_tokens(out, lang, text, ph.get("en"), ph.get("id"))
    cognates = load("lang-cognates.json")
    for cid, c in (cognates.get("concepts") or {}).items():
        for lang, f in (c.get("forms") or {}).items():
            add_with_tokens(out, lang, (f or {}).get("word"), c.get("gloss"), cid)
    layers = load("lang-layers.json")
    for lang, m in (layers.get("forms") or {}).items():
        for cid, w in m.items():
            add_with_tokens(out, lang, w, cid, cid)
    for cid, by_lang in (layers.get("conjugation") or {}).items():
        for lang, conj in by_lang.items():
            add_with_tokens(out, lang, conj.get("infinitive"), cid, cid)
            for tense in ("present", "past"):
                for w in conj.get(tense) or []:
                    add_with_tokens(out, lang, w, None, None)
    for ff in layers.get("falseFriends") or []:
        add(out, ff.get("lang"), ff.get("word"), ff.get("means"), ff.get("itemId"))
    return out


def row_to_photon(r) -> dict:
    (pid, kind, lang, surface, meaning, tier, branch_csv, pos, ipa, _row, src, uri, cap) = r
    return {
        "id": pid, "kind": kind, "lang": lang, "surface": surface,
        "meaning_en": (meaning or "")[:MEANING_CAP], "tier": tier,
        "branch": [b for b in (branch_csv or "").split(",") if b],
        "pos": pos, "ipa": ipa,
        "provenance": {"source": src, "source_uri": uri, "captured_at": cap},
    }


COLS = ("id,kind,lang,surface,meaning_en,tier,branch_csv,pos,ipa,semantic_row,"
        "provenance_source,provenance_uri,captured_at")


def build(corpus_dir: str, db_path: str, sem_bin: str, base_json: str, out_json: str) -> dict:
    import numpy as np

    words = deck_words(corpus_dir)
    conn = sqlite3.connect(db_path)
    rows = conn.execute(f"SELECT {COLS} FROM photons").fetchall()
    by_id = {r[0]: r for r in rows}
    exact: dict = {}
    loose: dict = {}
    for r in rows:
        exact.setdefault((r[2], r[3]), r[0])
        loose.setdefault((r[2], norm(r[3])), r[0])

    matched: dict = {}
    missing: dict = {}
    for (lang, surface), info in words.items():
        pid = exact.get((lang, surface)) or loose.get((lang, norm(surface)))
        if pid:
            matched[(lang, surface)] = pid
        else:
            missing[(lang, surface)] = info

    sem_rows = sorted({by_id[p][9] for p in matched.values() if by_id[p][9] is not None})
    n = len(rows)
    mat = np.memmap(sem_bin, dtype="<f4", mode="r", shape=(os.path.getsize(sem_bin) // (4 * SEM_DIM), SEM_DIM))
    row_to_id = np.empty(mat.shape[0], dtype=object)
    lang_codes: dict = {}
    row_lang = np.full(mat.shape[0], -1, dtype=np.int32)
    for r in rows:
        if r[9] is not None and r[9] < mat.shape[0]:
            row_to_id[r[9]] = r[0]
            row_lang[r[9]] = lang_codes.setdefault(r[2], len(lang_codes))
    valid = np.array([x is not None for x in row_to_id])
    vecs = np.asarray(mat, dtype=np.float32)
    norms = np.linalg.norm(vecs, axis=1)
    norms[norms == 0] = 1
    vecs = vecs / norms[:, None]
    vecs[~valid] = 0

    neighbors: dict = {}
    for i in range(0, len(sem_rows), 256):
        q_rows = np.array(sem_rows[i:i + 256])
        sims = vecs[q_rows] @ vecs.T
        sims[np.arange(len(q_rows)), q_rows] = -2
        sims[:, ~valid] = -2
        for j, qr in enumerate(q_rows):
            s = sims[j]
            cross = np.argpartition(-s, CROSS_K)[:CROSS_K]
            cross = cross[np.argsort(-s[cross])]
            same_mask = row_lang == row_lang[qr]
            ss = np.where(same_mask, s, -2)
            same = np.argpartition(-ss, SAME_K)[:SAME_K]
            same = same[np.argsort(-ss[same])]
            neighbors[row_to_id[qr]] = {
                "cross": [[row_to_id[k], round(float(s[k]), 3)] for k in cross if s[k] > -2],
                "same": [[row_to_id[k], round(float(ss[k]), 3)] for k in same if ss[k] > -2],
            }

    base = json.load(open(base_json, encoding="utf-8")) if os.path.exists(base_json) else []
    out: dict = {p["id"]: p for p in base}
    for p in out.values():
        p.pop("means_like", None)
        p.pop("means_like_same", None)

    def ensure(pid: str) -> dict:
        if pid not in out:
            out[pid] = row_to_photon(by_id[pid])
        return out[pid]

    for pid in set(matched.values()):
        p = ensure(pid)
        nb = neighbors.get(pid)
        if nb:
            p["means_like"] = nb["cross"]
            p["means_like_same"] = nb["same"]
            for nid, _ in nb["cross"] + nb["same"]:
                ensure(nid)

    en_by_concept: dict = {}
    for (lang, surface), info in words.items():
        if lang == "en" and info["concept"] and (lang, surface) in matched:
            en_by_concept.setdefault(info["concept"], matched[(lang, surface)])

    for (lang, surface), info in sorted(missing.items()):
        pid = f"photon:word:{lang}:{surface}"
        if pid in out:
            continue
        p = {
            "id": pid, "kind": "word", "lang": lang, "surface": surface,
            "meaning_en": (info["gloss"] or "")[:MEANING_CAP], "tier": "deck",
            "branch": ["10-linguistics"], "pos": None, "ipa": None,
            "provenance": {"source": "deck", "source_uri": "learning/app/corpus", "captured_at": ""},
        }
        anchor = en_by_concept.get(info["concept"]) if info["concept"] else None
        if anchor and anchor in neighbors:
            p["means_like"] = [[anchor, 1.0]] + neighbors[anchor]["cross"][: CROSS_K - 1]
        out[pid] = p

    photons = list(out.values())
    body = json.dumps(photons, ensure_ascii=False, separators=(",", ":"))
    size = len(body.encode("utf-8"))
    if size > MAX_BYTES:
        raise SystemExit(f"all.json would be {size} bytes, over {MAX_BYTES}")
    with open(out_json, "w", encoding="utf-8") as f:
        f.write(body)
    return {
        "deck_words": len(words), "matched": len(matched), "stubbed": len(missing),
        "with_means_like": sum(1 for p in photons if p.get("means_like")),
        "photons": len(photons), "bytes": size,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus", default=CORPUS_DIR)
    ap.add_argument("--db", default=DB_PATH)
    ap.add_argument("--semantic", default=SEMANTIC_BIN)
    ap.add_argument("--base", default=OUT_JSON)
    ap.add_argument("--out", default=OUT_JSON)
    a = ap.parse_args()
    print(json.dumps(build(a.corpus, a.db, a.semantic, a.base, a.out), indent=2))


if __name__ == "__main__":
    main()
