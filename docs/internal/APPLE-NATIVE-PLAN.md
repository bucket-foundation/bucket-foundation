# Apple Native Plan

Base revision: `793bbc2d6` on `feat/apple-native`, read 2026-10-20 with Xcode 26.2 (17C52) on macOS 15.1. Status: plan, round 3, folding in founder decisions D1, D2 and D4, the platform research in the session scratchpad `apple-surfaces-research.md`, and live checks of production on 2026-10-20. Founder question for the plan bead: answer the open decisions D3, D5 to D14.

Target outcome: a person signs in to Bucket on any Apple device with an email code, Sign in with Apple, Google or GitHub, studies offline, and finds the same progress on every other device and on the web at `/research-os/learn`. Every surface is Swift 6 and SwiftUI on one shared package, built with Xcode on this Mac. EAS and Capacitor plugins have no role in the native path.

Owners: "founder (gianyrox)" approves every gate and decision; "agent session, reviewed by founder" executes code and tests, and the founder signs off each executed result.

## Founder Decisions

Decided rows carry `source-founder`. Open rows carry a recommendation.

| ID | Question | Status | Answer or recommendation |
|---|---|---|---|
| D1 | Which surfaces, in what order | decided 2026-10-20 | all Apple devices from day one: iPhone, iPad, native SwiftUI Mac, Apple Watch, Apple TV, Vision Pro, as parallel tracks on one BucketKit core |
| D2 | Minimum OS | decided 2026-10-20 | 26.0 on every platform; 27 APIs sit behind `if #available` and need the toolchain upgrade in Prerequisites |
| D4 | Sign-in methods | decided 2026-10-20 | Sign in with Apple and other OAuth providers in the first release, Google and GitHub at least, "all other oauths" per the founder; email codes stay |
| D3 | Local store | open | GRDB; SwiftData is the alternative |
| D5 | Tauri `bkt-desktop` end state | open | keep it for the sidecar workbench views while the native Mac app ships in the store |
| D6 | App Review demo path | open | guest study plus a reviewer account; any password action for it fails closed and gets its own critic review |
| D7 | Upload path | open | this Mac with the Xcode account session, per Local First |
| D8 | Close GoTrue signup while the launch list is closed | open | production GoTrue has `disable_signup: false` today, so the apps and the session route create accounts while `/sign-in` shows the launch list; closing it also closes OAuth sign-up |
| D9 | Polingual languages on Apple surfaces | open | after ShareAlike handling ships |
| D10 | OAuth providers beyond Google and GitHub | open | add each from the Supabase list in `supabase/config.toml` only after its developer app, review notes and privacy answers exist |
| D11 | App Clip | open | not in the first release |
| D12 | Release timing | open | each ship unit releases when its exit criteria pass; holding all units for one launch day is the alternative |
| D13 | Is `xbwblxwafphvdeldighd.supabase.co` the durable auth host that closes `bkt-x23u` | open | yes, if the founder owns that project; provider config and redirect allowlists below point at it |
| D14 | EU trader status under the DSA | open | founder call: trader status publishes an address, phone and email on the EU storefronts; without a declaration the EU storefronts stay closed |

## Prerequisites

| Item | State | Owner |
|---|---|---|
| Production auth host | live: the site bundle points at `xbwblxwafphvdeldighd.supabase.co`; its `/auth/v1/settings` returns `disable_signup: false` and `email` as the only enabled provider; D13 confirms it as durable | founder (gianyrox) |
| Session route live | `POST https://www.bucket.foundation/api/academy/session {action:"otp", email:"bad"}` returns 400 `bad_email`, which `createSessionHandler` reaches only after its `enabled()` and `configured()` checks, so `ACADEMY_REVIEW_LOG=on` and the Supabase env are set | none |
| Toolchain | this Mac runs macOS 15.1 with Xcode 26.2: it builds and uploads for 26 SDKs, and it cannot launch a macOS 26 app, so Mac track tests need a macOS 26 host: a GitHub `macos-26` runner if that image exists (unverified), else the founder upgrades this Mac to macOS Tahoe 26.6, which Xcode 27 and 27 APIs also need (research §0) | founder (gianyrox), pending |
| Server endpoints for app links | `https://www.bucket.foundation/.well-known/apple-app-site-association` and `/auth/native-callback` both return 404 today; the Server Contract adds both | agent session, reviewed by founder |
| App Store Connect record | add macOS, tvOS and visionOS versions to the existing "Bucket Foundation" record for universal purchase; records cannot merge later | founder (gianyrox) |
| Apple developer setup | Sign in with Apple capability and key, Services ID for the web, App Group `group.foundation.bucket.app`, Keychain access group through the entitlement, associated domains `webcredentials:` and `applinks:www.bucket.foundation`, the OTP sender domain registered with the Private Email Relay | agent session, reviewed by founder |

## Current State

| Area | Fact | Path |
|---|---|---|
| iPhone app | Capacitor 8.5.2, bundle id `foundation.bucket.app`, iOS 15.0, device family `1,2`, two build modes | `packages/bkt-mobile/capacitor.config.ts` |
| UI | React 18, three.js, 3dmol 2.5.5, KaTeX; 37 view and 7 scene `.tsx` files | `packages/bkt-ui` `[empirical: ls, 2026-10-20, ls src/{views,explore}/*.tsx \| wc -l]` |
| Phone shim | bundled mode answers `/local/progress`, `/local/review-log*`, `/local/account*`, `/local/ros/<name>`; other `/local/*` paths return 501 | `packages/bkt-mobile/src/adapter.ts` |
| Phone sync and tokens | `createMobileSync` over `createReviewSync`; outbox in `localStorage`; `SecureStorageVault` item `bkt.sync.session` | `src/lib/academy/mobile-sync.ts`, `packages/bkt-mobile/src/token.ts` |
| TLS | ATS pins ISRG Root X1, X2 and YR SPKIs; the live chain ends at Root YR | `Info.plist` `[empirical: openssl s_client and security find-certificate, 2026-10-20]` |
| Plist | `ITSAppUsesNonExemptEncryption` false; `WKAppBoundDomains` apex and www; no privacy manifest | `packages/bkt-mobile/ios/App/App/` |
| Uploads | build `2026102020` bundled mode and `2610202027` web mode, version 1.0, Xcode account session; scheme `date +%y%m%d%H%M` | founder's session, confirmed in App Store Connect by the coordinator |
| Auth | site sign-in is email code only; no `signInWithOAuth` or `signInWithIdToken` call in `src`; web OAuth callback route exists at `src/app/auth/callback/route.ts`; local config has Apple disabled and `enable_manual_linking = false`; production GoTrue enables `email` alone | `src/app/sign-in/`, `supabase/config.toml` lines 175 to 335, `[empirical: curl /auth/v1/settings with the site's publishable key, 2026-10-20]` |
| Native code | `apple/` exists untracked on `feat/apple-native`: `project.yml` for XcodeGen with app target `Bucket`, destinations iOS and macOS, bundle `foundation.bucket.app`, version 2.0, floors iOS 26 and macOS 26; `BucketKit/Package.swift` with all five 26 floors and Swift 6 mode; `BucketAPI` email-code session client, `KeychainSessionStore` (service `foundation.bucket.session`), `Account` observable with single-flight refresh, `TeXLite` Unicode equation fallback; 10 `@Test` functions in Swift Testing; screens Learn, Practice, Canon, Account; language decks hidden; Practice is local-only with no FSRS or sync yet | `apple/` `[empirical: ls and grep -c @Test, 2026-10-20]`; the coordinator reports the tests pass and is moving the Keychain group to the entitlement and refresh to 60 s early |
| Device flow | kinds `desktop`, `cli`, `mobile` in code and in a check constraint; `/device?code=` prefills the approval page | `device-flow.ts`, `20261020000000_academy_devices.sql`, `src/app/device/page.tsx` |
| Tutor | server tutor calls a configured LLM provider, Anthropic by default, dark until a key is set | `src/app/api/academy/tutor/handler.ts` |
| Corpus | science decks 3.65 MB in nine files; `lang-*` 4.17 MB under CC-BY-SA 3.0 and CC-BY 2.0 FR; about 4,800 distinct LaTeX snippets in the science decks | `learning/app/corpus` `[empirical: ls -la, meta read, regex count, 2026-10-20]` |
| Beads | `bd` absent on this Mac; no Apple bead in `.beads/issues.jsonl` | `[empirical: which bd, 2026-10-20]` |

## Capacitor Modes

| Property | Bundled mode | Web mode |
|---|---|---|
| Switch | `BKT_MOBILE_WEB` unset | `BKT_MOBILE_WEB=1`, `server.url` `https://www.bucket.foundation/research-os/home` |
| Session | email code through `/api/academy/session`, Bearer tokens in secure storage | Supabase cookie session in the WKWebView store |
| Offline | study works | nothing loads |
| Signed-out start | in-app sign-in | `/download` while the launch list is closed |
| Guideline 4.2 risk | medium | high: a remote site in a shell |
| Role | rollback build until the iPhone track exits | TestFlight `internal` only |

The native app clears `WKWebsiteDataStore.default()` on first launch and uses non-persistent stores for every web view.

## Server Contract

Every call sends `authorization: Bearer <access_token>`, checked by `verifyRequestUser` with gotrue `getUser`.

| Route | Change | Body | Success | Refusals |
|---|---|---|---|---|
| `/api/academy/session` | existing | `otp`, `verify`, `refresh` | `{access_token, refresh_token, expires_at, user_id}` | 400, 429 per IP and email, 401 `revoked`, 503 |
| same | new `id_token` | `{provider:"apple", id_token, nonce, authorization_code, client:"native"}` | same tokens via `signInWithIdToken`; the server then exchanges `authorization_code` at `https://appleid.apple.com/auth/token` with client id `foundation.bucket.app` within its 5-minute life and stores the Apple refresh token with that client id in `bucket.apple_tokens` | 400 `bad_token`, 429 on `idtoken:ip:<ip>` 40 per 600 s, 403 `signup_closed` |
| same | new `pkce` | `{auth_code, code_verifier}` | same tokens via GoTrue `grant_type=pkce` | 400 `bad_code`, 429, 403 `signup_closed` |
| same | new `logout` | `{scope:"local"}` with the Bearer token | ends that session through GoTrue `logout` | 401 |
| `/auth/callback` | capture provider refresh token | web OAuth callback | when the provider is Apple, stores `provider_refresh_token` with the Services ID as client id in `bucket.apple_tokens` | existing errors |
| `/.well-known/apple-app-site-association` | new route `src/app/.well-known/apple-app-site-association/route.ts` | GET | 200 `application/json`: `webcredentials.apps` `["QQ6D6A2LLS.foundation.bucket.app"]`, `applinks` for `/auth/native-callback` and `/device` | none |
| `/auth/native-callback` | new page outside `PROTECTED_PREFIXES` | GET from `ASWebAuthenticationSession` | the session intercepts the callback; a browser that lands here sees "return to the Bucket app" | none |
| `/api/academy/review-log` | existing | GET `since`, `limit<=500`; POST 1 to 200 `ReviewInput` | `{results, folded, advanced, skipped, capped}` | 409 conflict, 403 learn gate, 400 `bad_request`, 400 `device_mismatch` |
| `/api/academy/progress` | existing | GET; POST `{branch, data}` | upsert on `(user_id, branch)` | 401, 403, 503 |
| `/api/academy/device/*` | add kind `tv` to `DEVICE_KINDS` and to both check constraints in a new migration | start, approve, token, revoke | per `device-flow.ts` | per route |
| `/api/research-os/privacy` | new `delete_account` | `{action, confirm}` | `{learnerId, deletedAt, deleted, account:"deleted"}` | 400 `confirm_required`, 401, 403 reviewer target, 500 |
| `/api/canon/search`, `/api/explore/*`, `/academy-app/corpus/*` | existing | GET | JSON | per route |

GoTrue answers 422 with error code `signup_disabled` when signup is closed; `createSessionHandler` maps that to 403 `signup_closed`, and `BucketAPI` maps it to `BucketError.signupClosed` with the launch-list message. `ReviewInput` follows `parseReview`: lowercase UUID `review_id`, branch pattern, `card_id` up to 256, rating 1 to 4, level in `recall apply derive teach`, integer `reviewed_at` from 2020, `tz`, `atoms_version` of `corpus:<branch>` or `lang`, `device_id` `^[A-Za-z0-9._-]{1,64}$`. `parseRosLive("privacy")` and `packages/ros-contract/test/contract.test.ts` gain the `account` field in the same PR.

## Architecture

| Unit | Job | Platforms |
|---|---|---|
| `BucketModels` | `Codable`, `Sendable` mirrors of the contract types; Swift `parseReview` | all six |
| `BucketEngine` | ports of `fsrs.ts`, `replay.ts`, `mergeState` and the `engine.ts` study exports | all six |
| `BucketStore` | GRDB SQLite in the App Group container; `DatabaseMigrator` versions | iOS, iPadOS, macOS, tvOS, visionOS; watch keeps its own small cache |
| `BucketSync` | `actor SyncClient`, outbox flush, log pull, snapshot fallback | all but watchOS |
| `BucketAuth` | `actor SessionVault`, Keychain, providers, device key, deletion | all but watchOS |
| `BucketMath` | lesson renderer with pre-rendered math | all six |
| `Bucket3D` | RealityKit scenes | iOS, iPadOS, macOS, tvOS, visionOS |
| `BucketTutor` | on-device Foundation Models tutor | iOS, iPadOS, macOS, visionOS |
| Targets | `apple/project.yml` generates `Bucket.xcodeproj` with XcodeGen: multiplatform `Bucket` for iPhone, iPad, Mac and Vision Pro; `BucketTV`; `BucketWatch` embedded in the iOS app; `BucketWidgets`; `BucketShare` | one bundle id family, universal purchase |

| Topic | Choice | Reason |
|---|---|---|
| Language | Swift 6 mode, complete strict concurrency, Swift 6.2 from Xcode 26.2 | D2 |
| UI | SwiftUI `@Observable`; `NavigationStack` on iPhone and watch, `NavigationSplitView` on iPad, Mac, Vision Pro; focus-driven layouts on tvOS | one view tree |
| Math | build-time pre-render: `apple/tools/MathPrerender`, a macOS Swift CLI, loads bundled KaTeX in `WKWebView` on the Mac, exports each snippet with `createPDF` as a vector PDF keyed by sha256 of the source, and stores KaTeX MathML as the source of the VoiceOver label; lessons render as native SwiftUI text with inline math images on every platform | tvOS and watchOS have no WebKit (research §1); one renderer keeps every surface alike |
| Math fallback | a snippet missing from the bundle, after a corpus refresh, renders in SwiftUI `WebView` with KaTeX on iOS, macOS and visionOS, and as LaTeX source text on tvOS and watchOS | `WebView` is iOS, macOS and visionOS 26 only |
| Store | GRDB, MIT; runs on all six | D3 open |
| Sync backend | the existing Next.js routes over Supabase; CloudKit stays out because web and Android must see the same data | research §2.14 |

## Data And Conflict Rules

The server owns state; devices keep a projection plus an outbox. Rules copy `review-sync.ts`, `progress-store.ts`, `reconnect.ts` and `review-log-server.ts`; native differs in three places, each marked "native difference".

| Table | Key | Columns |
|---|---|---|
| `meta` | `key` | `schema_version`, `device_id`, `owner_user`, `owner_confirmed_at` |
| `branch_state` | `(owner, branch)` | `data`, `server_updated_at`, `local_dirty` |
| `outbox` | `review_id` | `ReviewInput` fields, `owner`, `queued_at`, `state` in `queued`, `held`, `rejected`, `last_error` |
| `seed`, `log_cursor`, `corpus` | `(owner, branch)`, `owner`, `deck` | snapshot seed, pull cursor, deck JSON with `etag` |

| Case | Rule | Source |
|---|---|---|
| Identity | v4 UUID per answer; resend after a lost response returns `duplicate` | `append_reviews`, `payloadHash` |
| Conflict | 409; drop every id in `results` | `flushOnce` |
| Order | `(reviewed_at, device_id, review_id)`; server clamps 24 h into the future | `compareReviewRows`, `clampReviewedAt` |
| Device id | each device mints an Ed25519 key with CryptoKit `Curve25519.Signing` and uses `deviceIdFor(pk)`: `dev_` plus 20 hex of sha256 of the raw key; binding later registers the same key | `device-flow.ts` line 54 |
| Id change | after a revoke or Keychain reset, binding waits for an empty outbox, or one transaction rewrites queued rows to the new id; rows already stored return `conflict` and drop | `payloadHash` |
| `device_mismatch` | native difference: rewrite to the bound id and retry once, then bisect | `review-log-server.ts` line 290 |
| Invalid row | native difference: validate and dedupe before send; a 400 splits the batch in halves until one row fails, which moves to `rejected` and shows on the Sync screen; the web client retries the same batch forever (`review-sync.ts` line 290), fixed by a bead | `parseReview` |
| Account switch | rows queued after the previous owner's last confirmation move to `held` | `switchOwner` |
| Refusal | 403 `minor_read_only` or `under_13` drops the owner's queue | `PERMANENT_REFUSALS` |
| Limits | warn at 2,000 rows; batches of 200; pages of 500 | `OUTBOX_CAP`, `BATCH`, `PULL_PAGE` |
| Snapshot mode | native difference: the web client drops queued rows at once on 503 `review_log_disabled` (`review-sync.ts` line 254); native drops them after `POST /api/academy/progress` with `mergeState` returns 200 | `pushBranch` |
| Screen state | `replay(server fold, pulled plus queued rows)`, then `mergeState` with local | `replay.ts` |
| Retry | scene active, network path satisfied, background refresh where the platform has it; 5 s, 15 s, 60 s, 300 s | `RETRY_MS` |
| Writers | the main app process alone flushes and refreshes; widgets, intents and the share extension append to the shared database; the watch sends answers over `WatchConnectivity` and the phone appends them with its own `device_id` | refresh-token rotation |
| Corpus | bundle the nine science files from a name allowlist with a sha256 manifest; refresh the same allowlist with `If-None-Match`; no `lang-*` file ships | `loadCorpusForBranch` folds server-side |
| Cross-process | `DatabasePool` in WAL with `observesSuspensionNotifications`, short transactions | shared-container lock terminations |

Schema migrations are named steps never edited after shipping; a newer `schema_version` opens read-only with a sign-out-and-resync action. Capacitor `localStorage` is not migrated.

## Auth

| Method | Native flow | Server | Platforms |
|---|---|---|---|
| Email code | email, then code | `session` `otp`, `verify` | all but watchOS |
| Sign in with Apple | `ASAuthorizationController` with `ASAuthorizationAppleIDProvider`; SHA-256 of a random nonce in the request; identity token and raw nonce to the server | `session` `id_token` calls `signInWithIdToken({provider:"apple"})` | iOS, iPadOS, macOS, tvOS, visionOS |
| Google, GitHub, later D10 providers | `ASWebAuthenticationSession` on `{SUPABASE_URL}/auth/v1/authorize?provider=<p>&code_challenge=<S256>&redirect_to=https://www.bucket.foundation/auth/native-callback`, callback `.https` matched by the associated domain; code and verifier to the server | `session` `pkce` | iOS, iPadOS, macOS, visionOS |
| TV code | `BucketTV` starts the device flow with kind `tv`, shows the 8-character code and a QR of `https://www.bucket.foundation/device?code=<user_code>`, polls `/token` with the Ed25519 proof | device routes | tvOS |
| Watch | no sign-in; the watch never holds tokens and works through the phone | none | watchOS |

| Item | Rule |
|---|---|
| Supabase config | on `xbwblxwafphvdeldighd` (D13) and in `supabase/config.toml` for the local stack: per provider enable `[auth.external.<p>]`, client id, secret through `env(...)`, `skip_nonce_check = false`; Apple client ids list `foundation.bucket.app` and the Services ID; the redirect allowlist adds `https://www.bucket.foundation/auth/native-callback` and `https://www.bucket.foundation/auth/callback`; `enable_manual_linking = true` |
| Web parity | `/sign-in` gains Apple, Google and GitHub buttons through `signInWithOAuth`, so an account made on a device signs in on the web |
| Linking | GoTrue links a new provider identity to an existing user when the provider email is verified and matches (unverified for the replacement host); Apple private-relay emails never match, so Account offers "link a sign-in method" through `linkIdentity`, which needs `enable_manual_linking = true`; unlinking requires two identities left |
| Duplicates | a person who already made a second account through a relay email gets a support path; no automatic merge in the first release |
| Signup gate | signup is open in production today; OAuth sign-up obeys the same GoTrue switch (D8); a GoTrue 422 `signup_disabled` becomes 403 `signup_closed` on `otp`, `id_token` and `pkce` |
| Keychain | service `foundation.bucket.session` as in `KeychainSessionStore`, plus `foundation.bucket.device-key`; access group from the `keychain-access-groups` entitlement; `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`, no iCloud sync; cleared on first launch without a `meta` row |
| Refresh | single-flight in the actor, 60 s early; 401 `revoked` clears the vault |
| Age band | 403 `no_profile` opens the age sheet; `13to17` keeps progress on the device |
| Device binding | iPhone, iPad, Mac and Vision Pro self-approve their own device code with their bearer; when `/token` returns the minted device session, the app stores it, then ends the original email or OAuth session through `session` `logout` with the old token, and signs each request with `x-bkt-device`; tvOS binds through the TV code flow; this path gets its own critic pass |

The Secure Enclave signs only P-256 and the server verifies only Ed25519, so the key is a Keychain item outside the enclave.

### Account Deletion

`/api/research-os/privacy` `delete` runs `privacy_delete_learner`, which deletes rows from 17 tables `[empirical: grep -c 'delete from' 20261005120000_research_os_work_quiz_languages.sql, 2026-10-20]` and keeps `auth.users`; reviewers may delete other learners' data there.

`delete_account` steps:

1. Confirm token required; `resolvePrivacyActor` must return `actingAsReviewer: false`, else 403.
2. Rate limit `delete:user:<uid>`, 5 per 600 s, through `session_rate_hit`.
3. For each `bucket.apple_tokens` row of the user, revoke at `https://appleid.apple.com/auth/revoke` with that row's client id and a client secret signed by the Sign in with Apple key. Rows come from the native `id_token` exchange (client `foundation.bucket.app`) and from the web `/auth/callback` (the Services ID). Whether GoTrue revokes on its own is unverified, so the server does it.
4. `deleteLearnerData(actor)`, then `auth.admin.deleteUser(uid)`, which cascades `identities`, `devices`, `device_codes`, `device_nonces`, `device_sessions`, `academy_sync_cursor`, `academy_review_baseline`, `academy_review_log` and `apple_tokens`.
5. 500 between steps leaves a retry that repeats every step, and each step is idempotent; 200 makes the client clear Keychain, the database and web stores; the phone tells the watch to wipe its cache.

Kept: 22 `on delete set null` foreign keys to `auth.users` leave authored graph rows with the author cleared `[empirical: grep set null count, 2026-10-20]`; `session_rate` hashed keys for 600 s; waitlist Blob objects; hosted backups to their window. The deletion screen and privacy text list each.

## Tracks

All tracks start together on the shared core. Tracks are build work; ship units, below, are what releases.

| Track | Scope | Platform specifics | Exit criteria |
|---|---|---|---|
| Core | engine, store, sync, auth, math pre-render, 3D scenes, server changes | packages compile for all six destinations in CI | T-01 to T-07, T-13, T-22, T-24 pass |
| iPhone | Learn, decks, lesson, study, review, quiz, placement, canon search, Explore, About with licences, Account with deletion and linking | Dynamic Type to accessibility sizes, VoiceOver | T-09 to T-12, T-14, compliance rows for iOS, 14 days on `internal` without a data-loss report |
| iPad | iPhone scope in split view, multiple windows through `WindowGroup(for:)`, keys space and 1 to 4, menu commands | no `UIRequiresFullScreen` | iPad snapshot set, keyboard test |
| Mac | iPad scope as a native macOS destination, menu bar, `Settings` scene | turn off "Designed for iPad" availability once it ships; Tauri per D5 | Mac snapshot set and full keyboard access test, both run on a macOS 26 host (Prerequisites) |
| Apple Watch | due-card review at recall level with pre-rendered math, grade buttons and Digital Crown, complications and Smart Stack through WidgetKit | embedded in the iOS app; no tokens; no 3D | T-20, offline review through the phone queue |
| Apple TV | review with select to flip and left or right to grade, lesson reader, Earth and atom in RealityKit, protein ball-and-stick | no WebKit; Siri Remote alone; focusable controls; 10-foot type; TV code and Sign in with Apple | T-25 remote-only walk, focus snapshot set |
| Vision Pro | iPad scope as windows; Earth, atom and protein as volumes | native build removes the iPad compatible mode in a universal record | T-21 |
| Extensions | widgets and Controls on iOS, macOS, watchOS, visionOS; study Live Activity on iOS shown in CarPlay and the watch Smart Stack | no network from extensions | T-16 |
| Intents | `StartReviewIntent`, `GradeCardIntent`, `OpenLessonIntent`, `SearchCanonIntent`, `AppShortcutsProvider` phrases; Spotlight through `IndexedEntity` on iOS, macOS, visionOS | intents append to the outbox | T-16, T-18 |
| Share | URL or text to an import draft | iOS, iPadOS, macOS, visionOS | share test in T-16 |
| CarPlay | widgets and Live Activity first, no entitlement needed (research §2.7); an audio-entitlement request for a "Listen" mode is filed later | no education category exists; approval for a flashcard app is uncertain | Live Activity visible in the CarPlay Simulator |
| Tutor | on-device tutor, see below | not tvOS or watchOS | T-23 |

tvOS is in scope by D1.

## Ship Units

An App Store platform version is the unit of release. Each unit depends on the Core exit, passes its own compliance rows, and soaks on TestFlight `internal` before review.

| Unit | Contains | Exit criteria, approved by founder (gianyrox) | Staged activation | Rollback |
|---|---|---|---|---|
| iOS | iPhone and iPad app, watch app, widgets, Controls, Live Activity, share extension, intents | Core exit; iPhone, iPad, Watch, Extensions, Intents, Share and Tutor track exits; iOS compliance rows; 14 days on `internal` with zero data-loss reports and zero `rejected` outbox rows without a cause; then 14 days on `external-alpha` | App Store phased release over 7 days for every update after 2.0; pause on a crash or sync regression | first release: bundled-mode Capacitor build as `2.0.1` with a higher build number, testers sign in again because Keychain items differ, the Sync screen shows unflushed reviews first; later releases: pause the phased release, ship a fix, or force an update through the flag file |
| macOS | native Mac app and its widgets | Core exit, Mac track exit on a macOS 26 host, macOS compliance rows, 14 days on `internal` | phased release over 7 days for updates | pause phased release; flag file disables sync or forces an update; the Tauri app stays available outside the store |
| tvOS | Apple TV app | Core exit, TV track exit with T-25, tvOS compliance rows, 14 days on `internal` | manual release after approval; phased release support on tvOS unverified | flag file; a fix build |
| visionOS | Vision Pro app | Core exit, Vision track exit, visionOS compliance rows, 14 days on `internal` | manual release after approval | flag file; a fix build; the iPad compatible mode is gone once a native visionOS version exists in the universal record |

Flag file: `public/apple/flags.json` on the site, served static by Vercel and changed by a PR into `dev` then `main`:

```json
{ "schema": 1, "min_build": { "ios": 0, "macos": 0, "tvos": 0, "visionos": 0 }, "sync_enabled": true, "message": null }
```

Every app fetches it at launch and on return to the foreground. A build below `min_build` shows an update screen and keeps local study. `sync_enabled: false` stops flushes and pulls; the outbox keeps rows until it turns back on. Fetch failure keeps the last cached value, and a first launch with no cache treats sync as on. T-28 covers it.

Migration compatibility: every server change is additive. New session actions, the `logout` action, the `tv` device kind, `delete_account`, `bucket.apple_tokens` and the two web routes leave the bundled Capacitor app and the web unchanged, so a client rollback needs no server rollback; a server rollback reverts its PR and keeps the new table. Local database migrations only move forward; an older build that meets a newer `schema_version` opens read-only with sign-out-and-resync. The bundled-mode iOS job in `bkt-mobile.yml` keeps building until 30 days after the native iOS release.

## 3D Scenes

| Scene | iOS, iPadOS, macOS | tvOS | visionOS | watchOS |
|---|---|---|---|---|
| Earth | `RealityView`, 2k map, landmask hit test | same | volume, 8k map | none |
| Atom plot | RealityKit instanced spheres from `atom-circle.ts` math | same | volume | none |
| Halo | Metal `.layerEffect` | same | same | none |
| Graphs | SwiftUI `Canvas` | same with focus | window | none |
| Protein | RealityKit ball-and-stick from a Swift PDB parser; 3Dmol ribbons in an offline `WebView` as a second mode | ball-and-stick only | volume | none |

SceneKit is deprecated in 26.0 on every platform (research §4), so it is left out.

## Tutor

| Item | Plan |
|---|---|
| Model | `SystemLanguageModel.default` on Apple Intelligence devices with iOS, iPadOS, macOS or visionOS 26; gated on `availability`, with the non-AI lesson view as the fallback |
| Scope | one atom: its lesson section, one quiz item and the learner's answer; tasks are hint, explain this card, and grade a free-text answer with `@Generable` output |
| Budget | 4,096 tokens shared by input and output (research §2.13); prompts trim to 3,000 input tokens, measured with the token counting API under `if #available(iOS 26.4, *)` and a character estimate before that |
| Grounding | answers cite spans of the atom text; the client checks each citation is a substring of the prompt and abstains otherwise, mirroring the closed-set rule of `src/app/api/academy/tutor` |
| Data | on-device, so guideline 5.1.2(i) consent does not apply; the server tutor stays off on Apple surfaces until a consent screen exists |
| Product rule | any-topic generation stays removed (2026-06-15) |

## Certificate Pins

| Item | Plan |
|---|---|
| Pins | X1, X2 and YR SPKIs in every target's `NSPinnedDomains`; a new ISRG root is added in a build before Let's Encrypt issues from it |
| Monitor | `scripts/apple/check-pins.sh` hashes the live chains of apex and www and fails when no pin matches; a daily `ops` workflow and `release.sh` both run it |
| Runbook | add the new SPKI, ship, retire the old pin after 90 days; if Vercel leaves Let's Encrypt, ship new pins first or an emergency build without pinning |

## Tooling And Release

| Item | Plan |
|---|---|
| Project | `apple/project.yml` generates `apple/Bucket.xcodeproj` with XcodeGen (MIT, a build-time tool only); package `apple/BucketKit`; the generated project stays out of git |
| Release | `apple/scripts/release.sh <platform>` with the Xcode account session: `xcodebuild archive -allowProvisioningUpdates DEVELOPMENT_TEAM=QQ6D6A2LLS CURRENT_PROJECT_VERSION=<n>`, then `-exportArchive` with `method=app-store-connect`, `destination=upload`; `--asc-key` adds API-key flags |
| Build number | `date +%y%m%d%H%M`; the script reads the newest build from App Store Connect with a key, else requires `--after <build>`, and refuses lower values |
| Version | `2.0` on every platform |
| TestFlight | `internal` with founder and team; `external-alpha` up to 25 learners per platform, native builds only |
| PR CI | `.github/workflows/apple.yml` on a macOS runner, Xcode 26.2 by path: `swift test`, simulator tests for iOS, tvOS, watchOS and visionOS; the macOS test run needs a `macos-26` runner image (unverified) or this Mac after the upgrade |
| Branches | Swift on `feat/apple-*` and server changes on `feat/site-*` into `dev`; workflows and scripts on `ops/apple-ci` into `ops/integration` |

Budgets are unmeasured targets recorded by XCTest metrics: launch to Learn home 1.0 s on iPhone 13 class, rating to next card 100 ms, Earth scene 250 MB, download 60 MB per platform including math PDFs, no hang over 250 ms in a 10-minute session.

## App Store Compliance

Owner "agent" is an agent session reviewed by founder; "founder" is founder (gianyrox). Each row's evidence is saved to `apple/compliance/<platform>/` before submission.

| Guideline | Requirement for Bucket | Owner | Test | Evidence |
|---|---|---|---|---|
| 1.2 | no other users' content in the apps; class sharing and public profiles stay web-only | agent | T-14 route allowlist | screen inventory |
| 2.1 | complete builds, live backend, demo path per D6, review notes per platform | founder | T-10 on the review build | review notes |
| 2.3 | screenshots and text per platform show that platform's real screens; no other-platform names | founder | checklist | App Store Connect metadata export |
| 2.5.1, 2.5.2 | public APIs; no downloaded code; KaTeX and 3Dmol bundled; corpus is data | agent | T-14 no remote script | bundle listing |
| 2.5.4 | background modes only for refresh | agent | entitlement diff | `Info.plist` |
| 2.5.16, 2.5.18 | widgets, Controls, share extension tie to study; no ads anywhere | agent | T-16 | screenshots |
| 2.4.3 tvOS | every tvOS action with the Siri Remote alone | agent | T-25 | screen recording |
| 3.1 | nothing sold, so no IAP; no links to paid digital content, which keeps the x402 citation rail off Apple surfaces | agent | T-14 string scan for x402 and pricing | bundle scan |
| 3.2.1(vi) | in-app donations only once Bucket is an approved nonprofit; the filing is pending (`docs/foundation/GOVERNANCE.md`), so no donation button or link ships | founder | T-14 string scan | founder note |
| 4.0 | HIG per platform, system controls, Dark Mode | agent | snapshot sets | parity sheet |
| 4.2 | native screens on every platform; web mode never submitted | founder | TestFlight group audit | group list |
| 4.8 | Sign in with Apple offered beside Google and GitHub on every platform that offers them | agent | T-26 | screenshots |
| 5.1.1(i), (ii) | privacy policy link in each app and record; consent before age band | founder | link check | URL |
| 5.1.1(v) | in-app deletion, Apple token revocation | agent | T-07 | test log |
| 5.1.2(i) | no third-party AI on Apple surfaces until a consent screen exists | agent | T-14 tutor route absent | bundle scan |
| Privacy manifest | `PrivacyInfo.xcprivacy` per target: no tracking, UserDefaults `CA92.1`, file timestamp `C617.1` if used; required-reason APIs audited from the built binary | agent | T-14 | manifest files |
| Nutrition label | email, user id, learning progress, all linked, none for tracking; provider identifiers added for OAuth | founder | checklist | App Store Connect answers |
| Age rating | questionnaire with no user content, no web browsing, education; server refuses under-13 writes | founder | checklist | rating screen |
| Kids category | not used; a Kids app could not ship on visionOS (research §2.6) | founder | none | record setting |
| Export compliance | `ITSAppUsesNonExemptEncryption` false: OS TLS and Ed25519 authentication (exemption wording unverified) | founder | plist check | plist |
| Accessibility | VoiceOver labels on cards, grades, scenes and math; Dynamic Type on iOS, iPadOS, watchOS, visionOS; macOS text size and keyboard access; tvOS focus and Larger Text; Reduce Motion for flips and spins | agent | T-27 audits per platform | Accessibility Inspector reports, optional Accessibility Nutrition Labels |
| watchOS | ships inside the iOS app; review works offline through the phone queue | agent | T-20 | test log |
| 5.2 | licences shown: Earth CC-BY-4.0, deck notes, KaTeX MIT, 3Dmol BSD (unverified), GRDB MIT | agent | T-14 About check | About screenshot |
| EU DSA trader status | declare in App Store Connect before EU distribution; trader status publishes contact details including an address (D14) | founder | none | App Store Connect setting |
| Age assurance | answer the updated age rating questionnaire; adopt the Declared Age Range API on iOS 26 where US state app-store age laws apply and feed its result into the age-band sheet; which states and dates apply needs verification | founder decides, agent builds | T-29 age sheet with and without a declared range | questionnaire export, legal note |
| Private Email Relay | register the OTP sender address and domain, with SPF and DKIM, under Sign in with Apple for Email Communication so relay addresses receive codes and deletion notices | founder | T-26 sends a code to a relay address | developer portal screenshot |
| Google OAuth consent | consent screen with the Bucket name, logo, privacy policy and `email` and `profile` scopes; brand verification before external testers | founder | T-26 on a non-test Google account | Google Cloud console status |

## Tests

| ID | Test | Owner | Track |
|---|---|---|---|
| T-01 | `FSRSGoldenTests` against vectors from new `scripts/apple/record-fsrs-vectors.ts`; integers exact, doubles 1e-12 relative | agent | Core |
| T-02 | `ReplayGoldenTests` on `tests/fixtures/academy-replay-sessions.golden.json` | agent | Core |
| T-03 | `MergeStateTests` from `scripts/test-academy-engine.ts` | agent | Core |
| T-04 | `OutboxTests`: review-sync cases plus bisect to one `rejected` row, pre-send dedupe, snapshot mode holding rows until 200 | agent | Core |
| T-05 | `ContractFixtureTests` on pairs from new `scripts/apple/record-contract-fixtures.ts`, including `id_token` and `pkce`; CI fails on drift | agent | Core |
| T-06 | `SessionVaultTests`: single-flight refresh under 20 callers, 401 clears, reinstall clears | agent | Core |
| T-07 | `scripts/test-account-delete.ts` on the local stack: every listed table empty for the user, set-null rows kept, Apple revoke called with a stub once per `apple_tokens` row with the right client id for a native-origin and a web-origin token, reviewer 403, retry after a fault, contract parse | agent | Core |
| T-08 | tester count and pending bundled-mode reviews before cutover | founder | iPhone |
| T-09 | `LearnLoopUITests` with a `URLProtocol` stub: sign in, study, offline, reconnect, flush | agent | iPhone |
| T-10 | `apple/scripts/e2e-local.sh`: app against `npm run dev` and the local stack, code from Inbucket, same progress on the web | agent runs, founder confirms | iPhone |
| T-11 | snapshots: `ImageRenderer` for SwiftUI screens, XCUITest captures for `WebView` and `RealityView` screens, per platform, light and dark | agent | all |
| T-12 | performance budgets | agent | iPhone |
| T-13 | fault injection: kill between append and flush, drop responses; zero lost and zero duplicate rows | agent | Core |
| T-14 | bundle checks: staff data, smoke hook, Kruse text, `lang-*`, licence allowlist, remote scripts, x402 and donation strings, tutor route, privacy manifest | agent | all |
| T-16 | extensions and intents: read-only access, intent append flushed by the app, share draft | agent | Extensions |
| T-17 | binding: signed request, replayed nonce, revoked device, id rewrite, `device_mismatch` retry, TV kind; after binding the original session's token gets 401; revoking the device ends the session the app is using, and its next call gets 401 | agent | Core |
| T-18 | Spotlight holds each atom title once | agent | Intents |
| T-20 | watch answer queued on the phone with the phone `device_id`; wipe on deletion | agent | Watch |
| T-21 | RealityKit memory budget on visionOS | agent | Vision Pro |
| T-22 | `check-pins.sh` passes live, fails on a test CA | agent | Core |
| T-23 | tutor eval: 50 fixed atom prompts, every citation a substring, abstain when unsupported, prompt under 3,000 tokens; no quality claim from it | agent | Tutor |
| T-24 | `MathPrerender` covers every bundled snippet; spoken label present for each | agent | Core |
| T-25 | tvOS walk with the Siri Remote alone through sign-in, review and a 3D scene | agent runs, founder confirms | Apple TV |
| T-26 | each provider signs in on the local stack with test apps and then on a device against production, links to an email account, unlinks only with two identities left; the AASA route returns 200 `application/json` and the `.https` callback returns to the app; a relay address receives an OTP; closed signup returns `signup_closed` | agent runs, founder confirms | Core |
| T-27 | Accessibility Inspector audit and a VoiceOver walk per platform | agent runs, founder confirms | all |
| T-28 | flag file: `min_build` above the running build shows the update screen; `sync_enabled: false` stops flushes and keeps rows; fetch failure keeps the cached value | agent | Core |
| T-29 | age assurance: the age sheet with a declared range, without one, and with a refusal | agent | iOS |

An unrun test counts as open; the plan claims no result.

## Beads To File

`bd` is not on this Mac; file these where Dolt runs. Agent rows carry `needs-founder` and `source-agent`; the decision rows carry `source-founder`.

| Title | Labels | Depends on | Acceptance |
|---|---|---|---|
| D1, D2, D4 recorded: all Apple surfaces, OS 26 floor, Apple and OAuth sign-in | `source-founder` | none | this plan |
| Open decisions D3, D5 to D14 | `needs-founder`, `source-agent` | none | founder answers |
| Toolchain upgrade to macOS Tahoe 26.6 and Xcode 27 | `needs-founder`, `source-agent` | none | `xcodebuild -version` |
| BucketKit engine, store, sync, auth | `needs-founder`, `source-agent` | plan | T-01 to T-07, T-13 |
| Session `id_token`, `pkce` and `logout`, providers on `xbwblxwafphvdeldighd`, web OAuth buttons, Apple token capture in `/auth/callback` | `needs-founder`, `source-agent` | D13 | T-05, T-26 |
| AASA route and `/auth/native-callback` page | `needs-founder`, `source-agent` | plan | AASA 200 `application/json`, T-26 on device |
| Flag file and app checks | `needs-founder`, `source-agent` | core | T-28 |
| Compliance accounts: DSA trader status, Private Email Relay, Google consent verification, age questionnaire | `needs-founder`, `source-agent` | D14 | compliance rows filled |
| Device kind `tv` migration | `needs-founder`, `source-agent` | plan | T-17 |
| Privacy `delete_account` with Apple revoke | `needs-founder`, `source-agent` | id_token bead | T-07 |
| Math pre-render tool | `needs-founder`, `source-agent` | plan | T-24 |
| One bead per track: iPhone, iPad, Mac, Watch, TV, Vision Pro, Extensions, Intents, Share, Tutor | `needs-founder`, `source-agent` | core | track exit criteria |
| CarPlay audio entitlement request | `needs-founder`, `source-agent`, `post-launch` | Extensions | Apple reply |
| Release script, pin monitor, CI | `needs-founder`, `source-agent` | plan | T-22, green CI on `ops/integration` |
| Compliance evidence per platform | `needs-founder`, `source-agent` | tracks | `apple/compliance/` filled |
| Web outbox stalls on a 400 batch | `needs-founder`, `source-agent` | plan | bisect case in `scripts/test-academy-review-sync.ts` |
| Retire Capacitor iOS path | `needs-founder`, `source-agent`, `post-launch` | 30 days after iPhone release | iOS job removed |

The launch gate in `CLAUDE.md` holds: every track bead names screens a person touches at launch, and D1 puts all six surfaces in the launch.

## Risks

| Risk | Likelihood | Impact | Mitigation | Uncertainty |
|---|---|---|---|---|
| Six tracks at once outrun one founder's review time | high | slipped gates | core first; tracks ship on their own exits (D12) | review hours unmeasured |
| Account duplicates from relay emails | medium | split progress | manual linking, support path | GoTrue automatic linking on `xbwblxwafphvdeldighd` unverified |
| Open signup in production before launch | high | accounts made outside the launch list | D8 | none: `disable_signup: false` measured 2026-10-20 |
| Mac tests blocked on the macOS 15.1 host | high | Mac unit cannot exit | `macos-26` runner or host upgrade | runner availability unverified |
| Apple refresh token missing for a user | medium | revoke cannot run | exchange at sign-in on both origins, T-07 | 5-minute code life leaves no retry after a failed exchange |
| Math PDFs inflate download size | medium | budget miss | dedupe by hash, measure in T-24 | about 4,800 snippets, size unmeasured |
| Swift and TS engine drift | medium | different schedules | T-01, T-02 in both CI workflows | drift rate unknown |
| CA change outside the pins | low | installed builds go offline | T-22, runbook | Vercel CA plans unknown |
| CarPlay audio entitlement refused | high | no Listen mode | widgets and Live Activity need none | Apple discretion |
| Foundation Models absent on most devices in use | medium | tutor unused | non-AI fallback | install share of Apple Intelligence devices unverified |
| Shared SQLite across processes | medium | terminations | suspension notifications, T-16 | untested on 26 |

## Unverified

- Whether `xbwblxwafphvdeldighd` is the durable host (D13).
- Why Xcode 26.2 runs on macOS 15.1 when Apple lists 15.6, and whether iOS 26 simulators run on this host.
- GoTrue automatic identity linking, Apple token revocation by GoTrue, and server-side PKCE exchange on `xbwblxwafphvdeldighd`.
- A GitHub `macos-26` runner image, tvOS phased release, and the US state age laws and dates in force.
- Apple claims taken from the research file: CarPlay entitlement outcomes, Foundation Models context size, export-compliance wording, Accessibility Nutrition Label deadlines, universal purchase rules.
- 3Dmol licence, protein PDB file sources, and math PDF sizes.
- Multi-line foreign keys missed by the single-line grep; T-07 runs on the full schema.
- Whether ATS pinning applies to web-mode WKWebView loads.
