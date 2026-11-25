# Comprehensible Input in the Learning System

Epic bkt-s1g2h.

Input is not wired into the learning system yet. Watch (`play/video`, 3 Spanish A2 videos with cue-level text in 7 languages) and Listen (`lib/listen/radio.ts`, live radio) never write to FSRS state. The study session (`Session.tsx` → `useLangSession`) and `SessionMix` on Kotlin and Swift schedule only word, phrase and `sent:` cards. Review history is split by platform. The web shared memory keeps a per-review log (`LangMemory.log` of `LangRow`), but only behind `NEXT_PUBLIC_POLINGUAL_SHARED_MEMORY`. The apps sync card snapshots and daily counts only (`StudySync.merge`).

## 1. Learner model

Per language L, `known(L, lemma)` gives a probability:

- **Studied word:** the FSRS card's retrievability R(t, S) at today. If R is at least 0.9, the word counts as known.
- **Tapped word:** a tap within the last 7 days sets the word to unknown, whatever the card says.
- **Exposed word:** the probability of knowing it rises with the number of times met, as `1 − exp(−λ·n)`. λ is fitted from the exposure and review rows (§7). Until about 1,000 learners have logged data, λ = 0 and exposure counts for nothing. The literature bounds the rate only: gains are slow and depend on encounter count (uchihara-2019, r .34; webb-2007).
- **Unseen word:** a prior from frequency rank (bkt-08oii) and the placement tier.

`knownCount(L)` is the sum of these probabilities.

**Cognate-adjusted coverage** for a polyglot: tokens that are unknown in L but have a cognate in a held language at R of at least 0.9 count as partly known, weight 0.5. This takes Wiktionary links now and bkt-6ge9k data later, with the form predicate from similarity-systems. The cognate-coverage paper shows the gain is large: the best single held language covers 0.26 of target tokens on average. Cognates feed coverage; recall scheduling gets only the small half-life factor in point 5.

## 2. Input as a typed unit

`InputItem { id, lang, kind: sentence|passage|audio|video_segment, lemmas: string[], tokens: {surface, lemma}[], text, translation?, audioUrl?, media?: {videoId, start, end}, cefr?, source, license }`

- A video segment is one cue span from `public/videos/*.json`.
- A sentence comes from Tatoeba (`apple/scripts/translate/tatoeba_sets.py`), and later from graded sentences (bkt-opcrr).
- Lemmas are computed at build time and shipped as one JSON bundle per language, so all three clients read the same file.
- An input unit is one item of 40 or more tokens, or a group of items totalling 40 or more: a video episode of consecutive cues, a passage, or a set of 4 to 6 Tatoeba sentences that share target lemmas (narrow reading, kang-2015). A single short sentence is never scored alone.

## 3. Selection

`coverage(U) = Σ known(token) / |U|` over a unit U, using cognate-adjusted values.

- **Eligible:** text between 0.95 and 0.98, audio and video at 0.90 or more, with 1 to 3 target lemmas; at 0.95 that allows 2 new words in a 40-token unit and 3 in a 60-token unit (hu-2000, schmitt-2011, vanzeeland-2013). Unknown non-target words get a gloss before playback and then count as known. Glossing is the normal path for short Tatoeba sets until graded sentences (bkt-opcrr) arrive.
- **New words:** 1 to 3 target lemmas with known below 0.5.

Score each eligible item by:

- due cards it reuses (input serves as review context),
- a frequency rank bonus for the new words,
- recent repeats (penalty),
- topic or episode continuity (narrow reading, kang-2015).

If no item qualifies, fall back to the item with the highest coverage and gloss its unknown words before showing it.

## 4. Session mix

Input items enter the same queue as `QueueEntry` with `stage: Input`. The share is counted in seconds of session time.

`inputShare = min(target(level), eligibleSeconds / sessionSeconds)`. The target comes from the placement tier: 70% up to A2, 60% past A2, with output and explicit cards rising after A2. As learning brings more units into the band the share rises on its own, and it falls to zero when nothing qualifies. This follows the coverage threshold (hu-2000; laufer-1989-coverage) and puts PATH-MODEL step 9 into practice. Step 9 is grade C; its 70:30 split is the starting point §9 tests.

This sits beside `soundShare` as `inputShare(known)` in `SessionMix`, and keeps the `alternate` and `CHECK_GAP` rules. A new target word from an input item becomes a card: the sentence is shown first, then the card comes 3 or more items later in the same session.

## 5. Evidence update

**Exposure without a tap.** An exposure is a typed row `{kind: exposure, card, at, item, tapped: false}` in the review log, and card state is always replayed from the log. On replay the update keeps the `fireCredits` guards: it skips new cards and cards with R below FIRE_MIN_RETRIEVABILITY (0.6); gain is `min(FIRE_MAX_STABILITY_GAIN 0.15, α·0.15)` with α fitted and 0 until data exists; `S' = S·(1+gain)`; due is the later of the old due and `lastReview + interval(S')`; at most once per card per day. `lastReview` stays the last graded review; studies read S_before and S_after from the rows, so past R estimates are never rewritten.

**Tap.** No change to stability. The card is introduced, or its due date is set to now and it is flagged unknown in the learner model. A tap tells us the learner did not know the word. It does not measure forgetting the way a lapse does.

**Cognate.** Multiply the initial half-life by 1.027 when a shared etymon is held at R ≥ 0.9 (retention-cognates, CI 1.023 to 1.031). Under the FSRS curve stability is proportional to half-life, so S₀ ← 1.027·S₀ applies the same ratio. The factor is a fixed prior: the paper finds it lengthens half-life and adds no recall prediction.

**Lean rules** (extending `lean/BucketMath/Fsrs.lean` and `Learning.Cognate`):

- E1: if R < 0.6 or the card is new, `exposure(S) = S`; otherwise `S ≤ exposure(S) ≤ 1.15·S`.
- E2: n exposure rows on one day replay to the same state as one row.
- E3: an exposure row with no taps gives due' ≥ due and lastReview' = lastReview. A tap overrides E3 and sets due to now.
- E4: a tap leaves S unchanged.
- E5: replay gives the same state for any order of rows with equal timestamps.
- C1: coverage lies in [0,1] and never drops as known or held sets grow (extends `coverage_mono`).
- C2: any selected unit has |U| ≥ 40, glossed coverage in the band, and k unglossed new words with 1 ≤ k ≤ 3 and k ≤ 0.05·|U|.
- M1: the realized input share stays within ±1 item of the target.

## 6. Progress metric

Two numbers per language: **input hours** (the sum of watched or read seconds on items at 90% or more coverage) and **known words** (`knownCount`). Home shows both beside the streak. A session with at least 5 minutes of input counts toward the streak.

## 7. Event logging

The review log gains a typed union `review | exposure | session`, the default on every platform:

- `review {card, rating, elapsedDays, S_before, S_after, D}`
- `exposure {item, unit, lemmas_seen, taps: lemma[], seconds, coverage_pred, completed}`; taps ride in the exposure row, with no event per tap
- `session {id, started, ended, share_target, share_real, arm, units, cards}`
- `session_mix {share_target, share_real, arm}`

Every write passes the `events-server` gates; on `under_age` or `no_consent` nothing uploads and the local log runs replay-only. `events.ts` validates fields with `parseProps` (lemmas ≤ 200, seconds ≤ 3,600). Daily caps: `exposure` 300, `session_mix` 60. Golden replay vectors, log to card state, run in TS, Kotlin and Swift CI.

## 8. Parity

**Shared engine:** the item schema, lemma bundles, the coverage function, selection, `inputShare`, the exposure update and the event schema. Write each once in TS as the spec. Port to Kotlin `SessionMix`/`Study` and Swift `SessionMix`, and check all three against the same golden vectors (the pattern `FsrsVectors.lean` already uses).

**Per platform:** the players (YouTube iframe on web, native players in the apps), the tap UI and the audio session.

## 9. Preregistered experiment

- **Design:** arms with input share 50/70/90 among learners whose eligible input can fill the target share. Assign by user hash, stratified by placement tier. Write PREREG.md before launch.
- **Primary outcome:** known words at day 28, measured by a held-out yes/no test with pseudowords.
- **Secondary outcomes:** input hours, day-28 retention, lapse rate.
- **Power:** two primary comparisons, 50 vs 70 and 90 vs 70, Holm-corrected at α 0.05. At d = 0.3 and power 0.8 that is about 211 per arm; with 40% loss by day 28, enrol 352 per arm, about 1,060 in total. Intention to treat, with multiple imputation as a sensitivity check.
- **Second study:** α (exposure weight) at 0 vs 0.1, scored by log-loss of the next card review.

## 10. Beads, in order

| # | Bead | Size | Depends | Ships on today's content |
|---|---|---|---|---|
| 1 | Review log default-on, plus input and tap events, on web, iOS and Android | M | none | Yes |
| 2 | InputItem schema and lemma bundle builder (Tatoeba sentences, cues from the 3 videos) | M | none | Yes |
| 3 | Learner model `known` and `knownCount` from FSRS, taps and exposures | M | 1 | Yes |
| 4 | Coverage selector with i+1 and golden vectors | M | 2, 3 | Yes (sentences) |
| 5 | Exposure and tap rows, replay, E1 to E5 in Lean | M | 1, 3 | Yes |
| 6 | Input stage on web: sentence-set and video-episode units, word tap | L | 4, 5 | Yes |
| 7 | `inputShare` in SessionMix (TS, Kotlin, Swift), tap UI spec, golden vectors, M1 proof | M | 6 | Yes |
| 8 | iOS and Android input stage with tap UI | L | 6, 7 | Yes |
| 9 | Input hours and known words on Home and streak | S | 1, 3 | Yes |
| 10 | Cognate-adjusted coverage and C1 proof | M | 4, bkt-6ge9k | Partly (Wiktionary) |
| 11 | Frequency priors for unseen words | S | bkt-08oii | No |
| 12 | Graded sentences in the selector | S | bkt-opcrr | No |
| 13 | Listen: map radio time to input hours only (no lemmas); add captioned audio clips | M | 2 | Clips no |
| 14 | 50/70/90 experiment PREREG and launch | M | 1, 7, 8 | After parity |

Beads 1 to 6 make the first release: Tatoeba sentences and the 3 videos as input cards inside the session, on the web first. Three videos are too few for the 95% coverage band to choose among, so the video arm is a demo until more licensed videos arrive.
