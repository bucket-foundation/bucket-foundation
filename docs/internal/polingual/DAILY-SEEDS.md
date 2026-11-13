# Polingual Daily Seeds

Six games run once a day on polingual.com/play. The web code in `polingual/src/lib/daily` is the spec. Golden tests in `golden.test.ts` pin the values.

## Shared Rules

- RNG: xorshift64 (`<<13`, `>>7`, `<<17`); a zero seed becomes `0x9E3779B97F4A7C15`.
- Bounded draw: Lemire full-width multiply with rejection, the Swift `next(upperBound:)` algorithm.
- `shuffled`: Swift `MutableCollection.shuffle(using:)` order, front to back.
- `mixed`: back to front, `j = next() % (i + 1)`.
- Seed hash: FNV-1a 64 over the UTF-8 bytes of the seed string.
- Day key: local calendar date as `Y-M-D` with no zero padding, e.g. `2026-11-13`.
- `targets` are sorted before joining with `,`. String sorts compare UTF-16 code units.
- Letters are counted after NFC normalization.

## Inputs

- Signed in: the first language system (`root`, `targets`) from the account.
- Guest: root `en`, targets `es`, `fr`, `de`.
- Corpus: `apple/Shared/Corpus` (the same atoms the web loads from `/academy-app/corpus`).

## Matching The Apps Today

| Game | Seed string | Words |
|---|---|---|
| Daily Set | `{day}|{root}|{targets}` | `GameDeck` pools, 400 per language |
| Mini | `mini|{day}|{root}|{targets}` | starter words, 12 per language |
| Word Groups | `groups|{day}|{root}|{targets as a set}`; tile order `groups|...|{lang}:{itemId}` | starter words, 60 per language |

The apps build Mini and Word Groups from learned words once a learner has eight or more. The web uses starter words, which match a new account on the apps.

## Web Daily Seeds Pending In The Apps

The apps deal these three from the system RNG today. They adopt these seeds next; until then, a round on the web and a round in the apps differ.

| Game | Seed strings | Deal |
|---|---|---|
| Speed Match | deck `speed|{day}|{root}|{targets}`, board `speed-board|{day}` | 12 words per language from the first 200 of each pool, balanced; 15 pairs or 60 seconds |
| Which Voice | `voice|{day}|{root}|{targets}` | 6 words per language from the first 200, then `flags` with mode voice, 10 prompts |
| Letter Sprint | language `letters-lang|{day}` mod the sorted script languages; deal `letters|{day}|{lang}` | 8 letters from the alphabet unit, three foils with a different sound |

Letter Sprint picks a script language from the system targets; with none, it picks from every script language.

## Results

- Local key `polingual/daily/v1`; account branch `polingual-daily`, `data.results` keyed `{game}|{day}`.
- The first result per key wins every merge (`savedAt`, earliest first).
- Saving pulls, merges per key, pushes, then reads back to confirm, three tries.
