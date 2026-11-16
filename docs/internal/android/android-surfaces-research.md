# Android Surfaces Research

Snapshot date: 2026-11-12. Scope: porting Polingual and Bucket Foundation from the shared Swift core on iOS to Kotlin and Jetpack Compose. Every claim links to the page it came from. "Unverified" marks claims with no primary-source confirmation in this pass.

## Planning Summary

| Topic | Current fact | Source |
|---|---|---|
| Play target API for new apps and updates | Android 16, API 36, since August 31, 2026 | [target-sdk](https://developer.android.com/google/play/requirements/target-sdk) |
| Target API for Wear OS and AAOS | API 35 | [target-sdk](https://developer.android.com/google/play/requirements/target-sdk) |
| Target API for TV and XR | API 34 | [target-sdk](https://developer.android.com/google/play/requirements/target-sdk) |
| Extension window for API 36 | Ended November 1, 2026 | [target-sdk](https://developer.android.com/google/play/requirements/target-sdk) |
| Latest platform | Android 17, API 37 | [Android 17 changes](https://developer.android.com/about/versions/17/behavior-changes-17) |
| Kotlin stable | 2.4.21, October 8, 2026; 2.5.0 planned December 2026 | [Kotlin releases](https://kotlinlang.org/docs/releases.html) |
| Compose | 1.12, BOM 2026.08.00, compileSdk 37, AGP 9.1.1 minimum | [Compose August 2026](https://android-developers.googleblog.com/2026/08/jetpack-compose-august-2026-release.html) |
| Play Billing Library | 9.1.0 current; v8 deadline August 31, 2027 | [release notes](https://developer.android.com/google/play/billing/release-notes), [deprecation FAQ](https://developer.android.com/google/play/billing/deprecation-faq) |
| Closed testing, new personal accounts | 12 testers opted in for 14 continuous days | [Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) |
| Developer verification | Enforcement from September 30, 2026 in first countries, global in 2027 | [verification help](https://support.google.com/android-developer-console/answer/16561738?hl=en) |
| Media3 stable | 1.11.1, September 10, 2026 | [Media3 releases](https://developer.android.com/jetpack/androidx/releases/media3) |
| Wear OS current | Wear OS 7, based on Android 17 | [Wear OS 7 changes](https://developer.android.com/training/wearables/versions/7/changes) |

## Phones Tablets and Foldables

Window size classes split available width into five classes and height into three ([window size classes](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes)):

| Class | Breakpoint |
|---|---|
| Compact width | under 600dp |
| Medium width | 600dp to under 840dp |
| Expanded width | 840dp to under 1200dp |
| Large width | 1200dp to under 1600dp |
| Extra-large width | 1600dp and up |
| Compact height | under 480dp |
| Medium height | 480dp to under 900dp |
| Expanded height | 900dp and up |

- Compute the class with `currentWindowAdaptiveInfo()` from `androidx.compose.material3.adaptive`. Large and extra-large widths need `supportLargeAndXLargeWidth = true` ([window size classes](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes)).
- Google says the classes describe the app window and must not drive `isTablet` logic ([window size classes](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes)).
- The adaptive app quality guidelines replace the old large screen guidelines and define three tiers ([adaptive app quality](https://developer.android.com/docs/quality-guidelines/large-screen-app-quality)):

| Tier | Name | Meaning |
|---|---|---|
| 3 | Adaptive ready | Full screen, no letterboxing, basic keyboard, mouse and stylus support |
| 2 | Adaptive optimized | Layout optimizations for all sizes and better input support |
| 1 | Adaptive differentiated | Multitasking, foldable postures, drag and drop, stylus where relevant |

- Completing Tier 2, then applying, earns the Google Play large screen badge ([adaptive app quality](https://developer.android.com/docs/quality-guidelines/large-screen-app-quality)).
- Test devices Google lists: foldable 841x701 dp, 8-inch tablet 1024x640 dp, 10.5-inch tablet 1280x800 dp, 13-inch Chromebook 1600x900 dp ([adaptive app quality](https://developer.android.com/docs/quality-guidelines/large-screen-app-quality)).
- Android 16 ignores orientation, resizability and aspect ratio limits on screens with sw600dp or more for apps targeting API 36. Apps targeting API 37 lose the opt-out ([Android 17 changes](https://developer.android.com/about/versions/17/behavior-changes-17)). Both apps must lay out at any size and orientation on tablets.

## Chromebooks and ChromeOS

- Android apps reach Chromebooks through the Play Store ([ChromeOS intro](https://developer.android.com/chrome-os/intro)).
- On ChromeOS, Android apps can run in freely resizable desktop windows, so the window size class changes during a session ([window size classes](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes)).
- The adaptive quality guidelines name "Googlebooks" and desktop displays as large screen targets and offer a Desktop emulator in Android Studio Canary ([adaptive app quality](https://developer.android.com/docs/quality-guidelines/large-screen-app-quality)).
- Unverified: the current status of a ChromeOS and Android platform merge and what a "Googlebook" device ships with. No primary page read in this pass confirmed it.
- Planning consequence: the Tier 3 rules on keyboard, mouse and trackpad cover ChromeOS. No separate Chromebook build is needed.

## Wear OS

- Wear OS 7 is current and based on Android 17, API 37 ([Wear OS 7 changes](https://developer.android.com/training/wearables/versions/7/changes)).
- Wear OS 7 applies Android 17 background audio hardening: background audio needs a foreground service that is not `shortService`, and for API 37 targets that service must hold while-in-use capability ([Wear OS 7 changes](https://developer.android.com/training/wearables/versions/7/changes)).
- Play requires Wear apps to target API 35 or higher for new submissions ([target-sdk](https://developer.android.com/google/play/requirements/target-sdk)).
- Compose for Wear OS Material 3 stable is `androidx.wear.compose:compose-material3:1.7.1`, October 7, 2026. Google calls the older `compose-material` superseded ([Wear Compose releases](https://developer.android.com/jetpack/androidx/releases/wear-compose)).
- Tiles use the `protolayout` and `tiles` libraries. Compose does not render tiles ([Tiles](https://developer.android.com/training/wearables/tiles)).
- The Wear OS docs include a "Migrate from tiles to widgets" guide ([Wear OS latest](https://developer.android.com/training/wearables/versions/latest)). Glance deprecated `glance-wear-tiles` in favor of a new `androidx.glance.wear` widgets library ([Glance releases](https://developer.android.com/jetpack/androidx/releases/glance)).
- Unverified: whether tiles themselves are deprecated on Wear OS 7. The docs only show a migration guide title.
- Complications: Watch Face Format watch faces may hold at most 8 complication slots ([Wear quality](https://developer.android.com/docs/quality-guidelines/wear-app-quality)). Unverified: current `ComplicationDataSourceService` API changes for data-source apps.
- Watch Face Format has been required for all watch faces since January 2026, and all Wear apps must support 64-bit from September 15, 2026 ([Wear quality](https://developer.android.com/docs/quality-guidelines/wear-app-quality)).
- A Wear app paired with a phone app must share its package name and signing key ([Wear quality](https://developer.android.com/docs/quality-guidelines/wear-app-quality)).
- Users must not type a username or password on the watch, rule `WO-P6` ([Wear quality](https://developer.android.com/docs/quality-guidelines/wear-app-quality)).

Candidate Wear features: a daily game tile, a streak complication, Listen radio playback controls.

## Android TV and Google TV

- TV apps use the same project structure as phone apps. Google recommends Compose for TV for the UI ([TV get started](https://developer.android.com/training/tv/get-started)).
- Play requires TV apps to target API 34 or higher ([target-sdk](https://developer.android.com/google/play/requirements/target-sdk)).
- The TV quality guidelines define three tiers: TV Ready, TV Optimized, TV Differentiated ([TV quality](https://developer.android.com/docs/quality-guidelines/tv-app-quality)).
- Tier 3 requirements that matter here ([TV quality](https://developer.android.com/docs/quality-guidelines/tv-app-quality)):
  - Manifest declares `CATEGORY_LEANBACK_LAUNCHER` and marks touchscreen as not required.
  - 320x180 banner with the app name.
  - Full D-pad navigation, no dependence on a Menu button.
  - minSdk of 31 or lower.
  - Audio that keeps playing in the background shows system media controls.
  - Full-screen non-video ads are dismissible with the D-pad; clickable ads may not open web URLs.
  - Web content only through `WebView`.
  - Android App Bundles mandatory; 64-bit and 16 KB page size support from August 1, 2026.
  - Sign-in apps must give reviewers login credentials.
- Without the TV manifest entries, Play does not treat the build as a TV app and does not review it for TV ([TV quality](https://developer.android.com/docs/quality-guidelines/tv-app-quality)).

Fit: Listen radio is a plausible TV surface. Daily games with D-pad input are possible. Lobbies with text entry are a weak fit.

## Android Auto and Media Apps

- Car audio apps use `MediaBrowserService` or Media3 `MediaLibraryService` plus a `MediaSession`. Android Auto and Android Automotive OS render the UI from the browse tree ([cars media](https://developer.android.com/training/cars/media)).
- Car App Library templated media apps still need the `MediaSession` and library service for voice actions ([cars media](https://developer.android.com/training/cars/media)).
- Media items carry `FLAG_PLAYABLE` for leaves and `FLAG_BROWSABLE` for nodes ([cars media](https://developer.android.com/training/cars/media)).
- Play requires AAOS apps to target API 35 or higher ([target-sdk](https://developer.android.com/google/play/requirements/target-sdk)).
- Car quality rules for the Media category ([car quality](https://developer.android.com/docs/quality-guidelines/car-app-quality)):
  - `AD-1`: no text ads beyond the advertiser or product name.
  - `NA-1`: no ads in notifications.
  - `IU-1`: no images except one static background image such as album art, plus drawer icons.
  - `EP-2`: relaunch restores prior state.
  - `EP-4`: AAOS listings need AAOS screenshots.
- Car apps get a manual review on top of normal Play review. Until the car review passes, later updates for all form factors are held, so Google advises against prototyping Auto support in the production APK ([car quality](https://developer.android.com/docs/quality-guidelines/car-app-quality)).

Fit: Listen radio maps to a browse tree of stations and a live stream item. Lobby ads must not appear in the car UI.

## Android XR

- Android XR covers XR headsets, wired XR glasses, audio glasses and display glasses ([Android XR](https://developer.android.com/develop/xr/get-started)).
- Most Android apps run unchanged on headsets and wired XR glasses, and large screen apps get XR treatment ([Android XR](https://developer.android.com/develop/xr)).
- Spatial features come from the Jetpack XR SDK: Compose for XR, SceneCore, ARCore for Jetpack XR, and Compose Glimmer for see-through displays ([Android XR](https://developer.android.com/develop/xr)).
- Play requires XR apps to target API 34 or higher ([target-sdk](https://developer.android.com/google/play/requirements/target-sdk)).
- Unverified: Jetpack XR library versions and stability, and any Play opt-in step for XR listings.

Fit: Tier 2 adaptive work gets both apps onto XR headsets with no XR code.

## Widgets and Glance

- Glance builds app widgets with a Compose-style API. Stable is 1.2.0, August 26, 2026; 1.3.0-alpha02 is the latest alpha ([Glance releases](https://developer.android.com/jetpack/androidx/releases/glance)).
- Glance 1.2.0 raised the default minSdk to 23 ([Glance releases](https://developer.android.com/jetpack/androidx/releases/glance)).
- Apps targeting API 37 get an `IllegalArgumentException` when a `RemoteViews` update exceeds the bitmap memory budget of `6 * width * height` bytes for the display ([Android 17 changes](https://developer.android.com/about/versions/17/behavior-changes-17)).
- Google advises decoding bitmaps once in `provideGlance` before `provideContent` so all size buckets share one bitmap ([Android 17 changes](https://developer.android.com/about/versions/17/behavior-changes-17)).

Candidate widgets: Polingual daily game and streak, Bucket Foundation reading progress.

## Kotlin and Compose Versions

| Item | Version | Source |
|---|---|---|
| Kotlin stable | 2.4.21, October 8, 2026 | [Kotlin releases](https://kotlinlang.org/docs/releases.html) |
| Kotlin 2.4 support ends | December 3, 2027 | [Kotlin releases](https://kotlinlang.org/docs/releases.html) |
| Kotlin next | 2.5.0 planned December 2026, 2.5.20 planned March 2027 | [Kotlin releases](https://kotlinlang.org/docs/releases.html) |
| Kotlin preview | 2.5.0-Beta2, October 21, 2026 | [Kotlin EAP](https://kotlinlang.org/docs/whatsnew-eap.html) |
| Compose | 1.12 | [Compose August 2026](https://android-developers.googleblog.com/2026/08/jetpack-compose-august-2026-release.html) |
| Compose BOM | 2026.08.00 | [Compose August 2026](https://android-developers.googleblog.com/2026/08/jetpack-compose-august-2026-release.html) |
| compileSdk for Compose 1.12 | 37 | [Compose August 2026](https://android-developers.googleblog.com/2026/08/jetpack-compose-august-2026-release.html) |
| AGP minimum for Compose 1.12 | 9.1.1 | [Compose August 2026](https://android-developers.googleblog.com/2026/08/jetpack-compose-august-2026-release.html) |
| Media3 | 1.11.1; 1.12.0-beta01 raises minSdk to 24 | [Media3 releases](https://developer.android.com/jetpack/androidx/releases/media3) |
| Wear Compose Material 3 | 1.7.1 | [Wear Compose releases](https://developer.android.com/jetpack/androidx/releases/wear-compose) |
| Glance | 1.2.0 | [Glance releases](https://developer.android.com/jetpack/androidx/releases/glance) |
| Play Billing Library | 9.1.0 | [Billing release notes](https://developer.android.com/google/play/billing/release-notes) |
| UMP SDK | 4.0.0 | [UMP Android](https://developers.google.com/admob/android/privacy) |

- Unverified: a newer Compose BOM after 2026.08.00. Maven shows a later Compose UI artifact date of August 26, 2026, without a confirmed BOM number.

## Shared Core Strategy

The iOS apps share one Swift core. Three ways to reach Android:

| Option | State | Source |
|---|---|---|
| Kotlin Multiplatform core shared by both platforms | KMP stable since Kotlin 1.9.20 | Unverified: the kotlinlang.org KMP page returned 404 during this pass |
| KMP with Swift export so iOS sees a Swift API | Swift export is Alpha, breaking changes expected | [Swift export](https://kotlinlang.org/docs/native-swift-export.html) |
| Keep Swift core, run it on Android with the Swift SDK for Android | Swift 6.3 shipped an official Android SDK on March 24, 2026, per secondary reports | Unverified: no swift.org page read; [heise](https://heise.de/-10901579) |
| Separate Kotlin core, ported from Swift | No interop needed; two cores to keep in sync | n/a |

- Swift export limits today: generics erase to upper bounds, only final classes inheriting from `Any`, collection subtypes skipped, direct Xcode integration only ([Swift export](https://kotlinlang.org/docs/native-swift-export.html)).
- Without Swift export, Kotlin reaches Swift through the Objective-C framework bridge (Unverified in this pass).
- Unverified: swift-java interop is pre-1.0; one blog reports 0.4.2 on 2026-06-26.
- Recommendation for planning: a separate Kotlin core is the lowest-risk path now. A KMP rewrite of the iOS core trades a working Swift core for an Alpha Swift API. Revisit when Swift export reaches Beta.

## Min SDK and Target SDK

- From August 31, 2026, new apps and updates must target API 36. Wear and AAOS need 35, TV and XR need 34 ([target-sdk](https://developer.android.com/google/play/requirements/target-sdk)).
- Existing apps below API 35 stay hidden from new users on newer OS versions ([target-sdk](https://developer.android.com/google/play/requirements/target-sdk)).
- Extensions ran to November 1, 2026, which has passed ([target-sdk](https://developer.android.com/google/play/requirements/target-sdk)).
- Unverified: a published date for an API 37 target requirement. The usual pattern would put it at August 31, 2027.
- Library minSdk floors: Glance 23, Media3 1.11 at 23 and 1.12 at 24 ([Glance releases](https://developer.android.com/jetpack/androidx/releases/glance), [Media3 releases](https://developer.android.com/jetpack/androidx/releases/media3)). Play Integrity standard and classic requests need API 23 ([Play Integrity](https://developer.android.com/google/play/integrity/overview)). TV requires minSdk 31 or lower ([TV quality](https://developer.android.com/docs/quality-guidelines/tv-app-quality)).
- Suggested settings: minSdk 26, targetSdk 36 at launch, compileSdk 37. Plan targetSdk 37 work around the background audio, widget memory and large screen changes. minSdk 26 is a judgment call; no Google page sets it.

## Credential Manager and Sign-In

- Credential Manager is the recommended Jetpack API for passkeys, Sign in with Google and other federated sign-in, passwords and digital credentials ([Credential Manager](https://developer.android.com/identity/sign-in/credential-manager)).
- It replaces legacy Google Sign-In, One Tap, Smart Lock for Passwords and FIDO2 APIs, each with a migration guide ([Credential Manager](https://developer.android.com/identity/sign-in/credential-manager)).
- It works on phones, Android XR and Wear OS ([Credential Manager](https://developer.android.com/identity/sign-in/credential-manager)).
- It supports Restore Credentials for moving to a new device ([Credential Manager](https://developer.android.com/identity/sign-in/credential-manager)).
- Sign in with Google through Credential Manager runs on API 19 and up. Google recommends both the bottom sheet and a separate button ([Sign in with Google](https://developer.android.com/identity/sign-in/credential-manager-siwg)).
- Setup needs a Google Auth Platform client ID and brand verification so the app name shows on the consent screen ([Sign in with Google](https://developer.android.com/identity/sign-in/credential-manager-siwg)).
- Google Drive and similar data access goes through `AuthorizationClient`, outside Credential Manager ([Sign in with Google](https://developer.android.com/identity/sign-in/credential-manager-siwg)).
- Email OTP: no Android platform API delivers email codes; it stays a backend flow. Apps targeting API 37 that read standard SMS for OTPs see a three-hour delay, so SMS codes must use SMS Retriever or SMS User Consent ([Android 17 changes](https://developer.android.com/about/versions/17/behavior-changes-17)).
- Android 17 hides all password characters when a physical keyboard is in use ([Android 17 changes](https://developer.android.com/about/versions/17/behavior-changes-17)).
- Passkeys need a relying party server and Digital Asset Links between the app and domain (Unverified in this pass; see [Passkeys](https://developer.android.com/identity/passkeys)).

## Play Billing and Subscriptions

| PBL version | New app and update deadline | Extension deadline |
|---|---|---|
| 7 | August 31, 2026 | November 1, 2026 |
| 8 | August 31, 2027 | November 1, 2027 |
| 9 | August 31, 2028 | November 1, 2028 |

Source: [deprecation FAQ](https://developer.android.com/google/play/billing/deprecation-faq).

- Each major version has a two-year life ([deprecation FAQ](https://developer.android.com/google/play/billing/deprecation-faq)).
- PBL 9.0.0 shipped May 19, 2026 ([release notes](https://developer.android.com/google/play/billing/release-notes)):
  - Blocked Play Store cases, such as OEM kids modes, now return `BILLING_UNAVAILABLE`.
  - In-app messaging can prompt users to accept an opt-in subscription price increase, at most once every 7 days.
- PBL 9.1.0 shipped June 18, 2026 and added Billing Choice APIs such as `getBillingChoiceInfoAsync()` ([release notes](https://developer.android.com/google/play/billing/release-notes)).
- Start on PBL 9.x. It stays valid for new submissions through August 31, 2028.
- Unverified: whether the existing iOS subscription backend handles Real-time Developer Notifications. That needs a separate server-side check.

## AdMob and UMP Consent

- The UMP SDK is `com.google.android.ump:user-messaging-platform:4.0.0` and needs API 21 ([UMP Android](https://developers.google.com/admob/android/privacy)).
- Required flow ([UMP Android](https://developers.google.com/admob/android/privacy)):
  - Call `requestConsentInfoUpdate()` on every launch.
  - Call `loadAndShowConsentFormIfRequired()` to show any required form.
  - Check `canRequestAds()` before any ad request.
  - Offer `showPrivacyOptionsForm()` when `getPrivacyOptionsRequirementStatus()` asks for it.
- The consent message is configured in AdMob under Privacy and messaging ([UMP Android](https://developers.google.com/admob/android/privacy)).
- Unverified: which regions currently require consent (EEA, UK, Switzerland), the IAB TCF certified CMP requirement and US state privacy messages. The page read did not state them.
- Unverified: the current Google Mobile Ads SDK version for Android.

## Media3 Background Playback

- Audio playback in the background uses a foreground service of type `mediaPlayback` with the `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permission and no runtime prerequisites ([service types](https://developer.android.com/develop/background-work/services/fgs/service-types)).
- Apps targeting Android 15 or higher may not start a media playback service from `BOOT_COMPLETED` ([service types](https://developer.android.com/develop/background-work/services/fgs/service-types)).
- Apps targeting Android 14 or higher must declare their foreground service types under Policy, App content in Play Console ([service types](https://developer.android.com/develop/background-work/services/fgs/service-types)).
- Android 17 background audio hardening: an app that plays audio, requests focus or changes volume from the background must run a foreground service. For API 37 targets, that service must have while-in-use capability ([Android 17 changes](https://developer.android.com/about/versions/17/behavior-changes-17)).
- Media3 `MediaLibraryService` is the supported library service for car and system media surfaces ([cars media](https://developer.android.com/training/cars/media)).
- Unverified: Media3 `MediaSessionService` starts and stops its own foreground service. That is how the library has worked, but this pass did not read the Media3 session guide.

For Listen radio, one `MediaLibraryService` serves phone notifications, lock screen, Wear, Auto and TV.

## Data Safety and Families

Data safety ([data safety help](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)):

- Every app on closed, open or production tracks must complete the form. Internal-only apps are exempt.
- Apps that collect nothing still file the form and a privacy policy.
- Data sent by third-party SDKs counts as collection by the app. AdMob, analytics and crash reporting must all be declared.
- Ephemeral processing is declared but not shown publicly. Ad or profile use can never count as ephemeral.
- The form asks whether users can request data deletion. Automatic deletion within 90 days qualifies.
- "Encrypted in transit" may be claimed only if all data from the app and its SDKs travels encrypted.

Families policy ([Families policy](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)):

- Apps that show ads to children or users of unknown age must use only Families Self-Certified Ads SDKs for those users, with no interest-based ads or remarketing.
- Banned formats for child-only apps:
  - full-screen ads that block use without a clear dismiss
  - rewarded ads that cannot close after 5 seconds
  - interstitials at launch
  - several ad placements on one page
  - offerwalls
- Child-only apps may not transmit AAID or other device identifiers, may not request `AD_ID` when targeting API 33 or higher, and may not collect precise location.
- Mixed-audience apps need age screening, such as a neutral age screen, and must keep non-approved SDKs away from children.

Planning consequence: if Polingual lists any child audience, lobby ads must run through a self-certified SDK version behind an age screen. A 13-plus or 18-plus target audience in Play Console avoids most of this. Unverified: whether the current AdMob SDK is on the self-certified list.

## Play Integrity API

- Verdicts: `appIntegrity`, `accountDetails`, `deviceIntegrity`, plus opt-in `MEETS_STRONG_INTEGRITY`, `appAccessRiskVerdict`, `playProtectVerdict`, `recentDeviceActivity` and `deviceRecall` in beta ([Play Integrity](https://developer.android.com/google/play/integrity/overview)).
- Standard requests run in a few hundred milliseconds after warm-up and suit frequent checks. Classic requests take seconds and suit rare high-value checks ([Play Integrity](https://developer.android.com/google/play/integrity/overview)).
- Default quota is 10,000 requests per day across all installs, with an increase form ([Play Integrity](https://developer.android.com/google/play/integrity/overview)).
- The API covers phones, tablets, Auto, TV, XR, ChromeOS and Wear OS ([Play Integrity](https://developer.android.com/google/play/integrity/overview)).
- Google advises against caching verdicts and recommends tiered server responses ([Play Integrity](https://developer.android.com/google/play/integrity/overview)).

Use cases: live lobby joins and score submission in Polingual, citation payments in Bucket Foundation.

## Closed Testing Requirement

- Personal developer accounts created after November 13, 2023 must run a closed test with at least 12 testers, opted in continuously for at least 14 days, before applying for production access ([testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)).
- A tester who leaves and rejoins restarts their 14 days ([testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)).
- Production and Pre-registration stay disabled until the requirement is met ([testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)).
- Google may require more testing when engagement during the test was low ([testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)).
- Organization accounts: the official article covers only personal accounts. A Play community guide says organization accounts are exempt ([community guide](https://support.google.com/googleplay/android-developer/community-guide/255621488/everything-about-the-12-testers-requirement?hl=en)). Unverified on an official policy page.
- Planning consequence: publishing under an organization account (AG Farms LLC, with a D-U-N-S number) likely skips the 14-day gate. A personal account adds at least two weeks plus review time per new app.

## Per-Surface Review Rules

| Surface | Review | Key gates | Source |
|---|---|---|---|
| Phone | Standard Play review | Target API 36, data safety, FGS declaration | [target-sdk](https://developer.android.com/google/play/requirements/target-sdk) |
| Large screens | No separate gate; badge after Tier 2 | Adaptive tiers | [adaptive quality](https://developer.android.com/docs/quality-guidelines/large-screen-app-quality) |
| Wear OS | Wear review against WO checklist; failure blocks listing updates | API 35, 64-bit, black background, no on-watch password entry | [Wear quality](https://developer.android.com/docs/quality-guidelines/wear-app-quality) |
| TV | TV review against Tier 3; failure blocks listing updates | Leanback manifest, D-pad, banner, minSdk 31 or lower, AAB | [TV quality](https://developer.android.com/docs/quality-guidelines/tv-app-quality) |
| Auto and AAOS | Extra manual review; updates held until approved | Media category rules, no text or notification ads | [car quality](https://developer.android.com/docs/quality-guidelines/car-app-quality) |
| XR | Unverified | API 34 | [target-sdk](https://developer.android.com/google/play/requirements/target-sdk) |

- Wear and TV share one listing with the phone app. A rejected Wear or TV artifact blocks the whole listing update until removed or fixed ([Wear quality](https://developer.android.com/docs/quality-guidelines/wear-app-quality), [TV quality](https://developer.android.com/docs/quality-guidelines/tv-app-quality)).
- Ship form-factor builds after the phone app is live, each on its own release.

## Developer Verification for Sideloading

- Verification takes effect September 30, 2026 for users in Indonesia, Singapore and Thailand, with global expansion to certified devices planned for 2027 ([verification help](https://support.google.com/android-developer-console/answer/16561738?hl=en)). Secondary reports also list Brazil ([Android Authority](https://www.androidauthority.com/android-sideloading-changes-timeline-3679204/)); Unverified on the primary page.
- From September 2026 the rules apply to phones and tablets ([verification help](https://support.google.com/android-developer-console/answer/16561738?hl=en)).
- Unregistered apps become unavailable for new installs on certified devices in covered countries ([verification help](https://support.google.com/android-developer-console/answer/16561738?hl=en)).
- Account types ([verification help](https://support.google.com/android-developer-console/answer/16561738?hl=en)):
  - Full account: $25.
  - Limited distribution account: no fee, no ID, up to 20 devices.
  - Organizations: need a D-U-N-S number, which can take up to 28 days.
- Google Play is one of the initial participating stores. ADB installs stay available for development, and an advanced flow lets users install unverified apps ([verification help](https://support.google.com/android-developer-console/answer/16561738?hl=en)).
- Unverified: whether Play Console identity verification satisfies this requirement with no extra step.
- Planning consequence: distribute through Play. Any sideloaded beta APK needs the app registered to the verified developer.
