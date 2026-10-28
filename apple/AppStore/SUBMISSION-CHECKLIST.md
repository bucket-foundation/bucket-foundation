# Submission Checklist

Polingual 1.0.1 and Bucket 2.0, from `feat/apple-subject-tiles` once the stack merges to `dev`.

## Before Submitting

1. Free disk on the Mac: clear `~/Library/Caches/com.todesktop.230313mzl4w4u92.ShipIt` (5.8 GB) and `/private/tmp/kala-device`, `/private/tmp/kala-dd`.
2. Polingual 1.0 must clear review first. Version 1.0.1 starts from the approved build.
3. Set What to Test on the latest TestFlight builds:
   `python3 -I apple/AppStore/beta_notes.py --apply --app polingual --build <build> --notes @apple/AppStore/notes/<build>-polingual.txt`, then the same with `bucket`.
4. Install the TestFlight build on an iPhone with an Apple Watch paired and check Watch quick review, the widget and Translate.

## App Store Connect: Polingual 1.0.1

1. Create version 1.0.1 and attach the build.
2. Paste What's New from `apple/AppStore/notes/whats-new-polingual-1.0.1.txt`, English and Spanish.
3. Upload new screenshots from `apple/AppStore/screenshots/polingual-1.0.1/`: 6.9-inch iPhone 1320x2868 and 13-inch iPad 2064x2752. The widget has no simulator shot: capture it from a phone with the widget on the Home Screen.
4. Apple Watch: add at least one Watch screenshot (the App Store requires one once the app ships a Watch app). Capture it from the paired watch.
5. Family and Lifetime: create `com.polingual.family.yearly` (auto-renewable, Family Sharing on, same group 22498866) and `com.polingual.lifetime` (non-consumable) with prices, then turn the `extra_plans` flag on. Bead bkt-y7i6j.
6. Student plan: create a one-time offer code campaign on Yearly at $29.99 for students, after 1.0 is live.

## App Privacy

The manifests and the draft agree on Email Address, User ID, Product Interaction and Other Usage Data, all linked and not used for tracking. Answers to change in ASC:

| Data type | Set it to | Why |
|---|---|---|
| Email Address | Collected, linked, App Functionality | Sign in by email and Sign in with Apple |
| User ID | Collected, linked, App Functionality and Analytics | Beta events and progress sync |
| Product Interaction | Collected, linked, App Functionality, Analytics, Product Personalization | Sessions and cards answered |
| Other Usage Data | Collected, linked, App Functionality, Analytics, Product Personalization | Answers and timings |
| Purchase History | Collected, linked, App Functionality, once the App Store notifications webhook (bkt-hikdo) stores purchases | Subscription events tied to the user |
| Crash Data, Performance Data | Not collected | The draft lists them, but neither app sends crash or performance data; Apple's own crash reports do not count |

Tracking stays No. If ad pixels ever run inside the apps, tracking changes to Yes and the apps need an App Tracking Transparency prompt.

## Entitlements

1. Family Controls distribution: request it for `com.polingual.app` and its three extensions (shield-config, shield-action, swap-monitor) before #1019 can ship.
2. Sign in with Apple is enabled on both App IDs. It works once #1001 is deployed.

## Bucket 2.0

Bucket stays in TestFlight until the founder says it goes live. What's New is ready in `apple/AppStore/notes/whats-new-bucket-2.0.txt`.
