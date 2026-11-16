# Known Languages Onboarding Plan

Bead bkt-pgr06.2, epic bkt-pgr06. Status: plan passed critic round 2 at 8.1, after round 1 at 6.2. Open findings filed as beads: bkt-pgr06.2.1 guest events dropped at sign-in, bkt-pgr06.2.2 handler test that a lang-known write leaves mastery alone, bkt-pgr06.2.3 server guard against an empty lang-known. Founder question: which share of new Polingual learners already speak two or more languages, and does asking change which set they build?

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
- Synced in its own progress branch, `lang-known`, a new row in `bucket.academy_progress` with data `{"codes": [...], "at": <ms>}`. It stays out of the `lang-systems` branch on purpose: `SystemsDoc.js` writes only `systems` and `removed`, so App Store 1.0 builds that predate this field would erase it on their next push. No old client reads or writes `lang-known`.
- `LangStore.known` loads from that branch on sign-in through `syncAfterSignIn` and pushes on change through the same queued, single-flight path as systems, held per account through sign-out like other unsynced work.
- Merge rule: the document with the larger `at` wins. `LangStore.isBlank` treats `lang-known` with no codes as blank, so the client 409 rule refuses an empty write over a stored list. The server weight guard counts 0 for this branch and gives it no protection; the client rule and the fact that only new builds write the branch carry it.
- Existing users have no `lang-known` row. They see the question once, as a sheet on the next launch after the update, with the root of their newest set preselected, and can dismiss it with "Later".
- `Lang.codes` includes la, grc, sa and ang. The speak step lists every other code; classical languages stay learnable targets.
- Settings: the `LanguageSections` single picker becomes "Languages I speak" opening the same chip grid, so the answer can change later.

## Measurement

One `BetaEvent` named `known_languages_set` with props `count`, `codes`, a comma-joined list of at most 8 codes, and `source`, one of `onboarding`, `settings` or `update_sheet`, sent once on completing the step and again when Settings changes it. The ingest at `src/app/api/beta/events` accepts only the names in `BETA_EVENT_NAMES` in `src/lib/beta/events.ts`, so step 0 adds `known_languages_set` there with a handler test, in its own web PR that merges first. Codes are language tags, which pass the banned-key rules. The event also goes into `STRICT_PROPS` with validation: `count` an integer from 1 to 40, `codes` matching `^[a-z]{2,3}(,[a-z]{2,3}){0,7}$`, `source` from the three values. The ideal-customer share counts learners: take each tester's latest `known_languages_set` event, then the share with `count` of 2 or more. Guests queue the event like other beta events and send it when they sign in; a guest who never signs in is not counted.

## Tests

- `KnownLanguagesTests` in BucketKit: unknown codes dropped, duplicates dropped, classical codes excluded from the speak list, base defaults, base when the device language is not picked, merge by `at`.
- `LangStoreKnownTests` with the stub transport: two devices write in turn and the later `at` wins; an empty list is refused over a stored one; a `lang-systems` push from a client without the field leaves `lang-known` untouched; sign-out holds an unsynced change for the same account.
- Handler test for `known_languages_set` in `src/app/api/beta/events`: valid props accepted, bad `codes` and `source` refused.
- `OnboardingFlowTests` UI test: pick Spanish and English, choose Spanish as base, see Spanish missing from targets, finish, and find a set with root `es`.
- Snapshot of the step on the smallest supported iPhone at the largest non-accessibility text size, through `FitPage`.

## Parity

The web onboarding in `polingual/` and Android get the same step in their own beads, filed with this PR, because the design system requires web-to-app parity.

## Out of Scope

Proficiency levels per language, placement tests for known languages and the lexicon map itself.

## Steps

0. Web: allow `known_languages_set` in `BETA_EVENT_NAMES`, with a handler test. The `bucket.beta_events` name check lists event names, so migration `20261116000000_beta_events_known_languages_set.sql` ships on the same branch, `feat/beta-known-languages-event`, and is applied to the hosted database before the ingest change reaches `main`.
1. BucketKit `KnownLanguages` with tests.
2. `LangStore.known` on the `lang-known` branch with load, push and merge, tests with the stub transport.
3. Onboarding `speak` step and target filtering, UI test.
4. Settings entry and the one-time sheet for existing users.
5. Event, then a TestFlight build with What to Test notes.

Each step is one commit on `feat/apple-known-languages`, one PR into `dev`, reviewed by the charizard orchestrator before merge.
