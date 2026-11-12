# Polingual Lobbies Handoff

Moved from charizard to the Mac on 2026-11-12. Work in your own clone or worktree. Keep out of `~/code/bucket-foundation` and `~/Projects/bf-bgaudio`, which the launchd worker uses.

## Founder Scope

1. Live game lobbies: list, create, join by a 6-character code, chat, ready-up, host starts, synced rounds, scores.
2. The host picks any existing daily game or the live Kahoot-style mode.
3. The web app and the iOS app share one room code and play together.
4. Lobby play is free and carries ads. Web: slots between rounds and on the lobby and results screens. iOS: an AdMob interstitial between games and a banner in the lobby. Test IDs only; the founder supplies the accounts.
5. Guests play with a nickname and no account. An optional account saves streaks, stats, history and friends. Show a save-your-progress prompt after a game, and merge guest progress on sign-in.
6. Learning stays paid. Lessons and courses stay behind the subscription, and results screens upsell learning. Gate by feature, never by "log in to play".
7. Resume the open items from past sessions, listed below.

## Beads

Local bd in the bucket-foundation repo. The Polyglott Nucleus instance was down, so no `pol-` beads exist yet.

| Bead | Scope |
|---|---|
| bkt-ukl7j | Lobbies epic |
| bkt-ukl7j.1 | A game picker covering every game |
| bkt-ukl7j.2 | Web lobbies, cross-play |
| bkt-ukl7j.3 | Ads behind config |
| bkt-ukl7j.4 | Guest play |
| bkt-ukl7j.5 | Optional account, guest merge |
| bkt-ukl7j.6 | Learning paywall, upsell |
| bkt-g0uss | Critic and merge pending feat/apple-* branches |
| bkt-2yge8 | 1.0.1 resubmit after the App Review 2.5.4 rejection |
| bkt-o0o9k | UIBackgroundModes conflict: dev against fix/polingual-bgaudio-254 |
| bkt-of9qi | Uneed listing rejected, tester could not use the app |
| bkt-utu5f | Vercel Blob 403 on signups |

## Branches

### feat/polingual-lobbies

Server, BucketKit and iOS, at b87acad854.

- 488128c0d1: lobbies, chat, ready-up, synced rounds, Supabase migration, routes under `api/academy/lobbies`.
- b1d45a6ed0: critic round 1 fixes. The server keeps the answer key, rate limits live in the database, ids are checked.
- b0d5adbed8: guest tokens and the merge on sign-in.
- 866904d709: free games for locked players, the save-progress nudge and the learning upsell.
- b87acad854: game ids, with a server answer key for each game.
- Server tests 17 of 17 pass. BucketKit tests and the sim build passed at b1d45a6ed0, before the guest, merge, gating and game-id commits. Swift for those commits has not been compiled.
- Still to do: compile and test the Swift, the iOS AdMob piece of bkt-ukl7j.3, and critic round 2.

The API contract:
- `POST /api/academy/lobbies` accepts `game`, one of daily, same-word, flags or live. The default is daily.
- `POST /api/academy/lobbies/guest {nickname, guestId}` returns `{token, userId, expiresAt}`. Send the token as a Bearer on every lobby route.
- `POST /api/academy/lobbies/guest/merge {guestToken}` runs with the signed-in bearer.
- The server sends the prompts: mode, gloss, choices, lang and answer. Lang and answer stay null while a round is live.
- `POST answer {lobbyId, round, choice}` returns `{correct, points, ms, lobby}`.
- The web client renders server prompts. The TS round port on the web branch may be unneeded for lobbies; check before keeping it.

### feat/polingual-lobbies-web

Web, at 5d6470b655, WIP. The build is broken.

Done:
- A TS port of the round builder in `polingual/src/lib/lobby/rounds.ts`.
- Shared vectors in `apple/.../Fixtures/lobby-rounds.json`. Swift LobbyRoundsParityTests passes on the Mac at byte parity, and 8 TS tests pass.
- The API client with a guest token.
- An ads config, off by default.

Left:
- `play/Lobbies.tsx` and `play/Room.tsx`, which `page.tsx` already imports.
- A redirect from `/join/<code>` to `/play/<code>`.
- The save-progress and upsell UI.
- A two-browser Playwright test.
- A rebase onto the server branch.
- Live mode: the existing `/live` host board already exists. The plan hands the lobby's live game off to it.

### wip/apple-merge or dev

The output of bkt-g0uss. See its bead notes for the branches merged, skipped and stale. Skip anything that touches UIBackgroundModes until the founder decides bkt-o0o9k.

## Next

1. Finish the web room UI and fix the build. Rebase the web branch on feat/polingual-lobbies.
2. Add iOS AdMob through SPM with Google test IDs.
3. Run the critic. Pass needs a weighted score above 8.0, no dimension below 7, and no high finding. Then merge both branches into dev locally and push dev. No PR to main.
4. Run a two-device lobby test: an iOS simulator plus a browser against a local Next server and a local Supabase. The app needs a debug base-URL override for that.
5. Finish bkt-g0uss.

## Open Items From Past Sessions

| Item | Status |
|---|---|
| 1.0.1 resubmit, bkt-2yge8 | Blocked on the founder: TestFlight upload approval, a device recording of Listen playing from the Home Screen |
| Background audio decision, bkt-o0o9k | Blocked on the founder |
| Uneed rejection, bkt-of9qi | Not started: get the tester's note |
| Blob 403, bkt-utu5f | Blocked on the founder. Both Blob stores are suspended for exceeding quota, so upgrade the plan or clear usage in Vercel Billing. |
| Feedback items 8 and 9, Speaker audio | Blocked on the founder's ear check |
| bkt-sk1j2 age sync, bkt-wvj0s age range | Done and closed |

## Founder Inputs Needed

- AdMob app id and ad unit ids for Polingual iOS.
- Web ad env: `NEXT_PUBLIC_POLINGUAL_ADS` (off, placeholder, adsense-test or adsense), `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADSENSE_SLOT_LOBBY`, `NEXT_PUBLIC_ADSENSE_SLOT_ROUND`, `NEXT_PUBLIC_ADSENSE_SLOT_RESULTS`.
- Approval to apply the lobbies migration to the live Supabase project.
- A TestFlight build approval.
- Vercel Blob billing.

## Apple Merge Result

`wip/apple-merge` at 069526d35a. Nothing reached dev.

- Merged into the wip branch: polingual-icon, d8-word-tiles, fewer-ctas, letter-word-ink, placement-pop, mini-word-ink, cousin-tile-tap, listen-script, zero-streak-nudge, heard-meaning, shared-items-view, beta-free, library, listen-radio-only, member-names, streak-widget, watch-subtitles.
- Blocker: `test-academy-group-name-route` fails with a TypeError from member-names. `test-academy-lang-audio` fails on dev too. No Swift build was run.
- Skipped for a conflict in GroupShares.swift: group-voice-notes.
- Stale, close them: answer-sound, no-star, one-sound-tile, trial-top, app-icon, engine-articles, translate-embed, wrong-translation.
- Conflicting and not reviewed: d8-cards, game-stars, media-in-app, meetups, one-tile, polingual-onboarding, polingual-parity, share-people, sound-card, swap-shield.
