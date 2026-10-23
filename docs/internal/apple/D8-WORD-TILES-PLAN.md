# D8 Word Tiles In The Native Study Screens

Plan for bringing the D8 word tile and flag tile into the language study screens of the Bucket and Polingual iOS apps. Brand source: `brand/_directions/pages/d8/` on PR #966, mainly `deck.html`, `tiles.css`, `tiles.js` and `mobile.html`. Nothing in this plan is built yet. Round 3, after the critic reports on PR #968.

## Problem

On a language card the learner can lose track of the language they are in. The founder tapped "Got it" on a new word without knowing whether it was French or Spanish. The header today is a small green line of caps, and the language name repeats across the card: the header, the prompt ("Spanish for seven"), the answer placeholder and the hints.

## Founder Intent

- One flag tile names the target language. "English → Spanish" sits outside the tile as plain text.
- Only the answer choices look like buttons. Headers and tiles never do: no lip, no tilt, no press state on a tile inside a card.
- Each language is named once per card.
- The flag teaches which language it stands for, so the flag becomes knowledge the learner carries.
- Bucket's language section only. Polingual keeps today's screens; flags in Polingual come later.

## What D8 Specifies

- Word tile, "the hero of every screen" (`tiles.css` `.t`, `.tt`): square, 14 px corners, flag fill showing as a full border around a parchment panel inset 12 px at 80 percent, a glaze of three inset shadows plus a white highlight ellipse, a 6 px lip in ink at 30 percent, alternating tilt of minus 2 and plus 1.5 degrees. Inside: language label top left in Space Mono caps, the word in Nunito 800, a speaker right of the word at 55 percent opacity turning vermilion while playing, IPA at the bottom. Words longer than 3 characters take the smaller `.long` size. Tap to hear.
- Small tiles follow `mobile.html` `.grid .t`: 10 px corners, panel inset 7 px, label 8 px, IPA 10 px.
- Flag tile: the same glazed square with the full flag and no words, used to pick a language.
- Buttons: flat, 12 px corners, a 4 px darker lip, no pills. Primary vermilion `#D9381E` with lip `#8E2312`. Secondary white with a 2 px `#E3D6B8` keyline and a matching lip.
- Words in their own script, always with IPA. Flags at full strength only on flag tiles and tile borders.
- D8 defines no dark mode.

## Card Header

Every language card opens with the same row:

```
┌────┐
│ 🇪🇸 │  English → Spanish · translate · A1
└────┘
```

- A small flag tile for the target language: full flag, no words, no lip, no tilt, no tap target. It reads as an image.
- Beside it, one line of plain text: the direction, the exercise kind and the level. This line is the only place on the card where the two languages are named.
- Inside a card, the word tile drops its language label, its 6 px lip and its tilt, and keeps the flag border, the glaze and the parchment panel. The speaker icon is the only tap target on it. Standalone tiles in pickers keep the D8 label, lip and tilt.
- Same-language kinds (gender, conjugate, type-heard) show "Spanish · article · A1".

## Layout By Exercise Kind

| Kind | Body | Answers |
|---|---|---|
| intro | Word tile of the new word with speaker and IPA; the root word below in plain text | "Got it", D8 primary |
| choose, cognate | Prompt word in a word tile with the prompt language's flag border | Option buttons |
| cloze | The sentence with a gap in plain serif | Option buttons |
| reverse | Word tile of the target word with speaker and IPA | Option buttons |
| listen | Speaker tile: flag border, speaker in the panel, no word, no IPA until answered | Option buttons |
| type-heard | Speaker tile as in listen | Text field and Check |
| translate | Prompt word in a word tile | Text field and Check |
| speak | Prompt word in a word tile | Speak and "Type instead" |
| sentence, wordbank | Prompt sentence in plain serif | Option buttons or token buttons |
| gender, conjugate | Noun or verb in a word tile with IPA | Option buttons or text field |
| false-friend | Target word in a word tile | Option buttons |
| match | One flag tile per language in the set, its name printed under it while the flag is new; the words as option buttons; the learner assigns each word to a flag | Word buttons, flags as targets |

- Match is where flags teach: the learner places each word on its flag.
- A flag shows its language name underneath until the learner has matched that language correctly 3 times; after that the flag stands alone. Any miss on a nameless flag brings the name back.
- Grading keeps flag knowledge out of the word schedule. With the name shown, match grades as today through `gradeMatch`. With a nameless flag, a wrong assignment records a flag miss in a local per-language counter and gives that word card no rating from this match; a right assignment grades as today.
- Every single word sits in a word tile, as D8 asks of the hero. Sentences and gapped sentences stay in plain serif, since a square tile cannot hold a sentence. This is the one deviation from "the hero of every screen".
- Feedback after an answer keeps today's content: the answer, its reading, the family line and the false-friend note.

## Option Buttons

- D8 secondary style, one per row, full width, so phrases and sentences fit.
- Correct: malachite `#1E7A5A` fill with white text and a darker malachite lip. Wrong pick: vermilion keyline and strikethrough. Others fade to 55 percent.
- Pressed: the lip collapses 3 px.

## Repeated Names Removed

Each string below loses its language name, since the header carries it:

- Prompts: default, sentence and wordbank ("Spanish for seven" becomes "seven"), reverse ("What does this mean in English?" becomes "What does this mean?"), listen ("pick the English meaning" becomes "pick the meaning"), speak ("Say seven in Spanish" becomes "Say seven"), cognate ("Which Spanish word shares a root with English seven?" becomes "Which word shares a root with seven?").
- Answer field placeholder: "Answer in Spanish" becomes "Your answer".
- False-friend note and family line: they name other languages, which stays, and drop the card's own target language.
- Placement: the eyebrow and title keep "English to French" once; the prompt drops "French for".

## Flags

- Drawn natively from the stripe table in `tiles.js`, ported to Swift as data. Emblems as glyphs (★, ☸, ✡, ✚, ◆, ☾, ●, ☯). No emoji anywhere, so every iOS version and the simulator draw the same flag.
- Egypt's eagle is an emoji in `tiles.js`, and Egypt's tricolour without the eagle is Yemen's flag. If Arabic keeps the Egyptian flag, the eagle is a vector path from the public domain Wikimedia flag file, in gold `#C09300`.
- `tiles.js` covers 18 languages. Twelve more need a flag decision: English, Dutch, Swedish, Polish, Finnish, Czech, Indonesian and Tamil take their national flags. Latin, Ancient Greek, Sanskrit and Old English get pigment tiles from the D8 palette with a script glyph. English is a founder question.
- The app names Chinese "Mandarin"; D8 says "Chinese". The header follows the app's name.

## IPA And Readings

Measured on the live corpus, 326 items: 15 languages carry IPA on all 326, and 9 more on every item they carry. Japanese carries kana and romaji; Chinese carries pinyin. Thai, Sanskrit and Old English carry no reading, so their tiles leave the line empty. Fallback order: IPA, kana, roman, nothing. The readings toggle keeps hiding the line.

## Type And Color

- Bundle Nunito and Space Mono under OFL in the app targets' shared resources in `project.yml`, registered at launch with `CTFontManagerRegisterFontsForURL` from `Bundle.main`, which works on iOS and macOS and needs no Info.plist key. Fredoka is out of scope: no display text on these screens.
- Non-Latin scripts use the system fonts iOS ships (PingFang, Hiragino, Devanagari Sangam, Geeza, Arial Hebrew). No Noto bundle.
- Dark mode: tiles keep the parchment panel and ink text, a fixed tile like a printed card. The card around them follows the app's dark palette. Option buttons use a dark surface `#2A2620` with a `#4A443A` keyline.

## Scope

In: the card header, word tile, speaker tile and flag tile views, the layouts in the table, option buttons, the repeated-name removals, the language chips and root picker on Language systems, placement.

Out: science cards, Today and Learn lists, the streak ℧, collage, confetti, motion beyond the lip press, colors outside tiles and buttons, the Polingual first screen, the web app.

## Build Steps

1. `D8Flag` table in BucketKit: each `Lang.codes` entry maps to stripes plus an optional glyph emblem, or a pigment tile.
2. `CardText` in BucketKit: a pure function from an `Exercise` to the visible strings of the card. The header, prompt and placeholder views read from it.
3. Font registration and the `FlagTile`, `WordTile` and `SpeakerTile` views, matching `tiles.css` and `mobile.html`, with Reduce Motion removing tilt.
4. Card header and the per-kind layouts.
5. Option buttons and match with flag targets.
6. Language chips and placement.

Each step is one PR, stacked.

## Tests

In `BucketKitTests`:
- Every language in `Lang.codes` has a flag or pigment entry, and none uses an emoji.
- Reading fallback order on fixtures for Spanish, Japanese, Chinese and Thai.
- `CardText` names the target language exactly once per card, for all 15 kinds, across Spanish, Japanese and Arabic fixtures.
- Listen and type-heard expose no target word before the answer.
- Contrast: ink on the 80 percent parchment panel over the darkest and lightest flags reaches 4.5 to 1.

- Match grading: a wrong assignment on a nameless flag leaves the word card unrated and increments the flag miss count; with the name shown, grading equals `gradeMatch`.
- The name under a flag hides after the third correct match and returns after a miss.

On device, each step: screenshots of all 15 kinds on an iPhone 14 Pro and the smallest supported iPhone, light and dark, checked by eye before any claim. At the default text size each card fits one screen. At the largest accessibility size the pass rule is no clipped or truncated text, with the card scrolling vertically. VoiceOver reads "Spanish flag" on the flag tile and "siete, IPA ˈsjete" on a word tile.

## Rollout

Branch `feat/apple-d8-word-tiles`, rebased onto `feat/apple-today` once #953 and #954 settle, since StudyView and LanguagesHome change there. One stacked PR per build step, TestFlight internal, founder review on the founder's iPhone before merge. Polingual ships it in 1.0.1, Bucket in 2.1. Rollback is a revert of the stacked PRs; no data or schema changes.

## Risks

- One flag per language is a political choice for English, Spanish, Portuguese and Arabic. The flag table records each choice and its source.
- Right-to-left words inside the panel: Arabic and Hebrew lay out right to left within the tile.
- Long phrases inside a word tile: phrases render in plain serif with the speaker beside them; word tiles hold single words and short nouns.
- D8 is on open PR #966. Each step re-checks the D8 files before it starts.

## Founder Decisions

Taken on 2026-10-22 from the mockups in `d8-visuals/index.html`.

- Scope is Bucket's language section. Polingual stays as it is; the three-flag question waits for a later Polingual pass.
- The prompt is plain text with the small flag: "seven" over "in Spanish". The answers are D8 buttons.
- Picking presses the button in with a lapis keyline and wakes Check. Check stays grey until a pick.
- After Check each answer becomes a wide tile in its own language's flag: label top left, word and speaker, IPA below. The right answer gets a malachite ring and a ✓ badge, a wrong pick a vermilion ring and a ✕ badge. Every tile but the right one drops to 78 percent brightness.
- Translate options come from the learner's other languages (sette, siete, sept, sieben). The engine picks same-language distractors today, so this is an engine change with parity tests.
- Shared root shows the known cousins as small flag tiles with an empty tile for the asked language.
- Long words: over 7 letters the type steps down; a space or over 12 letters moves the word to the wide tile. No word breaks mid-word.

## Findings For Other Branches

Measured on the live decks at bucket.foundation/academy-app/corpus on 2026-10-22.

- LaTeX: 1,094 math segments render with raw commands, led by \tfrac (173), \circ (153), \vec (127), \hat (59) and \dfrac (45). `\pmod` renders as "±od" because `\pm` matches first.
- Markdown: 161 lesson paragraphs carry `$$` mid paragraph and 50 carry bullet lists; LessonText shows both as raw text.
- Long answers: biophysics has 73 quiz answers over 400 characters, the longest 1,184, written in ASCII math ("H-hat", "lambda").
- Science study keeps one question kind, recall then self-rating, restyled with D8 buttons and a pigment tile per branch.
- Today needs three counted groups: due now, new today, done.

## Work Tracking

Step 0, before any code: a bead filed on the charizard machine with the `source-founder` label, linked to this plan and PR #968. `bd` finds no database on this Mac, so the Mac session asks the charizard orchestrator to file it. The bead id goes into this plan and into every stacked PR body, and step 1 does not start until it exists.
