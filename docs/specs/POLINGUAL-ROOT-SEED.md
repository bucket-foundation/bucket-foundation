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
2. Form similarity of 0.60 or more, where similarity is normalized Damerau-Levenshtein similarity: one minus the optimal string alignment distance over the longer length. An adjacent swap costs one edit, the same `editDistance` that placement uses.

Similarity is the higher of two channels. Spelling compares the romanization when a reading has one and the written form otherwise, lowercased with accents folded. Sound compares IPA with stress, length and secondary articulation marks removed. Both channels compare written strings, so the score is a proxy for auditory intelligibility until slice 3 collects recognition data. The best known language wins and is stored with the entry. A pair listed in `falseFriends` never explains a word, and the relation is symmetric.

## Coverage

Core deck, one known language, threshold 0.60 `[empirical: scripts/polingual/root-seed.ts, 2026-11-15, npm run polingual:root-seed]`.

| Known | Target | Understood | Share |
|---|---|---|---|
| es | pt | 177 of 244 | 72.5% |
| es | it | 126 of 244 | 51.6% |
| es | fr | 80 of 244 | 32.8% |
| en | es | 19 of 244 | 7.8% |

## Seed and UI

A seeded card skips the new-card queue. Its first showing is one recognition check: target word shown, meaning picked in the root language. A pass grades the card Easy, so FSRS gives it a long first interval and the daily new-word budget goes to words outside the set. A miss returns the card to the new queue. Placement starts each language at the tier where the seeded share drops under half.

Each word node on the map carries one of four states: seeded, learning, mastered, unseen. A seeded node draws an edge to the known word that explains it, labelled with the shared root when the cognate data has one. Onboarding, after the learner picks languages, shows "You already understand 126 of 244 Italian words" with four sample pairs. A seeded word card carries a "You know this" tag with the known word beside it. Language home draws the understood share as the filled base of the progress bar.

## Universal Root Lexicon

Founder intent, 2026-11-16, and the plan for slice 2: every learner starts with one shared root lexicon, so a learner with no second language still gets a seeded set. `understandableSet` treats the lexicon as one more known language. It needs four data sets:

- A reviewed root entry for each concept: root form, gloss and descendant form in each language. Today 102 of 244 concepts carry a root and some are wrong (`bkt-kfrjg`).
- Etymology edges read from the Kaikki inherited, borrowed and derived templates, replacing the regex over etymology text.
- Derivative links from each root to words the learner's own language holds, such as aqua to aquatic, which mark the roots a monolingual learner can read.
- International words with a form and IPA in each language, such as taxi and hotel.

## Slices

1. Done here: `understandableSet` in `src/lib/polingual/understandable.ts`, tests, the coverage script.
2. Universal root lexicon data, then the seed for learners with one language.
3. Web: scheduling seed and placement behind a flag, then the onboarding count, card tag and progress base.
4. Swift and Kotlin ports, then concept alignment for the top 1000 lists.

## Open Questions

1. Root lexicon: which roots go in first, Latin and Greek for the Romance and English decks, or one Proto-Indo-European layer for all?
2. Threshold: 0.60 admits leche and latte and rejects mano and main. Keep 0.60, or tune it against learner recognition data from the first check?
3. Known languages: onboarding asks for one root language today. Add a "languages you know" step with a level for each?
