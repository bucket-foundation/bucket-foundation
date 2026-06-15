#!/usr/bin/env python3
"""
proof.py — end-to-end demonstration of all five Polingual query axes on the
real 45k-word photon substrate. Prints a short report + per-axis examples and
measures query latency. Run: python3 scripts/photon/proof.py
"""
from __future__ import annotations

import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
import query as Q  # noqa: E402


def hr(t):
    print("\n" + "=" * 72)
    print(t)
    print("=" * 72)


def show(res, limit=6):
    if "error" in res:
        print("  (error)", res["error"])
        return
    for r in res.get("results", [])[:limit]:
        sc = r.get("score", r.get("similarity"))
        ipa = (r.get("ipa") or "").strip()
        print(f"  {sc:>6}  {r['lang']:<3} {r['surface']:<22} {ipa:<18} "
              f"{(r['meaning_en'] or '')[:38]}")


def main():
    ix = Q.idx()  # warm the index
    hr("PHOTON SUBSTRATE — Polingual multi-axis query proof")
    print(f"rows: {ix.n}   "
          f"semantic vecs: {sum(1 for r in ix.sem_row if r is not None)}   "
          f"phonetic vecs: {sum(1 for r in ix.pho_row if r is not None)}")
    print("source: Wiktionary via Kaikki (CC-BY-SA)")

    timings = []

    # ---- SEMANTIC (cross-lingual) ----
    hr("AXIS 1 — SEMANTIC neighbors (cross-lingual, by meaning)")
    for w, lg in [("love", "en"), ("book", "en"), ("free", "en")]:
        t = time.time(); res = Q.semantic_topk(w, lg, k=8); dt = (time.time()-t)*1000
        timings.append(dt)
        print(f"\n  semantic_topk({w!r}, {lg!r})   [{dt:.1f} ms]")
        show(res)

    # ---- PHONETIC ----
    hr("AXIS 2 — PHONETIC neighbors (by sound, language-agnostic)")
    for w, lg in [("night", "en"), ("star", "en"), ("liber", "la")]:
        t = time.time(); res = Q.phonetic_topk(w, lg, k=8); dt = (time.time()-t)*1000
        timings.append(dt)
        print(f"\n  phonetic_topk({w!r}, {lg!r})   [{dt:.1f} ms]")
        show(res)

    # ---- SPELLING ----
    hr("AXIS 3 — SPELLING neighbors (normalized edit distance)")
    for w, lg in [("encyclopedia", "en"), ("night", "en")]:
        t = time.time(); res = Q.spelling_topk(w, lg, k=8); dt = (time.time()-t)*1000
        timings.append(dt)
        print(f"\n  spelling_topk({w!r}, {lg!r})   [{dt:.1f} ms]")
        show(res)

    # ---- ETYMOLOGY ----
    hr("AXIS 4 — ETYMOLOGY (Wiktionary/Kaikki, CC-BY-SA)")
    for w, lg in [("liber", "la"), ("stella", "la"), ("star", "en")]:
        t = time.time(); res = Q.etymology(w, lg); dt = (time.time()-t)*1000
        timings.append(dt)
        et = res.get("etymology")
        print(f"\n  etymology({w!r}, {lg!r})   [{dt:.0f} ms]")
        print(f"    {et if et else '(' + str(res.get('error') or 'no etymology') + ')'}")

    # ---- TRANSLATE ----
    hr("AXIS 5 — TRANSLATE (cross-lingual: same meaning + semantic neighbors)")
    for w, frm, to in [("love", "en", "es"), ("book", "en", "fr"), ("free", "en", "de")]:
        t = time.time(); res = Q.translate(w, frm, to, k=6); dt = (time.time()-t)*1000
        timings.append(dt)
        print(f"\n  translate({w!r}, {frm!r} -> {to!r})   [{dt:.1f} ms]")
        if "error" in res:
            print("    (error)", res["error"]); continue
        if res["exact_meaning_matches"]:
            print("    exact-meaning:",
                  ", ".join(s for s, _ in res["exact_meaning_matches"][:5]))
        print("    semantic   :",
              ", ".join(f"{s}({sc})" for s, sc, _ in res["semantic_neighbors"][:6]))

    hr("LATENCY")
    vec_axes = [t for t in timings]
    print(f"  axis-query latencies (ms): min {min(vec_axes):.1f}  "
          f"max {max(vec_axes):.1f}  mean {sum(vec_axes)/len(vec_axes):.1f}")
    print("  (semantic/phonetic = brute-force numpy matmul over 45k rows;")
    print("   spelling = full edit-distance scan; etymology = streamed JSONL grep)")


if __name__ == "__main__":
    main()
