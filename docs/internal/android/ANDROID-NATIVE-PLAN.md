# Android Native Plan

Base revision: `c1afe33045` on `dev`, read 2026-11-12 on charizard with Android SDK platforms 31, 35 and 36 and JDK 21. Status: plan, round 2 after critic round 1. The plan commit sits directly on `dev` at `c1afe33045`, which was still the `dev` head on 2026-11-12. Platform facts come from `docs/internal/android/android-surfaces-research.md`; a row marked "research" cites its section there. Epic `bkt-292zc`, plan bead `bkt-292zc.1`. Founder decided AD3 to AD6 and AD8 to AD16 on 2026-11-12 as recommended; AD7 stays open.

Target outcome: Polingual and Bucket Foundation run as native Kotlin and Jetpack Compose apps on Android phones, tablets, foldables and Chromebooks, on one shared Kotlin core that mirrors BucketKit. A person signs in with the same email code or Google account as on iOS and the web, finds the same progress, and plays a live lobby with iOS and web players on one room code. Wear OS, Android Auto, TV, XR and widgets follow as tracks on the same core.

Owners: "founder (gianyrox)" approves every gate and decision; "agent" is an agent session reviewed by the founder.

## Founder Decisions

Decided rows carry `source-founder`. Open rows carry a recommendation.

| ID | Question | Status | Answer or recommendation |
|---|---|---|---|
| AD1 | Scope | decided 2026-11-12 | Polingual at feature parity with iOS, plus Bucket Foundation on the same core (founder, via coordinator) |
| AD2 | Stack | decided 2026-11-12 | Kotlin, Jetpack Compose, Material 3, Navigation Compose, coroutines and Flow, kotlinx.serialization, Media3, DataStore; min SDK 26; target API 36, the Play floor since 2026-08-31; compileSdk 37 for Compose BOM 2026.08.00 (research, SDK and Compose) |
| AD3 | One app or two Play listings | decided 2026-11-12, `source-founder` | two listings, `com.polingual.app` and `foundation.bucket.app`, built from one Gradle project with a shared `:core` module, mirroring the two iOS bundle ids. Each listing keeps its own rating, data safety form and billing; Polingual carries ads and subscriptions, Bucket carries neither |
| AD4 | Shared core language | decided 2026-11-12, `source-founder` | a separate Kotlin core (Android-only JVM modules). KMP would let Swift call the Kotlin core, but BucketKit already exists in Swift with 413 tests, so KMP adds a second source of truth on iOS for no Android gain (research, KMP) |
| AD5 | Surfaces in the first release | decided 2026-11-12, `source-founder` | phone, tablet, foldable and ChromeOS in one adaptive APK set; Wear OS, Glance widgets and Android Auto second, because a car app puts every later update for every device type behind a manual car review (research, Auto); Android TV and XR deferred until phone ships |
| AD6 | Sign-in methods | decided 2026-11-12, `source-founder` | email code (existing `session` actions) and Sign in with Google through Credential Manager in the first release. Apple plan D4 asked for Google, GitHub and other OAuth providers; on Android, GitHub would run through a Custom Tab PKCE flow and waits for the iOS `pkce` action, so it follows in Polingual 1.1. Passkeys follow web support |
| AD7 | Play developer account type | open | founder call. Bucket is held in the founder's personal name and AdMob and AdSense sit on his personal Google account, so a personal account is the default reading; an organization account under AG Farms LLC needs a D-U-N-S number. Personal accounts made after 2023-11-13 need 12 testers opted in for 14 days before production; the organization exemption appears only in a Play community guide, so plan for the closed test either way (research, Play testing) |
| AD8 | Subscription product ids and prices | decided 2026-11-12, `source-founder` | reuse the iOS ids so `POLINGUAL_PRODUCTS` in `src/lib/app-store/entitlement.ts` covers both stores: subscriptions `com.polingual.monthly` and `com.polingual.yearly` with a 3-day free trial offer, `com.polingual.family.yearly`, and the one-time product `com.polingual.lifetime`; prices match the App Store tiers |
| AD9 | Ads | decided 2026-11-12, `source-founder` | AdMob in Polingual lobbies only, banner in the lobby and an interstitial between games, behind a remote flag, off by default; UMP consent before any ad request; no ads in Bucket. Same scope as the handoff for iOS |
| AD10 | Families policy and audience | decided 2026-11-12, `source-founder` | target audience 13 and older on Polingual so the Families policy and its certified-ads-SDK rule do not apply; the age band sheet stays; Bucket keeps the same age gate as iOS |
| AD11 | Free beta access | decided 2026-11-12, `source-founder` | iOS grants free access on TestFlight. On Android, grant it on debug and internal-test builds through a build flavor, never on production; a server allowlist is the alternative |
| AD12 | Push notifications | decided 2026-11-12, `source-founder` | Firebase Cloud Messaging with a new `platform: "fcm"` on `/api/academy/push/register`; needs a Firebase project. Defer to the second ship unit; local reminders through WorkManager first |
| AD13 | Signing | decided 2026-11-12, `source-founder` | Play App Signing with an upload key generated on charizard, kept outside git in `~/.bucket-secrets/android/`, backed up to the founder's password manager |
| AD14 | Release gate | decided 2026-11-12, `source-founder` | the founder approves each ship unit after its exit criteria pass and the 14-day closed test ends; agents never press release in the Play Console |
| AD15 | Polingual lexicon and corpus licence on Play | decided 2026-11-12, `source-founder` | ship the same bundled corpus as iOS (`apple/Shared/Corpus`, CC-BY-SA material) with the same About and licence screen; this matches the decision already taken for iOS |
| AD16 | App Clip equivalent | decided 2026-11-12, `source-founder` | none in the first release; the research file found no current primary source on Google Play Instant, and the web `/play/<code>` link covers quick join for people without the app |

## Prerequisites

| Item | State | Owner |
|---|---|---|
| Google Play developer account | absent | founder (gianyrox) |
| Upload key and Play App Signing enrolment | absent; AD13 | founder approves, agent generates |
| Play app records `com.polingual.app` and `foundation.bucket.app` | absent; AD3 | founder |
| Play Billing products and the 3-day trial offer | absent; AD8 | founder |
| Google Play service account with Android Publisher API access, for server purchase checks and Real-time developer notifications | absent | founder |
| Pub/Sub topic for Real-time developer notifications, pushing to a new server route | absent | founder creates, agent wires |
| AdMob Android app ids and ad unit ids for Polingual | absent; Google test ids used until then | founder |
| Google Cloud OAuth clients: one Android client per app per signing certificate SHA-1 (upload and Play signing), plus the existing web client id for Credential Manager | absent | founder |
| Supabase Google provider enabled on the production auth host with the Android client ids allowed | absent; AD6 | founder |
| Digital Asset Links file at `https://www.bucket.foundation/.well-known/assetlinks.json` for app links and passkeys | 404 today; Server Contract | agent |
| `LOBBY_GUEST_SECRET` in the Vercel env | open in the lobbies handoff; guest lobby play fails with 503 without it | founder |
| Firebase project, only if AD12 picks FCM | absent | founder |
| Server env `GOOGLE_AUDIENCES` with the web client id, and `PLAY_RTDN_AUDIENCE`, in Vercel | absent | founder sets, agent documents in `.env.example` |
| Toolchain | charizard has SDK platforms 31, 35, 36; platform 37 and AGP 9.1.1 are needed for compileSdk 37; no system image yet; an x86_64 Google APIs image for API 36 is about 1.5 GB | agent |

## Current State

| Area | Fact | Path |
|---|---|---|
| Android code | none on `dev`; branch `feat/android-polingual` holds no commits beyond `dev` | `android/` absent |
| Shared Swift core | `BucketKit`: API client, session, lobbies, groups, Polingual engine, games, lexicon, today plan, content and radio; the lobbies handoff reports 413 passing tests; this plan did not rerun them | `apple/BucketKit/Sources/BucketKit` |
| Apps on iOS | two app targets from one `project.yml`: `Bucket` (`foundation.bucket.app`) and `Polingual` (`com.polingual.app`), each with widgets, share extension and a watch app; `BucketClip` App Clip for Bucket | `apple/project.yml` |
| Polingual sources | about 60 SwiftUI files: Today, Learn, Account tabs; eight daily games (Daily Set, Mini, Word Groups, Same Word, Speed Match, Which Voice, Flags, Letter Sprint); translate card; Listen radio; lobbies; groups; paywall; onboarding | `apple/Bucket/Sources/Polingual`, `apple/Polingual/Sources` |
| Bucket sources | Today, Learn, Account; science decks, question cards, canon search, library | `apple/Bucket/Sources` |
| Bundled data | 19 MB under `apple/Shared/Corpus`: four `lang-*.json` files, `top1000/*.json`, and `lexicon/*.tsv.z` (raw deflate, one per language) | `apple/Shared/Corpus` |
| Auth | `POST /api/academy/session` actions `otp`, `verify`, `apple`, `refresh`, `delete_account`; tokens `{access_token, refresh_token, expires_at, user_id}` | `src/lib/academy/session-server.ts` |
| Entitlement | App Store server notifications and `GET /api/academy/entitlement`; no Google Play path | `src/app/api/app-store`, `src/app/api/academy/entitlement` |
| Push | APNs only: `/api/academy/push/register` takes an APNs token, env and bundle id | `src/lib/academy/apns.ts` |
| Lobbies | live on dev; guest tickets, merge, answer key on the server, 1 s poll | `src/app/api/academy/lobbies`, `HANDOFF-polingual-lobbies.md` on `handoff/polingual-lobbies` |
| Radio | Listen radio streams stations from the public radio-browser.info API | `apple/BucketKit/Sources/BucketKit/Content.swift` |
| Prices | `com.polingual.monthly`, `.yearly`, `.family.yearly`, `.lifetime`; 3-day trial | `apple/Polingual/Sources/Entitlement.swift` |

## Feature Map

Each iOS feature, its Android counterpart, and the module that owns it. "core" is the shared Kotlin core; "pol" and "bkt" are the two app modules.

| iOS feature | Swift source | Android counterpart | Module |
|---|---|---|---|
| Email code sign-in, refresh, sign-out | `BucketAPI`, `Account` | Ktor client on the same `session` actions; tokens in DataStore encrypted with an Android Keystore AES key; single-flight refresh with a `Mutex`, 60 s early | core |
| Sign in with Apple | `session` `apple` | Sign in with Google through Credential Manager (AD6); Apple sign-in on Android is out of scope | core |
| Guest mode and save-progress nudge | `GuestPass`, `SaveProgress` | same guest ticket flow, guest id in DataStore, merge on sign-in | core, pol |
| Delete account | `session` `delete_account` | same action; lobby rows go through `bucket.delete_lobby_user` on the server already | core |
| Onboarding and language choice | `Onboarding.swift` | two-page `HorizontalPager`, presets Romance, East Asian, Germanic, Iberian, flag tiles | pol |
| Language systems and sync | `LangStore`, `LangSystems` | Kotlin port; systems pushed to `/api/academy/progress` branch `lang-systems` | core |
| Study engine and daily session | `Engine.swift`, `TodayPlan` | Kotlin port with golden vectors from the Swift tests | core |
| Eight daily games | `Games.swift`, `GamePlay.swift`, `MiniGame.swift`, `WordGroupsGame.swift`, `LetterGame.swift` | Kotlin ports of round builders with the same seeded RNG so a day's set matches iOS; Compose screens per game | core, pol |
| Word detail, translate, language picker | `TranslateCard.swift`, `Lexicon.swift` | lexicon loaded from the same `.tsv.z` assets with `java.util.zip.Inflater(nowrap = true)`; picker with recents, search and swap | core, pol |
| Voice and pronunciation | `LangVoice.swift` (AVSpeechSynthesizer) | Android `TextToSpeech` with per-language voice checks; missing voices show a prompt to install | pol |
| Listen radio with background audio | `AppAudio.swift` | Media3 `MediaLibraryService` with ExoPlayer, foreground service type `mediaPlayback`, media notification, Android Auto browse tree (research, Auto) | pol |
| Paywall, trial, restore | `Paywall.swift`, `Subscriptions.swift` | Play Billing Library; restore is `queryPurchasesAsync`; server verification route (Server Contract) | pol |
| Lobbies | `Lobbies.swift` (kit and UI) | same REST contract, 1 s poll while a room is open, server clock offset, round phase from `LobbyClock` | core, pol |
| Lobby ads | `LobbyAds.swift` | AdMob banner and interstitial behind the flag, UMP first (AD9) | pol |
| Groups, cheers, shares | `Groups.swift`, `GroupSocial.swift`, `GroupShares.swift` | same `groups` routes; second ship unit | core, pol |
| Account: display name, username | `AccountView.swift`, `/api/academy/profile` | profile `POST {handle, display_name}`, lobby display name | core |
| Reminders, word of the day | `Reminders.swift`, `WordOfDayReminder.swift` | WorkManager daily job and `POST_NOTIFICATIONS` permission on API 33+ | pol |
| Widgets | `PolingualWidget.swift` | Glance app widgets: streak and word of the day | pol |
| Share extension | `PolingualShare` | `ACTION_SEND` text intent filter opening translate | pol |
| Watch app | `apple/Polingual/Watch`, `apple/Polingual/WatchShared/WatchDeck.swift` | Wear OS app with a word deck and a Tile (track Wear) | wear |
| Deep links | `DeepLink` used in `apple/Bucket/Sources/BucketApp.swift` and `apple/Polingual/Sources/PolingualRoot.swift` | Android App Links on `www.bucket.foundation/play/<code>` and `/join/<code>` with `assetlinks.json` | pol |
| Bucket science study, canon search, library | `ScienceLearn.swift`, `ScienceStudy.swift`, `CanonView.swift`, `Library.swift` | Compose screens on the same core and corpus routes | bkt |
| Placement test | `PlacementView.swift`, `PlacementCEFR.swift` | same CEFR placement port | core, pol |
| Alphabet study, sound drills, letter sounds | `AlphabetStudy.swift`, `SoundDrills.swift`, `LetterSounds*.swift`, `CharacterTables.swift`, `ScriptCourse.swift` | Kotlin ports of the tables and Compose drills | core, pol |
| Tap words, sentence translations | `TapWords.swift`, `SentenceTranslations.swift` | same | pol |
| Watch films with subtitles | `FilmViews.swift` | Media3 player with the same subtitle source; Today `watch` activity | pol |
| Wrong translation report | `WrongTranslation.swift` | same `POST /api/academy/translation-report` | pol |
| Feedback, beta events | `Feedback.swift`, `Beta.swift`, `BetaEvents.swift`, `BetaFlags.swift` | same routes; beta access per AD11 | core, pol |
| Milestones, streak goal, brag card | `MilestoneMoment.swift`, `Milestones.swift`, `StreakGoal.swift`, `StreakGoalCard.swift`, `GameBrag.swift`, `GameLedger.swift`, `ShareCard.swift` | ports; brag and share cards rendered to a bitmap and sent through the Android share sheet | core, pol |
| Group compare, shared items, screen share | `GroupCompare.swift`, `ShareObjects.swift`, `SharedItems.swift`, `ScreenShare.swift` | with groups in Polingual 1.1; screen share maps to a screenshot share | pol |
| Interface language | `InterfaceLanguage.swift`, `*.lproj` | per-app language through `LocaleManager` and `locales_config.xml`; strings converted from `.lproj` to `values-*/strings.xml` by a script | pol |
| Add to Today, today plan store | `AddToToday.swift`, `TodayPlanStore.swift` | same | core, pol |
| Reminder consent and plan | `ReminderConsent.swift`, `ReminderPlan.swift` | same rules over WorkManager | core |
| App Shortcuts and intents | `Shortcuts.swift` | static and dynamic shortcuts in `shortcuts.xml`; App Actions only if the founder asks | pol |
| Library | `Library.swift`, `LibraryView.swift` | same | core, pol, bkt |
| Bucket widgets, share extension, watch | `BucketWidgets`, `BucketShare`, `BucketWatch` | Glance widget and `ACTION_SEND` in Bucket 1.0; Bucket on Wear OS deferred with no date | bkt |
| Bucket App Clip | `BucketClip` | none (AD16) | none |
| Mac Catalyst and native Mac | `supportedDestinations: [iOS, macOS]` | ChromeOS through the same APK with keyboard and pointer support | pol, bkt |

## Server Contract

Every authenticated call sends `authorization: Bearer <access_token>`. Rows marked existing need no server change.

| Route | Change | Body | Success | Refusals |
|---|---|---|---|---|
| `/api/academy/session` | existing | `otp`, `verify`, `apple`, `refresh`, `delete_account`; `otp` takes `app` and looks it up in `APP_REDIRECTS`, which holds `polingual` only, so Android Polingual sends `app:"polingual"` and Bucket sends none | `{access_token, refresh_token, expires_at, user_id}`; delete returns `{ok:true}` | 400 `bad_email`, `bad_code`; 401 `revoked`; 429; 503 |
| same | new action `google`, shaped like `apple` | `{action:"google", id_token, nonce, app}` with `app` in `APPLE_APPS` | the handler checks the token locally before GoTrue, as `appleTokenOk` does: RS256 signature against Google JWKS, `iss` `https://accounts.google.com` or `accounts.google.com`, `aud` in a new `GOOGLE_AUDIENCES` env list holding the web client id, `exp` in the future, `email_verified` equal to `true`, `nonce` equal to the raw nonce the app hashed; then GoTrue `signInWithIdToken({provider:"google", token, nonce})` and the same tokens. GoTrue links the Google identity to an existing email-code user when the Google email is verified and matches (unverified on the production host; listed under Unverified until a recorded check exists) | 400 `bad_request`, 429 on `google:ip:<ip>`, 401 `bad_token`, 502 `google_failed` on a GoTrue 5xx |
| `/api/academy/lobbies/**` | existing | per `apple/BucketKit/Sources/BucketKit/Lobbies.swift` | `{lobby}` and friends | 401, 404, 409 `already_answered`, 429 |
| `/api/academy/lobbies/guest`, `/guest/merge` | existing | `{nickname, guestId}`, `{guestToken}` | `{token, userId, expiresAt}`, `{merged}` | 503 without `LOBBY_GUEST_SECRET` |
| `/api/academy/progress` | existing | GET; POST `{branch, data}` | upsert | 401, 403, 503 |
| `/api/academy/profile` | existing | POST `{handle, display_name, is_public}` | profile | 409 handle taken, 422 |
| `/api/academy/entitlement` | extend | GET | unchanged shape `{active, productId, expiresAt, trial}` from `entitlementFrom`; the handler feeds it App Store events and Play rows mapped to the same event kinds, so the entitlement with the latest expiry wins whichever store sold it; a lifetime purchase has no expiry and wins | 401 |
| `/api/play/verify` | new | `{packageName, productId, purchaseToken}` with Bearer | verifies through the Android Publisher API (`purchases.subscriptionsv2.get`, `purchases.products.get`), stores `(user_id, purchase_token, product_id, expiry, state)`, acknowledges | 400, 401, 409 token bound to another user |
| `/api/play/rtdn` | new | Pub/Sub push with an OIDC token | updates the stored state on renew, cancel, revoke, refund | 401 bad Pub/Sub token |
| `/api/academy/push/register` | extend, AD12 | adds an optional `platform` field: absent or `apns` keeps today's `token`, `env`, `bundleId` checks; `fcm` takes `{token, platform:"fcm", bundleId:"com.polingual.app"}` with an FCM token normaliser and no `env` | stored | 400 |
| `/.well-known/assetlinks.json` | new route | GET | `delegate_permission/common.handle_all_urls` and `common.get_login_creds` for both package names and both SHA-256 fingerprints | none |

New table `bucket.play_purchases`, keyed by `purchase_token`, written by the service role alone.

| Step | Rule |
|---|---|
| Binding | the app sets `obfuscatedAccountId` to sha256 of the Supabase user id at purchase; verify refuses with 409 when the Play record names a different hash or the token row belongs to another user |
| Idempotency | `purchase_token` is the key; a repeated verify for the same user returns the stored row with 200 |
| Order | call Google, upsert the row, then acknowledge; a lost response leaves an unacknowledged purchase that the app resends on next launch from `queryPurchasesAsync`; Google refunds a purchase left unacknowledged for 3 days, so the app retries on every launch and on network return |
| Pending | `PENDING` state stores the row with no access; RTDN or the next launch moves it on |
| Upgrade, downgrade | `linkedPurchaseToken` marks the old row `replaced` |
| Refund before store | RTDN for an unknown token fetches it from Google and stores it as ended |
| RTDN auth | Pub/Sub push with an OIDC token whose `aud` equals a new `PLAY_RTDN_AUDIENCE` env and whose email equals the push service account |
| Google or server down | the app grants access only from a server answer or from the cached server answer while its `expiresAt` is in the future; no cache means locked, with a retry button |
| Voided or refunded, any product | RTDN `voidedPurchaseNotification` or a refund state marks the row `voided`, which maps to `refund`; a refunded lifetime row stops counting in the entitlement merge |

| Play state | `entitlementFrom` event kind |
|---|---|
| active subscription, auto-renewing | `subscribe`, then `renew` on each renewal |
| free trial phase | `trial` |
| canceled, still in paid period | `cancel` |
| in grace period | `billing_issue` |
| account hold | `expire` until recovery, then `renew` |
| pending | none stored as an event; no access |
| replaced through `linkedPurchaseToken` | `expire` on the old token |
| expired | `expire` |
| voided or refunded | `refund` |
| lifetime purchase, acknowledged | `subscribe` with no `expiresAt` |

Each Play row maps with `originalTransactionId` set to its `purchase_token`, since `entitlementFrom` groups events by that field. A server test in `scripts/` feeds each state through the mapping and `entitlementFrom` (AT-06).

`delete_account` deletes the user's rows there; Play subscriptions stay active at Google, so the deletion screen tells the person to cancel in Play, as the App Store screen does.

## Architecture

One Gradle project in `android/`, Gradle wrapper, version catalog in `android/gradle/libs.versions.toml`.

| Module | Job | Depends on |
|---|---|---|
| `:core:model` | `@Serializable` mirrors of contract types: `Session`, `Lobby`, `LobbySummary`, `GameWord`, `LangSystem`, corpus types | none |
| `:core:engine` | ports of the Polingual engine, game round builders, seeded RNG, lexicon, today plan; pure Kotlin JVM, unit-tested with golden vectors from Swift | `:core:model` |
| `:core:net` | Ktor client with OkHttp engine; `BucketApi`, error mapping identical to `BucketError` | `:core:model` |
| `:core:auth` | session vault (DataStore plus Keystore), refresh mutex, Credential Manager Google sign-in, guest pass | `:core:net` |
| `:core:data` | repositories for systems, progress, lobbies, entitlement; offline corpus from assets | all core |
| `:core:ui` | Material 3 theme from the iOS palette (`Palette`, `D8`), shared components, adaptive scaffold | `:core:model` |
| `:app:polingual` | Polingual screens, billing, ads, Media3 service, Glance widget | core |
| `:app:bucket` | Bucket screens | core |
| `:wear:polingual` | Wear OS app and Tile | `:core:engine`, `:core:model` |

| Topic | Choice | Reason |
|---|---|---|
| Corpus | the `apple/Shared/Corpus` directory added as an asset source dir, so one copy feeds both platforms | no duplicate 19 MB in git |
| Versions | Kotlin 2.4.21, Compose BOM 2026.08.00, Media3 1.11.1, Play Billing 9.1.0, Wear Compose Material 3 1.7.1 (research) | current stable on 2026-11-12 |
| Theme | light and dark tokens copied from `Palette` and `D8`: paper `#EFE8D4`/`#1F1C16`, ink `#23201A`/`#ECE5D3`, vermilion `#D9381E`, malachite `#1E7A5A`, lapis `#1F4E9A`, parchment `#F6EEDC` | parity with iOS |
| Layout | `NavigationSuiteScaffold` and window size classes: bottom bar on compact, rail on medium, rail plus list-detail on expanded | research, large screens |
| Concurrency | coroutines; `viewModelScope`; lobby poll as a `Flow` cancelled when the room leaves composition | |
| DI | manual constructor injection through an `AppGraph`; Hilt adds annotation processing for little gain at this size | |
| Persistence | DataStore for settings, systems and engine state per branch; Room only if Bucket's review outbox needs SQL | |
| Determinism | the daily set uses `GameSeed.daily(day, root, targets)` and the same xorshift RNG as Swift; a fixture shared with Swift tests proves byte parity | cross-platform daily sets match |

## Data And Conflict Rules

Same rules as iOS for the parts Android touches: the server owns state; the app keeps a projection.

| Case | Rule |
|---|---|
| Language systems | last writer wins on `updatedAt`, as `LangStore` does; push debounced 2 s after a change |
| Engine state | per system, pushed to `progress` with `mergeState`; offline changes queue in DataStore and push on reconnect |
| Account switch | sign-out clears local engine state after a final flush, as `beforeSignOut` does on iOS |
| Guest merge | after sign-in, call `guest/merge` once, then drop the ticket |
| Lobby answers | one answer per round; a 409 `already_answered` keeps the pick; any other failure frees the round |
| Purchase | the app sends every purchase to `/api/play/verify` before granting access; access is cached for offline use until the stored expiry |

## Auth

| Method | Flow | Server |
|---|---|---|
| Email code | email, then 6-digit code | `session` `otp`, `verify` |
| Google | Credential Manager `GetGoogleIdOption` with the web client id and a nonce, falling back to `GetSignInWithGoogleOption` for the button; ID token and raw nonce to the server | `session` `google` (new) |
| Guest | nickname, guest ticket | lobbies `guest` |

Tokens live in DataStore encrypted with an AES-GCM key in the Android Keystore, excluded from backup through `dataExtractionRules`. A 401 `revoked` clears the vault.

## Tracks

| Track | Scope | Exit criteria |
|---|---|---|
| Core | model, engine, net, auth, data, ui modules; server changes in the contract | AT-01 to AT-06 pass |
| Polingual phone | onboarding, Today, daily session, eight games, word detail, translate, Listen radio, paywall, lobbies, ads, account | AT-07 to AT-14; screenshots per screen in `android/polingual/screenshots/` |
| Large screens and ChromeOS | adaptive layouts, keyboard shortcuts, pointer hover, resizable windows | AT-15 |
| Android Auto | Listen radio browse tree and playback in the Desktop Head Unit | AT-16 |
| Bucket phone | Today, Learn, science study, canon search, library, account | AT-17 |
| Wear OS | Polingual word deck and Tile | AT-18 |
| Widgets | Glance streak and word of the day | AT-19 |
| TV and XR | deferred by AD5 | none yet |

## Ship Units

| Unit | Contains | Exit criteria, approved by founder | Staged activation | Rollback |
|---|---|---|---|---|
| Polingual Android 1.0 | Polingual phone and large screens | Core and those track exits; compliance rows; 14 days on closed testing with the tester count the account type requires (AD7) | staged rollout 10, 50, 100 percent | halt the staged rollout; ship a fix with a higher version code |
| Polingual Android 1.1 | Wear OS, widgets, Android Auto, groups, FCM push | track exits | staged rollout | halt rollout |
| Bucket Android 1.0 | Bucket phone and large screens | Bucket track exit; compliance rows | staged rollout | halt rollout |

Every server change is additive, so a client rollback needs no server rollback.

## Play Compliance

| Policy | Requirement | Owner | Test |
|---|---|---|---|
| Target API level | target the API level Play requires by the release date (research, SDK) | agent | build check |
| Data safety | email, user id, app activity, purchase history; device ids for AdMob in Polingual | founder answers, agent drafts | checklist |
| Families | AD10: 13 and older audience; if any child audience is chosen, only Families-certified ad SDKs and no AdMob personalization | founder | checklist |
| Payments | Play Billing for all digital access in Play builds; no link to web checkout | agent | string scan AT-14 |
| Account deletion | in-app deletion plus a web deletion URL in the Play listing | founder lists the URL, agent builds | AT-11 |
| Ads | UMP consent in EEA, UK and Switzerland before requests; test ids until AD9 ids arrive | agent | AT-13 |
| Foreground service | `mediaPlayback` type declared and justified in the Play Console | agent | AT-16 |
| Accessibility | TalkBack labels, 48 dp targets, font scale 200 percent | agent | AT-20 |

## Tests

| ID | Test | Owner |
|---|---|---|
| AT-01 | seeded RNG and daily set parity with Swift on a shared fixture | agent |
| AT-02 | engine golden vectors from `apple/BucketKit/Tests` | agent |
| AT-03 | lexicon lookup parity on 200 sampled queries per language | agent |
| AT-04 | API error mapping table against recorded server replies | agent |
| AT-05 | session vault: single-flight refresh under 20 callers; 401 clears | agent |
| AT-06 | server tests in `scripts/`: `session` `google` refuses a bad signature, wrong `aud`, expired token, wrong nonce and `email_verified` false with 401 `bad_token`; `/api/play/verify` idempotency and binding; the Play state mapping table | agent |
| AT-07 | onboarding to first daily session on an emulator, screenshots | agent |
| AT-08 | every daily game plays to its result screen | agent |
| AT-09 | translate with picker recents, search and swap | agent |
| AT-10 | Listen radio keeps playing with the screen off and the app swiped away | agent runs, founder confirms |
| AT-11 | account: display name, username, delete; lobby rows gone after delete | agent |
| AT-12 | Play Billing with license testers: purchase, trial, restore, cancel through RTDN | agent runs, founder confirms |
| AT-13 | UMP form shows with an EEA debug geography; no ad request before consent | agent |
| AT-14 | release APK scan: no test ad ids in production flavor, no web checkout links, no secrets | agent |
| AT-15 | resizable emulator and ChromeOS window classes compact, medium, expanded | agent |
| AT-16 | Desktop Head Unit browse and play | agent |
| AT-17 | Bucket study loop with offline reconnect | agent |
| AT-18 | Wear emulator deck and Tile | agent runs, founder confirms |
| AT-19 | widget renders with and without data | agent runs, founder confirms |
| AT-20 | Accessibility Scanner and TalkBack walk | agent runs, founder confirms |
| AT-21 | cross-play: Android emulator, iOS simulator and a browser in one lobby code, 3 rounds, all agree | agent runs, founder confirms |

An unrun test counts as open.

## Beads To File

| Title | Labels | Depends on |
|---|---|---|
| Open decisions AD3 to AD16 | `needs-founder` | none |
| Play account, records, signing, OAuth clients, AdMob ids, product ids | `needs-founder` | AD3, AD7, AD8 |
| Core modules and parity fixtures | `source-agent` | plan |
| Swift side of the parity fixtures: export RNG, daily set and engine vectors from BucketKit tests to `apple/BucketKit/Tests/Fixtures/android-parity/` | `source-agent` | plan |
| Session `google` action and `assetlinks.json` | `source-agent` | AD6 |
| Play verify, RTDN and `play_purchases` table | `source-agent` | service account |
| One bead per track | `source-agent` | core |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Swift and Kotlin engine drift | medium | different daily sets across platforms | shared fixtures AT-01, AT-02 in both test suites |
| Closed-testing rule delays launch | high on a personal account | 14 days or more | AD7 |
| TTS voices missing on devices | medium | silent Which Voice game | detect and hide the game, prompt to install |
| Lobby 1 s polling on mobile data | medium | battery and cost | poll only while a room is on screen |
| Play purchase not verified when the server is down | low | access gap | cache last verified expiry |

## Unverified

- Google Play Instant availability (AD16).
- GoTrue linking of a verified Google email to an existing email-code user on the production auth host.
- Whether organization Play accounts skip the 12-tester closed test.
- Android 17 background audio limits on a Media3 service; checked in AT-10 on an API 37 image.
- GoTrue `signInWithIdToken` for Google on the production auth host with Android client ids.
- Whether radio-browser stream URLs all play in ExoPlayer; HLS and Icecast are expected to work.
