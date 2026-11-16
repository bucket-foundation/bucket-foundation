# Polingual Play Ideal State

Target date: November 2027. Research date: 2026-11-13. Bead: bkt-yz1sz. Game ideas, ad formats, portals and the free to paid funnel come from `GAMES-RESEARCH.md`, cited as [G n].

## Product

Polingual Play is the place a person plays word games across languages with the people they already know: alone on the bus, with family on the living room TV, with a class on the projector, and with friends in a group chat. Every game ends on the words the player missed, and those words become the Pro review deck. One identity carries across web, iOS, Android and the TV: a nickname, an avatar, a flag passport of languages played, a weekly league and a streak. The free tier stays free and ad supported for players 13 and over; children play with no third-party ads and no open chat.

## Where the Code Stands

| Piece | Today | Path |
|---|---|---|
| Web lobbies | rooms of up to 8, join code, guest nickname, five games (`daily`, `same-word`, `flags`, `live`, `tiles`), always-on standing lobbies with bots behind `POLINGUAL_LOBBY_BOTS`, a per-player ISO flag | `polingual/src/app/(site)/play`, `src/lib/lobby`, migrations `20261112*` |
| Host screen | Stoa live rooms: host screen with QR, phones join at `/join/[code]`, six-character codes, up to 4 teams, answer streaks, school mode, reports, room summaries, 3 open rooms per host | `polingual/src/app/(site)/live`, `src/lib/stoa`, migrations `20261109*` |
| Native games | eight games in the iOS and Android apps, a streak goal card with a 100-day goal, flag misses | `apple/Bucket/Sources/Polingual`, `android/polingual` |
| Ads | rail, banner, between rounds and results slots, consent gate | `polingual/src/lib/lobby/ads.ts`, `play/Consent.tsx` |
| Missed words | results card links each missed word to its lesson | `play/LearnWord.tsx` |
| Plans | Monthly $9.99, Yearly $59.99 with a 3-day trial, Family $89.99 for 6, Lifetime $149.99, Student $29.99; Family, Lifetime and Student have no store product yet | `polingual/src/lib/app/plans.ts` |

Missing today: accounts that persist across devices for play, a friends list, a profile or avatar, a league, one streak shared by web and native games, and a TV layout tuned for a couch.

## Research Findings

### Live Activity and Presence

- **Kahoot and Blooket** run on a host screen plus a join code. Kahoot players join by PIN with a nickname only, and Kahoot's student policy says that nickname is the only data it takes from a player without an account [5]. Blooket joins by code, QR or link, and an account is optional [3].
- **Among Us** sets every online game to private by default; the host can flip it public, and public games appear under Find Game [23]. Lobbies hold 4 to 15 players since June 2021 [23].
- **Jackbox** shows a room code on the TV, players type it at jackbox.tv or scan a QR code, and audience members beyond the player cap join the same code [9][10]. The host can hide the code until the real players are in [10].
- **Clash Royale** added a social tab in its March 2026 update [17].
- Polingual's standing lobbies with bots already solve the empty room problem that a public lobby list creates at low traffic.

### Identity

- **Kahoot** offers a generator of friendly two-word nicknames with three re-rolls and filters flagged names, and its own help page says the filter misses names aimed at another student [4]. Stoa's `nicknames.ts` already follows the generator pattern.
- **Duolingo** replaced profile photos with a built avatar (hair, skin tone, body, accessories) [11]; its October 2026 update added Avatar Suits as limited-time event rewards [12].
- **GeoGuessr** ranks duels in Bronze, Silver, Gold, Master and Champion, and hides the numeric rating below Gold [13][14].
- **Brawl Stars** shows a rank frame, icon and pin per rank, with nine frame tiers in 2026, and Supercell reports about ten times more players in Ranked than in the Power League it replaced [20][21].
- Nationality shows up as region boards and flags in many games; we found no primary source on GeoGuessr profile flags. Polingual's flags already mean languages, so the passport carries language flags, and a home country flag stays optional.

### Friends, Family and Groups

- **Duolingo Friends Quest** pairs two friends on a weekly shared goal and needs a mutual follow; Duolingo reports followers are 5.6 times as likely to finish a course [15]. **Friend Streak** links up to 5 partners, and Duolingo reports 22% higher daily lesson completion [16]. Both are company figures. A November 2025 report found empty quest tabs and random partner assignment [24].
- **Roblox** renamed Friends to Connections in July 2025, added Trusted Connections for 13 and over, and in April 2026 reverted to Friends and Trusted Friends; teens 13 to 17 can add adults only when they know them in person, by QR scan or contact import, and connected parents become a child's Trusted Friend [25][26].
- **GeoGuessr Ranked Team Duels** (July 2024) pair two friends who must both be PRO [13].
- **NYT Games** added a friends leaderboard across Wordle, Connections, Spelling Bee and the Mini [18].
- **Family plans**: Duolingo Super Family runs about $119.99 a year for 6 and Max Family about $240 (secondary sources) [19]. Kahoot+ Family lists $90 a year per host [27], and a Kahoot study plan at $19 a month shares with up to 5 accounts [22].

### Big Screen

- Jackbox: one TV, phones as controllers, about 8 to 10 players and up to 10,000 audience members who vote [9][10]. Its family filter has existed since Party Pack 2, and Jackbox recommends it with a strict profanity filter for public play [10].
- Kahoot Present mode puts the question on the shared screen; player caps run from 10 on low tiers to 2,000 on top plans [6].
- Gimkit runs about 500 players in most live modes and 60 in its 2D modes [7]. Blooket allows 60 free and 300 on Plus [3].
- Polingual's Stoa host screen with QR join already matches this pattern.

### Cosmetic Economies and Prices

| Product | Currency | Price | Random paid items | Source |
|---|---|---|---|---|
| Roblox | Robux | 800 for $9.99 on web, about 640 for $9.99 on mobile; creators keep 70% | in some experiences | [28][29] |
| Fortnite | V-Bucks | 800 for $8.99 since 2026-03-19; Battle Pass 800 V-Bucks; Crew grants 800 V-Bucks a month | removed after FTC case | [30][31] |
| Clash Royale | Gems, Pass | Gold Pass $5.99, Diamond Pass $11.99 from April 2026 | reduced; tier skips at 10 Gems a Crown | [32][33] |
| Brawl Stars | Gems, Pass | Brawl Pass about $8.99, Pass Plus about $12.99 (reseller figure) | yes, odds disclosed | [34] |
| Among Us | Stars, Beans | Stars from $1.99, Cosmicubes about 70 to 90 Stars | no | [35] |
| Gimkit | in-game cash | cosmetics bought with play currency; $5 Season Ticket | no | [7] |
| Blooket | tokens | Blooks earned by play; no paid packs found | earned boxes only | [3] |
| Duolingo | gems | streak freeze about 200 gems (secondary) | no | [36] |
| Jackbox | none | packs $24.99 to $34.99 | no | [9] |

- The FTC's 2022 Fortnite settlement: $275 million for COPPA violations and $245 million in refunds for dark patterns that drove unwanted charges [31]. Epic then shipped cabined accounts for players under 13, which block cash purchases, free text chat and custom names until a parent consents [37].
- Apple and Google both require loot box odds disclosure, and Belgium's regulator treats paid loot boxes as gambling [38][39].
- Fortnite cut the Battle Pass price from 1,000 to 800 V-Bucks in the same change that raised V-Bucks prices [30]. Price moves get read as a trust signal.

### Retention and Scale

| Product | Figure | Source |
|---|---|---|
| Kahoot | 1.1 million average monthly EU recipients, six months to January 2025; an undated claim of 70 million monthly uniques | [1][2] |
| Duolingo | more than 10 million users on a 365-day streak in February 2026 | [40] |
| Duolingo | DAU/MAU near 41% in Q1 2026 (secondary); an AppMagic estimate gives 28.6% | [41][42] |
| NYT Games | 11.2 billion puzzles in 2025, 4.2 billion of them Wordle and 1.6 billion Connections | [43] |
| Roblox | 138 million daily users in Q3 2026, down 9% year over year; monthly payers 30 million, down 16% | [44] |
| Fortnite | about 110 to 120 million monthly players, third-party estimate | [45] |
| Among Us | 908.6 million lifetime downloads; about 11,000 Steam concurrents in August 2026 | [46][47] |
| Brawl Stars | one festival in May 2025 lifted monthly revenue about 50% to over $27 million | [48] |

- Duolingo's DAU/MAU spread (41% against 28.6%) shows how much the source matters. Polingual should report its own ratio from `polingual_web_events` and native events.
- Roblox's first yearly drop came in the quarter after it required age checks for chat [28][44]. Safety work has a cost in reach, and the plan budgets for it.

### Families, Teens and Children

- **What families use**: one shared screen with phones as controllers (Jackbox, Kahoot), a shared weekly goal (Friends Quest), and a family plan that gives each member a profile (Duolingo, Kahoot).
- **What teens use**: ranks with visible frames, short ranked matches with friends, seasonal cosmetics, and group chat sharing (Wordle's emoji grid shipped as a Share button on 2021-12-16 after players typed grids by hand [49]).
- **Children and stores**:
  - Under 13 in the US: COPPA needs verifiable parental consent before collecting personal data, and the amended rule's compliance date was 2026-04-22 [G17].
  - Kahoot gives US students under 13 a restricted account without email sign-in and no public sharing [5].
  - Blooket's policy requires verifiable parental consent for under-13 accounts, and most children join without one [8].
  - Duolingo routes under-13s to a child account with a username, a private profile, no ads and no social messaging [50].
  - Among Us gives under-13 accounts Quick Chat, a preset phrase list, until a parent unlocks more [51].
  - Roblox requires a face estimate or ID check before chat since 2026-01-07, sorts users into six age bands and limits chat to nearby bands [28].
  - Apple's Kids Category bars third-party ads and analytics; Google Play needs Families self-certified ad SDKs [G27][G28].
  - Alabama settled with Roblox for $12.2 million, adding parent controls over contacts and Robux transfers [52].

## Ideal State

### Day in the Life: Solo Player

Maya, 24, studies Spanish and knows some French. On the train she opens the Polingual app and the Play tab shows today's Polyword, her league standing (6th of 30 in Silver, 2 days left), and two friends online. She solves Polyword in four guesses; the share card shows a Spanish flag over a grid of colored tiles, and she posts it to her group chat. She plays one ranked Flag Duel against a matched player, wins 7 to 5, and sees her Gold progress bar move. The results card lists the three words she missed with a "Learn these" button; she adds them to review. At lunch a push tells her Sam passed her in the league; she plays one Flag Tiles run to take the spot back. Her streak reads 41 days, kept by any game on any device. She sees one interstitial all day, after her third game.

### Day in the Life: Family on a TV

The Okafor family, two parents and kids aged 9 and 14, has the Family plan. After dinner the 14-year-old opens polingual.com/tv on the smart TV browser (or casts from a phone), and the TV shows a room code and a QR code. Everyone scans with a phone; the 9-year-old joins on a family tablet through the child profile, which shows a preset nickname and avatar and no chat box. They pick Family Mix: picture words in English, Igbo and French with audio. The TV reads each word aloud, phones show four flag or picture choices, and the round recap plays each word with a native speaker. The family's weekly Family Quest (play 5 games together) ticks to 4 of 5. Nobody sees an ad: the Family plan removes them, and child profiles never see third-party ads on any plan.

### Day in the Life: Classroom

Ms. Ruiz teaches Spanish 2 to 28 students aged 15 and 16. She signs in on the projector computer, opens `/live`, picks her unit's word list and turns on school mode. Students join by code with generated nicknames; the roster matches the class list she uploaded once, so the report credits each real student without a public profile. They play Flag Duel in four teams for 12 minutes. The projector shows the question and a live team bar; phones show only the choices. At the end the class summary lists the 10 most missed words and each student's accuracy, and she assigns those words as homework review with one tap. Student play shows no ads. The free teacher tier covers 40 players; a school license adds reports across classes and larger rooms.

### Day in the Life: Friend Group

Five friends, 16 to 19, share a crew called "lingo gremlins". On Friday night one opens a private room from the crew page and the other four get an invite. They play Forehead on one phone in person, then switch to an online Flag Duel with two of them remote. The crew page shows a weekly crew score against other crews in their league, each member's rank frame and passport, and the cosmetic each earned from this season's Atlas Pass. Chat inside the crew is free text for members 13 and over, filtered, with report and block on every message. A shared invite link brings a sixth friend in; the crew gets a joining bonus of passport stamps for both of them.

### North-Star Metrics

The north star is **weekly learning players**: players who play on at least 3 days in a week and add at least one missed word to review.

| Metric | Target by November 2027 | Why |
|---|---|---|
| Weekly learning players | 50,000 | ties play to learning, the Pro bridge |
| D1 / D7 / D30 retention, app | 40% / 20% / 10% | above the hypercasual medians in [G21] |
| DAU / MAU | 30% | between Duolingo's two estimates [41][42] |
| Share of sessions with a friend, family or class | 35% | the social graph carries retention |
| Shares per 100 daily players | 8 | Wordle-style growth |
| Free to paid conversion of monthly players | 3% | RevenueCat freemium range [G32] |
| Interstitials per free session, 13 and over | 0.5 or fewer | ad load guardrail |
| Third-party ads served to a child profile | 0 | hard guardrail |

### Economy

- **One earned currency, stamps.** Every game pays stamps for play and accuracy; stamps buy cosmetics and power-ups for Flag Duel between rounds. Stamps cannot be bought with money.
- **Cosmetics priced in money, shown in money.** Avatar items, rank frame skins, flag card backs and TV themes sell for $0.99 to $4.99 each with the price in local currency. No premium currency, no bundles that leave leftover currency, no random paid items. This removes the pattern behind the Fortnite settlement [31] and the loot box rules [38][39].
- **Atlas Pass, a season of 10 weeks.** A free track of stamps and cosmetics for every player, and a paid track at $4.99 that Pro includes. Rewards come from playing any game and from learning missed words, so the pass also pays for review.
- **Pro stays the main product.** Pro removes ads and opens the learning layer [G]. Family Pro gives 6 profiles, child profiles included.
- **Children.** Child profiles earn stamps and cosmetics from play; they see no store and no pass upsell. A parent can buy an item for the child from the parent profile.
- **Refunds.** Any cosmetic bought in the last 14 days and unused can be refunded from the profile, one tap.

### Social Graph

| Layer | Size | How you join | Ages |
|---|---|---|---|
| Friends | up to 200 | mutual add by code, QR or link | 13 and over; under 13 only with a parent's approval, through the family |
| Family | up to 6 | Family plan owner invites | all ages; parent manages child profiles |
| Class | up to 40 free, more on a school license | teacher roster plus join code | all ages, school mode, no profile shown |
| Crew | up to 30 | invite from a member | 13 and over |
| League | 30 per week | matched by activity | 13 and over see names; under 13 sees a league of bots and family |
| Rooms | 2 to 8 players, 2 to 40 on the TV, audience above that | code, QR, lobby list | lobby list for 13 and over |

Presence shows which friends are online and in which room, with a one-tap join when the room is open. Chat is free text for 13 and over inside friends and crews, filtered with report and block; public rooms get preset phrases and emotes only, for everyone. Under 13 gets preset phrases everywhere, the Among Us Quick Chat model [51].

### Identity

- **Nickname**: picked from the generated list in `stoa/nicknames.ts`; custom names for 13 and over pass the filter and a review queue.
- **Avatar**: a built avatar with the Duolingo builder pattern [11], with outfit items from stamps, the pass and the shop.
- **Passport**: one stamp per language played, levels per language, shown on the profile and in every room.
- **Home flag**: optional, off by default, never shown for child profiles.
- **Rank**: one weekly league across games, plus a ranked Flag Duel rating with divisions; the number stays hidden below Gold, the GeoGuessr rule [14].

### What to Copy

| From | Copy |
|---|---|
| Kahoot, Blooket | join by code with nickname only; generated nicknames; host screen plus phones |
| Jackbox | TV shows code and QR; audience mode beyond the player cap; family filter on by default |
| Duolingo | weekly league of 30; Friends Quest and Friend Streak; built avatar; child accounts with no ads and no messaging |
| Wordle, NYT | one daily puzzle free; share card; friends leaderboard |
| GeoGuessr | divisions with a hidden number below Gold; team duels for friends |
| Brawl Stars, Clash Royale | rank frames and pins; a free pass track; social tab |
| Gimkit | earn in-game currency per answer and spend it between rounds |
| Among Us | private by default; preset chat for children |
| Roblox | teens add adults only from in-person QR; parents as a child's trusted contact |

### What to Avoid

| Pattern | Seen in | Why |
|---|---|---|
| premium currency with odd pack sizes | Robux, V-Bucks | hides price; led to the FTC case [31] |
| random paid items | Brawl Stars, earlier Fortnite | gambling rules in Belgium, odds rules in stores [38][39] |
| paid ranked play | GeoGuessr team duels | splits friends who do not all pay [13] |
| open chat for unverified ages | Roblox before 2026 | lawsuits and settlements [52] |
| streak pressure with paid repair | Duolingo freezes | anxiety for children; a free weekly freeze replaces it |
| a public lobby list for children | Among Us public games | strangers in rooms with kids |

## Roadmap

Each phase ships behind a flag, with web and native in step.

### Phase 1: One Player, December 2026 to February 2027

- Play account linked to the existing auth (`src/lib/app/auth.ts`); guest play stays, and a guest upgrades with history kept.
- Age gate at first run: under 13, 13 to 17, 18 and over, stored on the profile; under 13 gets a child profile with the rules above.
- One streak across web lobbies and native games; extend `lib/app/streak.ts` to read lobby play.
- Profile with nickname, passport and a starter avatar.
- Missed words from lobby and Stoa results land in the same review deck the native games use.
- Ship store products for Family, Student and Lifetime in `plans.ts`.

### Phase 2: Friends and the TV, March to May 2027

- Friends by code, QR and link; presence and one-tap join for rooms in `bucket.lobbies`.
- Weekly league of 30 across all games.
- `/tv`: the Stoa host screen with a couch layout, big type, audio on, family filter on, audience mode above 8 players.
- Friend Quest and Family Quest.
- Polyword and Flag Duel from [G] ship on the shared lobby code.

### Phase 3: Classroom and Crews, June to August 2027

- Teacher accounts with rosters on top of Stoa school mode; class summary from `live_summaries`; assign missed words as homework.
- School license pricing and a student data agreement page beside `/live/student-data`.
- Crews for 13 and over with crew score, invites and filtered chat with report and block.
- Ranked Flag Duel with divisions and rank frames.

### Phase 4: Seasons and Reach, September to November 2027

- Stamps, the cosmetics shop with money prices and 14-day refunds, and the first Atlas Pass.
- Discord Activity and portal builds from [G] for top-of-funnel reach.
- Voice Atlas and Forehead from [G].
- Review against the north-star targets and set the 2028 plan.

### Risks

- Classroom and family use bring COPPA and student data work in every phase; legal review sits before Phase 1 ships the age gate.
- Low traffic leaves leagues and lobby lists thin; bots fill seats as they do today, and leagues count only players active that week.
- Moderation cost grows with chat; preset phrases ship first and free text follows the report tooling.

## Sources

Each bracketed number is an `[empirical: source, 2026-11-13, web search]` citation. Vendor and secondary figures are directional.

1. Kahoot DSA recipients page. https://trust.kahoot.com/digital-services-act/
2. TechCrunch on Kahoot. https://techcrunch.com/?p=1588116
3. AhaSlides, Blooket review 2026. https://ahaslides.com/blog/blooket-review/
4. Kahoot, nickname generator and filter. https://kahoot.com/blog/2017/11/09/generate-funny-nicknames-players-live-kahoots/ , https://support.kahoot.com/hc/en-us/articles/115002201267
5. Kahoot age restrictions and teacher trust page. https://support.kahoot.com/hc/articles/115001642328 , https://trust.kahoot.com/teachers/
6. Kahoot player limits and Present mode. https://support.kahoot.com/hc/en-us/articles/115003072287
7. Gimkit pricing and player caps. https://nibble-app.com/blog/gimkit-pricing-cost
8. Common Sense privacy report, Blooket. https://privacy.commonsense.org/privacy-report/Blooket
9. Jackbox pack listings and prices. https://www.xbox.com/en-US/games/store/x/9MTC1LDSR6T2 , https://www.dekudeals.com/items/the-jackbox-party-pack-10 , https://psprices.com/region-us/game/9202042/the-jackbox-big-bang-bundle , https://jackboxgames.com/how-to-play-party-pack-nine-remotely
10. Jackbox Party Pack 8 streaming, moderation and accessibility. https://www.jackboxgames.com/streaming-moderation-accessibility-features-jackbox-party-pack-eight/
11. Duolingo avatar creator. https://blog.duolingo.com/avatar-creator/
12. Duolingo October 2026 update. https://blog.duolingo.com/october-2026-update/
13. GeoGuessr ranked team duels launch and modes. https://lr.eu.psf.lt/r/geoguessr/comments/1dovt46/ranked_team_duels_launch_july_1st/lb3cvlf/?context=3 , https://shapes.inc/fandom/geoguessr/game-modes
14. GeoGuessr guide to ranked play. https://geoguessr.freshdesk.com/support/solutions/articles/206000056733-a-guide-to-geoguessr-s-ranked-play
15. Duolingo Friends Quests and social features. https://blog.duolingo.com/friends-quests/ , https://blog.duolingo.com/friends-social-features/
16. Duolingo Friend Streak. https://blog.duolingo.com/friend-streak/
17. Clash Royale March 2026 update. https://gamingonphone.com/news/clash-royale-march-2026-update-is-bringing-two-new-heroes-new-trophy-road-arenas-social-tab-and-more
18. NYT Games leaderboard launch. https://gamesbeat.com/new-york-times-games-launches-leaderboard-to-celebrate-daily-wins
19. Duolingo family plan prices, secondary. https://duolingoguides.com/?p=7322
20. Brawl Stars November 2026 release notes. https://www.gameleap.com/articles/brawl-stars-release-notes-all-changes
21. Supercell, Ranked is dead and Ranked is back; 2025 in review. https://supercell.com/en/games/brawlstars/blog/news/ranked-is-dead-and-ranked-is-back/ , https://supercell.com/en/games/brawlstars/blog/community/2025-in-review-franks-blog-post
22. Kahoot plans, secondary. https://cuemath.com/blog/kahoot-pricing/
23. Among Us 15-player lobbies and online play. https://innersloth.com/among-us-3rd-birthday-15-player-lobbies , https://www.pcgamer.com/among-us-is-getting-15-player-lobbies , https://breezewiki.discard.no/among-us/wiki/Online
24. Friend Quest bug report, November 2025. https://piunikaweb.com/2025/11/05/duolingo-friend-quest-bugged/
25. Roblox, Trusted Connections and age-based communication, July 2025. https://corp.roblox.com/newsroom/2025/07/advancing-safety-on-roblox-with-age-based-communication , https://techcrunch.com/2025/07/17/roblox-introduces-new-safeguards-for-teens-including-age-estimation-tech/
26. Roblox, Expanding Trusted Friends, April 2026. https://about.roblox.com/newsroom/2026/04/expanding-trusted-friends
27. Kahoot+ Family pricing. https://triviamaker.com/kahoot-pricing/ , https://pricingsaas.com/companies/kahoot
28. Roblox, age checks required to chat, 2026-01. https://about.roblox.com/newsroom/2026/01/roblox-age-checks-required-to-chat
29. Robux prices 2026; Roblox Developer Exchange. https://rowatcher.com/news/robux-prices-bundles-2026-guide , https://create.roblox.com/docs/production/monetization/developer-exchange
30. Fortnite V-Bucks and Battle Pass price change, March 2026. https://www.altchar.com/game-news/fortnite-v-bucks-prices-increasing-on-march-19-as-battle-pass-costs-drop-aPgqx4g3fEYf
31. NPR, Epic and FTC settlement, 2022-12-19. https://www.npr.org/2022/12/19/1144119348/fortnite-epic-games-ftc-child-privacy-dark-patterns-deceptive-design
32. Supercell, Pass Royale price changes. https://supercell.com/en/games/clashroyale/blog/news/pass-royale-price-changes-2/
33. Clash Royale June 2026 update and May 2026 progression rework. https://supercell.com/en/games/clashroyale/blog/release-notes/june-update-2026/ , https://gamingonphone.com/news/clash-royale-may-2026-update-to-bring-collection-levels-mastery-rework-and-progression-overhaul/
34. Brawl Stars gem and pass prices, reseller. https://topuplist.com/blogs/detail/brawl-stars-gems-price-best-value-packs-2026
35. Among Us Stars and Cosmicubes. https://among-us.fandom.com/wiki/Stars
36. Duolingo streak freeze price, secondary. https://duolingoguides.com/how-much-is-a-streak-freeze-on-duolingo/
37. Epic, cabined accounts. https://www.epicgames.com/site/news/introducing-cabined-accounts-a-new-way-for-kids-to-join-the-metaverse?lang=en
38. App Store loot box odds rule. https://www.pocketgamer.biz/app-store-now-requires-developers-to-list-loot-box-odds
39. Google Play loot box odds rule. https://www.pocketgamer.biz/google-play-developers-must-now-disclose-loot-box-odds
40. Pocket Gamer.biz, 10 million Duolingo users on a 365-day streak. https://www.pocketgamer.biz/more-than-10-million-duolingo-users-have-a-365-day-streak
41. Duolingo DAU/MAU, secondary. https://axis-intelligence.com/?p=36752
42. Udonis, Duolingo statistics. https://www.blog.udonis.co/mobile-marketing/mobile-apps/duolingo
43. Engadget, NYT Games 2025 year in review. https://www.engadget.com/gaming/nyt-games-has-a-year-in-review-thing-now-too-203000878.html
44. Roblox Q3 2026 results. https://www.ggrecon.com/articles/roblox-daily-players-fall-q3-2026/
45. Fortnite player count estimate. https://www.esports.net/news/fortnite-player-count
46. Udonis, Among Us player count. https://www.blog.udonis.co/mobile-marketing/mobile-games/among-us-player-count
47. Steambase, Among Us. https://steambase.io/apps/945360
48. Mobidictum, May 2025 revenue surge. https://mobidictum.com/top-mobile-games-revenue-surge-may-2025/
49. Wikipedia, Wordle. https://en.wikipedia.org/wiki/Wordle
50. Common Sense privacy report, Duolingo. https://privacy.commonsense.org/privacy-report/duolingo
51. ESRB, what parents need to know about Among Us. https://www.esrb.org/blog/what-parents-need-to-know-about-among-us/
52. Alabama Attorney General, Roblox settlement. https://www.alabamaag.gov/attorney-general-marshall-announces-12-2-million-settlement-with-roblox-to-ensure-child-safety/
