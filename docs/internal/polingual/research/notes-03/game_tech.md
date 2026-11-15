# Game Tech Stack for Polingual Play

Research date 2026-11-15. Local inputs read: `docs/internal/polingual/GAMES-RESEARCH.md`, `docs/internal/polingual/PLAY-IDEAL-STATE.md`, `/Users/g/reports/Polingual Play games market.md` (which recommends Phaser 4 for web), and the shipped game code in `/Users/g/code/bucket-foundation`. No earlier repo research on engines, Rust, Bevy, Defold or Rive exists beyond the market report's engine table.

## What the shipped code looks like today

### Takeaway
Polingual Play games are written three times today: SwiftUI `Canvas` on iOS, Jetpack Compose canvas on Android, TypeScript on web, with pure game logic and tests only on the web side. Every new game triples the client work.

### Cited Findings
- Snake exists as `polingual/src/lib/lobby/snake.ts` (155 lines) plus `snake-arena.ts` (45), `apple/Bucket/Sources/Polingual/Play/SnakeGame.swift` (141, SwiftUI `Canvas`), and `android/polingual/src/main/kotlin/com/polingual/app/play/SnakeScreen.kt` (217). Local repo, read 2026-11-15.
- Web lobby logic lives in about 20 pure TS modules with unit tests (`room.ts`, `lanes.ts`, `flag-run.ts`, `babel.ts`, `shift-play.ts`, `tilt.ts`, `world.ts`, and others) under `polingual/src/lib/lobby/`. Local repo.
- iOS game views: `Play/SnakeGame.swift`, `Play/TilesGame.swift`, `GamePlay.swift`, `MiniGame.swift`, `Lobbies.swift`. Android: `play/AtlasScreen.kt`, `play/ISpy.kt`, `play/SnakeScreen.kt`, plus art in `core/ui/pl/Art.kt`. No SpriteKit, Rive, Lottie, Phaser or Pixi dependency found. Local repo.
- The eight ranked game ideas are text, flags, audio and light motion (Flag Duel, Polyword, Flag Tiles, Forehead, Voice Atlas, Babel Match, Shift, Word Snake); only Word Snake needs a realtime position server. `GAMES-RESEARCH.md`.

### Inferences
- The rule set (scoring, timing, board generation, bot behavior) is the part that drifts between three copies; rendering is small per game. A shared core pays off on rules first.

### Gaps
- No measurement of how often the three implementations diverge or how much time each port takes.

## What the big studios use

### Takeaway
The top live-ops studios run proprietary C++ engines grown out of copied game code (Supercell Titan, Playrix, King's older Candy Crush engine), while newer titles and most of the market sit on Unity. Daily word-puzzle leaders (NYT) ship web apps inside a native shell. Duolingo builds characters in Rive.

### Cited Findings
- **Supercell**: proprietary engine Titan "powers every game we make and serves 300 million players a month"; job posts call it "our multi-platform C++ game engine"; built for mobile across the full device range; about 70 people in the Titan org per a job listing; Titan games made almost EUR 2.7B in 2025 — [Supercell: game engine called Titan](https://supercell.com/en/news/game-engine-called-titan); [PocketGamer.biz](https://www.pocketgamer.biz/supercells-titan-engine-spanning-flagships-to-the-cheapest-oldest-android-handset-in-the-world/); [Supercell careers](https://supercell.com/en/careers/senior-engine-programmer/0c5ef7a2-f039-4ec6-aff5-fc35c79a3ee8/)
- Titan "started as game code": teams copied shared code between games, then pulled it into one engine; game teams edit engine systems directly; a Titan engineer says "There are bugs everywhere. It slows the game teams down." Brawl Stars load time fell from about 35 s to 5 to 6 s on old Android and 7 s to 2.5 s on new iOS after about four months of work; a visual timeline editor replaced hand-edited animation CSVs — [Supercell: Titan game engine](https://supercell.com/en/news/titan-game-engine/)
- **King**: Defold was built in 2007 by Ragnar Svensson and Christian Murray, sold to King (first used on Blossom Blast Saga), acquired 2013, released free in March 2016, later open source. Candy Crush itself runs on an older in-house engine (forum claim, not an official King statement) — [Defold history](https://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.4everland.io/wiki/Defold.html); [Defold forum](https://forum.defold.com/t/king-games-made-with-defold/67352)
- King job posts: a Principal Unity Developer role "will evaluate migration strategies for our existing C++ and custom-engine titles"; Unity roles staff Candy Crush Solitaire and new games. No official statement that Candy Crush Saga moves to Unity — [Hitmarker: King Principal Unity Developer](https://hitmarker.net/jobs/king-principal-unity-developer-1745416); [Outscal: King Senior Unity Developer](https://outscal.com/job/senior-unity-developer-candy-crush-solitaire-new-games-at-king-in-barcelona-catalonia-spain-2); [PocketGamer.biz: King tools](https://www.pocketgamer.biz/what-tools-does-king-use-to-develop-its-hugely-successful-games)
- **Playrix** (Homescapes, Gardenscapes): "Our custom engine, similar to Unity or Unreal, constantly evolving"; C++, Lua, Python; OpenGL ES and Metal; reusable cross-title modules "greatly speeds up feature development" — [Hitmarker: Playrix Lead C++ Gameplay](https://hitmarker.net/jobs/playrix-lead-c-software-engineer-gameplay-1518264.md); [Habr comment](https://habr.com/en/companies/playrix/articles/566654/comments)
- **Rovio**: Angry Birds 2 runs on Unity; Bad Piggies was built in Unity in five months; Rovio's Beacon platform ships Unity and native SDKs for live ops, IAP, ads and player safety — [Wikipedia: Angry Birds 2](https://Www.wikipedia.org/wiki/Angry_Birds_2); [PocketGamer.biz: Bad Piggies](https://www.pocketgamer.biz/news/51053/how-strong-process-and-unity-helped-rovio-make-bad-piggies-in-five-months/); [Rovio Beacon](https://rovio.com/articles/beacon-by-rovio-the-games-platform)
- **Zynga** Words With Friends 2: async REST backend; Lightning Round real-time play reused an existing persistent socket built for chat. Client engine not documented; current Zynga posts hire Unity/C# — [Zynga Engineering](https://medium.com/zynga-engineering/words-with-friends-2-how-we-built-lightning-round-8e6dfb3dbe27); [Built In: Zynga](https://www.builtinla.com/job/principal-software-developer-full-stack-unity-c/10179878)
- **Voodoo**: tested about one new Unity game a week, which produced Paper.io in 2016; hypercasual was only 25% of 2023 revenue; 2026 hits (Castle Busters, Marble Sort!, Sand Loop) lean midcore — [Wikiwand: Voodoo](https://www.wikiwand.com/en/articles/Voodoo_(company)); [AppMagic](https://appmagic.rocks/blog/voodoo-new-big-three)
- Market share: Unity about 48% of mobile and about 70% of top-grossing mobile games per AppRadar (2026); a GDC 2026 survey reported by Voxbooster has Unreal at 42% and Unity at 30% across all developers, so the figures conflict by population — [AppRadar](https://appradar.com/blog/mobile-game-engines-development-platforms); [Voxbooster](https://voxbooster.com/blog/game-engine-market-share-statistics-2026)
- **NYT Games**: web built in React and TypeScript with Node and Go APIs on AWS; Wordle moved to React for the Games app; Wordle and Connections are "basically Web apps" played on web or inside the NYT Games app container; Crossplay, the first two-player game, is a native Swift app on iPhone and also on Android — [NYT Greenhouse job](https://job-boards.greenhouse.io/thenewyorktimes/jobs/4698871005); [TechRadar on Crossplay](https://www.techradar.com/computing/websites-apps/we-had-to-do-a-lot-of-technological-work-that-was-sort-of-unprecedented-which-was-really-challenging-and-exciting-crossplay-producer-on-the-effort-to-bring-the-new-york-times-first-two-player-game-to-life)
- **Duolingo**: Rive case studies cover the creative technologist role that bridges animation and engineering, and the Lily AI video call, which needed real-time character animation light on file size and engineering effort; Duolingo's own blog covers per-character viseme lip-sync on top of idle animations — [Rive: creative technologists at Duolingo](https://rive.app/blog/creative-technologists-duolingo-s-solution-to-the-designer-to-developer-handoff); [Rive: Lily video call](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life); [Duolingo blog: visemes](https://blog.duolingo.com/world-character-visemes)

### Inferences
- Custom engines at Supercell, King and Playrix came from years of copied game code and now need teams of about 70. They are an outcome of scale. A small team gets the same benefit (one place for shared game code) from a shared rules library without owning a renderer.
- The two closest analogues to Polingual Play by genre are NYT Games (daily word puzzles: web app in a native shell, native only for the flagship multiplayer game) and Duolingo (native app plus Rive characters). Neither uses a game engine for word games.

### Gaps
- Dots (Two Dots) engine: no source found.
- Duolingo Chess rendering stack: no primary source found.
- Rovio's Beacon link to Angry Birds 2 specifically: not confirmed.

## Engines compared

### Takeaway
For a text, audio and light-motion word game on iOS, Android and web, native UI per platform plus a small canvas layer stays the fastest to iterate. Defold is the lightest cross-platform engine with a console path. Godot web on iOS Safari is weak. Bevy runs on all three targets but its own team still points mobile production users to Godot.

### Cited Findings
- Empty web builds: Phaser 290 KB, Three.js 151 KB, PlayCanvas 300 KB, Cocos Creator 709 KB, Defold 1.03 MB, Unity about 11 MB, Godot about 10 MB (pre Unity 6 and Godot 4.3, directional) — [Poki engine guide](https://developers.poki.com/guide/web-game-engines), via the market report
- Poki targets under 8 MB initial download and says each extra MB costs "a couple percent of players"; CrazyGames disables Unity games on iOS by default for memory crashes — [Poki requirements](https://sdk.poki.com/new-requirements); [CrazyGames tech reqs](https://docs.crazygames.com/requirements/technical/), via the market report
- Phaser 4 shipped April 2026; targets desktop, mobile, Discord, YouTube Playables; reaches iOS and Android through an official Capacitor template; no consoles — [Phaser 3 vs 4](https://phaser.io/news/2026/05/phaser-3-vs-phaser-4); [Phaser Capacitor tutorial](https://phaser.io/tutorials/bring-your-phaser-game-to-ios-and-android-with-capacitor)
- **Defold**: builds typically under 2 MB; hot reload works from the editor on device targets but "doesn't work in HTML5 builds"; console exports for approved developers (PS5, PS4, Switch) and free Xbox support since 1.14 — [Wikipedia: Defold](https://en.wikipedia.org/wiki/Defold); [Defold HTML5 manual](https://www.defold.com/manuals/html5/); market report
- **Godot 4.5 web**: single-threaded export is default and the compatible path on iOS, "not as performant as the multi-threaded export"; Safari has WebGL 2 issues; native mobile exports "will always perform better by a significant margin"; single-threaded audio latency rises and glitches when frame rate drops; forum reports of iOS-only web crashes in 4.4.1 fixed in 4.5 beta — [Godot docs: Exporting for the Web](https://docs.godotengine.org/en/4.5/tutorials/export/exporting_for_web.html); [Godot 4.3 web progress report](https://godotengine.org/article/progress-report-web-export-in-4-3/); [Godot forum](https://forum.godotengine.org/t/game-crashes-randomly-on-ios-devices-html-export/114043)
- Godot ships no console exports; W4 Games sells them — [Godot: console ports](https://godotengine.org/article/about-official-console-ports/); [W4 Consoles](https://www.w4games.com/w4consoles)
- Unity cancelled the Runtime Fee in September 2024 and raised the free tier to $200K — [Unity blog](https://unity.com/blog/unity-is-canceling-the-runtime-fee)
- **Bevy** (Rust): Android and iOS support since 0.3, Android lifecycle events in 0.12; WebGL2 and WebGPU web targets; 0.20 released October 2026 with rendering and UI work; 2026 commits still fix Android activity defaults and wasm clipboard gaps — [Bevy 0.3](https://bevy.org/news/bevy-0-3/); [Bevy 0.12](https://bevy.org/news/bevy-0-12/); [AlternativeTo on Bevy 0.20](https://alternativeto.net/news/2026/10/bevy-0-20-brings-major-rendering-shading-and-ui-enhancements-to-open-source-game-engine/); [Bevy 0.19 cargo features](https://docs.rs/crate/bevy/0.19.0-rc.2/source/docs/cargo_features.md)
- Shipped Bevy mobile games are few: one IAA iOS game on r/bevy (March 2025), a Bevy Meetup 13 talk on iOS deployment (April 2026, secondary source), and a forum note that the Bevy team "still recommends using engines like Godot for production mobile games" — [r/bevy](https://reddit.birdcat.cafe/r/bevy/comments/1jh0yn1/i_made_a_iaa_ios_game_using_bevy); [LavX on Bevy Meetup 13](https://news.lavx.hu/article/bevy-meetup-13-from-vfx-editors-to-ios-games-the-community-shows-its-growing-maturity); [itch.io on winit mobile limits](https://itch.io/t/5033020/overcoming-the-limitations-of-winit-on-mobile-platforms)
- Rust binary size on mobile needs symbol stripping, panic=abort and LTO to stay small — [bitdrift](https://blog.bitdrift.io/post/optimizing-rust-mobile-sdk-binary-size)

### Inferences
- Unity and Godot add about 10 MB to web and run poorly in iOS Safari, which rules them out for portal mini-games and for the shared-screen web lobby.
- Bevy is the Rust engine with the most momentum, yet pre-1.0 with breaking releases every few months, thin mobile track record, and no editor. For a word game whose hard parts are text layout, IME input, accessibility and audio, a game engine renderer works against the platform: SwiftUI and Compose already handle multilingual text and VoiceOver/TalkBack.
- Unverified background, no source fetched this session: SpriteKit and Metal are iOS-only; Flutter Flame and React Native Skia would add a fourth UI stack beside SwiftUI, Compose and React; Macroquad is small and simple but light on mobile polish; Fyrox targets desktop 3D; wgpu is a graphics layer, not an engine; raylib and SDL3 are C libraries that build for iOS, Android and web via Emscripten; Oxygine is unmaintained; Cocos Creator 3.x exports TS games to web and native.

### Gaps
- Current Defold 1.10+ per-platform empty bundle sizes (the live dashboard at defold.com/build-size was not fetched).
- No benchmark comparing SwiftUI Canvas, SpriteKit and Compose canvas frame times for 2D games.
- Macroquad, Fyrox, Flame, RN Skia, Cocos Creator: no current sources gathered; Are We Game Yet was not fetched.

## Animation tools

### Takeaway
Rive is the strongest fit: one file with state machines and data binding runs on iOS, Android and web through MIT-licensed runtimes at 0.2 to 2.4 MB, and Duolingo uses it for characters. Spine suits skeletal sprite characters inside an engine. Blender suits pre-rendered sprite sheets and 3D-looking assets.

### Cited Findings
- Rive runtimes cover iOS, Android, web, Windows, macOS, Linux, Steam; consoles (PS5, Xbox Series X, Switch) on request; runtimes are MIT licensed — [Rive games](https://rive.app/games); [Rive runtimes](https://rive.app/runtimes)
- Rive data binding connects animations, text, colors and layouts to real-time data; scripting (named Luau in one API directory) adds logic and procedural drawing inside the file; React Native runtime v0.5 rebuilt on the native iOS and Android runtimes; minimums iOS 15.1, Android SDK 24 — [Rive docs](https://rive.app/docs/getting-started/introduction.md); [apis.io: Rive](https://apis.io/providers/rive/); [Rive RN migration guide](https://rive.app/docs/runtimes/react-native/migration-guide)
- Rive runtime sizes: web canvas-lite 222 KB brotli, canvas 567 KB, webgl2 648 KB; iOS about 1.67 MB download and 4.66 MB install; Android arm64 2.40 MB download, 7.03 MB install, audio removable with `-PnoAudio` — [Rive runtime sizes](https://rive.app/docs/runtimes/runtime-sizes)
- Spine: spine-ios is a Swift runtime; docs now point to the 4.3 branch; runtime major.minor must match the editor export version; spine-android exists for Kotlin; Spine 4.2 added physics — [spine-ios docs](https://esotericsoftware.com/spine-ios); [Spine runtime architecture](https://de.esotericsoftware.com/spine-runtime-architecture); [Spine 4.2 physics](https://us.esotericsoftware.com/blog/Spine-4.2-The-physics-revolution)

### Inferences
- Rive gives the founder the Duolingo pattern: designers build a character or celebration once with a state machine (idle, correct, wrong, streak), and SwiftUI, Compose and Next.js each drive it by setting inputs. That removes per-platform animation code, which is the polish gap between the current Canvas games and Candy Crush-grade feel.
- Blender fits best as an offline tool: render 3D flags, tokens or mascot poses to sprite sheets or to images imported into Rive. Real-time 3D adds a renderer for little gain in a word game.
- Unverified background: Lottie plays After Effects exports and has no state machines; Live2D targets anime-style 2D character rigs and adds a Cubism runtime license.

### Gaps
- No time-cost data found for a Blender to sprite-sheet pipeline.
- Rive pricing tiers for teams and the status of Rive scripting language naming were not confirmed.
- Lottie and Live2D current runtime facts not gathered.

## Live multiplayer latency

### Takeaway
Supabase Realtime Broadcast is fast enough for turn and round based play (quiz rounds, Flag Duel) with medians under 50 ms in Supabase's own tests, and about 60 ms measured by a third party. A continuous arena like Word Snake wants a dedicated authoritative server.

### Cited Findings
- Supabase benchmarks: Broadcast over WebSockets median 6 ms, p95 28 ms, p99 213 ms at 32,000 users; broadcast from database median 46 ms, p95 132 ms at 80,000 users and 10,000 msg/s; payload tests 13 to 27 ms median; Realtime Authorization median 19 ms — [Supabase Realtime benchmarks](https://supabase.com/docs/guides/realtime/benchmarks)
- Third-party laptop test measured 58 to 60 ms for Supabase Broadcast end to end — [DEV: Neon vs Supabase Realtime](https://dev.to/kubeden/neon-realtime-vs-supabase-realtime-410g)
- Connection caps: 200 on Free, 500 on Pro, 10,000 on Pro with spend cap off — [Supabase Realtime limits](https://supabase.com/docs/guides/realtime/limits), via the market report
- Zynga added real-time play to an async word game by reusing an existing persistent socket — [Zynga Engineering](https://medium.com/zynga-engineering/words-with-friends-2-how-we-built-lightning-round-8e6dfb3dbe27)

### Inferences
- A round of Flag Duel sends a question, answers and scores a few times a minute; 60 to 200 ms jitter is invisible if the server stamps round start and answer receipt times. Scoring should stay server-side.
- Word Snake at 10 to 20 position updates a second per player needs an authoritative tick server (Colyseus in TypeScript was the market report's option; a Rust server with the shared core is the other). This is the one place Rust on the server earns its cost.

### Gaps
- No mobile-network (LTE/5G) latency figures for Supabase Realtime.
- Colyseus and other dedicated server pricing for late 2026 not refreshed.

## Sharing game code across SwiftUI, Android and web

### Takeaway
A Rust core shared via UniFFI (Swift, Kotlin) and WASM (web) is a production pattern (Crux, Ferrostar, Proton, Photoroom) and fits Polingual's split: rules in one crate, native UI and Rive per platform. A full shared renderer (engine everywhere) or a web view everywhere trade away native feel or iOS performance.

### Cited Findings
- Crux: Rust core compiled to a static library for iOS with UniFFI Swift bindings, a dynamic library on Android with Kotlin bindings, and WASM for the browser; pre 1.0, "production-ready" with occasional breaking API changes — [Crux GitHub](https://github.com/redbadger/crux/); [crux_core 0.16.2 README](https://docs.rs/crate/crux_core/0.16.2/source/README.md)
- Red Badger says Proton and Photoroom chose Rust and Crux; Proton teams each own a core shared across platform shells (vendor claim) — [Red Badger](https://content.red-badger.com/resources/rust-and-crux-in-the-enterprise-cross-platform-correct-by-design)
- Stadia Maps' Ferrostar exposes a Rust navigation core to Swift and Kotlin with UniFFI; Rust in production since 2018 — [Stadia Maps: Ferrostar](https://stadiamaps.com/blog/ferrostar-building-a-cross-platform-navigation-sdk-in-rust-part-1/)
- NYT runs Wordle and Connections as web apps inside its native Games app, and went native Swift for its two-player Crossplay — [TechRadar](https://www.techradar.com/computing/websites-apps/we-had-to-do-a-lot-of-technological-work-that-was-sort-of-unprecedented-which-was-really-challenging-and-exciting-crossplay-producer-on-the-effort-to-bring-the-new-york-times-first-two-player-game-to-life)
- Playrix reuses modules across titles to speed feature work; Supercell's Titan came from code copied between games — [Habr](https://habr.com/en/companies/playrix/articles/566654/comments); [Supercell](https://supercell.com/en/news/titan-game-engine/)

### Inferences
Three options for this team:

| Option | Shared | Per platform | Cost | Risk |
|---|---|---|---|---|
| Per-platform native, today | nothing | rules, UI, art | 3x every game; drift in rules | slow to add games |
| Web view everywhere, Phaser 4 | everything | thin shell | 1x; fast iteration with web hot reload | weaker feel on iOS, App Review scrutiny for web wrappers, Safari audio quirks |
| Shared rules core in Rust, native UI and Rive | rules, scoring, bots, board generators, server validation | rendering and input in SwiftUI, Compose, React | about 1.3x to 1.5x; one test suite | FFI build setup, WASM size, Rust skill on team |
| Full engine everywhere, Defold or Bevy | everything | nothing | 1x code, but a fourth UI stack and loss of native text and accessibility | engine text and IME handling for 20+ languages, Bevy instability |

- The current TS lobby modules are already pure functions with tests, which is the shape a Rust core would take. Porting them is mechanical.
- The same Rust crate compiled natively can run the authoritative server for Word Snake and validate scores for Flag Duel, so client and server can never disagree on rules.
- A middle path with no new language: keep TS as the rules source and run it on iOS and Android through JavaScriptCore or a JS engine. This avoids Rust but gives up type-checked FFI and native speed. No source checked.

### Gaps
- No measured WASM size for a small UniFFI or Crux core; no measured build-time cost.
- No case study of a game (as opposed to an app) using Crux.

## Recommendation for Polingual Play

### Takeaway
Keep native SwiftUI, Compose and Next.js for UI. Add Rive for every character, celebration and transition. Move game rules into one Rust crate (`play-core`) exposed through UniFFI to Swift and Kotlin and through wasm-bindgen to web, and reuse it on a small Rust server for real-time arena games. Keep Supabase Broadcast for round-based rooms. Use Phaser 4 only for the portal mini-games where web size and Poki rules dominate. Use Blender offline for art.

### Cited Findings
- Studios at scale share code in one engine or module set (Supercell, Playrix) — [Supercell](https://supercell.com/en/news/titan-game-engine/); [Habr](https://habr.com/en/companies/playrix/articles/566654/comments)
- Duolingo's character polish comes from Rive state machines driven by app data — [Rive: Duolingo](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)
- Rust shared cores ship in production on iOS, Android and web — [Crux](https://github.com/redbadger/crux/); [Ferrostar](https://stadiamaps.com/blog/ferrostar-building-a-cross-platform-navigation-sdk-in-rust-part-1/)
- Supabase Broadcast medians of 6 to 60 ms suit round-based play — [Supabase benchmarks](https://supabase.com/docs/guides/realtime/benchmarks); [DEV](https://dev.to/kubeden/neon-realtime-vs-supabase-realtime-410g)

### Inferences
Ordered plan:
1. Rive first. Biggest polish gain per hour, no architecture change, 0.2 MB web, about 1.7 MB iOS. One mascot file with states for correct, wrong, streak, level-up.
2. Rust `play-core` second, starting with the newest game rather than porting all eight. Pure functions only: state in, action in, state and events out. Golden test vectors shared with the existing TS tests during the move.
3. Rust or Colyseus arena server only when Word Snake is scheduled. Supabase stays for rooms, presence and auth.
4. Phaser 4 for portal builds only; render text in DOM. Revisit Defold only if consoles become a firm goal.
5. Skip Bevy for now. Revisit after Bevy 1.0 or if a 3D or physics-heavy game is planned.

Tradeoffs:
- Rust adds a toolchain, cross-compile setup on the Mac build box and a skill the team must hold. It pays off from the second game that ships on three platforms.
- Native UI per platform keeps 3x rendering code. That code is small for word games, and SwiftUI and Compose already handle multilingual text, right-to-left scripts and accessibility, which a game engine would make the team rebuild.
- A web view everywhere is the fastest path to one codebase but gives up native feel on the platform where paying learners live.

### Gaps
- No team-specific estimate of Rust ramp-up time.
- No test yet of UniFFI build time on the shared Mac build queue.
