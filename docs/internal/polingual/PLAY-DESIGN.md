# Polingual Play Design

Epic `bkt-yz1sz`. Drafted 2026-11-13 against `origin/dev` at `cdd5d5c820`. Mockups live at `/design/play/*` in the polingual app, served only when `NODE_ENV` is not `production`.

Play is the free, ad-supported front door to Polingual. A player opens `/play` or the Play tab, sees the world playing right now, joins or starts a game in two taps, earns coins and rank, dresses an avatar, and pulls friends and family in through groups and a TV screen. Polingual Pro removes ads and opens the learning layer (`bkt-zapwl`). Money buys looks and never score.

## Ground Truth

What ships today on `dev`, and what this design builds on.

| Piece | Where | State |
|---|---|---|
| Web lobbies with bots, chat, ready, rounds | `polingual/src/app/(site)/play`, `src/lib/academy/lobbies-server.ts`, migrations `20261112000000_polingual_lobbies.sql`, `20261112100000_polingual_lobby_bots.sql` | live; server computes points in `lobby_answer` from `decision.points` |
| Games | `play/langs.ts` `GAMES`: daily, same-word, flags, tiles, live | five modes; `lobbies.game` check lists four, tiles added in `20261112200000_polingual_tiles.sql` |
| Guest play | `merge_lobby_guest(p_guest, p_user)` | guest ids merge on sign-in |
| Kahoot-style host board | `polingual/src/app/(site)/live`, `/join/[code]`, `src/lib/stoa/*`, `bucket.live_rooms` | signed per-room tokens, phases lobby to finale, nickname keys from a word list, school mode |
| Learning groups | `bucket.learning_groups`, `group_members`, `group_cheers`, shared items | family and friends kinds, 10-char invite code, owner and member roles, weekly goal |
| Ads | `play/Ad.tsx`, `AdsContext.tsx`, `Consent.tsx`, `src/lib/lobby/ads.ts` | rails above 1000 px, 320x50 banner, consent gate by country |
| Brand | `polingual/public/d8/index.html`, `app/app.module.css` `.page`, `public/brand/kit`, `src/lib/flags.ts` | parchment, tyrian, vermilion, ochre, lapis, malachite, maya; Fredoka, Nunito, Space Mono; CSS gradient flags for 31 languages |
| iOS products | `apple/Polingual/Polingual.storekit` | monthly, yearly, family yearly, lifetime; no consumables yet |
| Research | `docs/internal/polingual/GAMES-RESEARCH.md` | ranked game ideas, meta layer, ad formats, teen rules |

Missing today: persistent player profile, coins, avatar, rank, friends, a live activity feed, a group-scoped game, a bridge from a lobby to the TV board, and any consumable purchase.

## Brand Rules For Play

Play keeps the landing page's look: parchment field with the 22 px dot grid, chunky Fredoka headlines in tyrian, vermilion buttons with a dark lip shadow (`0 4px 0 #8E2312`), Space Mono for codes, counters and labels, flags as CSS gradients from `src/lib/flags.ts`.

The public brand site at `/brand` holds every token, component and rule below, with downloads; Play and the mockups import its shared parts from `polingual/src/app/(site)/play-kit`.

Play adds energy on top of that base:

- **Answer colors.** Four answer slots, each a brand color plus a shape so color-blind players can play: vermilion triangle, lapis diamond, ochre circle, malachite square. The TV and the phone share them.
- **Motion.** Cards pop in at 160 ms with a 4 px lift; coin gains count up; rank changes slide. All of it sits behind `prefers-reduced-motion: no-preference`.
- **Dark stage.** The TV board and the in-round phone use `--tyrian-deep` (#3A0F2F) as the stage with parchment text, so a living room TV reads from across the room. Lobby and menus stay on parchment.
- **Type scale.** TV question text at `clamp(48px, 6vw, 96px)`; room code at 96 px Space Mono; phone answer buttons at least 96 px tall.
- **Voice.** Short, warm UI strings in the landing page voice: "Room filling", "You're in", "3 friends playing".

## Information Architecture

```
/play                      Play home: live activity, quick play, my groups, rank strip
/play/[code]               Room: lobby, rounds, results (exists)
/play/new                  Start a game: game, languages, audience, screen
/play/tv/[code]            TV host board for a room
/join/[code]               Phone controller (exists for live rooms; extended)
/me                        Profile card, stats, rank, badges
/me/avatar                 Avatar editor
/me/friends                Friends, requests, invite link
/shop                      Cosmetics and coin packs
/groups/[id]               Group page (exists); gains Play tab and leaderboard
/u/[handle]                Public profile card, opt-in
```

App tabs on iOS and Android: Learn, Play, Groups, Me. The shop opens from the coin chip in every header.

## Screens And States

Each screen lists its states. Every screen has a loading skeleton in brand shapes and an offline banner.

### Play Home

Hero strip with live counters, a "Quick play" button, the games grid, my groups, friends online, and the live feed.

| State | What shows |
|---|---|
| guest, first visit | counters, feed, quick play, "Pick a name and a flag" sheet on first tap |
| signed in | coin chip, rank badge, avatar in the header; friends row; groups row |
| quiet hours, under 20 players online | counters hide the player number and show "Rooms open" with bot-backed rooms |
| no friends yet | friends row becomes "Invite a friend" card with share link |
| ads on | rail or banner per `ads.ts`; no ad above the fold on phones |
| Pro | no ad slots; "Review missed words" card in place of the banner |

### Start A Game

One sheet with four choices, each with a default so "Start" works on first tap.

| Choice | Options | Default |
|---|---|---|
| Game | the `GAMES` list | last played |
| Languages | `LANG_SETS` or custom up to 8 | last used |
| Who | public, friends only, a group, private code | public |
| Screen | everyone on their own device; one TV plus phones | own device |

Choosing a group pre-fills the invite list and posts "Garcia family: game starting" to the group. Choosing TV creates a live room and opens `/play/tv/[code]`.

### Room

Exists. Adds avatars on the player list, flags beside names, a group badge when the room belongs to a group, and a results screen with coin and rank deltas.

| State | What shows |
|---|---|
| lobby, filling | code, QR, player chips with avatar and flag, bot fill countdown |
| round | prompt, four answers, timer, my streak |
| reveal | right answer, who got it, speed ranking |
| results | podium with avatars, coins earned, rank points, missed words card, share |
| host left | next human becomes host; bots never host |

### TV Host Board

Full screen, landscape, built for 3 m viewing.

| Phase | TV shows | Phone shows |
|---|---|---|
| lobby | room code at 96 px, QR, joined avatars dancing in, player count | name check, avatar, "You're in" |
| question | word, flag of the prompt language, four colored shapes with answers, timer ring, answered count | four big colored shapes only |
| reveal | right answer grows, wrong ones fade, bar chart of picks | right or wrong, points, streak |
| board | top 5 with avatars and slide-in rank changes | my place and gap to the next player |
| finale | podium, confetti in brand colors, group name | final place, coins earned, "Play again" |
| paused | dimmed board, "Paused" | "Paused" |

### Phone Controller

Portrait, thumb-reach layout, haptics on answer. Also works as a full virtual player: when the room has no TV, the phone shows the prompt text above the buttons.

### Profile Card

Avatar on a colored plinth, handle, flag, league badge, level, the languages played as a flag passport, three stats (games, wins, best streak), group badges. The card renders as an image for sharing. A public profile at `/u/[handle]` exists only when the player opts in; under-18 accounts cannot opt in.

### Avatar Editor

Character on the left, category tabs on the right: body color, face, hair or hat, outfit, accessory, plinth, emote. Owned items equip on tap; locked items show the coin price and a "Get" button that opens the shop sheet. Randomize and undo. The avatar is a layered SVG from a fixed part set, so every combination renders on TV, phone, watch and the share card.

### Shop

Daily rotation of 4 featured items, a catalog by category, coin packs, and the Pro card. Every coin price shows its money value on hover or long press in markets that require it. No timers on purchases, no loot boxes, no "only 2 left" scarcity copy.

| State | What shows |
|---|---|
| guest | browse only; "Sign in to save your coins" |
| under 13 | coin packs hidden; earn-only shop |
| 13 to 17 | coin packs behind the store's family approval; monthly cap shown |
| purchase pending | spinner on the pack, coins credited only after server receipt check |
| refunded | coins removed; items bought with refunded coins stay if the balance covers them, otherwise the balance goes negative and earning pays it back |

### Groups Play Tab

Group leaderboard for the week, "Start a game for the group" button, last 5 group games, and members online. Owners can set the default languages for group games.

### Friends

Friend list with presence, requests in and out, invite link and QR. Friends come from a code or a shared group; there is no search by name or email, which keeps strangers out of minors' lists.

## Flows

1. **Guest to player.** Open `/play`, tap Quick play, pick a name from the word-pair generator and a flag, play. After the first game: "Save your coins and rank" sign-in sheet. Sign-in calls `merge_lobby_guest` plus a new `merge_guest_wallet`.
2. **Family game night on TV.** Parent opens Play on a laptop plugged into the TV, Start a game, Who = Family group, Screen = TV. The TV shows the code and QR. Kids scan, the phone opens `/join/CODE` with their avatar from the group. Ten rounds, podium, coins land in each account.
3. **Compete in a group.** Every scored game a member plays counts toward the group's weekly board. Group games count double on that board. Sunday 20:00 local time to the group owner, the board closes and the winner gets a plinth badge.
4. **Friends playing now.** Home shows "Ana is in a Flags room, 6 of 8". Tap joins the room when it is public or friends-only.
5. **Buy a hat.** Shop, tap item, confirm coin spend, item equips. Short of coins: pack sheet opens with the smallest pack that covers the gap.

## Live Activity

Counters on Play home, updated every 5 s from one cached endpoint.

| Counter | Source | Rule |
|---|---|---|
| Players online | Supabase Realtime presence on channel `play:online`, counted server-side | rounded down to the nearest 10 above 100; hidden under 20 |
| Rooms filling | `lobbies` with `status='lobby'` and `listed` and a human joined in the last 2 min | exact |
| Games today | count of `play_results` since local midnight UTC | exact |
| Countries playing | distinct `country` in presence | exact |

The feed shows the last 30 events from `play_events`, newest first, one line each, with avatar and flag: "Ana won Flags in ROOM K7M2QX", "Garcia family started Same word", "12 players in Tiles room". Rules:

- Only accounts aged 18 or more with `feed_public` on appear by handle. Everyone else appears as "A player from Spain" or not at all.
- Friends' events show by handle inside the friends row whatever the public setting, since friendship is mutual and consented.
- Bots never appear as winners in the public feed.
- Events expire after 24 hours.

## Identity

### Profile

Handle (3 to 20 chars, lowercase letters, digits and dots, unique, screened against a block list), display flag (a country chosen by the player, defaulting to the IP country on first run, editable), avatar, league, level, languages played. Under-13 accounts pick from generated word-pair handles only, the same nickname keys the live board uses.

### Level

Lifetime XP sets a level that never drops: level `n` needs `50 * n * (n + 1)` total XP, so level 2 needs 300 XP, level 10 needs 5,500 XP and level 30 needs 46,500 XP. Levels gate nothing purchasable; they unlock a few earn-only cosmetics so long-time players look the part.

### League

Weekly leagues in cohorts of 30, seeded by the player's tier and grouped by time zone band so the Sunday close falls in the evening.

| Tier | Name | Color |
|---|---|---|
| 1 | Parchment | #EBDDBE |
| 2 | Ochre | #E9A23B |
| 3 | Maya | #6FB7C2 |
| 4 | Malachite | #1E7A5A |
| 5 | Lapis | #26428B |
| 6 | Vermilion | #D9381E |
| 7 | Tyrian | #5B1A4A |
| 8 | Gold | ochre on tyrian |

League points come from scored games. Top 7 promote, bottom 5 demote, tier 1 cannot demote, tier 8 holds a top-10 board. A player with no games in a week drops out of cohorts until they play again.

### Skill Rating

A hidden Glicko-2 rating per game mode drives matchmaking for public rooms and bot difficulty. It never shows as a number. Starting values 1500, RD 350, volatility 0.06; updated per game against every other human in the room as pairwise results.

## Economy

### Earn

| Source | Coins | XP and league points | Limit |
|---|---:|---:|---|
| Finish a scored game | 10 | 10 per correct answer | none |
| Place 1st, 2nd, 3rd with 3 or more humans | 15, 8, 4 | 30, 15, 5 | none |
| First game of the day | 20 | 0 | once a day |
| Streak day 7, 30, 100 | 50, 200, 500 | 0 | once each per streak |
| Group game finished | 5 | league points count double on the group board | none |
| Weekly league promotion | 100 | 0 | weekly |
| Rewarded ad | 20 | 0 | 5 a day, ages 13+, free tier only |
| Pro monthly stipend | 300 | 0 | monthly while subscribed |

Daily cap on coins from play: 300. XP has no cap, league points cap at 1,500 a day. Bot-only games pay half coins and no placement bonus. A free player who plays 6 games a day earns about 120 coins a day.

### Spend

| Rarity | Price | Days of free play | Example |
|---|---:|---:|---|
| Common | 150 | 1 to 2 | color, simple hat |
| Rare | 400 | 3 to 4 | outfit, flag cape |
| Epic | 900 | 7 to 8 | animated emote, plinth |
| Legendary | 2,000 | about 17 | full set with TV entrance animation |

Earn-only items come from levels, streaks and league finishes and are never for sale. Every item does the same thing in play: nothing.

### Coin Packs

| Pack | Coins | Price | Coins per $ |
|---|---:|---:|---:|
| Handful | 500 | $0.99 | 505 |
| Pouch | 1,200 | $1.99 | 603 |
| Chest | 3,500 | $4.99 | 701 |
| Vault | 8,000 | $9.99 | 801 |

Coins never expire, as App Store guideline 3.1.1 requires for virtual currency bought with IAP. Bought coins and earned coins share one balance; the ledger keeps the source of every coin so refunds and regional disclosure rules can be honored.

### Anti-Abuse

- **Server-authoritative.** Coins and XP come only from `play_settle(lobby_id)`, a service-role function that recomputes from `lobby_answers` and `lobby_prompts`. Clients never send a coin amount. The existing `lobby_answer` already takes server-computed points from `lobbies-server.ts`.
- **Idempotent ledger.** `coin_ledger` has `unique (reason, ref, user_id)`; settling a lobby twice credits once.
- **Win trading.** Placement bonus pays at most 3 times a day for the same set of human opponents. Two accounts that finish 1 and 2 against each other more than 10 times in a week lose placement bonuses for that pair and land in a review queue.
- **Farming.** Rooms that finish under 40% of the round time on every round, or with all-identical answer timing, settle at zero.
- **Guest wallets.** Guests earn into a device wallet capped at 500 coins; merge on sign-in keeps up to that cap.
- **Refund abuse.** App Store Server Notifications `REFUND` and Play voided purchases debit the ledger. Three refunds in 90 days lock coin pack purchases on that account.
- **Rate limits.** Reuse `lobby_take` keys for create, join and settle.

## Social

### Friends

Mutual friendships only. A request comes from a friend code, a QR, or a shared group. Either side can remove. Blocking hides presence and room invites both ways. Accounts under 13 can add friends only through a family group their parent owns.

### Groups

`learning_groups` gains play: `group_games` links a lobby or live room to a group, and the weekly group board reads league points earned by members. Owner powers: start a group game, set default languages, remove a member. Group chat stays limited to cheers and preset reactions, as today.

### Chat

Lobby chat exists. For under-18 accounts, chat becomes preset phrases and emotes only. Free-text chat for adults runs through the existing message length limit plus a block-list filter; reports go to `live_reports`-style storage with a 30-day purge.

## TV Mode

TV mode reuses the live board stack in `src/lib/stoa`: signed per-room tokens, `live_rooms` phases, server clock for `opens_at` and `closes_at`, and `time_factor` for accessibility. Play adds a bridge from a lobby to a live room and avatars on the board.

### Protocol

1. Host taps Screen = TV. `POST /api/play/tv` creates a `live_rooms` row with `product='polingual'`, `mode='open_floor'`, and `settings.lobby_id` when it comes from a lobby or group. Response: code, host token, topic.
2. The TV opens `/play/tv/[code]` with the host token in memory only. It subscribes to the room topic and renders by phase.
3. Phones open `/join/[code]` from the QR. Signed-in players join with their profile; guests get a nickname key. Join returns a seat token stored in `sessionStorage` for reconnect.
4. Each phase change is a signed event `{seq, phase, idx, opens_at, closes_at}` broadcast on the topic. Clients ignore any event with `seq` at or below the last seen one.
5. Answers go to `POST /api/live/answer` with the seat token and choice index. The server stamps receive time and scores against `opens_at` with the player's `grace_ms`.
6. Finale calls `play_settle` for the room, which credits coins and XP to signed-in players. Guests see their score and a sign-in prompt.

Host controls on the TV: start, pause, skip, end, lock room, kick, and a "Play again" that keeps the room and players. A host phone can act as remote: open `/play/tv/[code]?remote=1` signed in as host.

### Mixed Play

One room can hold players on phones beside the TV and players joining from anywhere. Remote players see the full prompt on their phone. The TV labels them with a small globe.

### Screens

Version 1 targets any screen with a browser: a laptop on HDMI, a smart TV browser, AirPlay or Chromecast tab mirroring. Native tvOS and Android TV apps come after M6 if TV rooms pass 10% of games.

### Failure

| Failure | Behavior |
|---|---|
| TV loses network | room keeps running on server timers; TV resyncs from the latest event on reconnect |
| phone drops | seat token rejoins the same seat within the room lifetime |
| host closes the TV | room pauses after 30 s without host heartbeat; ends after 10 min |
| clock skew | all timing uses server `opens_at` and receive time; phones show a countdown from server offset |

## Store And IAP

### Products

| Product | iOS | Google Play | Web |
|---|---|---|---|
| Coin packs | consumable IAP `com.polingual.coins.500`, `.1200`, `.3500`, `.8000` | consumable in-app products, same ids | Stripe Checkout, one Price per pack |
| Pro | existing subscriptions | Play subscriptions (Android plan) | Stripe subscription |
| Cosmetics | bought with coins only | same | same |

Cosmetics are never sold for money directly. One currency keeps refund math simple and keeps prices identical across stores.

### Store Rules

- **Apple.** Digital goods used in the app go through IAP (guideline 3.1.1). Purchased virtual currency must not expire. Coins bought on the web may be used in the app under 3.1.3(b) multiplatform services as long as the same packs are also sold in the app. Loot boxes would need odds disclosure; Play has none. Validate with App Store Server API and listen to App Store Server Notifications v2 for refunds.
- **Google Play.** Digital goods use Play Billing. Consume each coin pack purchase server-side after crediting, then acknowledge. Listen to Real-time Developer Notifications and the Voided Purchases API.
- **US external links.** Court rulings in 2025 opened link-out purchases in US storefronts for both stores. Rules and fees moved during 2025 and 2026, so M5 starts with a check of current Apple and Google terms before any web link appears inside the apps.
- **Web.** Stripe Checkout with the buyer's account id in `client_reference_id`; credit on `checkout.session.completed`, debit on `charge.refunded` and disputes. Web purchases require an account aged 18 or more as the payer.

### Teens And Children

| Age band | Ads | Coin packs | Social | Profile |
|---|---|---|---|---|
| under 13 | none in Play; COPPA needs verifiable parental consent before ad data sharing | hidden on web; on iOS and Android only through Ask to Buy or Play family approval | friends via parent's family group; preset chat | generated handle; never in public feed |
| 13 to 17 | contextual only, no personalization, as Google applies for under-18 accounts | allowed through the store; web shop needs a parent payer; cap $50 a month on web | friends by code or group; preset chat | chosen handle; never in public feed |
| 18 and over | consented per `Consent.tsx` | allowed | full | opt-in public profile |

Age comes from the existing sign-up age gate; a guest is treated as 13 to 17 until signed in. Apple age rating stays 9+; Google Play target audience stays 13+ unless the founder chooses to enter the Families program. No loot boxes anywhere, which keeps Play clear of Belgian and Dutch gambling rulings and the EU consumer guidance on virtual currencies, which also asks for the real-money price beside a currency price. The shop shows that price in EU and UK storefronts.

## Data Model

New tables in schema `bucket`, RLS on, service role writes coins.

```sql
player_profiles (user_id pk -> auth.users, handle unique, country char(2), avatar jsonb,
  level int, xp bigint, tier smallint, feed_public bool default false, age_band text,
  created_at, updated_at)
coin_ledger (id uuid pk, user_id, delta int, reason text, ref text, source text check in
  ('earn','iap_apple','iap_google','stripe','refund','spend','grant'),
  created_at, unique (user_id, reason, ref))
coin_balances (user_id pk, balance int, updated_at)        -- written in the same tx as ledger
cosmetics (id text pk, slot text, rarity text, price int null, earn_rule text null,
  svg_ref text, active bool)
inventory (user_id, cosmetic_id, acquired_at, via text, pk (user_id, cosmetic_id))
purchases (id uuid pk, user_id, store text, store_txn_id text, product_id text,
  coins int, status text, raw jsonb, created_at, unique (store, store_txn_id))
play_results (lobby_id or room_id, user_id, game text, place int, score int,
  coins int, xp int, settled_at, pk (game_ref, user_id))
league_weeks (id, starts_at, ends_at, band text)
league_members (week_id, user_id, cohort int, tier smallint, points int,
  pk (week_id, user_id))
friendships (a uuid, b uuid, status text, created_at, pk (a, b), check (a < b))
blocks (user_id, blocked_id, pk (user_id, blocked_id))
group_games (group_id, lobby_id null, room_id null, started_by, created_at)
play_events (id, kind text, actor uuid null, public_label text, payload jsonb,
  created_at)                                                -- purged after 24 h
```

Balance changes go through one function, `coin_apply(user, delta, reason, ref, source)`, which inserts the ledger row and updates the balance under a row lock in one transaction. Spending checks `balance >= price` under the same lock. Account deletion cascades every table above; `purchases` keeps store transaction ids with the user id nulled for refund matching.

## API Sketch

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/play/live` | GET | none | counters and last 30 public events, cached 5 s at the edge |
| `/api/play/me` | GET, PATCH | user | profile, balance, tier; PATCH handle, country, avatar, feed_public |
| `/api/play/settle` | POST | service | settle a finished lobby or room; idempotent |
| `/api/play/tv` | POST | user or guest host | create a live room from a lobby or group |
| `/api/play/friends` | GET, POST, DELETE | user | list, request by code, accept, remove, block |
| `/api/play/groups/[id]/board` | GET | member | weekly group board |
| `/api/play/groups/[id]/game` | POST | member | start a group game, posts to group |
| `/api/shop/catalog` | GET | none | catalog, rotation, prices |
| `/api/shop/buy` | POST | user | spend coins on a cosmetic |
| `/api/shop/checkout` | POST | adult user | Stripe Checkout session for a pack |
| `/api/shop/apple` | POST | user | verify a signed transaction, credit |
| `/api/shop/google` | POST | user | verify purchase token, credit, consume |
| `/api/webhooks/stripe`, `/apple`, `/google` | POST | signed | credits, refunds, revocations |

## Build Order

| Milestone | Scope | Exit criteria |
|---|---|---|
| M0 Design | this doc, mockups, founder decisions | critic pass; founder answers the decisions table |
| M0b Brand site | `/brand` gains a sticky section nav plus play color, flags, icons, avatar, illustration, motion, components, voice and do and don't sections; shared `play-kit` parts | `/brand` returns 200 with every section anchor; mockups and brand import one `Avatar`, `Shape` and `Flag`; voice lint clean |
| M1 Identity | `player_profiles`, handle, flag, avatar parts v1 (40 parts), profile card, guest name and flag sheet | profile round-trips on web and iOS; share card renders; account deletion test removes the row |
| M2 Settle and coins | `play_settle`, `coin_ledger`, `coin_apply`, earn table, results screen deltas | settle runs twice and credits once; property test on ledger balance equals sum of deltas; farming rules covered by tests |
| M3 Live activity and friends | presence, counters, `play_events`, friends, blocks, friends row | counters within 10% of a load-test truth at 500 simulated players; under-18 never appears in public feed in tests |
| M4 Groups and TV | `group_games`, group board, start for group, `/api/play/tv`, TV board with avatars, phone controller from lobby | a 10-phone TV game on a real TV over home Wi-Fi with no missed phase; reconnect test passes; group board totals match ledger |
| M5 Shop and IAP | catalog, coin spend, Stripe packs, StoreKit 2 consumables, Play Billing consumables, refund webhooks | sandbox purchase and refund on each store; teen gates enforced server-side; store review passes |
| M6 Leagues | weekly cohorts, promotion and demotion, rank badges, Sunday close job | dry-run week on staging with 300 seeded players; promotion counts match spec |

Each milestone ships behind a flag in `polingual` env and lands on `dev` as its own PR with tests.

## Metrics

| Metric | Target after M4 |
|---|---|
| D1 retention of Play-first users | 25% iOS, 19% Android, matching the hypercasual medians in `GAMES-RESEARCH.md` |
| Games per player per day | 4 |
| Share of games with 2 or more humans | 40% |
| Play to Pro conversion within 30 days | 2% |
| Coin pack payers among monthly actives | 1.5% after M5 |

These are targets for review, set from public benchmarks and no Polingual data yet.

## Founder Decisions

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 1 | Avatar style | flat geometric character from brand shapes; illustrated animal mascots; photoreal | flat geometric "Polly" figure built from brand shapes, renders as SVG everywhere |
| 2 | Coin name | coins; "words"; "pips" | coins, plain and global |
| 3 | Pro coin stipend | none; 300 a month; 2x earn | 300 a month; a multiplier on earn reads as pay-to-win to free players |
| 4 | Rewarded ads for coins | on for 13+; off | on, 5 a day, ages 13+, never for Pro |
| 5 | Public feed handles | adults opt-in; everyone anonymized | adults opt-in, everyone else "a player from Spain" |
| 6 | Under-13 in Play | allowed with parent family group; blocked | allowed through family groups, no ads, no packs on web |
| 7 | Web packs in apps | sell in-app and web, share balance; app-only | share one balance under 3.1.3(b); link-out only after M5 terms check |
| 8 | League count | one league across all games; per game | one league across all games, as `GAMES-RESEARCH.md` Meta Layer proposes |
| 9 | TV native apps | browser only; tvOS and Android TV now | browser only until TV rooms pass 10% of games |
| 10 | Google Play Families program | enter; stay 13+ | stay 13+ for launch |

## Risks

- **Empty rooms.** Live counters on a small base look sad. Bots fill rooms, counters hide under 20 players, and the feed shows rooms opening.
- **Moderation load.** Handles and adult chat need a block list and reports from day one; under-18 accounts stay on preset text.
- **Store policy drift.** Link-out rules changed through 2025 and 2026; M5 re-checks them before shipping any link.
- **Coin inflation.** If players hit the daily cap on most days, raise prices for new items; never cut earn rates on existing players.
