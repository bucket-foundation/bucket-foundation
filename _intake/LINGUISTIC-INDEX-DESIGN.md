# Linguistic index — dictionaries · alphabets · languages · semantics

*Drafted 2026-05-13. Founder ask: "index dictionaries words alphabets
languages meanings — vast background process. language meaning semantics
LLMs brain neurons semantics Noam Chomsky linguistics! And we need to do
testing of all these words and meanings against the embedded index."*

## What this is

A new ingestion + analysis layer that adds **language itself** to the
canon. Not as a topic, but as a **substrate** — the words, alphabets,
grammars, and semantic networks through which all canon content is
expressed. Then a battery of tests against our existing embedding index
to surface how the canon corpus performs on classic linguistic tasks
(synonymy, analogy, polysemy, cross-lingual meaning).

## Source plan (firing tonight as background jobs)

| Source | Tool | What | Status |
|---|---|---|---|
| **OpenAlex authors** | `agf-openalex` | 25 canonical linguists: Chomsky · Pinker · Fodor · Saussure · Jakobson · Lakoff · Rosch · Jackendoff · Wierzbicka · Boroditsky · Fillmore · Sperber · Wilson · Goldberg · Bresnan · Johnson · Levinson · Everett · Evans · Poggio · Bengio · Dehaene · Sigman · Friederici · Hickok | 🟢 firing now |
| **arXiv** | `agf-arxiv` | Word embeddings · compositional semantics · LM brain · UG · distributional semantics · construction grammar · WordNet · morphology · etymology | 🟢 firing now |
| **Project Gutenberg** | `agf-gutenberg` | Webster · OED scans · etymological dicts · Saussure · Skeat · Liddell-Scott · Lewis-Short · Monier-Williams | 🟢 firing now |
| **PubMed** | `agf-pubmed` | Broca/Wernicke · semantic memory · fMRI language · neural correlates of meaning | 🟢 firing now |
| **Wiktionary dump** | `agf-wiktionary` (TODO) | The full lexical graph — ~8M entries, ~300 languages, IPA, etymologies, definitions, derived terms, anagrams, semantic relations | 🟡 next |
| **WordNet 3.1** | direct download | English semantic graph — synsets, hypernyms, hyponyms, meronyms, entailment | 🟡 next |
| **CONCEPTNET** | API | Multilingual common-sense graph — ~34M edges across ~83 languages | 🟡 next |
| **Universal Dependencies** | direct | Cross-lingual syntactic treebanks for 100+ languages | 🟡 next |
| **Tatoeba sentences** | direct | ~10M parallel sentences across 400+ languages | 🟡 next |
| **Babel codes** | direct | ISO 639-3 + Glottocode mappings for ~8,000 languages | 🟡 next |

## Storage layout

```
bucket-canon/
  10-linguistics/                              ← NEW BRANCH
    README.md                                  branch overview
    sub-claims/                                claim cards (extracted from sources)
    sub-figures/                               Chomsky, Saussure, Pinker, etc.
  _bridges/
    semantics/                                 ← NEW BRIDGE — language as a primitive
      INDEX.md                                 how semantics connects to mind, info, math, physics

_intake/
  linguistics/
    wiktionary/                                full lexical graph
    wordnet/                                   English synsets
    conceptnet/                                multilingual common-sense
    ud/                                        Universal Dependencies treebanks
    alphabets/                                 every script + Unicode block
    canon-vocab/                               ← words extracted from existing canon
```

## Tests we want to run against the embedded index

Once Wiktionary + WordNet are ingested, we can probe our **bge-small-en
canon embedding** against classic linguistic benchmarks:

### A. Distance benchmarks (does the embedding capture meaning?)

| Test | Dataset | What it measures |
|---|---|---|
| WordSim-353 | Finkelstein 2002 | human-rated word-pair similarity |
| SimLex-999 | Hill 2015 | similarity not relatedness (`cat`/`dog` similar; `cat`/`mouse` related but not similar) |
| MEN-3K | Bruni 2014 | concrete word relatedness |
| RareWord | Luong 2013 | how well does our model handle infrequent words? |

For each: encode the words, compute cosine similarity, correlate with human gold.

### B. Analogy (Mikolov-style)

> "king" - "man" + "woman" = "queen"

- Google analogy dataset (capital-country, gender, plurals, comparatives)
- BATS analogy benchmark
- For our canon corpus: domain analogies (`einstein` - `physics` + `biology` = ?)

### C. Polysemy detection

For each word: does our embedding distinguish senses?
- `bank` (river) vs `bank` (institution)
- `light` (illumination) vs `light` (weight)
- `mind` (cognition) vs `mind` (concern)

Test: cluster contexts containing the word; see if clusters separate by sense.

### D. Cross-canon semantic search

For each canon-claim concept, retrieve from a held-out set:
- Synonyms (should rank near each other)
- Antonyms (should rank far)
- Hypernyms (`mathematics` → `formal-science`?)
- Sister concepts (`topology` ↔ `geometry` ↔ `algebra`)

### E. Bridge-detection sanity check

The 17 detected bridges should map to dictionary-defined concepts.
- `non-symmetry-principle` → links to "asymmetry", "broken symmetry", "chirality"
- `multivalence` → "polysemy", "ambiguity", "multiple-valued"
- Confirm via WordNet hypernym walk + Wiktionary definition embedding.

## Why this matters

1. **Brain–language thesis (Chomsky/Dehaene)**: the brain is wired for
   compositional structure. Canon needs the same substrate — without a
   linguistic backbone, claim cards float.

2. **Semantic robustness**: right now our embedding is trained on 599
   curated claim cards. That's tiny. Adding WordNet's ~117K synsets,
   Wiktionary's millions of definitions, and ConceptNet's relational
   edges grounds the embedding in **general language meaning**, not
   just canon-specific phrasings.

3. **Cross-lingual reach**: if a researcher searches in German for
   *Schwerkraft* or Japanese for *重力*, we should find the gravity
   claim card. Cross-lingual embeddings + Wiktionary translations
   enable that without translating the whole corpus.

4. **Etymology = canon-history**: the history of "force", "mass",
   "energy" tracks the history of physics. Linking each canon concept
   to its etymological tree (via Skeat / Liddell-Scott / Monier-
   Williams) reveals when each idea entered the language.

5. **Falsifiability**: if our bridge detection says X and Y are
   isomorphic, but WordNet says they're in unrelated synsets and
   ConceptNet shows no overlapping relations — that's a failure
   signal worth tracking. The linguistic layer is a sanity check.

## Tools to build

| Tool | What |
|---|---|
| `agf-wiktionary` | parse Wiktionary XML dump → per-word JSON |
| `agf-wordnet` | download + index WordNet 3.1 (NLTK or direct) |
| `agf-conceptnet` | hit ConceptNet 5 API + cache locally |
| `agf-test-embedding` | run benchmarks A–E above against any embedding |
| `agf-canon-vocab` | extract every distinct token from canon claim cards + map each to Wiktionary entries |

## Background jobs running NOW

```
oa-ling  (PID 2491570)  25 linguist OpenAlex profiles
arxiv-ling (PID 2491571) 10 linguistic-CS arxiv queries × 2 papers
gut-ling   (PID 2491572) 10 classical-dictionary Gutenberg queries × 2 books
pm-ling    (PID 2491574) PubMed: language brain Broca Wernicke (50 papers)
```

ETA: ~2 hours for the OpenAlex batch (rate-limited), the others
finish in 10-30 min each. Then we have a baseline linguistic corpus
to add to canon FTS and to run the tests against.

## Open questions

1. Add **10-linguistics** as a new canon branch, or absorb under
   07-mind? Lean **separate branch** — linguistics has its own
   primitives (phoneme, morpheme, lexeme, sign, etc.) that aren't
   downstream of mind.
2. Wiktionary dump is 9GB compressed — store raw in `_intake/` only
   (gitignored), index extracts in `bucket-canon/10-linguistics/`.
3. Multilingual: start English-only, expand to ~30 high-resource
   languages once the pipeline is solid.
