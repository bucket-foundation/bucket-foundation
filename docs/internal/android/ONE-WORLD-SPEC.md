# Polingual Android One World Spec

Beads `bkt-pp8hw.6` and `bkt-pp8hw.8`. Rules: `docs/design/POLINGUAL-DESIGN.md`. Every Android screen reads tokens, art and components from `android/core/ui/.../pl`, generated from the web source.

## Pipeline

| Layer | Web source | Android output | How |
|---|---|---|---|
| Tokens | `polingual/src/ui/tokens.json` | `pl/Tokens.kt`: `PL`, `PLRadius`, `PLSpace`, `PLLip`, `PLMotion`, `PLTypeSpecs` | `python3 android/scripts/gen_polingual_ui.py` |
| Art | `polingual/src/ui/art/data.ts` | `pl/ArtData.kt`, drawn by `pl/Art.kt` | same script: SVG bodies become path, group, clip, tile pattern and label nodes |
| Flags | `polingual/src/lib/flags.ts` | `pl/Flags.kt`, drawn by `FlagSwatch` | same script: CSS gradients become stripe, diagonal and disc layers |
| Launcher | Fredoka "Po" on vermilion | `polingual/src/main/res/mipmap-anydpi-v26`, `drawable/ic_launcher_*.xml` | same script |
| Fonts | `polingual/public/fonts/stoa` | `core/ui/src/main/res/font/pl_*.ttf` | same script, woff2 to ttf |
| Type | `tokens.json` type | `pl/Theme.kt`: `PLType`, `PLFonts`, `PLTheme` | hand written over the generated specs |

`TokensTest` in `core/ui` fails when a generated file drifts from its source (`--check`), when a color, scale, motion or type token differs from the JSON, or when an art piece fails to build.

## Components

| Web | Android | Notes |
|---|---|---|
| `Button` | `PLButton`, `PrimaryButton`, `PlainLink` | variants primary to quiet, sizes Sm to Xl, 4dp lip, 3dp press over `PLMotion.press` |
| `Card` | `PLCard`, `Card` | paper, plain, ink, tyrian tones, 2dp hairline, 20dp radius, lip |
| `Pill` | `PLPill` | active state in lapis |
| `Badge` | `PLBadge`, `Pill` | eight tones, mono label |
| `FlagTile` | `FlagTile`, `WordTile` | `FlagTile` is the language chip; `WordTile` is the word card with flag band, label, word, IPA, gloss, speaker, lip and tilt |
| `Stage` | `Stage`, `Sticker` | stickers keep rotation inside -14 to 14 degrees and the hard shadow; scale with width |
| grounds | `GroundBox(Ground.Paper, Lattice, Diagonal)`, `Modifier.dotPaper`, `Modifier.starLattice` | lattice tiles the `girih` art |
| `FlagBand`, `StreakFlame` | same names | band sits under every `Page` |
| empty state | `EmptyState` | one sticker and one line |

## Screens

| Screen | File | Ground | Art | Components |
|---|---|---|---|---|
| Today | `TodayScreen.kt`, `Extras.kt` | diagonal | ticket, seal, torn-label, script-ru; game art per tile | `StreakFlame`, `FlagTile`, ink card for the daily session, vermilion translate card, tyrian `GameTile` list, `AdBanner` |
| Learn | `LearnScreen.kt` | paper | torn-label, calligraphy-yong, pebble; kente empty state | `Card` per language set, `PLBadge` for Active, `PrimaryButton` lapis, `LockedPreview` for non-paying users |
| Listen | `ListenScreen.kt` | lattice | script-ko, seal, bunting | `PLPill` language row, ink now-playing card, paper station cards |
| Translate | `WordScreens.kt` | paper | calligraphy-ain, ticket, script-ru | text field, `PrimaryButton`, result cards |
| Account and sign-in | `AccountScreen.kt`, `Milestones.kt` | paper | azulejo, script-he, ink-dot | `SignInCard` with email code, nickname card, subscription and privacy cards |
| Paywall | `Paywall.kt` | lattice | ticket, seal, streak-flame, kente; pebble empty state | plan cards with ochre selection, one primary button, quiet links on dark |
| Onboarding | `Onboarding.kt` | diagonal | seal mark, stage of ticket, seal, torn-label, kente, pebble | `StreakFlame` card, `FlagTile` row, `PLPill` presets and languages |
| Play tab | `PlayScreen.kt`, `GamesHub.kt` | lattice | star, azulejo-grid, blocks, seal, pebble, azulejo, bunting, torn-label | `PLCard` tyrian tone with tilted art sticker |
| Games, lobby, study | `GameScreens.kt`, `LobbyScreens.kt`, `StudyScreen.kt`, `Reveal.kt` | lattice with a paper panel; study on paper | game art, seal, kente, bunting | `WordTile` prompt, `WordReveal` with word, language, script, root, definition and a Next button between rounds, Start learning on results |
| Tab bar | `Root.kt` | card | streak-flame, seal, blocks, azulejo for Today, Learn, Play, Account | `NavigationSuiteScaffold` in paper and card colors |

Billing, ads and entitlement code (`Billing.kt`, `Ads.kt`, `Entitlement.kt`) is unchanged.

## Open Gaps

| Gap | State |
|---|---|
| Back, play, pause and swap glyphs are drawn in the generator; the speaker comes from `src/app/tile.tsx` | move all five into `src/ui/art` on web |
| `OutlinedTextField` and `FilterChip` still come from Material in forms and the language picker | needs a `Field` component on web first, then the port |
| Art labels render in the system font for Noto families | add Noto subsets if the system font misses a glyph |
| `cs` flag drops its triangle, `en` and `el` lose their sized canton layer | extend the flag converter for sized layers |

## Play Games Gap

The web hub lists twelve games (`polingual/src/app/(site)/play/GameHub.tsx`). Android ships eight daily games of its own (`GameKind`), which match the iOS set.

| Web game | Mode | Android today | Gap |
|---|---|---|---|
| Flag Duel | live lobby | live rooms in `LobbyScreens.kt` | check the duel round matches web rules |
| Flag Tiles | solo daily | none | build: falling word, tap the flag |
| Voice Atlas | solo daily | Which Voice is close | build the map pin round |
| Word Snake | solo arena | none | build: arena with bot snakes |
| Forehead | party, one phone | none | build: tilt with the accelerometer |
| Babel Match | solo match-3 | none | build |
| Shift | solo daily | none | build: column slide board |
| Same Word | live lobby | Same Word solo | add the lobby mode |
| Flags | live lobby | Flags solo | add the lobby mode |
| Tiles | live lobby | none | build |
| I Spy | solo | none | build: camera round |
| Polyword | solo daily | none | build |

Android games with no web hub entry: Daily Set, Mini, Word Groups, Speed Match, Letter Sprint. Parity needs these on the web hub too, or the web set on Android; the founder picks the canonical twelve.
