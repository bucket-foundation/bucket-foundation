# Handoff: Polingual lobby bots and tiles

## Done

Bead bkt-ukl7j.8, bot players, is closed. It merged into `dev` at `37538f829f` and passed the critic in round 2 with 8.25.

- Server bots have names, flags and three skills (easy, medium, hard). They join, ready up, chat from fixed phrases, and answer through `submitAnswer` at a planned time. They read only the visible prompt plus the corpus.
- Six standing rooms loop with bots: daily, live and tiles. Humans join them mid-game. A host can fill seats with bots, and empty seats auto-fill after 8 s.
- Bots carry a "bot · skill" label. No stats or streak code reads lobby rows.
- A lazy tick runs on list and state reads, with an 800 ms lease per lobby. All of this sits behind `POLINGUAL_LOBBY_BOTS=on`, which is off by default.
- Migration `20261112100000_polingual_lobby_bots.sql`.
- Low findings are filed as beads bkt-dn5bx, bkt-i4dgv and bkt-iwirq.

## In Progress

Bead bkt-ukl7j.9 has its WIP commit on this branch. It has not been reviewed or merged.

Founder spec:
1. Piano tiles mode. A word shows at the top in one language. Tiles in many languages fall in lanes, and the player taps every tile that means the word before it passes. Rounds last a few seconds and speed ramps up. A combo multiplier applies, and a miss costs a life. It works with touch and keyboard at phone and desktop widths.
2. A full reveal after every round. Each word shows with its flag, full language name, the word, its romanization where it has one, and its definition.
3. CTAs. A persistent "Start learning" button on every game screen links to the paid learning flow at `/app?from=play`. Between rounds and on results, the screen shows "Next game: <name>" with a countdown, "Rematch" and "Play with bots".
4. Branding and feel. Use the Polingual logo, palette and type, with flags and icons everywhere. Add motion, sound cues with a mute toggle, score pops and streak flames. Leave no dead time between rounds.
5. Keep the existing modes working. Bots must play tiles too.

Ad rule from bead bkt-zapwl: games are free with ads for every non-paying user, signed in or not, and paid subscribers see no ads. On dev, `entitlementOf` and `showsAds` in `polingual/src/lib/lobby/ads.ts` already match this. Ads show for signed-out and free users, and stay hidden for subscribers and for "unknown" access.

Built so far:
- Server side for game `tiles`: `src/lib/academy/lobby-tiles.ts`, the tile answer path `tileAnswerDecision`, lives and combo, and reveal entries in `lobby-reveal.ts` and `lang-lookup.ts`. Bots play tiles through `botTileChoice`. Migration `20261112200000_polingual_tiles.sql` is applied locally only.
- Tests in `scripts/test-academy-lobby-tiles.ts`. 44 of 44 pass alongside the lobbies and bots suites.
- Client files: `Tiles.tsx`, `Reveal.tsx`, `sound.ts`, and Room changes for the toolbar, mute, streak, lives, score pop, reveal and results CTAs. Also the header "Start learning" button and new CSS.

## Left

- Run `cd polingual && npx tsc --noEmit -p .` and the polingual lobby tests. The first type check flagged `LobbyPrompt` missing from `client.ts`, now exported; rerun it.
- Add client tests for `streakOf`, `livesLeft`, `langFlag`, `laneTarget` and the sound mute storage.
- Run the dev pair (API 3100, web 3101 with `POLINGUAL_LOBBY_BOTS=on`), then play tiles in Playwright at 390 and 1440 widths. Check the reveal and the results CTAs.
- Put flags on the language lists in `Lobbies.tsx`.
- Run the critic per `docs/agents/BUCKET-CRITIC.md`, then merge into `dev` and push. Never push to `main`.
