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
