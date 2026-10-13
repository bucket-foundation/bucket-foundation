# PHOTON

The standardized knowledge packet of bucket.foundation.

*Drafted 2026-05-13. Founder: "photon is the data packet, the light, the
Data, the knowledge, the evidence, the claim, the hypothesis. Every
vectorized object we create is a photon."*

## What a photon is

A **photon** is a single, addressable, type-stable knowledge object.
Anything we have a meaning for, a word, a sentence, a claim, an
evidence excerpt, a coin, a manuscript leaf, a hypothesis, a bridge,
Is represented as a photon.

A photon has:
- one **canonical identity**
- one **English meaning** (even if the surface form is in any language)
- a **semantic vector** (what it means)
- a **phonetic vector** (how it sounds)
- a **confidence tier** (where on the nucleus → fringe gradient it sits)
- **provenance** (where it came from, with date)
- **relations** (other photons it cites, contradicts, refines, derives from)

The bucket canon is a **graph of photons**. Different kinds of photons
have different "shapes" in the same mega vector space, but they all
implement the same minimum contract, so any query can ride across
Them.

## Why this name

> *Photon = light = data = knowledge*

Light is the canonical signal of physics. A photon has both a wavelength
(meaning) and a polarization (form). It is both particle and wave. It
travels. It carries information across distance. It is the substrate of
every visible thing in the universe.

A bucket photon carries meaning across the canon. It is the substrate
of every visible thing in our knowledge graph.

## Photon types

Every photon has a `kind`. The kind determines which optional fields
are present, but the minimum schema is shared.

| Kind | What it is | Example |
|---|---|---|
| `word` | A lexical item in some language | "gravity" (en), "重力" (ja), "Schwerkraft" (de) |
| `phrase` | A multi-word unit | "second law of thermodynamics", "exclusion principle" |
| `sentence` | A single proposition with truth value | "Entropy of a closed system never decreases." |
| `claim` | A curated bucket-canon claim card | Penrose: consciousness is non-computable |
| `evidence` | A corpus passage supporting/refuting a claim | A paragraph from a Nature paper, with citation |
| `hypothesis` | A proposed but unconfirmed claim | "Younger Dryas Boundary impact caused megafauna extinction" |
| `axiom` | A nucleus-tier foundational statement | "F = ma" |
| `bridge` | A multi-branch primitive | "Non-symmetry principle" spanning math+physics+biophys+mind+sacred |
| `figure` | A person | Penrose, Saussure, Becker |
| `site` | A geocoded physical place | Göbekli Tepe, Giza, Stonehenge |
| `object` | A physical artifact | A specific Roman coin, the Antikythera mechanism, a clay tablet |
| `manuscript` | A textual artifact | Codex Sinaiticus, Voynich, Dead Sea Scrolls |
| `concept` | An abstract idea | entropy, holographic principle, exclusion zone water |

The shape of a photon, which fields it carries, depends on its kind,
But every photon implements the same minimum.

## Minimum schema

```json
{
  "id": "photon:word:en:gravity",
  "kind": "word",
  "lang": "en",
  "surface": "gravity",
  "meaning_en": "The attractive force between masses; the curvature of spacetime; one of the four fundamental interactions.",
  "tier": "nucleus",
  "branch": ["02-physics"],
  "semantic_vec": "ref:vectors.f32.bin:row:1234",
  "phonetic_vec": "ref:phonetic.f32.bin:row:1234",
  "provenance": {
    "source": "wiktionary",
    "source_uri": "https://en.wiktionary.org/wiki/gravity",
    "captured_at": "2026-05-13T..."
  },
  "relations": [
    { "predicate": "derives_from", "to": "photon:word:la:gravitas" },
    { "predicate": "appears_in",   "to": "photon:claim:newton-gravity-1687" },
    { "predicate": "translates",   "to": "photon:word:de:schwerkraft" },
    { "predicate": "translates",   "to": "photon:word:ja:重力" }
  ]
}
```

### Fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Canonical, hierarchical (`photon:<kind>:<...>`). Must be stable across rebuilds. |
| `kind` | enum | One of the kinds above. |
| `lang` | string | BCP-47 tag for the surface form. `en` for English-only kinds (claim, axiom, bridge). |
| `surface` | string | The original token / phrase / text. |
| `meaning_en` | string | The English definition or meaning. **Required for every photon**, this is the universal lingua franca. |
| `tier` | enum | `nucleus` · `functional` · `edge` · `unverified` |
| `branch` | string[] | Canon branches the photon attaches to. |
| `semantic_vec` | ref | Pointer into the semantic embedding matrix. |
| `phonetic_vec` | ref | Pointer into the phonetic embedding matrix. Required for `word` and `phrase`, optional otherwise. |
| `provenance` | object | Where it came from + when. |
| `relations` | array | Links to other photons by canonical predicate. |

### Kind-specific fields

| Kind | Extra fields |
|---|---|
| `word`, `phrase` | `pos` (part of speech) · `morphology` · `etymology_chain[]` · `ipa` |
| `claim` | `excerpt` · `source_url` · `timestamp` · `score` |
| `evidence` | `excerpt` · `source_url` · `relevance_score` · `supports[]` · `refutes[]` |
| `hypothesis` | `claim_text` · `falsifiability` · `evidence_for[]` · `evidence_against[]` |
| `site` | `lat` · `lng` · `civilization` · `era_start` · `era_end` · `unesco_id` · `lidar_url` |
| `object` | `museum_id` · `material` · `dimensions` · `provenance_chain[]` |
| `figure` | `birth` · `death` · `birthplace` · `affiliations[]` · `h_index` |
| `bridge` | `member_photons[]` · `centroid_vec` · `vocabulary_map[]` |

## Vector geometry

Each photon has **two** vectors:

1. **Semantic vector** (currently 384-d via `bge-small-en` or our
 `canon-bge-small-v1`). Captures what it *means*.
2. **Phonetic vector** (planned 64-d). Captures what it *sounds like*.
 Built from IPA transcription via a character-level encoder; allows
 cross-lingual phonetic matching independent of meaning.

The two vectors live in two separate matrices (different dims, different
metrics). A query can ride either:
- "find words that mean the same as 0" → semantic top-K
- "find words that sound like 0" → phonetic top-K
- "find words that mean similar AND sound similar" → joint score

For non-lexical kinds (claim, site, etc.), the phonetic vector is
Optional and zero / absent.

## Network shape

The canon is a graph:

```
            ┌─────────────────────────────────────┐
            │  NUCLEUS  primitives, axioms, laws  │
            │  ◯ word:gravity                      │
            │  ◯ word:entropy                      │
            │  ◯ axiom:F=ma                        │
            │  ◯ bridge:non-symmetry-principle     │
            │   ─────────────                     │
            │  FUNCTIONAL  peer-reviewed claims   │
            │  ◯ claim:einstein-1905-photoelectric │
            │  ◯ evidence:nature-2013-thermometry  │
            │  ◯ site:gobekli-tepe                 │
            │   ─────────────                     │
            │  EDGE  contested, fringe, awaiting  │
            │  ◯ claim:hancock-younger-dryas       │
            │  ◯ site:gunung-padang                │
            │  ◯ hypothesis:water-ez-coherent      │
            └─────────────────────────────────────┘

  Each ◯ is a photon. Edges are predicates: derives_from, refines,
  translates, appears_in, supports, refutes, bridges_to, located_at.
```

The same mega vector space holds words, phrases, claims, evidence,
Sites, objects, but with different shapes (different dims, different
relations available). A query in the joint space can hop across
kinds: word → claim → evidence → site.

## Predicates

| Predicate | Meaning | Example |
|---|---|---|
| `translates` | Same meaning, different language | `gravity:en` translates `Schwerkraft:de` |
| `derives_from` | Etymological / historical ancestor | `gravity:en` derives_from `gravitas:la` |
| `synonym_of` | Same language, same meaning | `entropy:en` synonym_of `disorder:en` (functional) |
| `appears_in` | Photon appears in another photon's text | `word:photon` appears_in `claim:einstein-1905` |
| `cites` | Bibliographic citation | `claim:becker-1985` cites `claim:szent-györgyi-1957` |
| `supports` | Evidence-for | `evidence:nature-2013` supports `claim:N` |
| `refutes` | Evidence-against | `evidence:counter-2020` refutes `claim:N` |
| `bridges_to` | Cross-branch isomorphism member | `claim:N` bridges_to `bridge:non-symmetry-principle` |
| `located_at` | Geographic anchor | `figure:newton` located_at `site:woolsthorpe` |
| `attested_at` | When a word first appears in a corpus | `word:gravity:en` attested_at year 1644 |

## Multilingual policy

- **Surface in any language**, including non-Latin scripts (CJK, Cyrillic,
 Arabic, Devanagari, etc.). UTF-8 throughout.
- **Meaning always in English**, this is the lingua franca for the
 vector space. A French definition gets translated before embedding.
- **Translations are first-class photons** linked by the `translates`
 predicate; we don't merge them into one photon.
- **Target initial coverage**: top 50 languages by speaker count +
 every language with a substantial canon-tier text tradition (Greek,
 Latin, Sanskrit, Classical Chinese, Hebrew, Arabic, Old English,
 Akkadian, Sumerian).

## Multilingual ingestion sources

| Source | Languages | Status |
|---|---|---|
| Wiktionary (English-defined) | ~300 source langs, English meanings | 🟡 launching |
| PanLex | 1,300+ languages, translations | 🟡 launching |
| Open Multilingual WordNet | ~30 high-resource langs, synsets | 🟡 launching |
| Tatoeba | 400+ languages, parallel sentences | 🟡 launching |
| ConceptNet | 83 languages, relational graph | 🟡 launching |
| Etymology Wikipedia / Skeat / Lewis-Short | EN, GRC, LAT, SKT | 🟢 partial |
| Sacred-Texts.com | 30+ langs, religious primary sources | 🟢 done |

## Implementation plan

| Stage | What | Output |
|---|---|---|
| 1 | Schema + types | `src/lib/photon.ts` · `tools/canon/photon.py` |
| 2 | Photon builder | `agf-photon-build`, converts any source row to a photon |
| 3 | Semantic embedding | use existing `bge-small-en` pipeline; meaning_en → 384d |
| 4 | Phonetic embedding | new tool, IPA → char-level encoder → 64d |
| 5 | Wiktionary ingest | first multilingual lexicon: 50 langs × top-10K words = 500K photons |
| 6 | Cross-lingual links | use Wiktionary's translation tables to create `translates` predicates |
| 7 | Test suite | semantic neighbors · phonetic neighbors · cross-lingual retrieval · analogy |
| 8 | Web | `/canon/photons/[id]` route to inspect any photon |

## Photon storage

```
_intake/photons/
  index.sqlite              metadata for every photon
  semantic-vectors.f32.bin  N × 384 dense matrix
  phonetic-vectors.f32.bin  N × 64 dense matrix
  by-kind/
    word/                   one JSON per photon
    phrase/
    claim/
    ...
```

The sqlite index has columns:
- `id`, `kind`, `lang`, `surface`, `meaning_en`, `tier`, `branch_csv`,
 `semantic_row`, `phonetic_row`, `provenance_source`, `captured_at`

Vector files are memmap-style, single open, random row access. Same
pattern we use for claim embeddings + corpus embeddings.

## Open design questions

1. **Polysemy**: `bank` (river) vs `bank` (institution), two photons
 with different `meaning_en`. Sense-disambiguation is a downstream
 step; v0 emits one photon per Wiktionary sense.

2. **Compositional photons**: should "second law of thermodynamics"
 be one phrase-photon or three word-photons + a phrase-photon linking
 them via `composed_of`? Lean toward **both**, phrase photon for
 queries, word photons for word-level analysis.

3. **Fringe ↔ canon gradient**: tier-classifier already exists. Every
 photon gets a tier on ingest. The `bridge:` photons (already 17)
 are nucleus-tier and span branches.

4. **Embedding refresh policy**: when we re-train the canon embedding,
 do we re-embed all photons? Yes, but the photon `id` stays stable,
 only the `semantic_row` field is rebuilt. Old vectors archived for
 diff analysis.

5. **API**: `/api/photon/<id>` returns the JSON. `/api/photon/search?q=`
 semantic search. `/api/photon/similar/<id>` neighbours. These ship
 as a new layer alongside the existing canon endpoints.

## Naming convention

```
photon:<kind>:<lang?>:<canonical-id>

photon:word:en:gravity
photon:word:ja:重力
photon:word:la:gravitas
photon:phrase:en:second-law-of-thermodynamics
photon:claim:einstein-1905-photoelectric
photon:axiom:newton-second-law
photon:bridge:non-symmetry-principle
photon:figure:newton
photon:site:gobekli-tepe
photon:object:antikythera-mechanism
photon:manuscript:codex-sinaiticus
photon:hypothesis:younger-dryas-impact
```

Hierarchical, kebab-case, stable.

## Tagline

> bucket.foundation is a graph of **photons**, words, claims, evidence,
> objects, sites, and hypotheses, every one with an English meaning,
> a semantic vector, and a phonetic vector. Different shapes, one
> mega vector space. Canon at the centre, fringe at the boundary.
> Free to read. Paid to cite.
