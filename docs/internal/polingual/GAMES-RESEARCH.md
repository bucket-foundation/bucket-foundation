# Polingual Games Research

Research date: 2026-11-12. Model under test: every game is free with ads for players who do not pay; Polingual Pro removes ads and opens the learning layer.

Polingual already ships eight games in the app (Daily Set, Mini, Word Groups, Same Word, Speed Match, Which Voice, Flags, Letter Sprint) and web lobbies at `/play` with bots and an AdSense rail, banner, between-rounds and results slot (`polingual/src/lib/lobby/ads.ts`).

## Ranked Game Ideas

| Rank | Game | Pattern borrowed | Build on | Session | Ad fit |
|---|---|---|---|---|---|
| 1 | Flag Duel | Kahoot, Gimkit, Duolingo leagues | `/play` lobbies | 4 to 6 min | between rounds, results |
| 2 | Polyword | Wordle | Daily Set | 2 to 4 min | results, rewarded archive |
| 3 | Flag Tiles | Piano Tiles, runners | Speed Match | 1 to 3 min a run | rewarded continue, interstitial between runs |
| 4 | Forehead | Heads Up | Which Voice audio | 60 s rounds | results only |
| 5 | Voice Atlas | GeoGuessr | Which Voice, Flags | 3 to 5 min | results, rewarded extra round |
| 6 | Babel Match | match-3 | Same Word | 3 to 8 min | rewarded moves, interstitial between levels |
| 7 | Shift | Typeshift | Mini | 3 to 6 min | results, rewarded hint |
| 8 | Word Snake | agar.io and .io arenas | lobbies, realtime | 3 to 10 min | interstitial on death, rail |

Ranking weighs four things: reuse of shipped code and data, fit with the flag and photon data, how often the loop opens an ad slot without breaking play, and how cleanly a missed word leads to the paid learning layer.

### 1. Flag Duel

A live room of 2 to 30 players, joined by code or from the always-on lobby list, plays ten rounds: a word appears in one of the room's languages, every player taps the flag of its language or the matching word in their own language, and speed plus accuracy scores points. Correct answers pay coins that buy one power-up between rounds (freeze a rival, double points, a shield, a 50/50), the Gimkit economy that keeps students answering after they lead [24][25]. Bots fill empty seats, which the lobby code already does. A weekly league of 30 players promoted and demoted by points, the Duolingo structure, gives the reason to come back on a fixed day [11][12]. Rooms map to classrooms and friend groups, so a teacher can host from a word list, the Blooket and Kahoot use. Ads: the between-rounds slot after round five and the results slot; nothing during a round. Paywall hook: the results card lists the player's missed words with a "Learn these" button that opens Pro review.

### 2. Polyword

One five or six letter word a day in the player's target language, six guesses, green and yellow tiles, the Wordle loop that held 12 to 15 million daily players in estimates from May 2026 [15]. The twist is a flag row: after each guess the player sees the answer's meaning in one of their other languages, one more language per miss, so a miss teaches a translation. The share card is an emoji grid headed by the language flag, built for group chats the way Wordle's grid spread. One puzzle a day per language keeps it scarce; streaks and a calendar give replay. NYT keeps Wordle, Connections, Strands and Pips free and sells the archive [14], so Polingual does the same: today's puzzle is free, past puzzles cost a rewarded ad each for free players and are open in Pro.

### 3. Flag Tiles

Four lanes, each headed by a flag; words fall down the lanes and the player taps the lane whose flag matches the word's language, or in the learning variant the lane holding the word's translation. Speed rises every ten tiles, the Piano Tiles and runner curve, and a run ends on the first miss. Runs last one to three minutes and hypercasual players average about four sessions a day [21]. Replay comes from a personal best, a daily seed shared by all players, and a friends leaderboard. A run end opens the two monetized moments the format is known for: an opt-in rewarded ad to continue once, or an interstitial before the next run, one per break [20]. Missed words feed the Pro review deck.

### 4. Forehead

A party mode for one phone in a room: the player holds the phone to the forehead, the screen shows a word in a language the friends speak, the friends give clues in any language, tilt down scores and tilt up passes, sixty seconds a round, the Heads Up loop [22]. Decks come from the shipped language decks; a mixed deck shows a flag per card so clue-givers know which language the word is in. The end screen replays every card with audio and translation, which is the learning beat, and a recorded clip with the flag overlay is the share. Ads appear on the results screen only, since a party passing a phone around will not sit through a video. Extra themed decks and the per-card review are Pro.

### 5. Voice Atlas

Five rounds a day: the player hears a native speaker's sentence, or sees a street sign or menu photo, and drops a pin on a world map; points scale with distance from the true country, the GeoGuessr scoring that runs its daily challenge [16]. A correct language earns a flag stamp in a passport, the collection loop. Duels let two players race the same five clips. Polingual's Which Voice and Flags data already pair audio with languages, so the content cost is the photo set and a map. GeoGuessr has moved even its daily challenge behind PRO [16], which leaves room for a free daily version; Polingual keeps the daily free, offers one extra round for a rewarded ad, and puts unlimited rounds plus the transcript and word breakdown of each clip in Pro.

### 6. Babel Match

A match-3 board where tiles are words in several languages with small flags; three tiles that mean the same thing in a line clear, so "dog", "perro" and "chien" match the way three red gems would. Levels have move limits and goals (clear twenty words for "food"), which is the match-3 structure players already know. The meaning check uses the photon translation links already in the deck slice. Rewarded ads give five extra moves when a level fails; an interstitial plays between levels after level ten. Long level maps suit the app more than portals. Pro adds level packs per topic and a review of every word cleared.

### 7. Shift

Three to five columns of letters slide up and down, and the player spells words across the center row, the Typeshift design [23]. The Polingual version builds each board from two languages, so a column set spells words in both, and the daily goal is to use every letter once. Clue puzzles give a meaning in the player's language and ask for the target-language word. A daily board with a global time leaderboard drives replay [23]. Hints cost a rewarded ad for free players. It is the hardest board generator on this list, which puts it seventh despite good fit.

### 8. Word Snake

A browser arena where each player steers a snake through floating words; eating words in the room's target language grows the snake, eating a decoy shrinks it, and bigger snakes swallow smaller ones, the agar.io loop that still fills the .io section of Poki [26]. Rounds are short and death is instant, which suits an interstitial on death with a frequency cap and a rewarded respawn at current size. It would draw the widest portal traffic of the eight, and it carries the weakest learning signal and the highest server cost, since it needs a realtime position server beyond the turn-based lobby code. Build it after Flag Duel proves lobby traffic.

### Meta Layer

Every game feeds four shared systems: one weekly league across all games, one streak that any game extends, one flag passport that stamps each language played, and one "missed words" list that becomes the Pro review deck. The league, streak and passport keep free players playing; the missed-words list is the bridge to paid.

## Patterns From Hit Games

| Game | Core loop | Session | Replay hook | Multiplayer | Polingual mapping |
|---|---|---|---|---|---|
| Wordle | six guesses at one word | 2 to 4 min | one a day, share grid | async, social share | Polyword |
| NYT Connections, Strands | group or find words | 3 to 6 min | one a day, archive paywall | none | Word Groups exists |
| Duolingo leagues | XP from lessons ranks you in 30 | all week | promotion, Sunday deadline | async league | meta league |
| Kahoot | host shows question, players race | 10 to 20 min | host runs a new set | live room | Flag Duel |
| Gimkit, Blooket | answer to earn currency, spend in a mode | 10 to 15 min | new modes on one question set | live room | Flag Duel power-ups |
| Quizlet Match, Blast | pair six terms; shoot the right asteroid | 1 to 2 min | best time | solo | Speed Match exists |
| Piano Tiles, runners | tap lanes as speed rises | 1 to 3 min | best score | leaderboard | Flag Tiles |
| match-3 | swap to line up three | 3 to 8 min | level map, lives | none | Babel Match |
| Typeshift | slide columns to spell | 3 to 6 min | daily board, time board | leaderboard | Shift |
| GeoGuessr | guess location, score by distance | 3 to 5 min | daily five, duels | ranked duels | Voice Atlas |
| Heads Up | guess the word on your forehead | 60 s rounds | new decks | same room | Forehead |
| agar.io and .io | eat, grow, avoid | 3 to 10 min | instant restart | realtime arena | Word Snake |

- Quizlet Match shows six pairs and adds a one second penalty per wrong guess; Blast needs a set of six or more terms [18].
- Blooket's Gold Quest pays gold per correct answer and lets players steal from each other; Tower Defense pays tokens to build towers [25]. Gimkit pays money per answer for upgrades and power-ups [24].
- Duolingo leagues rank about 30 users by weekly XP across ten tiers [11][12]. A 2026 survey of 191 learners links competition beliefs with engagement, and no public study isolates a causal effect of leagues [11].
- NYT reported Wordle as its most-played game with 5.3 billion plays in 2024 per a secondary source, and Wordle brought tens of millions of new users in 2022 [15].
- Hypercasual medians: D1 25% iOS and 19% Android, D7 6% and 3% (Tenjin) [21].

## Web Game Platforms

| Platform | Revenue share | Required SDK | Submission rule | Fit |
|---|---|---|---|---|
| Own site `/play` | AdSense share on our own traffic | AdSense, H5 Games Ads after approval | playable H5 games on the site [9] | first; keeps the Pro link |
| CrazyGames | ad revenue share, rate in developer terms | CrazyGames SDK, only its ads | Basic Launch without ads, then Full Launch on metrics [2] | second; takes multiplayer |
| Poki | 50/50 on Poki traffic, 100% on your own traffic [1] | Poki SDK, no other ad or tracking SDK | small initial download, curated acceptance [1] | third; good reach, tight rules on external links |
| YouTube Playables | revenue share in a pilot with selected creators [4] | Playables SDK after onboarding | certification review [4] | try Polyword; rev share uncertain |
| Discord Activities | IAP fee 15% up to $1M, then 30% [5] | Embedded App SDK | open to all developers since 2024 [5] | Flag Duel for servers; paid SKUs |
| Telegram Mini Apps | Stars payments, third-party ad networks | Telegram WebApp API | open | low; crypto-heavy audience |
| GameDistribution | 33% kept by the network per a competitor's blog [3] | GD SDK | open | low; syndication strips the brand |
| Facebook Instant Games | not published | Instant Games SDK, banners ending by 2027-03-31 [7] | Zero Permissions migration deadlines in 2026 [7] | skip |
| itch.io | 10% default, developer-set [8] | none | open | showcase only |
| Y8 | revshare page exists, terms not found [8] | Y8 SDK | open | skip |

Portal rule that shapes the plan: CrazyGames allows only ads served through its SDK [19], and Poki requires written consent for any third-party plugin or external service [1]. A portal build is a lite top-of-funnel version that keeps the portal's ads, links to polingual for the full game where the portal permits it, and carries no Polingual ads or paywall. Check each portal's current requirements page before submission.

## Ads

### Formats

- **Rewarded.** Opt-in video for a stated reward. Unity and Tapjoy data across eight apps links each rewarded view with higher 30-day retention, 53% to 68%, with selection bias [10]. CrazyGames forbids rewarded buttons that do nothing [19].
- **Interstitial.** Full screen at a natural break. CrazyGames caps midgame ads at one every 3 minutes and bans pairing a midgame ad with a rewarded continue in the same break [19]. Google's Ad Placement API puts `adBreak()` calls at transitions and takes a `data-ad-frequency-hint`, 30 seconds in Google's example [6]. A Unity A/B test on Dice Hunter found no retention loss from interstitials after an intro period [10]; a 2025 AdQuality analysis found higher churn after interstitials than after rewarded, above 20% for some iOS games [10].
- **Rails and banners.** Display units beside or under the play area. Polingual's web code already places a 160 or 300 rail above 1000 px and a 320x50 banner on phones. Meta is retiring banners in Instant Games by 2027-03-31 [7].
- **H5 Games Ads.** AdSense formats for HTML5 games through the Ad Placement API: interstitial and rewarded via `adBreak()`. Any publisher owning an H5 games site may apply under AdSense policies [9]. Google documents one-way revenue sharing for H5 games today [9].

### eCPM

| Format | US app | Web H5 | Source |
|---|---|---|---|
| Rewarded | $16 to $20, range $13 to $30 across sources | $4 to $15 blended | [13] |
| Interstitial | $5 to $14 | lower than app | [13] |
| AdMob global, 2025 | rewarded $8 to $18, interstitial $2.50 to $5 | n/a | [13] |

All eCPM figures are vendor-published. Use Polingual's own AdSense and AdMob reports as the baseline once traffic runs.

### Teens and Children

- **Under 13.** The amended COPPA Rule took effect 2025-06-23 with compliance due 2026-04-22; disclosing a child's data to third parties for ads needs separate verifiable parental consent, and ad use is never "integral" to the service [17]. Apps in Apple's Kids Category may not include third-party ads or analytics, with a narrow contextual exception that needs human-reviewed creatives [27]. Google Play apps that serve children must use Families self-certified ad SDKs [28].
- **13 to 17.** Google turns off ad personalization and filters sensitive categories for signed-in users under 18 across its publisher ad products, and in the US uses age estimation to apply it [29]. EEA and UK design codes bar personalized ads to under-18s [29].
- **Polingual rule.** Users under 13 see no third-party ads in any build; users 13 to 17 and users of unknown age get non-personalized requests (AdMob `tagForChildDirectedTreatment` or under-age-of-consent tags plus max content rating G or PG; AdSense non-personalized). Portal builds inherit the portal's own handling.

## Free to Paid Funnels

- **Duolingo.** Q3 2026: 64.9M DAU and 13.1M paid subscribers [34], about 20% of DAU by our arithmetic. FY2025 subscriptions were $873.4M of $1,037.6M revenue, about 84%; ads about 7% [30]. Free users spend energy per exercise and refill it by waiting or watching a rewarded ad; Super removes the limit and the ads [31]. The pattern: a rewarded ad and the subscription solve the same pain.
- **NYT Games.** Daily Wordle, Connections, Strands and Pips stay free; the archive of 10,000+ puzzles and the Crossword sit behind the subscription [14]. Wordle drove record games subscriber growth in Q1 2022 [15].
- **GeoGuessr.** Moved the daily challenge behind PRO [16]; duels and unlimited play are paid. A strict gate, which leaves a free daily geography game open for others.
- **Blooket and Gimkit.** Teacher pays for modes and reports, students play free; Blooket's free tier is the more generous of the two [24].
- **Benchmarks.** RevenueCat 2026: median Day-35 trial-to-paid 10.7% on hard paywalls and 2.1% on freemium; trials of 17 to 32 days convert 42.5% against 25.5% for trials under four days [32]. In free-to-play games 1% to 3% of DAU buy anything [33], which is why ads carry the free tier.

## Recommended Ad and Paywall Layout

### Free Player

| Moment | Web `/play` and site | iOS and Android app |
|---|---|---|
| First session | no ads in the first game | no ads in the first game |
| During a round | none | none |
| Lobby and menus, desktop | 160 or 300 rail at 1000 px and wider | n/a |
| Lobby, phone | 320x50 banner below the lobby list | none |
| Between rounds in Flag Duel | one display unit after round five | none |
| Run or game end | H5 `adBreak` interstitial, at most one per 3 minutes | AdMob interstitial, at most one per 3 minutes, never two games in a row |
| Opt-in | rewarded: continue once, extra daily puzzle, hint, extra Voice Atlas round | rewarded: same list, plus energy refill if energy ships |
| Results | results display unit plus the missed-words card | missed-words card |

One rule binds the table: each break holds one interstitial or one rewarded offer [19].

### Paywall

Polingual Pro removes every ad and opens the learning layer: FSRS review of every missed word from every game, the full puzzle archive, all language decks, Forehead theme decks, Babel Match level packs, and per-clip transcripts in Voice Atlas. Four entry points carry the paywall:

1. The missed-words card on every results screen, "Learn these 4 words", opens a Pro preview with the first word's lesson visible.
2. The archive and the extra-round buttons offer "Watch an ad" and "Go Pro" side by side.
3. After the third interstitial in a day, the next game end shows a one-tap "Play without ads" sheet once.
4. A seven-day streak milestone shows the player's week of missed words and offers the trial.

Offer a free trial of two to four weeks on annual Pro, the length RevenueCat links with the highest trial conversion [32]. Keep the daily games free forever, since the free daily habit is what NYT and Duolingo monetize [14][30].

## Sources

Each bracketed number is an `[empirical: source, 2026-11-12, web search]` citation. Vendor-blog figures are directional.

1. Poki for Developers, SDK site and deals terms, sdk.poki.com; third-party guide app.cinevva.com/guides/publish-game-poki. https://sdk.poki.com/ , https://sdk.poki.com/deals , https://app.cinevva.com/guides/publish-game-poki
2. CrazyGames requirements, docs.crazygames.com/requirements/intro/ and developer terms 2025-08-18. https://docs.crazygames.com/requirements/intro/ , https://files.crazygames.com/documents/developer_terms_20250818.pdf
3. Playgama, alternatives to GameDistribution, vendor blog. https://playgama.com/blog/business-faqs/alternatives-to-gamedistribution-for-html5-distribution/
4. YouTube Playables monetization and certification, Google Developers. https://developers.google.com/youtube/gaming/playables/reference/monetization
5. Discord, Activities open to all developers and fee change, via Pocket Gamer.biz and Gigazine, 2024. https://www.pocketgamer.biz/discord-activities-opens-up-to-all-developers-to-make-games-on-the-platform , https://gigazine.net/gsc_news/en/20240607-discord-monetization-terms
6. Google Ad Placement API and H5 game structure. https://developers.google.com/ad-placement/apis , https://developers.google.com/ad-placement/docs/html5-game-structure
7. Meta Instant Games changelog and 2025 web games changes. https://developers.facebook.com/documentation/games/whats-new/changelog/ , https://developers.facebook.com/blog/post/2025/07/31/web-and-instant-games-changes/
8. itch.io open revenue sharing, Game Developer; Y8 revshare page. https://gamedeveloper.com/business/itch-io-launches-open-revenue-sharing , https://it.y8.com/revshare
9. AdSense H5 Games Ads and Ad Placement game payments. https://adsense.google.com/start/h5-games-ads/ , https://developers.google.com/ad-placement/docs/payments
10. Unity, rewarded ads and retention; Unity Greener Grass case study; Pocket Gamer.biz ad quality and churn. https://unity.com/blog/understanding-the-impact-of-rewarded-ads-on-iap-retention-and-engagement , https://activation.unity3d.com/es/case-study/greener-grass , https://www.pocketgamer.biz/what-our-data-reveals-about-ad-quality-and-player-churn-in-mobile-games/
11. University of Essex repository, 2026 study of Duolingo users, European Journal of Psychology of Education. https://repository.essex.ac.uk/43461/1/s10212-026-01157-3.pdf
12. Duolingo blog, leagues and leaderboards; Deconstructor of Fun leagues breakdown. https://blog.duolingo.com/duolingo-leagues-leaderboards/ , https://duolingo.deconstructoroffun.com/mechanics/leagues
13. eCPM: MAF rewarded ad stats; Playio benchmarks; Playwire AdMob benchmarks; Applixir web rewarded. https://maf.ad/en/blog/rewarded-ads-stats/ , https://blog.playio.co/mobile-game-ecpm-benchmarks-2026 , https://www.playwire.com/blog/admob-ecpm-benchmarks-what-publishers-should-expect , https://www.applixir.com/?p=4289
14. NYT Games free and subscriber breakdown 2026; AP on NYT's two-player game and business model, 2026-01-21. https://www.thewordfinder.com/blog/?p=2000 , https://wtop.com/consumer-news/2026/01/this-just-in-from-the-new-york-times-its-first-2-player-game-and-an-evolving-business-model/
15. Bloomberg, Wordle brought tens of millions of users, 2022-05-04; Engadget; player estimates from fiveletterwordfinder and electroiq. https://www.bloomberg.com/news/articles/2022-05-04/n-y-times-credits-wordle-for-record-growth-of-games-subscribers , https://www.engadget.com/wordle-new-york-times-millions-new-users-151308110.html , https://fiveletterwordfinder.com/faq/players , https://electroiq.com/stats/wordle-statistics/
16. GeoGuessr Go PRO page; WorldGuessr comparison. https://geoguessr.com/go-pro-to-continue-playing-geoguessr , https://www.worldguessr.com/compare-to-geoguessr
17. Federal Register, COPPA Rule 2025-04-22; Hunton; Davis Polk. https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule , https://www.hunton.com/privacy-and-cybersecurity-law-blog/coppa-rule-amendment-compliance-deadline-approaches , https://www.davispolk.com/insights/client-update/ftc-prioritizes-coppa-enforcement-new-compliance-obligations-take-effect
18. Quizlet Help, Blast and Match. https://help.quizlet.com/hc/en-us/articles/27393733229965-Playing-a-game-of-Blast , https://help.quizlet.com/hc/en-us/articles/360031183611
19. CrazyGames ad requirements, midgame pacing, rewarded deep dive. https://docs.crazygames.com/requirements/ads/ , https://docs.crazygames.com/resources/midgame-ads-pacing/ , https://docs.crazygames.com/resources/rewarded-ads-deep-dive/
20. CrazyGames monetization guides for hypercasual and word games. https://docs.crazygames.com/resources/monetizing-hypercasual-io/ , https://docs.crazygames.com/resources/monetizing-word/
21. Tenjin and GameAnalytics hypercasual benchmarks; Segwise retention benchmarks. https://gamedevreports.substack.com/p/tenjin-and-gameanalytics-the-best , https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies.md
22. Heads Up on the App Store; iMore guide. https://apps.apple.com/app/id623592465 , https://imore.com/heads-everything-you-need-know
23. Typeshift, Noodlecake; Pocket Gamer review. https://noodlecake.com/games/typeshift , https://www.pocketgamer.com/typeshift/review/
24. Blooket and Gimkit comparisons and pricing, 2026. https://formswrite.com/blog/blooket-vs-gimkit-vs-kahoot-classroom-games-compared , https://plisio.net/education/what-is-gimkit , https://ahaslides.com/blog/blooket-review/
25. Blooket Help, Tower Defense; Blooket game mode previews. https://help.blooket.com/hc/en-us/articles/42441291043095-Game-Overview-Tower-Defense , https://help.blooket.com/hc/en-us/articles/31616660563479
26. Poki monthly top games roundups, 2026. https://jang.com.pk/en/68265-top-poki-games-for-july-2026-what-should-you-play-news
27. Apple developer news on Kids Category, 2019; App Review Guidelines. https://developer.apple.com/news/?id=06032019j , https://developer.apple.com/forums/thread/741173
28. AdMob Families policy help; Google Play Families ads policy. https://support.google.com/admob/answer/6223431 , https://support.google.com/googleplay/android-developer/answer/9857753
29. Google Ads, ad-serving protections for teens; restricted targeting in personalized ads; PPC Land on age estimation. https://support.google.com/adspolicy/answer/12205906 , https://support.google.com/adspolicy/answer/143465 , https://ppc.land/google-begins-machine-learning-age-detection-for-ad-protections-in-us/
30. Duolingo revenue mix, Dough Substack deep dive; Motley Fool. https://dough.substack.com/p/duolingo-deep-dive-duol , https://www.fool.com/investing/how-to-invest/stocks/how-does-duolingo-make-money
31. Duolingo energy system, Duolingo Wiki and Nuclear Monster, 2025. https://duolingo.fandom.com/wiki/Energy , https://nuclearmonster.com/2025/05/duolingo-switches-from-hearts-to-energy-adds-chess
32. RevenueCat State of Subscription Apps 2026 and trial length analysis. https://www.revenuecat.com/state-of-subscription-apps-2026/ , https://www.revenuecat.com/blog/growth/free-trial-length
33. Meta Instant Games monetization best practices; Unity hybrid monetization. https://developers.facebook.com/documentation/games/monetize/best-practices , https://unity.com/ru/blog/iap-to-hybrid-monetization
34. Duolingo Q3 2026 Form 10-Q; Quartr earnings summary. https://www.sec.gov/Archives/edgar/data/0001562088/000162828026069692/duol-20260930.htm , https://quartr.com/events/duolingo-inc-duol-q3-2026_3P0xhxPR
