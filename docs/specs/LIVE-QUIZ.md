# Stoa: Live Quiz Build Plan

Drafted 2026-11-06, revised the same day after the critic review on PR #1211. Stoa is a live multiplayer quiz shared by Polingual and Bucket. One big screen shows the board, players join from their phones with a code, answers score on speed and accuracy, and a leaderboard runs between rounds. Later phases add teams, asynchronous duels and a category dial mode.

## Identity

- **Name.** Stoa, the Athenian porch where teachers met students in public. It fits a classroom and both products. A trademark search in the app and game classes runs before P1a ships.
- **Look.** The D8 palette from `apple/Bucket/Sources/Polingual/D8Style.swift`: parchment ground, ink type, lapis, vermilion, malachite, plus one new ochre. Tiles sit in one column on phones and a 2 by 2 grid on the board.
- **Answer marks.** Every tile carries a pigment, a glyph and a letter: lapis wave A, vermilion spark B, malachite leaf C, ochre crescent D. Phones also show the full answer text, so a player who cannot see the board can still play.
- **Sound.** Four short cues made in-house: join, lock, reveal, finale. No looping music.

## Rules

**Open Floor** is the P1a mode, every player for themselves.

1. The host picks the product, the content and three rounds of five questions.
2. Each question opens for 20 seconds. A player locks one answer and cannot change it.
3. Player points: 500 for a right answer plus up to 500 for speed, scaled linearly across the player's window. A wrong answer or no answer scores 0.
4. **Steady streak.** Three right answers in a row add 100; the streak resets on a miss.
5. After each round the board shows the top ten players, then a 10 second break.
6. The finale shows the top five, the most improved player from round 1 to round 3, and the question most players missed.

**Chorus** is the P1b team mode, on the same engine.

1. The host sets 2 to 4 teams, named for the pigments: Lapis, Vermilion, Malachite, Ochre. Players auto-balance on join; the host can move them in the lobby.
2. Team score is the mean of its members' points per question, so a team of 4 and a team of 6 compete on equal terms. Each score row records the team at reveal, so scored questions stay frozen: a late joiner counts only from the questions they played, and removing a player changes no past question. Late joiners go to the team with the fewest active players. Teams lock when the game starts. Tied teams share a place.
3. **Unison bonus.** A team earns 150 more on a question when at least one member is right and the misses stay within max(1, floor(size / 5)): every team of 2 to 9 forgives one slip, a team of 10 forgives two, and a team of one must be right. A flat 80% forgave no slip at 4 and one at 5.
4. The board shows team standings first and the top five players second.

## Host Surfaces

| Order | Surface | Reason |
|---|---|---|
| 1 | Web host at polingual.com/live and bucket.foundation/live | Runs on every TV path a classroom has: projector, smart-TV browser, Chromecast tab cast, AirPlay from a Mac. No store review. Same code serves both brands. |
| 2 | AirPlay host from the iPhone app | Families and tutors have an iPhone and an Apple TV or AirPlay TV. Reuses the iOS join work from P2. |
| 3 | Native tvOS app | ASC already holds "Bucket tvOS 1.0". tvOS has no web view, so this is a SwiftUI port of the board. Worth it once web hosting shows repeat living-room use. |
| 4 | Roku channel | Largest US TV platform, highest cost per user reached. Gated on demand data. |

**AirPlay host.** The phone becomes the host remote and the TV becomes the board. The app declares a scene for the `UIWindowSceneSessionRoleExternalDisplayNonInteractive` role and returns a `UIHostingController` holding `StoaBoardView` when that session connects. The phone keeps the controls: start, pause, skip, remove, next round. With no external screen the phone shows the board itself, which works for a small group around one device.

**tvOS.** A new `BucketTV` target in `apple/project.yml`, bundle `foundation.bucket.app` for universal purchase with the existing record. BucketKit gains the tvOS platform. Sign-in reuses the device code flow in `src/lib/academy/device-flow.ts`, so the host signs in on a phone. The Siri Remote drives start, next and pause. Polingual content runs in the same app under a Languages tab until Polingual adds its own tvOS platform.

**Roku cost.** Roku runs BrightScript and SceneGraph, a separate language and UI toolkit with no web view and no shared code. BrightScript has no WebSocket object, so the channel polls the state route every 500 ms over `roUrlTransfer`. It needs a Roku device in developer mode, a separate channel certification against Roku's criteria, and its own release train. Estimate 4 weeks of build plus certification, and upkeep on every rules change. P5 starts only if 10% or more of web host sessions come from Roku TV browsers, or cast fallbacks fail for real users.

## Joining

- **Web, no install.** polingual.com/join and bucket.foundation/join take the 6 character code.
- **QR.** The board shows the code, the URL and a QR code that opens `/join/<code>`.
- **iOS app.** A Join Live button on the Games tab, with code entry and the camera scanner. Universal links on `/join/<code>` open the app when installed, through the existing `apple-app-site-association`.
- **App Clip.** A Polingual clip on the same `/join/<code>` URL, after P3.

**Codes.** 6 characters from the Crockford alphabet the group invite codes use (`^[0-9A-HJKMNP-TV-Z]{6}$`). A code resolves only while its room is open, and every room closes within 3 hours.

**Players never sign in.** `POST /api/live/join` takes the code and a nickname key and returns a room token: a JWT signed on the Vercel server with `STOA_ROOM_SECRET`, carrying room id, player id and an expiry at room close. The client keeps it in `sessionStorage` or memory and sends it with every answer. The player id exists only inside that room. The token also carries the room's `token_version`. Every answer and state call checks that the player row is active and the version matches; a removed player gets 403. Removing a player bumps `token_version` and the routes reissue tokens to the remaining players on their next state call, so a copied token from the removed player stops working.

**Nicknames.** Players pick from three generated two-word names, adjective plus animal or object, from a reviewed list in each interface language, with a reroll. No free text anywhere: no chat, no custom names, no team names, no reactions. The host can swap a player's name for another generated one or remove the player.

## Transport and State

Stoa runs on the live hosted Supabase project `xbwblxwafphvdeldighd`. Local development runs on `npm run db:local`. Founder task before P1a: change that project's Auth site URL from localhost to the production domain, so host sign-in links resolve.

**Decision: a public Realtime broadcast channel for fan-out, Vercel routes in front of Postgres functions as the authority.**

- **Routes.** The `bucket` schema is sealed off from PostgREST, so every call goes to a Next route under `/api/live/` on bucket.foundation, CORS open to polingual.com. Each route checks the room token or the host session and calls one `bucket.live_*` function with the service role. Every timestamp comes from `clock_timestamp()` in the database.
- **Channel.** Clients subscribe with the anon key to the public broadcast topic `stoa:<topic>`, where `topic` is a random UUID stored on the room and returned only by join and state. Public channels need no `realtime.messages` policies and no anonymous-auth setting. Only the routes broadcast, through the Realtime HTTP broadcast endpoint with the service key.
- **Signed events.** Anyone holding the room id could send on a public channel, so every event carries an Ed25519 signature, and phones verify it before any render. Browsers verify with WebCrypto, with a 7 KB fallback library for older ones; iOS verifies with CryptoKit.
- **Room keys.** `POST /api/live/rooms` generates a fresh Ed25519 keypair for each room. The private key sits in `live_rooms.sign_key`, encrypted with AES-GCM under a key derived by HKDF from `STOA_ROOM_SECRET` and the room id. `STOA_ROOM_SECRET` lives in Vercel encrypted environment variables for production and preview and in `.env.local` for local work, and stays out of every client bundle and app build. Join and state responses carry the room's public key. The keypair dies with the room row at the 24 hour deletion.
- **Rotation.** Rotating `STOA_ROOM_SECRET` covers both the room keys and the room tokens. The routes read `STOA_ROOM_SECRET` and `STOA_ROOM_SECRET_PREV`, try the current one first, and keep the previous one for 3 hours so live rooms finish. New rooms always use the current secret.
- **Replay.** The signature covers `room_id`, `seq`, event type, `issued_at` and the SHA-256 of the payload. Phones reject an event for another room, a `seq` at or below the last one seen, or an `issued_at` more than 30 seconds old by the ping clock offset. A phone that just loaded or rejoined fetches state over HTTPS first, takes its `seq` and public key from that, and only then accepts broadcasts. A replay from another room fails on `room_id` and on that room's key.
- **Flooding.** Unsigned or invalid events are dropped before parsing the payload into the UI. Realtime enforces per-project limits on messages a second and on payload size, and channel joins per connection, for the project's plan `[empirical: supabase.com/docs/guides/realtime/quotas, to read at P1a start]`. When a room sees forged traffic, phones report verify failures through `/api/live/probe`. The room moves to a new random topic when, inside 30 seconds, at least 3 distinct seats and 20% of the room report, and those reports come from 3 or more networks or from a majority of the room. Each report carries a network key hashed from the room id and the client address, deleted with the room, so one device holding several seats cannot force hops. Report hops wait 2 minutes apart; the host can rotate at any time. The new name reaches phones only through the state route, and the old topic goes quiet.
- **Events.** `open` carries `seq`, `idx`, prompt, options and `closes_at`. `reveal` carries the answer key and per-option counts. `board` carries standings. The answer key leaves the server only in `reveal`.
- **Private channels considered.** They would need JWTs for players, which means anonymous auth users, policies on `realtime.messages` and a cleanup job for auth rows. Signed public events give the same protection with less to run.

**Clock and host drop.** The room row stores every deadline: `opens_at`, `closes_at`, `next_at`. Phases advance on schedule with no host action, and the host can pause, skip or extend. Every route call first runs `live_tick(room)`, which applies any overdue transition and broadcasts it. A pg_cron job every 10 seconds calls `/api/live/sweep` through `pg_net` with a shared secret, so an idle room still advances. A host who drops reconnects with a host token, signed like the room token, and resumes the controls.

**Answer path.** `live_answers` takes inserts only, one row per answer, primary key `room_id, idx, player_id`, stamped with server receive time. No counter rows. At reveal one aggregate query scores the question and writes points to `live_scores`. The host board polls a count of rows for the current question once a second.

**Latency fairness.** In the lobby each client measures its broadcast delay: the server sends signed probes stamped with send time, and the client reports receipt time corrected by a ping clock offset. The median becomes the player's grace, capped at 1000 ms. Speed points use server receive time minus `opens_at` minus grace. Answers after `closes_at` plus grace score 0.

**Reconnects.** Broadcasts drive the screen and `GET /api/live/rooms/:id/state` is the truth. A client that sees a gap in `seq`, wakes from the background or reloads fetches state with its token and renders the snapshot.

**Limits.** 100 players per room, enforced in `live_join`. Joins are rate limited per room code at 150 a minute, so a class of 35 behind one school NAT joins at once. Failed code lookups are limited per IP at 60 a minute to stop guessing. A full room opens 101 connections and receives about 4 broadcasts per question. The Realtime connection and message quotas for the project's plan get checked against 3 concurrent full rooms before P1a launch `[empirical: supabase.com/docs/guides/realtime/quotas, to read at P1a start]`.

## Question Generators

All generators are pure TypeScript in `src/lib/stoa/`, seeded by the room seed, so a seed replays the same set in tests. Room creation generates and stores the full set. Only kinds the current data supports ship.

**Polingual**, from `polingual/src/data/words.json`: 244 concepts across 29 languages, each with a category, a 0 to 10 tier, and IPA or romanization on most forms.

| Kind | Phase | Prompt | Options |
|---|---|---|---|
| Pick the word | P1a | "water" in Spanish | four Spanish words; distractors share the category and sit within 2 tiers |
| Which language | P1a | a word in its native script | four language names; distractors share the script where the set allows |
| Translate | P1b | a word in language A, named with language B | four words in language B, same distractor rule; B is another picked target, or the home language when the host picked one |
| Sound it out | later | the IPA on screen, with audio as an extra | four written forms; only languages with IPA |

- **Difficulty.** Round 1 draws tiers 0 to 3, round 2 tiers 3 to 6, round 3 tiers 6 to 10.
- **Mix by root language.** The host sets a home language for prompts and picks target languages. The generator groups targets into families (Romance, Germanic, Slavic, Semitic, Indic, East Asian, classical) and keeps any one family under 40% of a round when the host picked more than one family.
- **Audio.** Sound it out shows the IPA first. The board plays audio as an extra, through the apps' voices or `speechSynthesis` on the web.
- **Deferred.** Shared root and confusable-distractor kinds wait for data: roots cover 102 of 244 concepts.

**Bucket**, from `learning/app/corpus/questions/*.json`: 793 `pick` questions across the 8 decks. P2 uses `pick` only, shuffled with the answer index tracked. Difficulty follows the atom's place in the prerequisite graph (`requires`): early atoms in round 1, deep atoms in round 3. The host picks one deck or a mix.

## Data Model

New migration in schema `bucket`, RLS on every table, reached only through the `live_*` functions.

| Table | Key columns |
|---|---|
| `live_rooms` | `id uuid`, `topic`, `sign_key`, `token_version`, `code`, `product`, `host_user`, `mode`, `school_mode`, `settings jsonb`, `seed`, `phase`, `idx`, `opens_at`, `closes_at`, `next_at`, `paused_at`, `seq`, `expires_at` |
| `live_players` | `id`, `room_id`, `nickname_key`, `team_slot`, `time_factor`, `grace_ms`, `removed` |
| `live_questions` | `room_id`, `idx`, `round`, `kind`, `prompt jsonb`, `options jsonb`, `answer smallint` |
| `live_answers` | primary key `room_id, idx, player_id`; `choice`, `received_at` |
| `live_scores` | primary key `room_id, idx, player_id`; `correct`, `points`, written once at reveal |
| `live_duels` (P4) | `id`, `seed`, `product`, `from_user`, `to_user`, `from_result`, `to_result`, `status`, `expires_at` |

A pg_cron job deletes rooms and every child row 24 hours after close. The host keeps a summary with no player rows: player count, the per-question right rate, and the top nicknames.

## API Surface

| Call | Who |
|---|---|
| `POST /api/live/rooms` | signed-in host; generates the set, returns code, room id and host token |
| `POST /api/live/join` | player; code and nickname key in, room token and room id out |
| `GET /api/live/rooms/:id/state` | room token or host token; snapshot with no answer key before reveal |
| `POST /api/live/answer` | room token; idx and choice |
| `POST /api/live/probe` | room token; lobby latency reports |
| `POST /api/live/rooms/:id/{start,pause,resume,skip,end}` | host token |
| `POST /api/live/rooms/:id/players/:pid/{move,rename,remove,time}` | host token |
| `POST /api/live/sweep` | pg_cron through `pg_net`, shared secret |
| `GET /api/live/rooms/:id/summary` | host; CSV of nicknames and scores |
| `POST /api/live/duels`, `GET /api/live/duels` | signed-in users, P4 |

## Beads

To file with `source-founder`, one bead per PR.

| Phase | Bead titles |
|---|---|
| P1a | Stoa migration: rooms, players, questions, answers, scores, deletion cron · Stoa room crypto: per-room Ed25519 keys, room tokens, dual-secret rotation · Stoa routes: rooms, join, state, answer, probe, host controls, sweep · Stoa generators: Pick the word and Which language with seeded tests · Stoa web host and join screens on polingual.com · Stoa load and replay tests: 100 players, forged and replayed events |
| P1b | Stoa Chorus teams: team lobby, mean scoring, unison bonus · Stoa Translate kind · Stoa School mode and summary CSV · Stoa student data page and host terms |
| P2 | Stoa Bucket pick generator · Stoa iOS join with Phoenix client and signature check · Stoa AirPlay host remote and external board · bucket.foundation/live and /join |
| P3 | Stoa tvOS target and board · Stoa tvOS device code sign-in |
| P4 | Stoa duels routes and inbox · Stoa matchmaking and ghost runs |
| P5 | Stoa Roku channel · Stoa Roku certification |

## Child Safety

- **Players.** No account, no email, no typed name, no free text, and no id that outlives the room. Nicknames come from the generated list.
- **Retention.** Room, player, answer and score rows are deleted 24 hours after the room closes. Rate-limit counters and report network keys hold a keyed hash of the network address, and the 5 minute purge deletes them within ten minutes.
- **School mode.** A room setting that removes every promo, paywall link, QR to the app, and TestFlight or App Store call to action from player screens and from the board. Results show nicknames only.
- **Hosts.** The host signs in with an existing account and accepts the Stoa host terms once: the host is a teacher or another adult, and a school host confirms the school allows the tool.
- **COPPA.** Stoa asks players for no name, contact, photo or location. The servers see network addresses and keep only an HMAC-SHA256 keyed with `STOA_ROOM_SECRET` (IPv4 address or IPv6 /64), in rate-limit counters and report rows deleted within ten minutes, used only to run rooms and stop abuse. COPPA treats that as support for internal operations. A nickname from our list, a room token in local storage that expires at close, and answers deleted within a day are what a player leaves behind. On that basis under-13 students can play in a class without parental consent; counsel reviews this before schools use it. Duels in P4 need an account and pass the existing age range check, so they stay 13 and over.
- **FERPA.** Stoa receives no student names or education records. The teacher's summary pairs nicknames with scores, and only the teacher knows which student held which nickname. The student data page lives at /live/student-data and the host terms at /live/terms. The host accepts the terms with a checkbox before opening a room; the browser remembers the acceptance.

## Monetization

- **P1 hosting is free** for every product and room size.
- **Joining is free** everywhere, with no account.
- **Measured.** Host sessions per week, players per room, repeat hosts after 14 days, School mode share, and app installs from the finale screen outside School mode.
- **Later rule.** A Polingual room above 30 players needs a host with a Polingual subscription or trial, unless the room runs in School mode.

## Phases

Each phase ships alone. Sizes assume one build agent and include review.

| Phase | Screens | APIs | Tests | Size |
|---|---|---|---|---|
| **P1a** Web host and web join, Open Floor, Pick the word and Which language | polingual.com/live: setup, lobby with code and QR, question, reveal, board, finale. polingual.com/join: code, nickname pick, waiting, answer, result | migration, `live_*` functions, rooms, join, state, answer, probe, host controls, sweep, signed broadcast module, deletion cron | generator unit tests on seeds; scoring tests for grace and late answers; SQL tests in `supabase/tests/` for duplicate answers and deletion; signature rejection test; Playwright with a host and 3 players; a load script with 100 players on the local stack | 2 weeks, 4 PRs |
| **P1b** Chorus teams, Translate, School mode | team lobby, team board, School mode toggle and stripped player screens | move route, team scoring, summary CSV | team mean and unison tests; School mode screens show no promo, checked in Playwright | 1.5 weeks, 3 PRs |
| **P2** Bucket quizzes, iOS join, AirPlay host | bucket.foundation/live and /join; iOS Join Live, scanner, answer screen; iOS host remote and external display board | Bucket generator | BucketKit tests for the Phoenix client, signature check and state decoding; UI test for join by code; device test of AirPlay to an Apple TV | 3 weeks, 4 PRs |
| **P3** tvOS host | tvOS setup, lobby, question, board, finale, device code sign-in | none new | tvOS UI tests on the simulator; a TestFlight build on Apple TV | 2 weeks, 3 PRs |
| **P4** Duels and matchmaking | send a duel from a word or a deck; inbox; result card through the existing brag share | duel routes; matchmaking pairs players of the same languages and level, falling back to a seeded ghost run | duel lifecycle and expiry tests; matchmaking fairness test on synthetic queues | 3 weeks, 4 PRs |
| **P5** Roku | lobby, question, board, finale in SceneGraph | none new, polls state | Roku dev-mode runs; certification checklist | 4 weeks plus certification |

**Compass mode**, the category dial, follows P4. The board spins a dial of eight points: the seven canon branches plus Languages. A player who answers three right in a row on a branch claims its keystone, and the first to hold four keystones wins. It reuses the Open Floor engine with a new round picker.

## Risks

- **Cheating.** The answer key leaves the server only at reveal. One answer per player per question by primary key. Scores use server receive time, so a modified client gains at most its own grace, capped at 1000 ms. Forged and replayed broadcasts fail the signature, room, `seq` and age checks. The host can lock the room and remove players.
- **Accessibility.** Every question has a visual form, and audio is an extra. Tiles carry color, glyph and letter plus the full text. VoiceOver reads "A, wave, agua" and announces 10 and 5 seconds left. Reduce Motion drops the dial spin and score animations. The host can extend a player's time up to 3 times the window, and speed points scale to that player's window. The board meets 4.5 to 1 contrast at 3 meters.
- **Right to left.** Arabic, Hebrew and Persian words render with bidi isolation: `dir="auto"` per option on the web and natural alignment in SwiftUI. An Arabic interface mirrors the phone layout and keeps the board grid and letters fixed, so A to D sit in the same place on every device.
- **Offline.** Live play needs a network. A player who drops sees a reconnecting banner and rejoins with the same token and score; missed questions score 0. The host can pause, which moves every deadline. A school network that blocks WebSockets falls back to polling state once a second.
- **Name and look.** Stoa, the pigments, the glyphs and the cues are original. Any rule or asset that resembles a shipped quiz game gets changed before release.
