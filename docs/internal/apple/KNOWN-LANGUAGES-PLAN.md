# Known Languages Onboarding Plan

Bead bkt-pgr06.2, epic bkt-pgr06. Status: plan, critic round 1. Founder question: which share of new Polingual learners already speak two or more languages, and does asking change which set they build?

## Goal

New learners tell Polingual every language they already speak. The answer:

1. Measures the ideal customer: the share of signups who speak two or more languages.
2. Picks a better base language for the first set than the device language alone.
3. Keeps known languages out of the target picks.
4. Seeds the lexicon map in epic bkt-pgr08, which needs to know every language a learner holds.

Prediction: over 40% of beta signups pick two or more languages. Test: the `known_languages_set` event after 200 signups.

## Today

`apple/Polingual/Sources/Onboarding.swift` has two steps, `welcome` and `languages`. The base language is `InterfaceLanguage.deviceRoot` with no question asked. `LanguageSections` in `apple/Bucket/Sources/Polingual/LanguagesHome.swift` has a single-choice "I already speak" picker that sets `root` for a new set. A `LangSystem` holds one `root` and its `targets`.

## Design

A third step, `speak`, between `welcome` and `languages`.

- Title "Which languages do you speak?", body "Pick every one you can hold a conversation in."
- A `FlowLayout` of `Chip`s for `Lang.codes`, the same component the languages step uses. The device language starts selected. At least one stays selected.
- Order: the device language first, then the languages most often spoken by Polingual's audience: English, Spanish, French, Portuguese, Chinese, Hindi, Arabic, then the rest by name.
- When two or more are picked, a small "Base language" row of the picked flags lets the learner choose which one prompts their first set. It defaults to the device language when picked, otherwise the first pick.
- The `languages` step then drops known languages from the default targets and from preset chips, the same way it drops `root` today.
- Footer dots grow from two to three. The step obeys `docs/design/POLINGUAL-DESIGN.md`: tokens, `PL` fonts, `Chip` and `D8Primary` only, no new components.
- VoiceOver: each chip reads "Spanish, selected" or "Spanish"; the base row reads "Base language, Spanish".

## Data

- `BucketKit`: `KnownLanguages`, a sorted `[String]` of valid `Lang.codes`, with `init(_ codes:)` that drops unknown codes and duplicates, and a `base(device:)` rule. Pure, fully unit tested.
- Stored locally in `LangStore` as `known`, persisted with the store's existing local state, and synced in the same payload as language sets so a reinstall or a second device gets it back. If the sync payload has no slot for it, the field rides inside the existing progress `data` jsonb under `known`, which the server already stores and the weight guard counts as an entry, so a blank overwrite cannot erase it.
- Settings: the `LanguageSections` single picker becomes "Languages I speak" opening the same chip grid, so the answer can change later.

## Measurement

One `BetaEvent` named `known_languages_set` with props `count` and `codes`, a comma-joined list of at most 8 codes, sent once on completing the step and again when Settings changes it. The ingest at `src/app/api/beta/events` accepts only the names in `BETA_EVENT_NAMES` in `src/lib/beta/events.ts`, so step 0 adds `known_languages_set` there with a handler test, in its own web PR that merges first. Codes are language tags, which pass the banned-key rules. The share of learners with two or more languages is then a count over stored beta events by `props.count`.

## Tests

- `KnownLanguagesTests` in BucketKit: unknown codes dropped, duplicates dropped, base defaults, base when the device language is not picked.
- `OnboardingFlowTests` UI test: pick Spanish and English, choose Spanish as base, see Spanish missing from targets, finish, and find a set with root `es`.
- Snapshot of the step on the smallest supported iPhone at the largest non-accessibility text size, through `FitPage`.

## Parity

The web onboarding in `polingual/` and Android get the same step in their own beads, filed with this PR, because the design system requires web-to-app parity.

## Out of Scope

Proficiency levels per language, placement tests for known languages and the lexicon map itself.

## Steps

0. Web: allow `known_languages_set` in `BETA_EVENT_NAMES`, with a handler test.
1. BucketKit `KnownLanguages` with tests.
2. `LangStore.known` with persistence and sync, tests with the stub transport.
3. Onboarding `speak` step and target filtering, UI test.
4. Settings entry.
5. Event, then a TestFlight build with What to Test notes.

Each step is one commit on `feat/apple-known-languages`, one PR into `dev`, reviewed by the charizard orchestrator before merge.
