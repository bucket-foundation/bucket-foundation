# Polingual Ideal State

Target date: November 2027. Written 2026-11-13. Epic: bkt-pp8hw. Design rules: `docs/design/POLINGUAL-DESIGN.md`. Play detail: `PLAY-IDEAL-STATE.md`. Founder question: what does the whole product look like when it is finished, and what is left.

## Product

Polingual teaches languages through their shared roots. A learner meets a word once and sees it across its sibling languages and scripts. Play is the free front door on every device, Learn is the paid core, and one illustrated world built from the homepage hero carries a person from the first game to the hundredth lesson.

## One World

- One source: `polingual/src/ui/tokens.json` and `src/ui/art` feed the web, BucketKit and Compose through generators with drift tests.
- Every screen sits on a ground (dot paper, star lattice, diagonal cut) with hand-placed hero stickers.
- Every component comes from the shared library and appears on `/brand`.
- A feature ships on web, iOS and Android in the same release.

## Surfaces at the Ideal State

| Surface | Ideal state |
|---|---|
| Home | The day in one screen: streak, today's session, today's daily games, friends online. The same layout on web, phone and tablet |
| Learn | Word cards led by a flag tile with word, script, IPA, root, cousins and audio. Sessions fit one screen with no scroll. Recorded native audio replaces TTS |
| Listen | Language radio with background audio, a now-playing ticket, and the word on screen for non-Latin scripts |
| Translate | One field, every language the learner studies, results as flag tiles that open their word cards |
| Play | 18 games as illustrated worlds, each revealing its words between rounds, each leading into Learn. Live lobbies by room code on web, apps and TV |
| Account | Name, username, avatar, passport of languages, plan, family, sign out. One identity across devices |
| Paywall | One screen, plans in local currency, three days free, games stay free. Web checkout beside the stores |
| Onboarding | Pick a language family in under a minute, placed by a short diagnostic, first word learned before any sign-up |
| /brand | The public reference for all of the above, with every asset downloadable |

## Business

Games are free everywhere. Every non-paying user sees ads (AdSense on web, AdMob in apps); paid users see none and get full Learn. In the apps, Home and Learn show as locked previews for non-paying users. Cosmetic purchases cover avatars. Guests play with no account; an account saves progress. Children's profiles see no third-party ads on any plan.

## Where It Stands

On dev as of 2026-11-13:

| Piece | State |
|---|---|
| Token contract, design rules, CLAUDE.md wiring | Done |
| /brand | Done: 11 sections, 83 art pieces as SVG and PNG, press kit script |
| Web product pass | Done for sign-in, Home, onboarding, Learn, paywall, Account, word pages, join, live |
| Web Play | 12 games as worlds with reveal and Start learning; TV layouts for lobby games |
| Android | Theme, art and components generated from the web; all main screens; Play tab; 9 web games ported; Duel and Tiles in live rooms |
| iOS | Theme, art and components in BucketKit and main screens restyled, on a branch |
| App daily games on web | Six games built, on a branch |

## What Is Left

Ranked by impact. Each row is a bead under bkt-pp8hw.

| Rank | Bead | Item | Why it ranks here |
|---|---|---|---|
| 1 | bkt-pp8hw.5 | iOS: merge the one-world port and ship a TestFlight build | iOS has the live users, and today they see the old look |
| 2 | bkt-pp8hw.8 | iOS: port the ten web games it lacks | Play is the free front door and iOS has two of twelve |
| 3 | bkt-pp8hw.9 | Web: merge the six app daily games into Play | Daily games drive the return visit |
| 4 | bkt-pp8hw.10 | Shared daily state: one play a day and one streak across web, iOS and Android under one sign-in | A daily game played on the phone should show done on the web |
| 5 | bkt-pp8hw.11 | Web Listen and Translate | Both exist only in the apps |
| 6 | bkt-pp8hw.12 | Android: Duel and Tiles rooms verified against a live lobby, release build to internal testing | Android has no testers yet |
| 7 | bkt-pp8hw.13 | Web checkout for plans | The web paywall can only send people to the app |
| 8 | bkt-pp8hw.14 | Recorded native audio for the first 500 words | TTS quality is the top beta complaint |
| 9 | bkt-pp8hw.15 | Founder decision: root and note in the reveal for free players | Sets how much of Learn the reveal gives away |
| 10 | bkt-pp8hw.16 | Account: avatar builder, passport, home flag on web and apps | Identity carries the social layer |
| 11 | bkt-pp8hw.17 | TV mode `/tv` with phones as controllers for every lobby game | The family and classroom use case |
| 12 | bkt-pp8hw.18 | Motion pass: press, pop, settle on every component, reduced motion checked | Most of the craft gap to Duolingo is motion |
| 13 | bkt-pp8hw.19 | Rewarded ad unit and Shift hint pricing | Hints are free on every platform today |
| 14 | bkt-pp8hw.20 | Visual regression suite: every screen at 390, 1440, 1920 compared on each merge | Keeps the world from drifting |
| 15 | bkt-pp8hw.21 | Small defects: Babel tile text size, reveal fact contrast, Tiles stage at the TV fold, study card gap, "cien" tile cut on TV Home, shared username rules module, brand PNG font fetch | Low severity, visible on close inspection |

## Risks

- The Mac holds 4 to 12 GB free, and iOS work stalls below 5 GB.
- Three platforms drift without the generator drift tests, so those tests stay in the merge gate.
- Children, classrooms and ads need legal review before the age gate ships (`PLAY-IDEAL-STATE.md`, Risks).
