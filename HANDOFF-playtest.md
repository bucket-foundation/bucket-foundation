# Handoff: Polingual Playtest

Branch `feat/polingual-playtest`, worktree `/home/gian/agfarms/.wt-playtest`. Beads: bkt-ukl7j.10, bkt-toqs9, then epic bkt-9gvte.

## Flags

`POLINGUAL_LOBBY_SETUP=on` turns on game sets, random mix, mixed-language choices and the hosted auto-start countdown. It needs migration `20261113000000_polingual_lobby_setup.sql`. `POLINGUAL_LOBBY_REVEAL=on` turns on the reveal gap.

## Done

- Server: mixed-language choices (`mixedPrompts`), setup single, sequence, mix (`normalizeSetup`, `nextGame`), standing slots `set-romance` and `mix-world`, auto-start 15 s after two ready (`pace`), `nextStartAt` for every lobby, slower tiles with eased ramp, lives count from the joined round.

## Next

- Client done: mixed tiles, verdict banner, countdown, setup picker, sign-in sheet and CTA states, ad rules (breaks.ts), rewarded continue route `/continue`. Hosted setup lobbies loop: `againHosted` resets after results.
- Dev pair verified at 390 and 1440 with `scripts/playtest-lobby.mjs` (SETUP=mix|single GAME=tiles W=390). Next: critic, merge into dev.
- Part 2: Flag Duel, Polyword.

## Flag Duel

Bead bkt-9gvte.1, branch `feat/polingual-flag-duel`. Flag `POLINGUAL_LOBBY_DUEL=on`, migration `20261113100000_polingual_flag_duel.sql`. Game `duel`: even rounds name the language, odd rounds pick the meaning; coins from right answers buy double points or 50/50 for the next round (`/lobbies/power`). Standing slot `duel-world`. Tests `scripts/test-academy-lobby-duel.ts`. Polyword is built on the Mac; skip it. Next game here: Flag Tiles.

## Flag Tiles

Bead bkt-9gvte.2, branch `feat/polingual-flag-tiles`. Solo daily run at `/play/flag-tiles`, deck from `GET /api/academy/flag-tiles` (`src/lib/academy/flag-tiles.ts`), run logic in `polingual/src/lib/lobby/flag-run.ts`. No migration, no flag. Playtest: `scripts/playtest-flag-tiles.mjs`. Next game: Forehead.

## Forehead

Bead bkt-9gvte.3, branch `feat/polingual-forehead`. One-phone party mode at `/play/forehead`, deck from `GET /api/academy/forehead?langs=&seed=` (`src/lib/academy/forehead.ts`), tilt via `devicemotion` z in `polingual/src/lib/lobby/tilt.ts` with buttons as fallback. No bots by design. Playtest: `scripts/playtest-forehead.mjs`. Next game: Voice Atlas.

## Voice Atlas

Bead bkt-9gvte.4, branch `feat/polingual-voice-atlas`. Daily five rounds at `/play/voice-atlas`, rounds from `GET /api/academy/voice-atlas` (`src/lib/academy/voice-atlas.ts`), map from the `world-atlas` package decoded in `polingual/src/lib/lobby/world.ts`, browser speech for the voice, passport in localStorage. Playtest: `scripts/playtest-voice-atlas.mjs`. Next game: Babel Match.

## Babel Match

Bead bkt-9gvte.5, branch `feat/polingual-babel-match`. Match-3 at `/play/babel-match`, meanings from `GET /api/academy/babel?langs=&level=` (`src/lib/academy/babel.ts`), board engine in `polingual/src/lib/lobby/babel.ts`. Solo puzzle with no bots. Rewarded five moves, interstitial between levels from level ten. Playtest: `scripts/playtest-babel.mjs`. Next game: Shift.

## Shift

Bead bkt-9gvte.6, branch `feat/polingual-shift`. Daily letter board at `/play/shift`, board from `GET /api/academy/shift` (`src/lib/academy/shift.ts`), play helpers in `polingual/src/lib/lobby/shift-play.ts`. Solo puzzle, no bots. Hint reveals a letter for a rewarded ad; the ad step is a placeholder stub until bkt-9s3fi lands. Playtest: `scripts/playtest-shift.mjs`. Next game: Word Snake.

## Word Snake

Bead bkt-9gvte.7, branch `feat/polingual-word-snake`. Canvas arena at `/play/word-snake`, deck from `GET /api/academy/word-snake?langs=&seed=` (`src/lib/academy/word-snake.ts`), engine in `polingual/src/lib/lobby/snake.ts`. Four bot snakes run in the browser; a realtime multiplayer server waits on Flag Duel traffic. Interstitial on death and game end capped at one per three minutes, rewarded respawn is a placeholder stub until bkt-9s3fi. Playtest: `scripts/playtest-word-snake.mjs`. This closes the ranked list in the epic except Polyword, which the Mac builds.
