# Polingual — vectorization + query backbone (photon substrate)

Multi-axis comparison engine over the **~209,000-word** photon substrate in
`_intake/photons/index.sqlite` (27 languages). Part of epic **bkt-2ea**
(beads **bkt-4zz**, **bkt-nhy**). The interim index served live at
`polingual.agfarms.dev` (systemd photon-api). This is the **bounded local
index**, distinct from the authoritative 6.5M-row `polingual` Supabase schema.

> **2026-06-15 — expanded 45k → ~209k common words.** The 45k slice missed
> everyday words (gold, entropy, iron, energy, gene, planet, ocean) because the
> commonness proxy (a) read only top-level `entry.translations` — blind to this
> dump's `senses[].translations` — and (b) had no frequency signal. `ingest_cache`
> now counts sense-level translations and weights by **wordfreq Zipf frequency**
> (the everyday-word signal), then keeps a larger per-language cut.

Source data: **Wiktionary via Kaikki (CC-BY-SA)** — attribution carried in each
photon's `payload.provenance`; only short, attributed etymology snippets are
surfaced, never long excerpts.

## What's here

| File | Role |
|------|------|
| `common.py` | paths, dims, memmap row helpers (capacity grow, random-access write) |
| `ingest_cache.py` | **rebuild `index.sqlite` from the raw Kaikki cache** with CLEAN primary-sense glosses + structured `senses[]`/`translations[]` + guaranteed core vocab + **wordfreq Zipf commonness ranking** (the data-quality + coverage fix, bkt-nhy) |
| `semantic_build.py` | semantic vectors for all rows — **LaBSE 768-d, embedding "surface: primary-gloss"** (cross-lingual) |
| `phonetic_build.py` | phonetic vectors for all IPA-bearing rows (IPA→64-d feature vec) |
| `query.py` | the five query axes + CLI — **sense-aware, language-priority headword + noise-filtered neighbors** |
| `build_subset.py` | bake the client starter asset (`learning/app/polingual/{subset.json,vectors.bin}`, int8) |
| `proof.py` | end-to-end demonstration on real words + latency report |

Build artifacts are **gitignored** (already in `.gitignore`):
`_intake/photons/index.sqlite`, `_intake/photons/*.f32.bin`. Regenerate with
the builders below. The committed starter asset (`learning/app/polingual/`) is
the small int8 subset shipped to the browser.

## Build (local, CPU-safe, idempotent)

# build-time only: wordfreq (MIT) powers the commonness ranking. Not a runtime
# dep of the photon-api service.
pip install wordfreq

```bash
# 1. rebuild the index with clean glosses + wordfreq commonness ranking
#    (~7-10 min, reads kaikki-cache; defaults: --en 25000 --per-lang 7000 --big 8000
#     ≈ 209k photons across 27 langs). Idempotent: rebuilds + atomic-swaps.
python3 scripts/photon/ingest_cache.py
# 2. phonetic (no model, ~seconds) — delete the stale bin first (index changed)
rm -f _intake/photons/phonetic-vectors.f32.bin
python3 scripts/photon/phonetic_build.py
# 3. semantic — LaBSE 768-d on CPU (~100 min for 209k; auto-rebuilds the bin on
#    dim change; resumable via --only-missing if interrupted)
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

## Coverage achieved (209k build, 2026-06-15)

- **Total**: 209,000 photons / 27 languages (EN 25k, la/sa 8k, others 7k where
  the cache has enough parseable surfaces).
- **Semantic**: 209,000 / 209,000 rows (100%, LaBSE-768).
- **Phonetic**: 157,895 / 209,000 rows — all rows that carry a usable IPA
  (157,948 had IPA; 53 had no parseable segments). Rows with no source IPA have
  no phonetic vector by design.

## Latency at ~209k (single box, CPU)

- semantic / phonetic top-k: ~10–30 ms (one numpy matmul over the memmap; the
  matmul scales linearly with rows but is still a single BLAS call).
- spelling top-k: ~40–80 ms (vectorized length+lang prefilter, then bounded
  Python edit-distance over the candidates only — was a full n-row Python loop).
- etymology: ~10–200 ms (streamed JSONL scan of the relevant Kaikki cache).
- one-time index load: ~1 s; one-time model load: not loaded by the server.
- Per-language masks for the semantic/translate axes are precomputed + cached so
  a hot language pays the O(n) cost once, not per request.

## Notes for the deployment design task

- `semantic-vectors.f32.bin` ≈ **642 MB** (209k × 768 × 4B);
  `phonetic-vectors.f32.bin` ≈ **53 MB** (209k × 64 × 4B). Both gitignored,
  memmapped by the server (never copied into RAM per request).
- Brute-force cosine is still fine at ~209k (single matmul, ~10-30 ms). An ANN
  index becomes worth it past ~10⁶ rows (i.e. the 6.5M Supabase schema, which is
  a separate future path — pgvector, not this local index). If shipped to a
  browser/edge, consider int8/fp16 quantization and/or only the populated rows.
- The Kaikki cache (`kaikki-cache/`, 10s of GB) is needed **only** for the
  etymology axis. For deployment, pre-extract `(lang, surface) → etymology_text`
  into a small sidecar table instead of shipping the raw JSONL.
- `payload.provenance` (CC-BY-SA attribution) must travel with any deployed copy.
