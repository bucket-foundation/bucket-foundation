# Polingual Root Seed

Founder request, 2026-11-15, bead `bkt-x32zu`. Every learner starts with a root lexicon. A target word whose meaning and form both match a word in the root language, or in another language the learner knows, sits in the understandable set from day one. Polingual teaches intercomprehension from known languages.

## Data

| Source | Holds | Use |
|---|---|---|
| `learning/app/corpus/lang-core.json` | 244 concepts, 29 languages, senses checked against Wiktionary translation tables | the target lexicon; one concept id is one meaning |
| `learning/app/corpus/lang-layers.json` | eSpeak NG IPA and romanization per form | the sound key and the cross-script spelling key |
| `learning/app/corpus/lang-cognates.json` | proto-roots on 102 of 244 concepts | a label on a match; depth is uneven and the concept fallback attaches wrong roots, such as `*mus-` on French voler |
| `learning/app/polingual/top1000/` | 1000 frequent words in each of 28 languages with an English gloss and IPA | slice 4; the lists share no concept ids across languages, and the same gap holds for the photon index and `apple/Shared/Corpus/lexicon` |

## Match Rule

A target word is understood through a known language when both hold:

1. Meaning identity: the two forms belong to the same concept id.
2. Form similarity of 0.60 or more, where similarity is normalized Levenshtein similarity, one minus edit distance over the longer length.

Similarity is the higher of two channels. Spelling compares the romanization when a reading has one and the written form otherwise, lowercased with accents folded. Sound compares IPA with stress, length and secondary articulation marks removed. The best known language wins and is stored with the entry.

## Coverage

Core deck, one known language, threshold 0.60 `[empirical: scripts/polingual/root-seed.ts, 2026-11-15, npm run polingual:root-seed]`.

| Known | Target | Understood | Share |
|---|---|---|---|
| es | pt | 177 of 244 | 72.5% |
| es | it | 126 of 244 | 51.6% |
| ru | pl | 99 of 244 | 40.6% |
| es | fr | 80 of 244 | 32.8% |
| en | de | 71 of 244 | 29.1% |
| en | es | 19 of 244 | 7.8% |
| es and en | fr | 95 of 244 | 38.9% |

## Scheduling Seed

A seeded card skips the new-card queue. Its first showing is one recognition check: target word shown, meaning picked in the root language. A pass grades the card Easy, so FSRS gives it a long first interval and the daily new-word budget goes to words outside the set. A miss returns the card to the new queue. Placement starts each language at the tier where the seeded share drops under half.

## Lexicon Map and UI

Each word node on the map carries one of four states: seeded, learning, mastered, unseen. A seeded node draws an edge to the known word that explains it, labelled with the shared root when the cognate data has one.

Onboarding, after the learner picks languages, shows "You already understand 126 of 244 Italian words" with four sample pairs. A seeded word card carries a "You know this" tag with the known word beside it. Language home draws the understood share as the filled base of the progress bar.

## Slices

1. Done here: `understandableSet` in `src/lib/polingual/understandable.ts`, tests, the coverage script.
2. Web: scheduling seed and placement behind a flag, then the onboarding count, card tag and progress base.
3. Swift and Kotlin ports with shared goldens, per the parity rule.
4. Concept alignment for the top 1000 lists, then the seed over them.

## Open Questions

1. Root: is the root lexicon the learner's root language, as built here, or a proto-root lexicon such as Latin and Proto-Germanic that every learner gets?
2. Threshold: 0.60 admits leche and latte and rejects mano and main. Keep 0.60, or tune it against learner recognition data from the first check?
3. Known languages: onboarding asks for one root language today. Add a "languages you know" step with a level for each?
4. Trust: does a seeded word count as known at once, or only after the recognition check passes?
5. False friends: a seeded word with a `falseFriends` entry gets a warning card first. Agreed?
