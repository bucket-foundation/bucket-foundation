# D8 Word Tiles In The Native Study Screens

Plan for bringing the D8 word tile and flag tile into the language study screens of the Bucket and Polingual iOS apps. Source of truth: `brand/_directions/pages/d8/` on PR #966, mainly `deck.html`, `tiles.css` and `tiles.js`. Nothing in this plan is built yet.

## Problem

On a language card the learner can lose track of the language they are in. The founder tapped "Got it" on a new word without knowing whether it was French or Spanish. The current header is a small green line of caps, and the prompt repeats the language name in text ("Spanish for seven").

## Founder Intent

- One flag tile names the target language. "English → Spanish" sits outside the tile as plain text.
- Only the answer choices look like buttons. Headers and tiles never do.
- No repeated language names on one card.
- Early on, the flag teaches which language it stands for, so the flag becomes knowledge the learner carries.
- Same treatment in Bucket and Polingual, which share these screens.

## What D8 Specifies

- Word tile, "the hero of every screen": square, 14 px corners, flag fill visible as a full border around a parchment panel inset 12 px at 80 percent, glaze from two inset shadows and a white highlight ellipse, a 6 px lip in ink at 30 percent, alternating tilt of minus 2 and plus 1.5 degrees. Inside: language name top left in Space Mono caps 13, the word in its own script in Nunito 800, a speaker to the right of the word at 55 percent opacity that turns vermilion while playing, IPA centered at the bottom in Noto Sans 17. Tap to hear. A tile flips on the Y axis to a new language.
- Flag tile: same glazed square, full flag, no words, used to pick a language.
- Buttons: flat, 12 px corners, a 4 px darker lip, no outlines, no pills. Primary vermilion `#D9381E` with lip `#8E2312`; secondary white with a `#E3D6B8` lip.
- Type: Fredoka 700 display, Nunito body, Space Mono labels, Noto for non-Latin scripts. All four are OFL.
- Flags reach full strength only on flag tiles and tile borders. Words always in their own script, always with IPA.

## Proposed Card Layout

```
┌──────┐
│ 🇪🇸   │  English → Spanish        <- small flag tile, text outside it
└──────┘
  ┌───────────────────┐
  │ ENGLISH           │            <- word tile: the prompt word,
  │     seven  🔊     │               flag border of the prompt language
  │     /ˈsɛvən/      │
  └───────────────────┘
  [ siete ] [ ocho ] [ seis ] [ cinco ]   <- the only buttons, D8 secondary style
```

- The small flag tile holds the target language. It is the one place the target language is named, beside "English → Spanish".
- The word tile shows the prompt word with the prompt language's flag border. On a reverse card the roles swap.
- New-word cards: the word tile shows the new word in the target language, speaker and IPA inside it. "Got it" is a D8 primary button. Tapping the tile flips it through the same word in the learner's other target languages, and the card's own language never repeats.
- Prompts show the word alone: "seven".
- The flag tile bounces once when the language changes from the previous card.

## Flags

- Drawn natively from the stripe and emblem table in `tiles.js`, ported to Swift as data: stripes as gradients, emblems as the same glyphs (★, ☸, ✡, ✚, ◆, ☾, ●, ☯). No emoji, so the simulator and every iOS version draw the same flag.
- `tiles.js` covers 18 languages. The app teaches 29. Flags still needed: Dutch, Swedish, Polish, Finnish, Czech, Indonesian, Tamil. Latin, Ancient Greek, Sanskrit and Old English have no country: they get a pigment tile from the D8 palette (Tyrian purple, lapis, ochre, malachite) with a script glyph, per the deck's "credit every cultural source".
- D8 maps Portuguese to Brazil and Arabic to Egypt. The apps speak pt-PT and ar-SA voices today. One of the two moves; see Founder Questions.

## IPA And Readings

Measured on the live corpus, 326 items: IPA on every item for 22 languages. Japanese and Chinese carry kana and pinyin only, so the tile shows the reading where IPA would go. Thai, Sanskrit and Old English carry nothing; their tiles leave the line empty. The readings toggle in the session keeps hiding the line.

## Scope

In: the word tile and flag tile components, the language exercise header and prompt, the new-word card, answer buttons in language exercises, the language chips and root picker on Language systems, the placement screen.

Out: science cards (Bucket ink and gold, #927), Today and Learn lists, the streak ℧, collage and confetti, colors outside the tiles and buttons, the Polingual first screen (founder kept the original), the web app.

## Build Steps

1. `D8Flag` table in BucketKit: every `Lang.codes` entry maps to stripes plus an optional emblem, or to a pigment tile. Unit test: no language is missing.
2. Bundle Fredoka, Nunito, Space Mono and Noto Sans subsets under OFL with their licenses; register through Info.plist `UIAppFonts` in both targets.
3. `WordTile` and `FlagTile` SwiftUI views matching `tiles.css`; Reduce Motion removes tilt, bounce and flip.
4. Exercise header, prompts, new-word card and option buttons switch to the layout above.
5. Language chips and placement adopt flag tiles.
6. Device screenshots of every exercise kind in an English to French, Spanish, Italian system and an English to Japanese, Arabic system, light and dark, checked by eye before any claim.

## Tests

- Flag table coverage across all 29 languages.
- Reading fallback order: IPA, then kana, then roman, then nothing.
- The new-word flip never shows the card's own language.
- Contrast: ink on the 80 percent parchment panel over the brightest and darkest flags meets 4.5 to 1.
- VoiceOver reads "Spanish, siete, IPA ˈsjete" on a word tile and "Spanish" on a flag tile.
- Existing parity, store and reminder suites stay green.

## Rollout

Branch `feat/apple-d8-word-tiles` off dev, stacked PRs per step, TestFlight internal build, founder review on the founder's iPhone before merge. Polingual ships it in 1.0.1, Bucket in 2.1. Rollback is a revert of the stacked PRs; no data or schema changes.

## Risks

- Long words and right-to-left scripts inside a square: the `.long` rule from `tiles.css` shrinks text above 7 characters; Arabic and Hebrew lay out right to left inside the panel.
- One flag per language is a political choice for English, Spanish, Portuguese and Arabic. D8 already chose; the plan follows D8 and records the choice in the flag table.
- Bundled fonts add about 1 MB per app.
- The D8 brand is still on an open PR (#966). The plan builds against its current files and re-checks them before step 3.

## Founder Questions

1. Is the proposed card layout the intent: small flag tile for the target language with "English → Spanish" beside it, and the prompt word in a word tile?
2. Portuguese and Arabic: keep the D8 flags (Brazil, Egypt) and switch the voices to pt-BR and ar-EG, or keep the voices and use Portugal and Saudi Arabia?
3. Should Bucket's language screens wear D8 too, or only Polingual?

## Work Tracking

No bead yet: `bd` finds no database on this Mac. File one on the charizard machine with `source-founder`, linked to this plan.
