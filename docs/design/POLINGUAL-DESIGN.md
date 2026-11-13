# Polingual Design System

Every Polingual screen on web, iOS and Android is built from these rules. A screen that breaks one fails review.

## Source

The polingual.com homepage hero is the brand. Its artwork, colors and type are the only visual vocabulary. Never draw a generic icon, never pull an icon set, never invent a new sticker without adding it to the art library first.

| Layer | Web | iOS | Android |
|---|---|---|---|
| Tokens | `polingual/src/ui/tokens.json` (source), `tokens.css`, `tokens.ts` | `BucketKit` theme generated from `tokens.json` | `android/core` theme generated from `tokens.json` |
| Art | `polingual/src/ui/art` | `BucketKit` art shapes | `android/core` art vectors |
| Components | `polingual/src/ui` | `BucketKit` views | `android/core` composables |
| Reference | `/brand` | `/brand` | `/brand` |

A token, sticker or component exists on one platform only when it exists in the web source first. Change `tokens.json`, run `npm run tokens`, then regenerate the native themes.

## Color

Use tokens by name: `var(--pl-vermilion)` on web, `PL.vermilion` on iOS, `PL.Vermilion` on Android. A hex literal outside the token files fails review.

| Role | Token |
|---|---|
| Light ground | `paper`, with the dot grid |
| Dark ground | `tyrian`, with the star lattice |
| Text | `ink`, `ink-dim` on paper; `paper` on tyrian |
| Primary action | `vermilion` with `vermilion-deep` lip |
| Secondary action | `lapis` with `lapis-deep` lip |
| Success, correct | `malachite` |
| Reward, streak, coins | `ochre` |
| Accent, selection | `maya` |

One primary action per screen. Vermilion means "do this next".

## Type

Three families, used by role.

| Style | Family | Use |
|---|---|---|
| `hero`, `title`, `heading` | Fredoka | screen titles, section heads, numbers that matter |
| `word` | Fredoka | the word being learned, always the biggest thing on a word card |
| `body`, `small` | Nunito | sentences, buttons' supporting text |
| `label` | Space Mono, uppercase, tracked | language names, eyebrows, captions such as "ATHENS · 400 BC" |

Native scripts (Devanagari, Hangul, Han, Cyrillic, Hebrew, Arabic, Greek) render in the system font for that script at `word` size. Never shrink a script to fit; wrap or scale the card.

## Grounds

| Ground | When |
|---|---|
| Paper with dot grid | reading, Learn, Account, forms |
| Tyrian star lattice | Play, Listen, paywall, celebrations, TV |
| Diagonal cut, paper beside lattice | Home, onboarding, sign-in, any screen that bridges learning and play |
| Flag band | bottom edge of the page frame and of share cards |

Every screen sits on one of these. A blank white or flat cream screen fails review.

## Artwork

The hero pieces: pinwheel tile, ἑκατόν ticket, 百 seal, शतम् torn label, red egg, Kente strip, script fragments (СТО, 백, מאה), confetti dots, flame, flag tiles, plus the sticker objects in `objects.tsx`.

- Stickers are hand placed: each has a fixed position, rotation between -14° and 14°, and the hard drop shadow `6px 8px 0 rgba(0,0,0,.35)`.
- Stickers frame content and never cover text, inputs or tap targets. At phone width they move to the edges or shrink; they never stack over the content column.
- A screen with stickers uses three to seven of them. Empty states, errors and loading use one sticker with a line of copy.
- Paper pieces keep their material: perforated edges on tickets, torn edges on labels, the inner border on seals.
- New art is drawn in the same style (flat color, ink outline where the hero has one, no gradients except the tile gloss), added to `src/ui/art`, shown on `/brand`, then ported.

## Components

Build screens only from `@/ui`. A screen that styles its own button, card, input or tile fails review. If a piece is missing, add it to `src/ui`, show it on `/brand`, then use it.

| Component | Rule |
|---|---|
| `Button` | variants primary, secondary, accent, success, gold, ghost, quiet; sizes sm to xl; 3D lip that presses down 3px; minimum 44px tall |
| `Card` | paper card, 2px hairline, 20px radius, 4px lip; tones ink and tyrian on dark grounds |
| `FlagTile` | the word tile: flag stripes, mono language label, word, IPA, speaker, gloss, thick lower lip, slight tilt |
| `Pill`, `Badge`, `Tag` | filters, counts, states |
| `Field`, `Sheet`, `Tabs` | forms, bottom sheets, section switching |
| `Stage` | places stickers around content on a ground |
| `Avatar` | the layered avatar; no photos |
| `StreakFlame`, `FlagBand` | streak and frame |

Each component lives in one file, takes tokens only, and has a render test.

## Layout

- Phone first at 390 wide, then 1440 desktop and 1920 TV.
- Side gutter 16px on phone. Content column caps at 1120px on desktop.
- TV layouts use the `hero` and `word` styles at 1.5x and keep every control reachable from a phone controller.
- Spacing comes from the `space` scale only.

## Motion

- Press: 100ms, the button lip collapses.
- Pop: 220ms with the overshoot ease for a correct answer, a sticker landing, a reward.
- Settle: 420ms for screen transitions.
- Everything honors reduced motion: swap movement for a fade.

## UX Rules

- One job per screen and one primary button.
- The word is the hero of every Learn and Play moment: word, language, script, root, definition, audio.
- Every game reveals the word the way Learn does, between rounds and on results, never during a round.
- Play always offers a "Start learning" path: in the Play header and on every results screen.
- Games are free everywhere. Non-paying users see ads in the defined slots only. Paid users see no ads and get full Learn. In the apps, Home and Learn show as locked previews behind the paywall for non-paying users. Guests play with no account; an account saves progress.
- Errors say what happened and what to do next, in one sentence.
- Tap targets are at least 44 by 44. Text contrast meets WCAG AA on its ground.
- Copy follows the voice rules in `CLAUDE.md`.

## Parity

Polingual is one product. Every screen, game and feature built on the web ships in the iOS and Android apps, and every app feature has its web counterpart. A web merge that adds a user-facing feature files the matching `feat/apple-*` and Android beads in the same change.

## Review

Before merge, screenshot each touched screen at 390, 1440 and 1920 and place it beside the homepage hero. It passes when a stranger cannot tell where the homepage ends and the product begins. The critic in `docs/agents/BUCKET-CRITIC.md` checks these rules and the hex-literal test.
