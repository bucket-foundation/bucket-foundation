#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import os
import re
import sys
import time
import unicodedata

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from common import (  # noqa: E402
    PHONETIC_BIN, PHON_DIM, FLOAT_SIZE, ensure_bin_capacity, open_db,
)

_DROP = set("ˈˌːˑ.‿|‖()[]/ ̩̯́̀̂̃̄̆"
            "͜͡ʰʱʲʷ˞̃ʼ")
_DIGRAPH = {
    "t͡ʃ": "ʧ", "tʃ": "ʧ", "d͡ʒ": "ʤ", "dʒ": "ʤ",
    "t͡s": "ʦ", "ts": "ʦ", "d͡z": "ʣ", "dz": "ʣ",
    "aɪ": "a", "aʊ": "a", "ɔɪ": "ɔ", "eɪ": "e", "əʊ": "o", "oʊ": "o", "ɪə": "ɪ",
}

VOWELS = {
    "i": (1.0, 0.0, 0), "y": (1.0, 0.0, 1), "ɪ": (0.85, 0.15, 0),
    "e": (0.7, 0.0, 0), "ø": (0.7, 0.0, 1), "ɛ": (0.5, 0.1, 0),
    "æ": (0.3, 0.1, 0), "a": (0.0, 0.2, 0), "ɐ": (0.15, 0.4, 0),
    "ə": (0.5, 0.5, 0), "ɨ": (1.0, 0.5, 0), "ʉ": (1.0, 0.5, 1),
    "ɑ": (0.0, 0.9, 0), "ɒ": (0.0, 0.9, 1), "ɔ": (0.4, 0.9, 1),
    "o": (0.7, 1.0, 1), "ʊ": (0.85, 0.85, 1), "u": (1.0, 1.0, 1),
    "ʌ": (0.4, 0.7, 0), "œ": (0.5, 0.1, 1), "ɤ": (0.7, 1.0, 0),
}
CONS = {
    "p": (0.0, 0, 0), "b": (0.0, 0, 1), "m": (0.0, 2, 1), "f": (0.1, 1, 0),
    "v": (0.1, 1, 1), "ʋ": (0.1, 4, 1), "w": (0.05, 4, 1),
    "t": (0.3, 0, 0), "d": (0.3, 0, 1), "n": (0.3, 2, 1), "s": (0.35, 1, 0),
    "z": (0.35, 1, 1), "θ": (0.2, 1, 0), "ð": (0.2, 1, 1), "l": (0.3, 3, 1),
    "ɫ": (0.3, 3, 1), "r": (0.35, 6, 1), "ɾ": (0.35, 3, 1), "ɹ": (0.35, 3, 1),
    "ʃ": (0.45, 1, 0), "ʒ": (0.45, 1, 1), "ʧ": (0.45, 5, 0), "ʤ": (0.45, 5, 1),
    "ʦ": (0.35, 5, 0), "ʣ": (0.35, 5, 1), "ɕ": (0.5, 1, 0), "ʑ": (0.5, 1, 1),
    "j": (0.6, 4, 1), "ɲ": (0.6, 2, 1), "c": (0.6, 0, 0), "ɟ": (0.6, 0, 1),
    "k": (0.8, 0, 0), "ɡ": (0.8, 0, 1), "g": (0.8, 0, 1), "ŋ": (0.8, 2, 1),
    "x": (0.8, 1, 0), "ɣ": (0.8, 1, 1), "q": (0.9, 0, 0), "χ": (0.9, 1, 0),
    "ħ": (0.95, 1, 0), "ʕ": (0.95, 1, 1), "h": (1.0, 1, 0), "ʔ": (1.0, 0, 0),
}
N_MANNER = 7

def normalize_ipa(raw: str):
    if not raw:
        return []
    s = unicodedata.normalize("NFC", raw).strip()
    s = s.strip("/[]")
    for dg, rep in _DIGRAPH.items():
        s = s.replace(dg, rep)
    out = []
    for ch in s:
        if ch in _DROP or unicodedata.combining(ch):
            continue
        if ch.isdigit():
            continue
        out.append(ch)
    return out

def seg_features(seg: str):
    if seg in VOWELS:
        h, b, r = VOWELS[seg]
        return ("V", h, b, r)
    if seg in CONS:
        p, m, v = CONS[seg]
        return ("C", p, m, v)
    return None

def stress_count(raw: str) -> int:
    return raw.count("ˈ") + raw.count("ˌ")

def phonetic_vector(raw_ipa: str):
    segs = normalize_ipa(raw_ipa)
    feats = [seg_features(s) for s in segs]
    feats = [f for f in feats if f is not None]
    if not feats:
        return None

    v = np.zeros(PHON_DIM, dtype="float32")

    nV = nC = 0
    for f in feats:
        if f[0] == "V":
            _, h, b, r = f
            v[0] += h; v[1] += (1 - h)
            v[2] += b; v[3] += (1 - b)
            v[4] += r
            v[5] += 1
            nV += 1
        else:
            _, p, m, voi = f
            v[8] += p; v[9] += (1 - p)
            v[10 + m] += 1
            v[18] += voi
            v[19] += 1
            nC += 1
    nseg = max(len(feats), 1)
    v[:32] /= nseg

    def enc(f, off):
        if f is None:
            return
        if f[0] == "V":
            v[off + 0] = f[1]; v[off + 1] = f[2]; v[off + 2] = f[3]; v[off + 3] = 1
        else:
            v[off + 0] = f[1]; v[off + 1] = f[2] / N_MANNER; v[off + 2] = f[3]
    enc(feats[0], 32)
    enc(feats[len(feats) // 2], 36)
    enc(feats[-1], 40)
    v[44] = nV / nseg
    v[45] = nC / nseg

    v[48] = min(len(feats), 16) / 16.0
    v[49] = min(stress_count(raw_ipa), 4) / 4.0
    skeleton = "".join("V" if f[0] == "V" else "C" for f in feats)
    for i in range(len(segs) - 1):
        bg = (segs[i] + segs[i + 1]).encode("utf-8")
        h = int.from_bytes(hashlib.md5(bg).digest()[:2], "little") % 14
        v[50 + h] += 1.0
    if len(segs) > 1:
        v[50:64] /= (len(segs) - 1)

    n = np.linalg.norm(v)
    if n == 0:
        return None
    return v / n

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only-missing", action="store_true")
    args = ap.parse_args()

    conn = open_db()
    cur = conn.cursor()
    if args.only_missing:
        cur.execute("SELECT rowid, id, ipa, phonetic_row FROM photons "
                    "WHERE ipa IS NOT NULL AND ipa!='' AND phonetic_row IS NULL "
                    "ORDER BY rowid")
    else:
        cur.execute("SELECT rowid, id, ipa, phonetic_row FROM photons "
                    "WHERE ipa IS NOT NULL AND ipa!='' ORDER BY rowid")
    rows = cur.fetchall()
    if args.limit:
        rows = rows[:args.limit]
    if not rows:
        print("[phonetic] nothing to do.")
        return 0

    mx = conn.execute("SELECT MAX(rowid) FROM photons").fetchone()[0]
    ensure_bin_capacity(PHONETIC_BIN, PHON_DIM, mx)

    mm = np.memmap(PHONETIC_BIN, dtype="float32", mode="r")
    fh = open(PHONETIC_BIN, "r+b")
    upd = conn.cursor()
    t0 = time.time()
    written = skipped = empty = 0
    for rowid, pid, ipa, pho_row in rows:
        idx = rowid - 1
        if (pho_row is not None and pho_row == idx and idx * PHON_DIM < mm.shape[0]
                and float(np.linalg.norm(mm[idx*PHON_DIM:(idx+1)*PHON_DIM])) > 0.5):
            skipped += 1
            continue
        vec = phonetic_vector(ipa)
        if vec is None:
            empty += 1
            continue
        fh.seek(FLOAT_SIZE * PHON_DIM * idx)
        fh.write(vec.astype("float32").tobytes())
        upd.execute("UPDATE photons SET phonetic_row=? WHERE id=?", (idx, pid))
        written += 1
        if written % 5000 == 0:
            conn.commit()
            print(f"[phonetic] {written} written  {written/max(time.time()-t0,1e-9):.0f}/s", flush=True)
    conn.commit()
    fh.close()
    del mm
    conn.close()
    print(f"[phonetic] done: written={written} skipped={skipped} "
          f"no_usable_ipa={empty} in {time.time()-t0:.1f}s", flush=True)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
