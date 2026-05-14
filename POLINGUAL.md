# polingual.com — language-focused frontend on the photon substrate

*Drafted 2026-05-13. Sister product to bucket.foundation. Same data
substrate (photon index), different product surface. One canon, two
windows.*

## What polingual is

**polingual.com** is the language-focused product surface of the photon
graph. Where bucket.foundation reads the canon as "knowledge claims and
bridges across branches," polingual reads the same data as "words and
meanings across languages."

Same photons. Different lens.

| Question | bucket.foundation answers | polingual.com answers |
|---|---|---|
| "What does the canon say about consciousness?" | Top claim cards, bridges, evidence | (out of scope) |
| "What does *gravity* mean?" | (out of scope) | English definition + translations to N languages |
| "How do you say *light* in Sanskrit?" | (out of scope) | `prakāśa · ज्योतिस् · दीप · आलोक` with IPA + definitions |
| "What's the etymology of *entropy*?" | (passing reference) | Full chain → Greek `ἐντροπή` → French `entropie` → English |
| "Show me words that sound like *gravitas*" | (out of scope) | Phonetic-vector top-K across all languages |
| "Words that mean *time* across the canon-tier languages" | (out of scope) | Cross-lingual semantic top-K |

## Scope (v1)

1. **Word lookup**: type any word in any language → English definition + part of speech + IPA + translations + etymology.
2. **Phonetic search**: "find words that sound like X" — uses the 64-d phonetic vector, cross-lingual.
3. **Semantic search**: "find words that mean Y" — uses the 384-d semantic vector, cross-lingual.
4. **Translation tables**: every photon's `translates` predicate edges visualized.
5. **Etymology trees**: the `derives_from` chain rendered as a vertical tree.

Out of v1: audio pronunciation generation, grammar lessons, learn-a-language UI, conjugation tables. Those come later if traction.

## Data substrate

Polingual reads the **same photon index** as bucket.foundation:

```
bucket-foundation repo (this one)
└── _intake/photons/
    ├── index.sqlite              ← word/phrase/claim/site/object photons
    ├── semantic-vectors.f32.bin   ← 384-d × N
    ├── phonetic-vectors.f32.bin   ← 64-d × N
    └── by-kind/                   ← per-photon JSON
```

Polingual queries this via the API layer:

```
GET https://www.bucket.foundation/api/photon?id=photon:word:la:gravitas
GET https://www.bucket.foundation/api/photon/search?q=gravity&mode=semantic&top_k=20
GET https://www.bucket.foundation/api/photon/translate?surface=light&from=en&to=sa
GET https://www.bucket.foundation/api/photon/phonetic?surface=gravitas&top_k=10
```

(These endpoints don't exist yet — they're on the build list.)

Or in development, polingual can read the same sqlite + memmap files directly (same repo, same disk, no network).

## Repo layout

```
bucket-foundation/
├── PHOTON-SPEC.md            ← the contract (this lives in this repo)
├── POLINGUAL.md              ← this file
├── _intake/photons/          ← the shared substrate
├── src/                      ← bucket.foundation Next.js app
└── polingual/                ← polingual.com Next.js app (separate)
    ├── README.md
    ├── package.json          ← uses Next + shares vector files
    ├── next.config.js        ← vercel.json points polingual.com here
    └── src/app/
        ├── page.tsx          ← search bar landing
        ├── word/[slug]/
        ├── phonetic/[seed]/
        └── api/...
```

Initial buildout option: keep polingual entirely inside this repo as
`polingual/` workspace. Vercel project A serves `bucket.foundation` from
`/`, project B serves `polingual.com` from `polingual/`. Same git history,
same canon data. Cheaper and tighter than two separate repos until
polingual stands on its own.

## Routes (polingual.com)

| Route | What |
|---|---|
| `/` | Big search bar: "what's the word for X?" or "what does X mean?" |
| `/word/<id>` | Single photon page: definition · IPA · pronunciations · translations · etymology · semantic + phonetic neighbors |
| `/search?q=…` | Mixed semantic + lexical results across all languages |
| `/translate?from=…&to=…&surface=…` | Direct translation lookup |
| `/phonetic/<surface>` | Phonetic-neighbor list |
| `/lang/<code>` | Language overview: stats, top-1000 most common words, classics |
| `/etymology/<id>` | Etymology tree visualization |
| `/api/...` | Same JSON shapes as bucket.foundation/api/photon |

## Visual identity

- **Less stone, more parchment.** Bucket is carved-in-stone. Polingual is
  ink-on-paper — manuscript-like serif, slightly more colorful, less
  monumental.
- **Color**: shifted toward ink-blue + sepia (vs bucket's gold + bone).
- **Typography**: ED Garamond Connect for headings (more lexicographic);
  IBM Plex Sans Condensed for IPA + tabular data; Plex Mono for code.
- **Component reuse**: search bar pill, sidebar drawer, filter chips —
  all shared from the bucket design system, restyled.

## v0 milestone (what ships first)

- `/word/<id>` route reading directly from `_intake/photons/index.sqlite`.
- Definition + lang + IPA + part-of-speech + raw provenance.
- Semantic-neighbor list (top-10 from same lang + top-10 cross-lingual).
- Vercel deploy on polingual.com with the bucket logo subtly cross-linking.

## v0.5 — translations as first-class

Wiktionary entries include translation tables (`translations:` array
listing each translation by language). Parse these into the photon
graph as `translates` predicates. Then `/translate?surface=light&to=sa`
returns the linked sa-photon directly. No live translation API needed
— it's all pre-cached.

## v1 — phonetic search

Type "gravitas" → phonetic-vector cosine top-K across all langs →
results: gravity (en), gravité (fr), gravedad (es), guruta (sa?),
重力 (ja, via IPA `ʤɨːɽʲikʲi` if listed). Cross-lingual sound matching
opens up etymological discoveries automatically.

## v2 — etymology trees

Render the `derives_from` predicate chain as a tree visualization. For
each English word, walk back through Latin, Greek, Sanskrit, PIE roots.
For Japanese, walk back through Old Chinese readings. For Hebrew,
through Semitic roots. Manuscript-aesthetic SVG.

## Naming

- **polingual** = poly + lingual = "many tongues" + nod to "poll" (asking, calling)
- Tagline: *"every word in every language, one meaning"*
- Or: *"the photon of meaning"*

## Status

- Domain: polingual.com (purchased 2026-05-13 by founder)
- Repo plan: `polingual/` subdirectory in this repo until it stands on its own
- Photon substrate: 4,500 photons live (en/la/sa @ 1,500 each), extended ingest
  to 30 langs running in background
- Code: not yet written — this doc is the spec
- Deploy: not yet wired

## Next concrete steps

1. Scaffold `polingual/` directory with a tiny Next.js app (homepage + `/word/<id>`)
2. Build `/api/photon/...` endpoints in bucket-foundation so polingual can fetch
3. Wire Vercel project for polingual.com → pointing at the `polingual/` workspace
4. Ship v0 word-lookup page, then translation, then phonetic, then etymology

For now this doc is the contract. polingual.com inherits the photon
substrate cleanly because the spec was designed around being multi-
product from the start.
