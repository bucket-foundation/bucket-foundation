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
