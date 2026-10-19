import json, os
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
ASSET = os.path.join(ROOT, "learning", "app", "polingual")
INK = "#1c2b2d"
PAPER = "#fbf7ee"


def unit(a):
    n = np.linalg.norm(a, axis=1, keepdims=True)
    n[n == 0] = 1
    return a / n


def load():
    subset = json.load(open(os.path.join(ASSET, "subset.json"), encoding="utf8"))
    m = subset["manifest"]
    width = m["sem_dim"] + m["phon_dim"]
    raw = np.fromfile(os.path.join(ASSET, "vectors.bin"), dtype=np.int8).reshape(-1, width).astype(np.float32) / 127.0
    return subset, unit(raw[:, : m["sem_dim"]]), unit(raw[:, m["sem_dim"]:])


def concept_rows(subset):
    words = subset["words"]
    out = {}
    for concept, rows in subset["concept_index"].items():
        by_lang = {}
        for r in rows:
            by_lang.setdefault(words[r]["l"], r)
        out[concept] = by_lang
    return out
