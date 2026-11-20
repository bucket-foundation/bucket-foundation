# Web Game Tech Stack for Polingual Play

Researched 2026-11-15. Sources older than 2024 are flagged inline as [pre-2024 or undated].

## Engines: size, load, mobile browser, iOS Safari, licensing, consoles

### Takeaway
Web-native engines (Phaser, PixiJS, Three.js, PlayCanvas, Cocos, Defold) ship empty builds of 150 KB to 1 MB, while Unity and Godot start near 10 MB of WebAssembly and fight iOS Safari memory limits. Of the web-first options, only Defold and Cocos have console paths; Godot reaches consoles through paid third parties; Phaser and Three.js have none.

### Cited Findings
- Empty-project sizes per Poki's engine guide: Unity about 11 MB unoptimized, Godot 10 MB, Phaser 290 KB, PlayCanvas 300 KB, Defold 1.03 MB, Cocos Creator 709 KB, Construct 3 342 KB zipped, Three.js 151 KB (122 KB Brotli). The same page still recommends Godot 3.5 for web-only export and quotes Unity's old 100,000 euro cap, so it predates Unity 6 and Godot 4.3 [likely pre-2024, undated] | [Poki engine guide](https://developers.poki.com/guide/web-game-engines)
- Poki (June 2026): Unity is "the most widely used engine among developers on our platform"; Unity compiles to one large Wasm blob that must download before play, while PlayCanvas can stream only what the first seconds need; "for every extra megabyte... you're going to lose a couple percent of players"; about 68% of Poki players have WebGPU-capable devices | [Poki blog 2026](https://poki.com/blog/building-web-browser-games-2026)
- Unity cancelled the Runtime Fee on 12 Sep 2024 and returned to seat subscriptions; Unity Personal is free, with the revenue cap raised from $100K to $200K with Unity 6 | [Unity](https://unity.com/blog/unity-is-canceling-the-runtime-fee)
- Unity Pro reported at $2,200 per seat per year (single outlet, verify) | [CGPress](https://cgpress.org/archives/unity-cancels-runtime-fee-and-reverts-to-subscription-model-for-game-developers.html)
- Unity 6 added mobile web support for Android and iOS browsers | [Engadget](https://www.engadget.com/gaming/unity-mounts-a-comeback-with-launch-of-unity-6-game-engine-205332034.html)
- Unity web on iOS is still unstable: forum reports of iOS 18.x crashes on Unity 6 builds, Safari holding compiled Wasm in memory across reloads | [Unity forum](https://discussions.unity.com/t/webgl-random-crashes-on-ios-18-works-fine-on-ios-18/1627624); older WebKit bug: Wasm over about 9 MB crashed on iOS 15.4 [2022] | [WebKit 237180](https://bugs.webkit.org/show_bug.cgi?id=237180)
- CrazyGames disables Unity games on iOS by default because of memory crashes and re-enables them after enough plays | [CrazyGames tech reqs](https://docs.crazygames.com/requirements/technical/)
- Godot 4 web: single-threaded export is the default and works on macOS and iOS; it cannot use threads and is slower than the threaded build; Safari has extra WebGL 2 issues; Wasm gzips to about a quarter of its size; custom templates with features stripped are advised for mobile | [Godot docs 4.5](https://docs.godotengine.org/en/4.5/tutorials/export/exporting_for_web.html)
- Godot is MIT licensed. The Godot Foundation will not ship console ports; developers need platform approval and either build export tools or buy from a certified third party; W4 Games announced Switch 2 beta support (Oct 2025) | [Godot consoles](https://docs.godotengine.org/en/4.5/tutorials/platform/consoles.html), [W4 Games](https://www.w4games.com/blog/w4-games-news-1/tag/110)
- Defold lists PS5, PS4 and Nintendo Switch as targets; Switch builds sit outside the standard build and require Nintendo approval | [Defold Switch manual](https://defold.com/manuals/nintendo-switch); Xbox support landed in Defold 1.14.0 (Oct 2026), free to approved Xbox developers | [Digital Citizen](https://www.digitalcitizen.life/defold-1-14-0-adds-free-xbox-support-for-approved-developers/); Defold 2025 retrospective said Xbox work paused mid-2025 | [Defold](https://defold.com/2026/01/02/Defold-2025-Retrospective/)
- Phaser 4 shipped in April 2026 (RC5 in Aug 2025 was called production-ready); listed targets are desktop, mobile, Steam, Discord, YouTube Playables, no consoles | [Phaser 3 vs 4](https://phaser.io/news/2026/05/phaser-3-vs-phaser-4), [RC5](https://phaser.io/news/2025/08/phaser-v4-release-candidate-5-is-out)
- Phaser to iOS/Android uses Capacitor, with official tutorial and Capacitor starter template | [Phaser Capacitor tutorial](https://phaser.io/tutorials/bring-your-phaser-game-to-ios-and-android-with-capacitor), [Capacitor games guide](https://capacitorjs.com/docs/v4/guides/games)
- Cocos, Defold, MonoGame, Haxe and SDL built closed console ports offered free to licensed developers | [Godot article on console ports](https://godotengine.org/article/about-official-console-ports/)

### Inferences
- For a team with a Next.js/TypeScript web app and a Capacitor iOS shell already in use elsewhere, a TypeScript web-native engine (Phaser 4 for 2D, PixiJS for a custom UI-heavy renderer) keeps one language, one repo and one deploy path, and stays under the Poki 8 MB and CrazyGames 20 MB mobile thresholds with room to spare.
- A quiz/party language game is UI and text heavy with light graphics, which favours DOM or canvas 2D over Unity or Godot; the Wasm engines add 10 MB and iOS risk for features the game does not need.
- If consoles become a firm goal, Defold is the only small, web-strong engine with first-party PS5, Switch and Xbox paths, at the cost of learning Lua and a separate toolchain. Godot plus W4 Games is the second option.
- Recommendation for the report writer: Phaser 4 in TypeScript, shipped inside the existing Next.js app and to portals, wrapped with Capacitor for iOS/Android stores; revisit Defold only if a console deal appears.

### Gaps
- No fetched official data on PixiJS v8, Babylon.js, PlayCanvas pricing or Cocos Creator console status in 2025-2026; sizes for those come only from the Poki table.
- No first-party benchmark of load time or frame rate across engines on mid-range Android or iPhone; Unity Pro price and Enterprise price unverified on Unity's own page.
- Godot 4.5/4.6 empty web export size not measured by an official source (forum figure of about 8 MB is anecdotal).

## Poki and CrazyGames: engines seen and technical requirements

### Takeaway
Poki targets an initial download under 8 MB and requires portrait support on mobile; CrazyGames allows 50 MB initial (20 MB for its mobile homepage), 250 MB total and 1,500 files, and expects Chrome/Edge first. Unity is the most common engine on Poki.

### Cited Findings
- Poki requirements: target initial download under 8 MB; remove dev tools and debug code | [Poki requirements](https://sdk.poki.com/new-requirements); the engine guide says 5 MB initial and 8 MB total (conflicts with the 8 to 10 MB in the easy-access guide) | [Poki engines](https://developers.poki.com/guide/web-game-engines), [Poki easy access](https://developers.poki.com/guide/easy-access)
- Poki requires every submitted game to work in portrait; Poki Play Testing returns 10 to 20 recorded player sessions within minutes; Poki syncs localStorage to its servers for cloud saves without an API | [Poki blog 2026](https://poki.com/blog/building-web-browser-games-2026)
- CrazyGames: initial download 50 MB or less, 20 MB or less for mobile homepage, measured until the SDK `gameplayStart` call; total 250 MB; 1,500 files max; relative paths only; time to gameplay 20 s or less for externally loaded files; Chrome and Edge expected, games broken on Safari get disabled there; must run on a 4 GB Chromebook; device pixel ratio forced to 1 on iOS and low-memory Android; Howler and PlayCanvas have known iOS audio issues, resume AudioContext on a user gesture; Basic Launch disallows ads, Full Launch requires the SDK | [CrazyGames tech reqs](https://docs.crazygames.com/requirements/technical/)

### Inferences
- Building to Poki's 8 MB budget satisfies CrazyGames too. Language audio packs and fonts must be lazy-loaded after first gameplay to stay inside these budgets.

### Gaps
- Neither portal publishes engine share percentages.

## Ad SDKs, rewarded ads, eCPM and revenue share

### Takeaway
Portal SDKs (Poki, CrazyGames, GameDistribution) handle ads for you on a revenue split; self-hosted games can use Google H5 Games Ads (Ad Placement API, beta, AdSense account). Published rewarded web eCPMs run about $3.60 global to $7 US from a vendor source, and no portal publishes its per-play payout.

### Cited Findings
- Poki: third-party guides report 50/50 on Poki-sourced traffic and 100% to the developer on traffic the developer brings; Poki prefers web exclusivity and negotiates per title. Not published by Poki | [Playgama comparison](https://playgama.com/blog/business-faqs/poki-vs-crazygames-vs-gamedistribution-revenue-share/), [Cinevva](https://app.cinevva.com/guides/publish-game-poki)
- CrazyGames: no split in main docs; 2026 GameMaker jam terms gave developers 60% of ad revenue and 70% of in-game purchase revenue; payouts monthly via Tipalti, EUR 100 minimum (third-party) | [Playgama](https://playgama.com/blog/business-faqs/poki-vs-crazygames-vs-gamedistribution-revenue-share/)
- CrazyGames says rewarded ads have the highest eCPM and are opt-in | [CrazyGames ad guide](https://docs.crazygames.com/resources/ad-monetization-guide/)
- Google H5 Games Ads: rewarded and full-screen ads via `adBreak()`/`adConfig()` in the Ad Placement API; beta program; any H5 games site owner may apply; needs an AdSense publisher ID; reward descriptions must be disclosed | [Ad Placement API](https://developers.google.com/ad-placement/apis), [AdSense help](https://support.google.com/adsense/answer/9959170), [PlayCanvas tutorial](https://developer.playcanvas.com/tutorials/google-ads-for-games/)
- Web rewarded video eCPM mid-2026: $3.62 global, $6.20 tier-1, $6.98 US (vendor AppLixir, optimistic bias) | [AppLixir](https://www.applixir.com/?p=4428); Playgama via Cinevva claims US rewarded $15 to $28, EU $8 to $15, India/Brazil $1 to $3 (unverified secondhand) | [Cinevva](https://app.cinevva.com/guides/web-game-monetization)
- Scale: Poki over 1 billion monthly plays and 600 studios in 2026; CrazyGames over 300 million gameplays a month (secondhand) | [Cinevva](https://app.cinevva.com/guides/web-game-monetization)

### Inferences
- Polingual Play on its own domain could use H5 Games Ads for rewarded hints; on portals the portal SDK must replace it, so ads belong behind one adapter interface.

### Gaps
- No primary data found for GameDistribution or AdinPlay revenue share or eCPM. No Poki or CrazyGames revenue per 1,000 plays.

## Live multiplayer for party and quiz games

### Takeaway
For a quiz/party game with host screen plus phones, Supabase Realtime Broadcast and Presence already in the stack covers 200 concurrent connections free and 500 on Pro (10,000 with spend cap off); Colyseus Cloud from $15/month adds authoritative rooms in TypeScript when cheating or timing matter.

### Cited Findings
- Supabase Realtime limits: Free 200 concurrent connections and 100 msg/s; Pro 500 and 500 msg/s; Pro without spend cap and Team 10,000 and 2,500 msg/s; broadcast payload 256 KB free, 3 MB paid; presence 20 msg/s free, 50 Pro, 1,000 higher tiers; broadcast replay retained 72 hours | [Supabase Realtime limits](https://supabase.com/docs/guides/realtime/limits)
- Colyseus: open source, self-host free; Colyseus Cloud from $15/month, no CCU/DAU/MAU caps, unlimited bandwidth, billed on provisioned compute | [Colyseus pricing](https://www.colyseus.io/pricing), [Colyseus docs](https://docs.colyseus.io/cloud/pricing-billing)
- Nakama: Apache-2.0 open source, self-host free; Heroic Cloud is contact-us, resource-based, no CCU caps; $600/month figure reported but tied to Satori by some sources | [Heroic Cloud pricing](https://heroiclabs.com/pricing), [Supercraft](https://crux.supercraft.host/blog/nakama-open-source-vs-managed-backend/)
- PlayroomKit: serverless multiplayer SDK; aggregator lists free 10 DAU, Lite $10/month for 10,000 MAU, enterprise custom (unverified) | [Toolradar](https://toolradar.com/tools/play/pricing)
- CrazyGames has a separate multiplayer requirements page (not fetched) | [CrazyGames tech reqs](https://docs.crazygames.com/requirements/technical/)

### Inferences
- A Kahoot-style quiz sends low-rate messages (question, answers, scores), which fits Supabase Broadcast; server-authoritative timing and scoring can run in a Postgres function or Edge Function with Broadcast for fan-out. Colyseus becomes worth it for twitch-style real-time rounds.

### Gaps
- Photon pricing page blocked fetch (Gcore challenge); no verified 2026 Photon CCU prices. No official PlayroomKit pricing page fetched. No WebRTC/PartyKit cost data gathered.

## Text rendering and TTS for many scripts

### Takeaway
DOM/canvas engines inherit the browser's full shaping for CJK, Arabic and Devanagari, and Godot 4 ships HarfBuzz/ICU shaping; engines that render bitmap or SDF glyph atlases need per-script font work.

### Cited Findings
- Godot 4 TextServerAdvanced uses HarfBuzz, ICU and SIL Graphite for BiDi and complex layouts; a fallback server has no CTL | [Godot TextServerAdvanced](https://docs.godotengine.org/en/4.4/classes/class_textserveradvanced.html)
- Godot excludes ICU data from exports by default to save size; the ICU break iterator data is about 4 MB [progress report, pre-2024] | [Godot CTL report 3](https://godotengine.org/article/complex-text-layouts-progress-report-3)

### Inferences
- Phaser text objects and PixiJS `Text` draw through the browser's canvas text API, so shaping and bidi come from the browser; a DOM overlay for question and answer text is the lowest-risk path for Arabic and Devanagari in any web-native engine.
- TTS options: browser `speechSynthesis` (voice coverage varies per device) or pre-generated audio served from Supabase Storage; pre-generated audio gives consistent voices across iOS, Android and portals and must be lazy-loaded to meet portal size budgets.

### Gaps
- No sourced comparison of Unity TextMeshPro, Defold, Cocos or PlayCanvas complex-script support; no sourced data on Web Speech API voice coverage on iOS Safari in 2026. These are inferences only and need verification.
