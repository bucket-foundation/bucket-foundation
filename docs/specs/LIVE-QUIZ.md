# Stoa: Live Quiz Build Plan

Drafted 2026-11-06. Stoa is a live multiplayer quiz shared by Polingual and Bucket. One big screen shows the board, players join from their phones with a code, teams race on speed and accuracy, and a leaderboard runs between rounds. Later phases add asynchronous duels and a category dial mode.

## Identity

- **Name.** Stoa, the Athenian porch where teachers met students in public. It fits a classroom and both products. A trademark search in the app and game classes runs before P1 ships.
- **Look.** The D8 palette from `apple/Bucket/Sources/Polingual/D8Style.swift`: parchment ground, ink type, lapis, vermilion, malachite, plus one new ochre. Answer tiles carry a pigment and a glyph: wave, spark, leaf, crescent. Tiles sit in one column on phones and a 2 by 2 grid on the board.
- **Sound.** Four short cues made in-house: join, lock, reveal, finale. No looping music in P1.
- **Phones show the full answer text** next to the glyph, so a player who cannot see the board can still play.

## Rules

The P1 mode is **Chorus**.

1. The host picks the product, the content, the team count of 2 to 4 or solo, and three rounds of five questions.
2. Each question opens for 20 seconds. A player locks one answer and cannot change it.
3. Player points: 500 for a right answer plus up to 500 for speed, scaled linearly across the window. A wrong answer or no answer scores 0.
4. Team score is the mean of its members' points per question, so a team of 4 and a team of 6 compete on equal terms.
5. **Unison bonus.** When 80% or more of a team answers right, the team earns 150 more.
6. **Steady streak.** Three right answers in a row add 100 to the player; the streak resets on a miss.
7. After each round the board shows team standings and the top five players, then a 10 second break.
8. The finale shows the winning team, the most improved player from round 1 to round 3, and the question most players missed.

Teams are named for the pigments: Lapis, Vermilion, Malachite, Ochre. Players auto-balance across teams on join; the host can move them in the lobby.

## Host Surfaces

Order, with reasons:

| Order | Surface | Reason |
|---|---|---|
| 1 | Web host at polingual.com/live and bucket.foundation/live | Runs on every TV path a classroom has: projector, smart-TV browser, Chromecast tab cast, AirPlay from a Mac. No store review. Same code serves both brands. |
| 2 | AirPlay host from the iPhone app | Families and tutors have an iPhone and an Apple TV or AirPlay TV. Reuses the iOS join work from P2. |
| 3 | Native tvOS app | ASC already holds "Bucket tvOS 1.0". tvOS has no web view, so this is a SwiftUI port of the board. Worth it once web hosting shows repeat living-room use. |
| 4 | Roku channel | Largest US TV platform, highest cost per user reached. Gated on demand data. |

**AirPlay host.** The phone becomes the host remote and the TV becomes the board. The app declares a scene for the `UIWindowSceneSessionRoleExternalDisplayNonInteractive` role in its scene manifest and returns a `UIHostingController` holding `StoaBoardView` when that session connects. The phone keeps the controls: start, pause, skip, kick, next round. When no external screen is connected the phone shows the board itself, which works for small groups around one device.

**tvOS.** A new `BucketTV` target in `apple/project.yml`, bundle `foundation.bucket.app` for universal purchase with the existing record. BucketKit gains the tvOS platform. Sign-in reuses the device code flow in `src/lib/academy/device-flow.ts`, so the host signs in on a phone. The Siri Remote drives start, next and pause. Polingual content runs inside the same tvOS app under a Languages tab until Polingual adds its own tvOS platform.

**Roku cost.** Roku runs BrightScript and SceneGraph, a separate language and UI toolkit with no web view and no shared code. BrightScript has no WebSocket object, so the channel polls `live_state` every 500 ms over `roUrlTransfer`. It needs a Roku device in developer mode, a separate channel certification against Roku's criteria, and its own release train. Estimate 4 weeks of build plus certification, and ongoing upkeep on every rules change. P5 starts only if 10% or more of web host sessions come from Roku TV browsers or cast fallbacks fail for real users.

## Joining

- **Web, no install.** polingual.com/join and bucket.foundation/join take the 6 character code. The board shows the code, the URL and a QR code that opens `/join/<code>`.
- **iOS app.** A Join Live button on the Games tab and on Today, with code entry and the camera QR scanner. Universal links on `/join/<code>` open the app when installed through the existing `apple-app-site-association`.
- **App Clip.** `BucketClip` already exists; a later Polingual clip opens on the same `/join/<code>` URL with no install. Post P3.
- **Roster mode.** A teacher pastes first names before class; each player taps their own name from the list. Players never type a name.

**Codes.** 6 characters from the Crockford alphabet the group invite codes use (`^[0-9A-HJKMNP-TV-Z]{6}$`). A code is live only while its room is open, and expires after 3 hours.

**Nicknames.** Players pick from three generated two-word names, adjective plus animal or object, drawn from a reviewed list in each interface language, with a reroll. No free text anywhere: no chat, no custom names, no team names. The host can rename a player to another generated name or remove them. Emoji reactions are off in P1.

## Transport and State

Stoa needs the hosted Supabase project that serves auth for both apps, the one the replacement decision in `bkt-x23u` settles. Local development runs on `npm run db:local`.

**Decision: Supabase Realtime broadcast for fan-out, Postgres functions as the authority.**

The `bucket` schema is sealed off from PostgREST, so clients call thin Next routes under `/api/live/` on bucket.foundation, and each route verifies the caller's Supabase JWT and calls one `bucket.live_*` function with the service role. Every timestamp comes from the database.

- The room state machine lives in Postgres: `lobby`, `question`, `reveal`, `board`, then `finale` and `closed`. The `live_*` functions move it and stamp every transition with `clock_timestamp()`.
- Each transition calls `realtime.send()` from the function, which broadcasts a small event (`seq`, `phase`, `q_index`, `opens_at`, `closes_at`) on the private topic `stoa:<room uuid>`. Clients never broadcast: RLS on `realtime.messages` grants select to room members and grants insert to nobody.
- Answers go over HTTP to the answer route, so each one is authenticated, stamped and written once by primary key.
- The host owns pacing and the server owns time and scoring. The host calls `live_advance` at the deadline; the server refuses before `closes_at`. When the host drops, the first `live_state` call more than 2 seconds past the deadline closes the question.
- Presence stays off for players, since presence diffs fan out to every member. The roster comes from `live_players`, and a ping call every 15 seconds updates `last_seen` and returns server time for clock sync.

**Why this over the alternatives.** Vercel functions hold no long-lived sockets. A host-authoritative design lets a modified host page award points. A separate socket server adds an always-on service, which Local First avoids. Supabase is already the database and auth for both apps.

**Identity.** Every player gets a Supabase anonymous session: supabase-js on the web, the `/auth/v1/signup` anonymous call through URLSession in BucketKit. iOS adds a small Phoenix channel client on `URLSessionWebSocketTask` in BucketKit, around 200 lines, with no new package. Hosts sign in with their existing account.

**Latency fairness.** The client reports milliseconds from the moment the question rendered. The server clamps that value into the range from its own elapsed time minus the player's measured round trip minus 300 ms, up to its own elapsed time. Speed points use the clamped value. Answers arriving after `closes_at` plus 500 ms score 0.

**Reconnects.** Broadcasts are hints; `live_state` is the truth. A client that sees a gap in `seq`, wakes from the background, or rejoins calls `live_state` and renders the snapshot. The anonymous session persists in localStorage or the Keychain, so a reload keeps the same player and score.

**Limits.** 100 players per room, enforced in `live_join`. A full room of 100 opens 101 connections and sends about 6 broadcasts per question, each delivered to 101 clients. The Realtime connection and message quotas for the prod project's plan get checked against 3 concurrent full rooms before P1 launch `[empirical: supabase.com/docs/guides/realtime/quotas, to read at P1 start]`. The host gets the live answer count on a host-only topic, throttled to 2 updates a second.

## Question Generators

All generators are pure TypeScript in `src/lib/stoa/`, seeded by the room seed, so a seed replays the same set in tests. Room creation generates the full set and stores it; players receive prompt and options at open and the answer at reveal.

**Polingual**, from `polingual/src/data/words.json`: 244 concepts across 29 languages, with IPA, romanization, a 0 to 10 tier and roots on 102 entries.

| Kind | Prompt | Options |
|---|---|---|
| Pick the word | "water" in Spanish | four Spanish words; distractors from the same category, using `Confusables` rules |
| Hear it | The board plays a word | four written forms in that language |
| Shared root | `*nem-` | four pairs of words; one pair shares the root |
| Which script | a word in its native script | four language names |
| Translate | a word in language A | four words in language B |

- **Difficulty.** Round 1 draws tiers 0 to 3, round 2 tiers 3 to 6, round 3 tiers 6 to 10. Hard questions also draw distractors from the same category and the same script.
- **Mix by root language.** The host sets a home language for prompts and picks target languages. The generator groups targets into families (Romance, Germanic, Slavic, Semitic, Indic, East Asian, classical) and keeps any one family under 40% of a round when more than one family is chosen.
- **Audio.** The board plays audio through the same voices the apps use; the web host falls back to `speechSynthesis` and drops Hear it for a language with no voice on that device. After reveal the board shows the IPA.

**Bucket**, from `learning/app/corpus/questions/*.json`: 793 `pick` questions across the 8 decks, plus `match` and `order` questions for later modes. P2 uses `pick` only, shuffled with the answer index tracked. Difficulty follows the atom's place in the prerequisite graph (`requires`): early atoms in round 1, deep atoms in round 3. The host picks one deck or a mix.

## Data Model

New migration in schema `bucket`, all tables with RLS on and reached through the `live_*` functions.

| Table | Key columns |
|---|---|
| `live_rooms` | `id uuid`, `code`, `product`, `host_user`, `mode`, `settings jsonb`, `seed`, `phase`, `q_index`, `opens_at`, `closes_at`, `seq`, `paused_ms`, `expires_at` |
| `live_teams` | `room_id`, `slot`, `pigment` |
| `live_players` | `id`, `room_id`, `auth_uid`, `nickname_key`, `team_slot`, `time_factor`, `streak`, `score`, `last_seen`, `removed` |
| `live_questions` | `room_id`, `idx`, `round`, `kind`, `prompt jsonb`, `options jsonb`, `answer smallint`, `audio jsonb` |
| `live_answers` | primary key `room_id, idx, player_id`; `choice`, `client_ms`, `server_ms`, `scored_ms`, `correct`, `points` |
| `live_duels` (P4) | `id`, `seed`, `product`, `from_user`, `to_user`, `from_result`, `to_result`, `status`, `expires_at` |

A daily cron deletes rooms, players and answers older than 24 hours and the anonymous auth users tied to them. Hosts keep a per-room summary: team scores and the per-question right rate, with no player rows.

## API Surface

| Call | Where | Who |
|---|---|---|
| `POST /api/live/rooms` | bucket.foundation route, CORS for polingual.com | host; generates and stores the set, returns code and room id |
| `POST /api/live/join` with code and nickname key | route over `live_join` | player; returns room id, player id, team |
| `GET /api/live/rooms/:id/state` | route over `live_state` | anyone in the room; snapshot with no answers before reveal |
| `POST /api/live/answer` with idx, choice, client ms | route over `live_answer` | player |
| `POST /api/live/ping` | route over `live_ping` | player; returns server time |
| `POST /api/live/rooms/:id/{start,advance,pause,lock,end}` | routes | host |
| `POST /api/live/rooms/:id/players/:pid/{move,rename,remove,time}` | routes | host |
| `GET /api/live/rooms/:id/summary` | route | host; CSV for teachers |
| `POST /api/live/duels`, `GET /api/live/duels` | route, P4 | signed-in users |

## Monetization

- **Joining is free everywhere**, with no account. Every player sees the brand and a QR to the app at the finale, so players are the acquisition channel.
- **Polingual hosting** is free up to 10 players with Chorus and the Pick the word kind. Polingual subscribers, including trial users and Polingual Family, host up to 100 players with every kind and mode. Ten players covers a family or party and sends each host to the paywall when a class wants in.
- **Classroom grant.** Teachers apply once with a school email and host up to 100 players free. A grant reaches 25 to 35 new players a session at no cost per seat.
- **Bucket hosting is free** at every size, matching the free-to-read canon.

## Phases

Each phase ships alone. Sizes assume one build agent and include review.

| Phase | Screens | APIs | Tests | Size |
|---|---|---|---|---|
| **P1** Web host and phone join, Polingual words, Chorus | polingual.com/live: setup, lobby with code and QR, question, reveal, board, finale. polingual.com/join: code, nickname pick, waiting, answer, result | migration, `live_*` functions, every `/api/live/` route, cleanup cron | generator and scoring unit tests on seeds; SQL tests in `supabase/tests/` for RLS, clamping, double answers and late answers; Playwright run with a host and 3 players; a load script with 100 simulated players on the local stack | 3 weeks, 5 PRs |
| **P2** Bucket quizzes, iOS join, AirPlay host | bucket.foundation/live and /join; iOS Join Live, QR scan, answer screen; iOS host remote and external display board; roster mode | Bucket generator, roster routes, summary CSV | BucketKit tests for the Phoenix client and state decoding; UI test for join by code; device test of AirPlay to an Apple TV | 3 weeks, 4 PRs |
| **P3** tvOS host | tvOS setup, lobby, question, board, finale, device code sign-in | none new | tvOS UI tests on the simulator; a TestFlight build on Apple TV | 2 weeks, 3 PRs |
| **P4** Duels and matchmaking | send a duel from a word or a deck; inbox; result card through the existing brag share | duel routes; matchmaking pairs players of the same languages and level from a queue, falling back to a seeded ghost run | duel lifecycle and expiry tests; matchmaking fairness test on synthetic queues | 3 weeks, 4 PRs |
| **P5** Roku | lobby, question, board, finale in SceneGraph | none new, polls `live_state` | Roku dev-mode runs; certification checklist | 4 weeks plus certification |

**Compass mode**, the category dial, follows P4. The board spins a dial of eight points: the seven canon branches plus Languages. A player who answers three right in a row on a branch claims its keystone, and the first to hold four keystones wins. It reuses the Chorus engine with a new round picker.

## Risks

- **COPPA and schools.** The apps are rated 13+, and classrooms include younger students. Players give no email, no name of their own and no free text; the anonymous session is used for room operation and deleted within 24 hours, which keeps players inside COPPA's support-for-internal-operations path. Duels need an account and the existing age range check, so under-13 users never reach them. The classroom grant terms state the school authorizes use, and a student data page goes up with P1.
- **Cheating.** Answers stay server-side until reveal. One answer per player per question by primary key. Join attempts are rate limited per IP at 10 failed codes a minute, and the host can lock the room. A modified client can answer fast but cannot see the answer, and its timing is clamped to the server window.
- **Accessibility.** Pigment plus glyph plus full text on every tile. VoiceOver reads "Wave, option 1, agua" and announces 10 and 5 seconds left. Reduce Motion drops the dial spin and score animations. The host can set a time factor up to 1.5 for a player, and speed points scale to that player's window. The board meets 4.5 to 1 contrast at 3 meters.
- **Right to left.** Arabic, Hebrew and Persian words render with bidi isolation (`dir="auto"` per option on the web, natural alignment in SwiftUI). An Arabic interface mirrors the phone layout and keeps the board grid fixed so glyph positions match across devices.
- **Offline.** Live play needs a network. A player who drops sees a reconnecting banner and rejoins with the same score; missed questions score 0. The host can pause, which extends `closes_at` for everyone. A school network that blocks WebSockets falls back to polling `live_state` once a second.
- **Name and look.** Stoa, the pigments, the glyphs and the cues are original. Any rule or asset that resembles a shipped quiz game gets changed before release.
