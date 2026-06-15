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
| `semantic_build.py` | semantic vectors for all 45k (multilingual, 384-d) |
| `phonetic_build.py` | phonetic vectors for all IPA-bearing rows (IPA→64-d feature vec) |
| `query.py` | the five query axes + CLI |
| `proof.py` | end-to-end demonstration on real words + latency report |

Build artifacts are **gitignored** (already in `.gitignore`):
`_intake/photons/index.sqlite`, `_intake/photons/*.f32.bin`. Regenerate with
the builders below.

## Build (local, CPU-safe, idempotent)

```bash
# phonetic first (no model, ~1s)
python3 scripts/photon/phonetic_build.py            # all IPA rows
# semantic (multilingual model, CPU, ~8-9 min for 45k)
python3 scripts/photon/semantic_build.py            # all rows
# resume only the gaps (no-op if complete):
python3 scripts/photon/semantic_build.py --only-missing
python3 scripts/photon/phonetic_build.py --only-missing
```

- **Semantic model**: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
  (384-d, open, multilingual). CPU by default — the ROCm path has hung on long
  sentence-transformers loops, so the builder hard-disables the accelerator
  unless you pass `--gpu` (which falls back on stall/error).
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
