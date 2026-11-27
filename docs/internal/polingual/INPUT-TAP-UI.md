# Input Stage Tap UI

Spec for the iOS and Android input stage (CI 8, bkt-s1g2h). The web stage in `polingual/src/app/(site)/app/[system]/study/InputStage.tsx` and `InputPlay.tsx` is the reference. Engine pieces are shared: `planInputMix`, `inputShare`, `activeMs` in `SessionMix` and the selector in `InputSelector`, checked by `input-mix-vectors.json` and `selector-vectors.json`.

## Placement

- `SessionMix.planInputMix(tier, cards, eligibleUnitSeconds)` returns the card indices where an input unit runs. Show one unit before each listed card.
- Units with no eligible plan never appear. A unit counts as eligible only when `InputSelector.plan` says so.
- The session row carries `share_target` (target for the tier), `share_real` (logged input seconds over session seconds) and `units` (input units finished).

## Gloss Screen

- Title "Before you start".
- List new words first in vermilion, then glossed words, each with its corpus gloss. Words without a gloss collapse into one line: "N more words to tap while you read."
- One primary button, "Start".

## Reading Screen

- Each sentence is a row of word buttons, one per token. A tap toggles the word: ochre fill on, plain off. A long press shows the gloss.
- The translation is hidden. A "Show meaning" link under each sentence reveals it and sets `revealed` on that sentence's exposure row.
- A video unit shows a poster, "Play the clip", that loads the player only on tap, plus a text fallback: "No video? Read along below, or open it on YouTube."
- A fixed action bar above the tab bar holds "Done" (primary) and "Skip" (quiet). Both stay fully visible on the smallest phone.

## Logging

- One exposure row per sentence that was on screen at 60 percent or more. Taps ride in that row; there is no event per tap.
- Seconds count only while the app is in the foreground, the window has focus and, for video, the player is playing. Use `SessionMix.activeMs` semantics: one mark per change of visible, focused or playing.
- Skip writes no rows. Leaving the app mid-unit writes the rows seen so far with `completed` false.
- Rows go to the local review log and the session batch, never as separate requests.

## Sizes

- Word buttons at least 44 pt tall with 3 pt horizontal padding; sentence text 20 pt.
- Gloss rows 16 pt, new words 18 pt display face.
- Tokens, colors and radii come from `polingual/src/ui/tokens.json` through the generated themes.
