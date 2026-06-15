# Polingual — vectorization + query backbone (photon substrate)

Multi-axis comparison engine over the 45,000-word photon substrate in
`_intake/photons/index.sqlite`. Part of epic **bkt-2ea** (bead **bkt-4zz**).

Source data: **Wiktionary via Kaikki (CC-BY-SA)** — attribution carried in each
photon's `payload.provenance`; only short, attributed etymology snippets are
surfaced, never long excerpts.

## What's here

| File | Role |
|------|------|
| `common.py` | paths, dims, memmap row helpers (capacity grow, random-access write) |
| `ingest_cache.py` | **rebuild `index.sqlite` from the raw Kaikki cache** with CLEAN primary-sense glosses + structured `senses[]`/`translations[]` + guaranteed core vocab (the data-quality fix, bkt-nhy) |
| `semantic_build.py` | semantic vectors for all 45k — **LaBSE 768-d, embedding "surface: primary-gloss"** (cross-lingual) |
| `phonetic_build.py` | phonetic vectors for all IPA-bearing rows (IPA→64-d feature vec) |
| `query.py` | the five query axes + CLI — **sense-aware, language-priority headword + noise-filtered neighbors** |
| `build_subset.py` | bake the client starter asset (`learning/app/polingual/{subset.json,vectors.bin}`, int8) |
| `proof.py` | end-to-end demonstration on real words + latency report |

Build artifacts are **gitignored** (already in `.gitignore`):
`_intake/photons/index.sqlite`, `_intake/photons/*.f32.bin`. Regenerate with
the builders below. The committed starter asset (`learning/app/polingual/`) is
the small int8 subset shipped to the browser.

## Build (local, CPU-safe, idempotent)

```bash
# 1. rebuild the index with clean primary-sense glosses (~5 min, reads kaikki-cache)
python3 scripts/photon/ingest_cache.py               # 27 langs, 45k photons
# 2. phonetic (no model, ~seconds) — delete the stale bin first (index changed)
rm -f _intake/photons/phonetic-vectors.f32.bin
python3 scripts/photon/phonetic_build.py
# 3. semantic — LaBSE 768-d on CPU (~20-40 min; auto-rebuilds the bin on dim change)
python3 scripts/photon/semantic_build.py
# 4. bake the starter subset for the client
python3 scripts/photon/build_subset.py
```

- **Semantic model**: `sentence-transformers/LaBSE` (768-d, Apache-2.0,
  purpose-built cross-lingual over 109 languages). Embeds **"surface:
  primary-sense gloss"** (the dominant Kaikki sense, NOT the old joined blob) so
  "light"/"luz"/"Licht"/"luce" land together by meaning. CPU by default — the
  ROCm path has hung on long sentence-transformers loops, so the builder
  hard-disables the accelerator unless you pass `--gpu`.
- **Phonetic**: deterministic IPA → 64-d articulatory feature vector
  (place/manner/voicing for consonants, height/backness/rounding for vowels,
  ordered onset/nucleus/coda sketch, length/stress + hashed bigram sketch).
- Both matrices are row-aligned memmaps; every stored row is L2-normalized so
  cosine == dot product. A photon's row index == `rowid - 1`, mirrored into
  `photons.semantic_row` / `photons.phonetic_row`.

## Query

```bash
python3 scripts/photon/query.py semantic love en
python3 scripts/photon/query.py phonetic night en
python3 scripts/photon/query.py spelling encyclopedia en
python3 scripts/photon/query.py etymology liber la
python3 scripts/photon/query.py translate free en de
python3 scripts/photon/proof.py        # full multi-axis report
```

Programmatic:

```python
import sys; sys.path.insert(0, "scripts/photon")
import query as Q
Q.semantic_topk("free", "en", k=10)        # cross-lingual by meaning
Q.phonetic_topk("night", "en", k=10)       # by sound, language-agnostic
Q.spelling_topk("encyclopedia", "en", k=10)# normalized edit distance
Q.etymology("liber", "la")                 # Wiktionary/Kaikki, attributed
Q.translate("free", "en", "de", k=8)       # exact-meaning + semantic neighbors
```

## Coverage achieved

- **Semantic**: 45,000 / 45,000 rows (100%).
- **Phonetic**: 32,261 / 45,000 rows — i.e. all rows that carry a usable IPA.
  Of 32,326 IPA-bearing rows, 65 had IPA strings with no parseable segments
  (tone-only / numeric); the remaining 12,674 rows simply have no IPA in the
  source and so have no phonetic vector by design.

## Latency at 45k (single box, CPU)

- semantic / phonetic top-k: ~4–7 ms (one numpy matmul over the memmap).
- spelling top-k: ~20–50 ms (full normalized-edit-distance scan).
- etymology: ~10–80 ms (streamed JSONL scan of the relevant Kaikki cache;
  large caches like English can hit a few hundred ms on a cold scan).
- one-time index load: ~0.3 s; one-time model load: ~3 s (cached).

## Notes for the deployment design task

- `semantic-vectors.f32.bin` ≈ **69 MB** (45k × 384 × 4B);
  `phonetic-vectors.f32.bin` ≈ **11.5 MB** (45k × 64 × 4B). Both gitignored.
- Brute-force cosine is fine at 45k (single matmul). An ANN index is only worth
  it past ~10⁵–10⁶ rows. If shipped to a browser/edge, consider int8/fp16
  quantization (semantic → ~17 MB at int8) and/or shipping only the populated
  rows.
- The Kaikki cache (`kaikki-cache/`, 10s of GB) is needed **only** for the
  etymology axis. For deployment, pre-extract `(lang, surface) → etymology_text`
  into a small sidecar table instead of shipping the raw JSONL.
- `payload.provenance` (CC-BY-SA attribution) must travel with any deployed copy.
