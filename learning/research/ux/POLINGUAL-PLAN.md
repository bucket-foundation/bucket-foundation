# POLINGUAL-PLAN: turning Bucket Academy's "Languages" mode into the real Polingual

**Pillar:** Data · **Epic:** `bkt-2ea` (photon substrate) under `bkt-jh0` (Academy) · sister to `bkt-epic-kruse`
**Author:** Data (Nucleus) · 2026-06-14
**Reads beside:** `PHOTON-SPEC.md` (the photon contract), `POLINGUAL.md` (product vision + endpoints + comparison axes), `src/lib/photon-index.ts` (in-repo access lib), `polingual/src/lib/photon-db.ts` (the PostgREST client), `learning/app/corpus/lang-core.json` (the 107-word toy deck), `learning/research/ux/UX-CRAFT.md` (the craft layer this drill must meet).

> **Data sources are open & attributed.** Every lexical fact here comes from **Wiktionary via Kaikki**
> (`kaikki.org`, CC-BY-SA 4.0; TatSoup/Tatuylonen's machine-readable Wiktionary extraction). Audio is
> **Wikimedia Commons** OGG/MP3 (each file CC-BY-SA / CC0, per-file license in the dump). We **attribute**
> ("Definitions & translations from Wiktionary, CC-BY-SA"), we **never** use proprietary dictionaries
> (OED, Merriam-Webster, Larousse…), and we **never** reproduce long copyrighted excerpts, we store
> short glosses + our own derived vectors + canonical URLs back to the source.

---

## 0. Ground truth: what the substrate is today

I inspected `_intake/photons/` directly (`python3 + sqlite3`, byte-math on the `.bin` files). The
substrate is a **real start with three load-bearing gaps** the vision docs gloss over. State the truth
first; the plan is the path from here to the vision.

| Asset | Spec/POLINGUAL.md claims | **Measured reality** | Gap |
|---|---|---|---|
| `index.sqlite` `photons` table | "45,000 rows, ~15 languages" | **45,000 rows, 27 languages** (en/la/sa @ 3000; 24 more @ 1500: ar cs de el es fa fi fr he hi id it ja ko nl pl pt ru sv ta th tr vi zh). All `kind=word`, all `tier=functional`. | More langs than claimed (good). |
| `payload` JSON per row | "senses, translations, etymology, sounds, derived/related" | **Minimal.** Top-level keys only: `id, kind, lang, surface, meaning_en, tier, branch, pos, ipa, provenance, relations`. `meaning_en` = ` · `-joined gloss. **`relations: []` is empty for every row.** No translations, no etymology chain, no sounds, no derived, *in the index*. | **The rich data was discarded at ingest.** It still exists upstream (see next row). |
| `phonetic-vectors.f32.bin` | "64-d, partial" | **64-d confirmed** (288,000 floats = 4500 rows × 64). | Correct. |
| `semantic-vectors.f32.bin` | "384-d" | **384-d confirmed** (1,728,000 floats = 4500 rows × 64... No: 4500 × 384). | Correct. |
| **How many vectorized** | "~1,472 vectorized so far" | **1,472 rows have `semantic_row`/`phonetic_row` set, and they are ALL `lang=en` (rows 0-1471).** The `.bin` files have 4500 slots but only the first 1472 (English) are wired into the index. | **🔴 Cross-lingual vector search, the entire heart of the product, does not function yet.** There are zero non-English vectors reachable from the index. |
| `kaikki-cache/` | (unmentioned) | **17 GB of raw Kaikki JSONL** (English, Latin, Sanskrit, Ancient_Greek, Arabic, Chinese 1.1GB, Czech, Dutch, …). Each entry has `senses[], translations[] (up to 170 langs), etymology_text, etymology_templates[] (full PIE trees), sounds[] (IPA + Wikimedia audio URLs), derived[], related[], forms[], synonyms/antonyms/hyponyms/hypernyms`. | **This is the goldmine.** Everything the index lacks is here. The ingest read these and kept ~6 fields. |
| `bulk.csv` | "2.5GB Kaikki dump = scale path" | **2.5 GB, 3,140,430 photon rows across 35 langs** (incl. Ang/grc/akk/sux/cop/egy/got, dead/classical langs Bucket cares about). Same lossy shape as the index (no translations/etymology/sounds). | Scale path for *breadth*; must be re-derived from `kaikki-cache/` for *depth*. |
| `all.json` (20MB) | (the lib reads this) | `src/lib/photon-index.ts` loads `all.json` into memory (45k rows, lexical-only scan). `polingual/src/lib/photon-db.ts` instead talks to **Supabase PostgREST** at `db.agfarms.dev` (`polingual` schema). **Two different access paths already exist** and disagree on transport. | Reconcile (§4). |

**The three gaps, named:**
1. **G1, vectors are English-only.** No cross-lingual semantic/phonetic search works. Highest priority.
2. **G2, relations are empty.** No `translates`, no `derives_from` in the index → translation tables and etymology trees have no data, even though it's sitting in `kaikki-cache/`.
3. **G3, the learn-a-language surface is a 107-atom toy** (`lang-core.json`, self-rated, 7 Romance/Germanic langs, no audio, no typed checking).

Everything below is the path from this real state to the Polingual vision.

---

## 1. The comparison axes: the heart of it

Five axes. For each: the query it answers, the algorithm, the data source, the build (local CPU/GPU),
and what to do given the measured gaps.

### 1.1 Semantic / meaning: "words that mean X across languages"

- **Query:** "words that mean *time*" → cross-lingual top-K (`Zeit:de`, `tiempo:es`, `kāla:sa`, `時:ja`…).
- **Model:** **`sentence-transformers/LaBSE`** (Language-agnostic BERT Sentence Embedding, Feng et al. 2020,
 Apache-2.0). 768-d, trained on 109 languages, **purpose-built for cross-lingual retrieval**, `time:en`
 and `tiempo:es` land on top of each other by design. This is the right model *because the product is
 cross-lingual*. The current 384-d vectors are almost `bge-small-en` (English-only, per
 PHOTON-SPEC §"Vector geometry"), which is **why** non-English never got vectorized: the model couldn't
 embed it meaningfully. **LaBSE is the fix for G1.**
 - Runner-up: `intfloat/multilingual-e5-base` (768-d, MIT, needs `query:`/`passage:` prefixes, slightly
 better on some MTEB cross-lingual tasks but heavier). Lightweight option:
 `paraphrase-multilingual-MiniLM-L12-v2` (384-d, keeps the existing 384-d file geometry, 50 langs,
 fastest). **Recommendation: LaBSE for quality; MiniLM-L12 if we must keep the 384-d files and CPU
 build time matters.** LaBSE is the default; it's the single biggest quality lever in the product.
- **What to embed:** The **gloss** rather than the surface. Embed the **first sense's `meaning_en`** (the
 primary gloss) instead of the full ` · `-joined blob, concatenated senses blur the centroid. Store one
 vector per *primary sense*; emit extra sense-photons for polysemous words (PHOTON-SPEC open
 question #1 already commits to one-photon-per-sense). Embedding the English meaning (not the foreign
 surface) is what makes the space cross-lingual: every photon, whatever its language, is anchored by its
 English meaning, exactly the PHOTON-SPEC "meaning_en is the lingua franca" rule. *Also* embed the
 surface with LaBSE (LaBSE handles raw foreign tokens) into a **second** vector so "sounds-meaning"
 joint queries and surface-similarity work, but the meaning-vector is primary.
- **Build (local):** `sentence-transformers` + torch. CPU: LaBSE ≈ **120-200 words/sec** on a modern
 box → 45k words in **~5 min**, 3.1M (full `bulk.csv`) in **~5 hrs**. GPU (any CUDA card): 10-20× faster.
 Output: rewrite `semantic-vectors.f32.bin` as **N × 768 f32**, set `semantic_row` for **every** photon
 (not just English). Normalize to unit length at build time so cosine = dot product.
- **Index:** for 45k, 500k, brute-force cosine over a memmapped matrix is <30 ms (numpy `@`); above ~1M,
 add **`hnswlib`** (MIT, pure-python wheels, ~50 MB index for 1M×768 at int8) or **FAISS** `IndexHNSWFlat`.
- **Answers:** `/api/photon/search?q=time&mode=semantic` (embed query, top-K) and
 `/translate` fallback (semantic neighbors filtered to `to=` language when no explicit `translates` edge).

### 1.2 Phonetic / sound: "words that sound like X"

- **Query:** "words that sound like *gravitas*" → `gravity:en, gravité:fr, gravedad:es, गुरुत्व:hi`…
 cross-lingual by *sound alone*, independent of meaning, this is the axis that surfaces accidental
 cognates and false friends, the delightful part of Polingual.
- **Algorithm, how the 64-d vector is built from IPA (this is the part to make rigorous):**
 1. **Normalize IPA** from `ipa` field / `sounds[].ipa`, strip stress (`ˈˌ`), length (`ː`), tie bars,
 brackets; keep the phoneme segments. (Kaikki gives multiple `sounds` per word, pick the
 general/standard-tagged one.)
 2. **Map each IPA segment to a phonological feature vector** (place, manner, voicing, height, backness,
 rounding, nasality…). Use **PanPhon** (Mortensen et al., Apache-2.0), it maps any IPA segment to a
 **24-dim articulatory feature vector** and even gives a weighted feature edit distance out of the box.
 3. **Pool the segment-feature sequence into a fixed 64-d vector.** Options, cheapest→best:
 (a) **mean+max pool** of PanPhon features + a few positional/length features (zero-training, ships
 today); (b) a tiny **char/segment-level GRU autoencoder** trained on the IPA corpus to a 64-d
 bottleneck (captures order, which mean-pool loses, *this is the "char-level encoder" PHOTON-SPEC
 §126 promised*); (c) embed the **IPA string** with a multilingual char model. **Recommendation:
 ship (a) now (deterministic, attributable, no training), schedule (b) as the quality pass.** Either
 way the output stays 64-d so the existing `.bin` geometry holds.
 - For "spelled-vs-sounds-like" cross-checks, also compute **Soundex/Double-Metaphone** (for Latin-script
 langs) as a cheap lexical pre-filter before the vector cosine.
- **Data source:** `ipa` column (present where Kaikki had it) → for the rest, **derive IPA** with
 **`epitran`** (Mortensen, MIT, grapheme→IPA for 100+ langs) so phonetic search covers words Wiktionary
 didn't transcribe. Attribute PanPhon + epitran in the about page.
- **Build:** PanPhon mean-pool is pure-CPU, ~5k words/sec → all 45k in seconds, 3.1M in minutes. Fill all
 4500+ phonetic slots (currently English-only), **fixes G1 on the phonetic axis too.**
- **Answers:** `/api/photon/phonetic?surface=gravitas&top_k=10`, epitran→IPA→PanPhon→64-d→cosine top-K.

### 1.3 Orthographic / spelling

"words spelled like X" + a spelling↔sound axis.

- **Query:** "words spelled like *colour*" → `color:en, couleur:fr, colore:it`; and "is this spelling
 weird for how it sounds?" (the spelling↔sound divergence, fun for English/French/Tibetan).
- **Algorithm:** (a) **Edit distance**, `rapidfuzz` (MIT) Damerau-Levenshtein, top-K by normalized
 similarity over the surface column, **bucketed by script** (don't compare Devanagari to Latin by
 codepoint). For cross-script "spelled like," compare the **romanization** (`translations[].roman` in
 Kaikki, or ICU transliteration). (b) **Spelling↔sound axis** = distance between the *orthographic* and
 *phonetic* representations: align surface graphemes to IPA segments, score grapheme-phoneme regularity.
 Surfaces a per-language "orthographic depth" number (English deep, Spanish shallow), a novel
 Polingual view.
- **Data source:** `surface` (already indexed) + `ipa`/epitran. No new model.
- **Index:** `rapidfuzz.process.cdist` over per-script surface lists; for scale, a **char-trigram
 inverted index** (SQLite FTS5 over trigrams, or a Python `Counter` index) pre-filters candidates before
 exact edit distance.
- **Answers:** `/api/photon/search?q=colour&mode=spelling&top_k=20`.

### 1.4 Etymological / root: cognate trees from etymology chains

- **Query:** "etymology of *entropy*" → `ἐντροπή (grc) → entropie (fr) → entropy (en)`; and the inverse:
 "all descendants of PIE 0" → the cognate tree (light/lux/leukos/licht…).
- **Algorithm:** **Parse Kaikki's `etymology_templates[]`** (structured) and `etymology_text` (prose
 fallback). The templates carry `{name: "inh"|"der"|"bor"|"root", args: {source_lang, source_term}}`,
 this is a **directed edge** `photon → ancestor`. Materialize these as `derives_from` / `inherited_from`
 / `borrowed_from` / `cognate_of` **relations** (fixes G2). Then etymology = a graph walk; a cognate tree
 = "all photons that reach the same PIE/proto root." Proto-forms (`*lewk-`, `*leuhtaz`) become their own
 `kind=word, lang=ine-pro` reconstructed photons so the tree has shared roots to converge on.
- **Data source:** **`kaikki-cache/*.jsonl` `etymology_templates` + `descendants`**, *not* the current
 index (which dropped them). This is the single biggest reason to re-ingest from the raw cache.
- **Build:** a Python pass over the cache emitting an `etymology_edges` table (`from_id, to_id, predicate,
 proto_form, source_lang`). ~minutes per language file. Render as a vertical SVG tree (POLINGUAL.md v2).
- **Answers:** `/api/photon/etymology?id=photon:word:en:entropy` (walk up) and
 `/api/photon/cognates?root=*lewk-` (walk down).

### 1.5 Translational: cross-lingual same-meaning clusters

- **Query:** "say *light* in Sanskrit" → exact translation; "all words for *light*" → the cluster.
- **Algorithm:** **two complementary sources, ranked.** (a) **Explicit**, Kaikki `translations[]` arrays
 (each entry: `{lang, code, sense, word, roman}`) materialized as **`translates` predicate edges**
 (fixes G2). This is *curated truth*, pre-cached, no model, POLINGUAL.md v0.5 exactly. Cluster = the
 connected component over `translates` edges, keyed by **shared sense**. (b) **Implicit fallback**, when
 no explicit edge exists, **semantic neighbors (§1.1) filtered to `to=` language** above a cosine
 threshold, flagged `inferred:true` in the response so the UI can mark it lower-confidence.
- **Data source:** `kaikki-cache` `translations[]` (170 langs on common words!) for explicit;
 LaBSE vectors for implicit. The `_dis1` disambiguation weights in Kaikki tie each translation to a sense.
- **Build:** translation-extraction pass over the cache → `translates` edges in a `relations` table. The
 170-translation `light` entry alone seeds links to ~150 languages from one English word.
- **Answers:** `/api/photon/translate?surface=light&from=en&to=sa` (explicit edge, fall back to inferred).

**Axis summary**

| Axis | Query answered | Algorithm | Source | Fixes |
|---|---|---|---|---|
| Semantic | "means X across langs" | **LaBSE** 768-d gloss embed → cosine top-K | `meaning_en` (Kaikki sense) | **G1** |
| Phonetic | "sounds like X" | IPA→PanPhon features→64-d pool→cosine | `ipa`/epitran | **G1** |
| Orthographic | "spelled like X" | rapidfuzz edit dist (per-script) + spell↔sound | `surface`+IPA | - |
| Etymological | "root / cognates of X" | parse `etymology_templates` → graph walk | **`kaikki-cache`** etym | **G2** |
| Translational | "X in language L" | explicit `translates` edges + inferred fallback | **`kaikki-cache`** `translations[]` | **G2** |

---

## 2. API layer

Flesh out the POLINGUAL.md endpoints. **One Python service** reads `index.sqlite` + memmapped `.bin`
vectors; Next.js routes proxy it (or read sqlite directly in dev). JSON shapes match PHOTON-SPEC.

| Endpoint | Does | Reads | Notes |
|---|---|---|---|
| `GET /api/photon?id=` | one photon + relations | sqlite row + `relations` table | adds translations/etymology now that G2 is fixed |
| `GET /api/photon/search?q=&mode=semantic\|phonetic\|spelling\|lexical&lang=&top_k=` | the four axes | sqlite + memmap | `mode` selects the axis; default = lexical (today's `searchPhotons`) |
| `GET /api/photon/translate?surface=&from=&to=` | translation | `translates` edges → fallback inferred | returns `inferred` flag |
| `GET /api/photon/phonetic?surface=&top_k=` | sound neighbors | epitran→PanPhon→memmap | works for un-transcribed inputs |
| `GET /api/photon/etymology?id=` / `cognates?root=` | trees | `etymology_edges` table | SVG-ready node/edge JSON |
| `GET /api/lang/{code}` | language overview | sqlite agg | top-N by frequency/tier (§3) |
| `GET /api/photon/audio?id=` | pronunciation | `sounds[].ogg_url`/local TTS | Wikimedia URL if present, else TTS |

**Deployment reality (decide explicitly).** Index + vectors at 45k×(768+64) f32 + sqlite ≈ **150-180 MB**;
Trimmed to a "starter" subset (top ~8k words × 15 langs, see §3) ≈ **15-25 MB**. Vercel serverless has a
**250 MB unzipped function bundle** cap and a read-only ephemeral FS, and cold-start memmap of a 180 MB
file is slow. **Decision (two-tier):**

- **Full index + all five axes → Hetzner box** (`prod-hetzner-1`, CPX42, already running K3s). Run the
 Python FastAPI photon service in the `inst-bucket-foundation` namespace, memmap the full `.bin` files
 from a PVC. No size cap, warm process, GPU-free. Exposed at
 `https://bucket-foundation.nucleus.agfarms.dev/api/photon/*` (TLS already live, per CLAUDE.md).
- **Vercel (`polingual.com` + `bucket.foundation`) → thin proxy + a trimmed starter subset baked in.**
 Word-lookup and the starter-guide work from a **15-25 MB starter index** shipped in the build artifact
 (instant, offline-capable, covers the common-words core). Anything needing the *full* cross-lingual
 vector search proxies to the Hetzner service. This matches POLINGUAL.md's "Vercel for surface, same disk
 in dev" while respecting serverless limits. The existing `polingual/src/lib/photon-db.ts` PostgREST path
 to `db.agfarms.dev` is a **third** option, fine for metadata lookups, but vector search must not go
 through PostgREST (no ANN). **Pick one read path per query class:** metadata→PostgREST or starter-sqlite;
 vector→Hetzner FastAPI.

---

## 3. "Starter guide to every language" + the learn-a-language drill

### 3.1 The curated common-words + common-phrases core

The 107-atom `lang-core.json` is a hand-authored toy (7 langs, self-rated). Replace its *content source*
With the photons while keeping its *good structure* (atoms with `forms{lang:{word,ipa}}`, `requires`
Prereqs, `example`, cited `resources`).

- **Selection (frequency/tier):** Kaikki entries don't carry frequency, so derive a **commonness proxy**:
 rank by (a) presence in a **Swadesh/Leipzig-Jakarta** core list (public-domain ~200-word universal
 cores, perfect "starter guide to every language" seed), (b) number of `translations[]` (common words
 get translated into more langs, `light`→170), (c) number of `derived[]`/`senses[]`, (d) shortness.
 Take **top ~800-1200 per language** → a `lang-core` photon subset. The Swadesh/Leipzig core *is* the
 "every language" starter spine: the same ~200 concepts in all 27 (then all 35, then more) langs.
- **Common phrases:** mine Kaikki `phrase`-POS entries + a small curated survival set
 (greetings/numbers/directions), emit as `kind=phrase` photons. Tatoeba (CC-BY) parallel sentences
 (PHOTON-SPEC §206) give cloze-drill material later.
- **Output:** regenerate `learning/app/corpus/lang-core.json` (and a per-language
 `lang-<code>.json`) from the photon DB, preserving the schema the Academy app already reads.

### 3.2 The learn-a-language drill, usability fixes

Current drill = 107 self-rated flashcards. The `UX-CRAFT.md` guardrails (restrained motion, parchment,
audio-as-hero) apply. Three fixes turn it real:

1. **AUDIO (local TTS + Wikimedia).** Prefer the **real human recording** when Kaikki `sounds[]` has an
 `ogg_url`/`mp3_url` (Wikimedia Commons, attributed). Fallback to **local TTS**: `piper` (MIT, offline,
 per-language voices, runs on the Hetzner box, sub-100ms) or browser `SpeechSynthesis` for instant
 client-side. Every card and every drill prompt gets a tap-to-hear. Pre-cache OGGs into a PVC.
2. **TYPED answer-checking with accent tolerance.** Replace self-rating with **typed recall**, graded by
 a tolerant matcher: NFC-normalize, strip combining diacritics for a "close" tier (`café`≈`cafe`),
 accept known orthographic variants (`ss`/`ß`, `oe`/`ö`), and rank by normalized edit distance
 (rapidfuzz, reused from §1.3). Three grades: exact / accent-close / wrong → feeds the FSRS scheduler
 already in `learning/app/js/fsrs.js`. **No more "did you get it? Click yes."**
3. **Sentence / cloze drills.** Beyond isolated words: cloze-delete a word from a Tatoeba sentence
 ("Tengo ___ perro" → *un*), and production drills ("say 'I have one dog' in French"). Uses the
 `example` field the deck already has, scaled by Tatoeba. Audio + typed-check apply here too.

The drill stays inside the existing Academy app (`learning/app/`, FSRS + adaptive engine already built),
We are upgrading the **content source** (photons not hand-authored) and the **grading/audio loop**, not
rebuilding the SRS.

---

## 4. Academy integration

One substrate, two surfaces.

```
                _intake/photons/  (index.sqlite + .bin + relations + etym_edges)
                                 │  ← ONE substrate (this plan fixes G1/G2 here)
                ┌────────────────┴───────────────────┐
                ▼                                     ▼
   Bucket Academy "Languages" branch        polingual.com (standalone)
   (learning/app/, FSRS drill)              (polingual/, Next 15)
   • real dictionary lookup (/api/photon)   • /word/<id> lexicographic page
   • the 5 comparison views                 • /search (5 axes)
   • learn-a-language drill (§3)            • /translate, /etymology, /phonetic
   • content = lang-core photons            • /lang/<code> starter guide
```

- **Shared:** the photon DB + the Python photon service (§2) are the **single source of truth**. Academy
 and polingual.com are two *read surfaces*. Academy embeds lookup + comparison views inline in lessons
 ("the word *light*, hear it, see its cognates, drill it"); polingual.com is the standalone
 lexicographic explorer. POLINGUAL.md already commits to "one canon, two windows."
- **Reconcile the two access libs:** `src/lib/photon-index.ts` (in-memory `all.json`, lexical only) and
 `polingual/src/lib/photon-db.ts` (PostgREST) should both become thin clients of the **same `/api/photon`
 service**. Keep the in-memory lib only as the **starter-subset** dev/offline path (§2). Document this so
 the next builder doesn't add a third path.

---

## 5. Scale path to fuller dictionaries

| Stage | Langs × words | Source | Storage | Index |
|---|---|---|---|---|
| **Now** | 27 × 1.5-3k = 45k | current `index.sqlite` (re-ingest for depth) | ~180 MB | brute-force memmap |
| **S1 depth** | same 27, **re-derive from `kaikki-cache/`** | adds translations+etymology+sounds (G2) | +relations/etym tables ~50 MB | same |
| **S2 breadth** | 35 × up to 200k = **3.1M** (`bulk.csv` already built) | `bulk.csv` (re-run extractor for depth fields) | ~3-5 GB sqlite | **hnswlib/FAISS HNSW** required |
| **S3 full** | "every language" = download more Kaikki per-lang JSONL on demand | kaikki.org per-language dumps | sharded sqlite per lang family | per-shard ANN, lazy-load |

- **Incremental & idempotent:** ingest keyed by photon `id` (stable per PHOTON-SPEC), re-running
 **upserts**, never duplicates. Vectors rebuilt only for new/changed `meaning_en` (hash the gloss).
- **Storage strategy at scale:** keep `meaning_en` + `surface` + IPA in sqlite; push `translations`/
 `etymology`/`senses` to a sidecar `payload` blob (or per-shard JSONL) so the hot index stays small.
 Vectors in memmapped `.bin` shards by language family.
- **What "every language" costs:** Kaikki covers ~1000+ langs but quality is power-law, ~50 langs
 are rich, the long tail is sparse inflection tables. "Every language" = ingest-on-demand of the long
 tail, **not** pre-build everything. The target is **35 rich langs deep + lazy long tail.**

---

## 6. Scope

**A strong, shippable start (this quarter):**
- 27 langs, 45k words, **all five axes working cross-lingually** (after G1 fix), real translation +
 etymology (after G2), a real typed+audio learn-a-language drill on an ~1k-word-per-lang core.
- This already beats the current state by a mile and is a useful product.

**What "every language + full dictionaries" requires (NOT this quarter):**
- ANN infra (FAISS/hnswlib) + sharded storage for 3M+ photons; sense-disambiguation (polysemy) at scale;
 per-language IPA/TTS coverage for the long tail; human review of inferred translations; ongoing Kaikki
 re-sync; a real ops budget for the Hetzner box memory/disk. This is a multi-quarter data-engineering
 program rather than a sprint. **Don't promise it on the landing page.** Promise "27 languages, growing."

**Risks:** CC-BY-SA attribution must be visible (license risk); inferred translations can be wrong (mark
Them); proto-form etymology parsing is noisy (Kaikki templates are inconsistent across langs, budget
cleanup); the 384-d→768-d vector rebuild changes the `.bin` geometry (one-time migration, archive old).

---

## 7. Bead breakdown

**Phase A, fix the substrate (unblocks everything; G1+G2):**
- `bkt-A1` Re-ingest from `kaikki-cache/` keeping `senses, translations, etymology_templates, sounds,
 derived` → richer `payload` + new `relations`/`etymology_edges` tables. *(P1)*
- `bkt-A2` Swap semantic model to **LaBSE**, re-embed **all 27 langs'** glosses → rewrite
 `semantic-vectors.f32.bin` (N×768), set `semantic_row` for every photon. **Fixes cross-lingual search.** *(P1)*
- `bkt-A3` Build phonetic vectors for all langs: IPA/epitran → PanPhon → 64-d pool → fill
 `phonetic-vectors.f32.bin`, set `phonetic_row` for every photon. *(P1)*
- `bkt-A4` Materialize `translates` (from `translations[]`) + `derives_from/inherited/cognate` (from
 `etymology_templates`) edges. *(P1)*

**Phase B, API + axes:**
- `bkt-B1` Python FastAPI photon service (sqlite + memmap) on Hetzner: `/api/photon`, `search` (4 modes),
 `translate`, `phonetic`, `etymology`, `cognates`, `lang`. *(P1)*
- `bkt-B2` Spelling axis (rapidfuzz per-script + trigram pre-filter) + spelling↔sound divergence. *(P2)*
- `bkt-B3` Trimmed **starter subset** (15-25 MB) baked into Vercel build; reconcile the two access libs to
 one client. *(P2)*

**Phase C, starter guide + drill:**
- `bkt-C1` Regenerate `lang-core.json` from photons via Swadesh/Leipzig core + commonness proxy (~1k/lang)
 + `lang-<code>.json` per-language. *(P2)*
- `bkt-C2` Audio: Wikimedia OGG cache + `piper` local TTS fallback, tap-to-hear on every card. *(P2)*
- `bkt-C3` Typed answer-checking with accent tolerance → FSRS grades. *(P1 for the drill)*
- `bkt-C4` Cloze + sentence/production drills from Tatoeba (CC-BY). *(P3)*

**Phase D, surfaces:**
- `bkt-D1` polingual.com `/word/<id>`, `/search`, `/translate`, `/etymology` (SVG tree), `/phonetic`,
 `/lang/<code>`. *(P2)*
- `bkt-D2` Academy "Languages" branch: inline lookup + 5 comparison views + drill entry. *(P2)*
- `bkt-D3` License/attribution page (Wiktionary CC-BY-SA, PanPhon, epitran, piper, Wikimedia audio). *(P1, legal)*

**Phase E, scale (later):**
- `bkt-E1` Re-run extractor over `bulk.csv` for depth fields (3.1M, 35 langs). *(P3)*
- `bkt-E2` hnswlib/FAISS ANN + sharded storage. *(P3)*
- `bkt-E3` On-demand long-tail Kaikki ingest. *(P3)*

---

## Appendix, measured facts

- `index.sqlite`: 45,000 rows, 27 langs, all `kind=word`/`tier=functional`, `relations` empty everywhere.
- Vectors: `semantic` 384-d × 4500 slots, `phonetic` 64-d × 4500 slots, **only rows 0-1471 are wired,
 and they are ALL English.** Non-English cross-lingual search does not function until Phase A.
- `kaikki-cache/`: 17 GB raw JSONL with the full rich fields (the goldmine for G2 + etymology + audio).
- `bulk.csv`: 3,140,430 rows, 35 langs incl. Ang/grc/akk/sux/cop/egy/got (classical langs Bucket wants).
- Two access libs already disagree on transport (`all.json` in-memory vs PostgREST), reconcile in B3.
- Sources: Wiktionary/Kaikki (CC-BY-SA), PanPhon + epitran (Mortensen, Apache/MIT), LaBSE (Apache-2.0),
 piper TTS (MIT), Wikimedia Commons audio (per-file CC). All open, all attributable.
