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

The web hub lists twelve games (`polingual/src/app/(site)/play/GameHub.tsx`). Rules live in `android/polingual/src/main/kotlin/com/polingual/app/play`, ported from `src/lib/academy` and `polingual/src/lib/lobby` with the web seeds, so a day's deck matches the web on the same corpus. Each solo game has unit tests mirroring the web tests. Word data comes from `assets/play`, generated by `android/scripts/gen_polingual_ui.py`.

| Web game | Mode | Android | Gap |
|---|---|---|---|
| Polyword | solo daily | `PolywordScreen`, web bank and order | archive and rewarded unlock |
| Flag Tiles | solo daily | `FlagTilesScreen`, deck, fall speed, ghost board | rewarded continue |
| Babel Match | solo levels | `BabelScreen`, board rules, levels | rewarded extra moves |
| Shift | solo daily | `ShiftScreen`, board, clues, hints | rewarded hint gate; hints are free |
| Word Snake | solo arena | `SnakeScreen`, snake rules, bots | rewarded respawn |
| Voice Atlas | solo daily | `AtlasScreen`, rounds, map, scoring, ghosts | passport stamps, rewarded extra round |
| Forehead | party, one phone | `ForeheadScreen`, tilt rules, deck | none known |
| I Spy | solo vs bots | `ISpyScreen`, scenes, objects, bots | live room mode |
| Same Word | live lobby | Play hub opens a room with Same Word preset | round and results need a lobby server to capture |
| Flags | live lobby | live rooms | none known |
| Flag Duel | live lobby | absent from `nativeLobbyGames` | add `duel` to the lobby model |
| Tiles | live lobby | `LobbyGame.Tiles` exists, absent from `nativeLobbyGames` | add the falling-tile round UI |

Android has no rewarded ad unit, so every rewarded-ad step on the web is absent. Banners follow `Ads.shouldShow(access)` on every results screen. Android games with no web hub entry: Daily Set, Mini, Word Groups, Speed Match, Letter Sprint.
