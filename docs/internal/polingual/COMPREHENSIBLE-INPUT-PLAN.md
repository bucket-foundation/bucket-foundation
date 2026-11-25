# Comprehensible Input in the Learning System

Epic bkt-s1g2h.

Input is not wired into the learning system yet. Watch (`play/video`, 3 Spanish A2 videos with cue-level text in 7 languages) and Listen (`lib/listen/radio.ts`, live radio) never write to FSRS state. The study session (`Session.tsx` → `useLangSession`) and `SessionMix` on Kotlin and Swift schedule only word, phrase and `sent:` cards. Review history is split by platform. The web shared memory keeps a per-review log (`LangMemory.log` of `LangRow`), but only behind `NEXT_PUBLIC_POLINGUAL_SHARED_MEMORY`. The apps sync card snapshots and daily counts only (`StudySync.merge`).

## 1. Learner model

Per language L, `known(L, lemma)` gives a probability:

- **Studied word:** the FSRS card's retrievability R(t, S) at today. If R is at least 0.9, the word counts as known.
- **Tapped word:** a tap within the last 7 days sets the word to unknown, whatever the card says.
- **Exposed word:** each meeting in input adds evidence. Words met 8 or more times count as known at 0.5 (waring-2003; uchihara-2019, r .34).
- **Unseen word:** a prior from frequency rank (bkt-08oii) and the placement tier.

`knownCount(L)` is the sum of these probabilities.

**Cognate-adjusted coverage** for a polyglot: tokens that are unknown in L but have a cognate in a held language at R of at least 0.9 count as partly known, weight 0.5. This takes Wiktionary links now and bkt-6ge9k data later, with the form predicate from similarity-systems. The cognate-coverage paper shows the gain is large: the best single held language covers 0.26 of target tokens on average. Cognates feed coverage; recall scheduling gets only the small half-life factor in point 5.

## 2. Input as a typed unit

`InputItem { id, lang, kind: sentence|passage|audio|video_segment, lemmas: string[], tokens: {surface, lemma}[], text, translation?, audioUrl?, media?: {videoId, start, end}, cefr?, source, license }`

- A video segment is one cue span from `public/videos/*.json`.
- A sentence comes from Tatoeba (`apple/scripts/translate/tatoeba_sets.py`), and later from graded sentences (bkt-opcrr).
- Lemmas are computed at build time and shipped as one JSON bundle per language, so all three clients read the same file.

## 3. Selection

`coverage(item) = Σ known(token) / tokens`, using cognate-adjusted values.

- **Eligible:** text coverage between 0.95 and 0.98, audio and video at 0.90 or more (hu-2000, schmitt-2011, vanzeeland-2013).
- **New words:** 1 to 3 target lemmas with known below 0.5.

Score each eligible item by:

- due cards it reuses (input serves as review context),
- a frequency rank bonus for the new words,
- recent repeats (penalty),
- topic or episode continuity (narrow reading, kang-2015).

If no item qualifies, fall back to the item with the highest coverage and gloss its unknown words before showing it.

## 4. Session mix

Input items enter the same queue as `QueueEntry` with `stage: Input`. The share is counted in seconds of session time.

| Level (from knownCount) | Input share | Rule |
|---|---|---|
| Below 300 words | 30% | Cards first, because coverage can't reach 95% |
| 300 to A2 (about 2,000) | 70% | PATH-MODEL step 9 starting point |
| Past A2 | 60%, with output and explicit cards rising | Step 9: "rising output after A2" |

This sits beside `soundShare` as `inputShare(known)` in `SessionMix`, and keeps the `alternate` and `CHECK_GAP` rules. A new target word from an input item becomes a card: the sentence is shown first, then the card comes 3 or more items later in the same session.

## 5. Evidence update

**Exposure without a tap.** If the word has a started card that has not been reviewed today, take the Good-review stability S_g and set `S' = S + α(S_g − S)` with α = 0.1. The due date never moves earlier. Credit is capped at once per card per day. This reuses the `firedCredit` field and the existing `fireCredits` pattern in `adaptive.js`. The weight is small because incidental gains are slow and need about 10 encounters (webb-2007, waring-2003), while intentional study gains more (webb-2020).

**Tap.** No change to stability. The card is introduced, or its due date is set to now and it is flagged unknown in the learner model. A tap tells us the learner did not know the word. It does not measure forgetting the way a lapse does.

**Cognate.** Initial stability × 1.027 when a shared etymon is held (retention-cognates, CI 1.023 to 1.031). Nothing more: the paper finds the feature adds no recall prediction.

**Lean rules** (extending `lean/BucketMath/Fsrs.lean` and `Learning.Cognate`):

- E1: `S ≤ exposure(S) ≤ S_good`.
- E2: n exposures in one day give the same S as one exposure.
- E3: exposure never makes a card due earlier.
- E4: a tap leaves S unchanged.
- C1: coverage lies in [0,1] and never drops as known or held sets grow (extends `coverage_mono`).
- C2: any selected item meets the coverage band and has 1 to 3 new words.
- M1: the realized input share stays within ±1 item of the target.

## 6. Progress metric

Two numbers per language: **input hours** (the sum of watched or read seconds on items at 90% or more coverage) and **known words** (`knownCount`). Home shows both beside the streak. A session with at least 5 minutes of input counts toward the streak.

## 7. Event logging

Make the review log the default on every platform, and add these events:

- `review {card, rating, elapsedDays, S_before, S_after, D, source: card|input}`
- `input_exposure {item, lemmas_seen, seconds, coverage_pred, completed}`
- `word_tap {item, lemma, known_pred}`
- `input_skip`
- `session_mix {share_target, share_real, arm}`

Each event carries a uuid, device id, timezone and `arm`. Add these names to `LEARN_EVENT_NAMES`, with daily caps.

## 8. Parity

**Shared engine:** the item schema, lemma bundles, the coverage function, selection, `inputShare`, the exposure update and the event schema. Write each once in TS as the spec. Port to Kotlin `SessionMix`/`Study` and Swift `SessionMix`, and check all three against the same golden vectors (the pattern `FsrsVectors.lean` already uses).

**Per platform:** the players (YouTube iframe on web, native players in the apps), the tap UI and the audio session.

## 9. Preregistered experiment

- **Design:** arms with input share 50/70/90 among learners past 300 known words. Assign by user hash, stratified by placement tier. Write PREREG.md before launch.
- **Primary outcome:** known words at day 28, measured by a held-out yes/no test with pseudowords.
- **Secondary outcomes:** input hours, day-28 retention, lapse rate.
- **Power:** at d = 0.3 this needs about 175 users per arm. Run it until each arm has that many.
- **Second study:** α (exposure weight) at 0 vs 0.1, scored by log-loss of the next card review.

## 10. Beads, in order

| # | Bead | Size | Depends | Ships on today's content |
|---|---|---|---|---|
| 1 | Review log default-on, plus input and tap events, on web, iOS and Android | M | none | Yes |
| 2 | InputItem schema and lemma bundle builder (Tatoeba sentences, cues from the 3 videos) | M | none | Yes |
| 3 | Learner model `known` and `knownCount` from FSRS, taps and exposures | M | 1 | Yes |
| 4 | Coverage selector with i+1 and golden vectors | M | 2, 3 | Yes (sentences) |
| 5 | Input stage in the session: sentence card and video-segment card, word tap on web | L | 4 | Yes |
| 6 | Exposure and tap update with E1 to E4 in Lean | M | 3 | Yes |
| 7 | `inputShare` by level in SessionMix (TS, Kotlin, Swift) and M1 proof | M | 5 | Yes |
| 8 | iOS and Android input stage parity | L | 5, 7 | Yes |
| 9 | Input hours and known words on Home and streak | S | 1, 3 | Yes |
| 10 | Cognate-adjusted coverage and C1 proof | M | 4, bkt-6ge9k | Partly (Wiktionary) |
| 11 | Frequency priors for unseen words | S | bkt-08oii | No |
| 12 | Graded sentences in the selector | S | bkt-opcrr | No |
| 13 | Listen: map radio time to input hours only (no lemmas); add captioned audio clips | M | 2 | Clips no |
| 14 | 50/70/90 experiment PREREG and launch | M | 1, 7, 8 | After parity |

Beads 1 to 5 make the first release: Tatoeba sentences and the 3 videos as input cards inside the session, on the web first. Three videos are too few for the 95% coverage band to choose among, so the video arm is a demo until more licensed videos arrive.
