# App Store Review Checklist

Fields to paste into App Store Connect for Bucket 2.0 and Polingual 1.0, checked against `apple/project.yml`, `apple/Polingual/Polingual.storekit` and the Swift sources on 2026-10-21. Listing copy lives in `APP-STORE-LISTING.md`.

## Bucket 2.0

- Name: `Bucket`. Bundle id: `foundation.bucket.app`. SKU: `bucket-ios-1`.
- Version 2.0, build 1. Team `QQ6D6A2LLS`. Platforms: iPhone, iPad, Mac.
- Price: free, no in-app purchases.
- Category: Education. Secondary: Reference.
- Copyright: `2026 AGFarms LLC`
- Privacy policy URL: https://www.bucket.foundation/privacy. Support URL: https://www.bucket.foundation. The in-app link on the account screen points to the same privacy page.
- Export compliance: `ITSAppUsesNonExemptEncryption` is NO in the project, so answer that the app uses only exempt encryption (HTTPS).
- Content rights: the app shows Wiktionary data (CC BY-SA) and Bucket canon text. Answer yes to third-party content and confirm the rights.
- Sign in: email one-time code on the app's own account system. Guideline 4.8 does not apply because no third-party social login exists.
- Account deletion: Account, Delete account, with confirmation (guideline 5.1.1(v)). Needs the server action deployed before submission.
- Microphone string: "Bucket listens when you tap Speak so you can say a word in the language you are learning."
- Speech recognition string: "Bucket turns what you say into text to check your pronunciation of the word."
- Review notes: "Sign-in is optional and uses a one-time email code. Every screen except Account works signed out. The microphone and speech recognition prompts appear on the first speaking exercise." Demo account: not needed while sign-in stays optional.

## Polingual 1.0

- Identity, subtitle, keywords, promotional text, description and screenshot captions: paste from `APP-STORE-LISTING.md`.
- Bundle id: `com.polingual.app`. SKU: `polingual-ios-1`. Version 1.0, build 1.
- Subscription group 1 holds two products:

| Product id | Reference name | Price | Period | Intro offer |
|---|---|---|---|---|
| `com.polingual.monthly` | Polingual Monthly | 9.99 | 1 month | 3 days free |
| `com.polingual.yearly` | Polingual Yearly | 59.99 | 1 year | 3 days free |

- Subscription review screenshot: the paywall screenshot (shot 6) for both products.
- Terms of use: custom EULA at https://polingual.com/terms, also linked in the description and the paywall policies buttons.
- Privacy policy URL: https://polingual.com/privacy. Support URL: https://polingual.com/support. Marketing URL: https://polingual.com.
- Restore purchases: the paywall shows the Restore button (`AppStore.sync()` in `Subscriptions.swift`).
- Manage subscription: opens https://apps.apple.com/account/subscriptions.
- Export compliance: same as Bucket, exempt encryption only.

## Age Rating Answers

Both apps answer None or No on every question: cartoon or fantasy violence, realistic violence, sexual content, nudity, profanity, horror, alcohol, tobacco, drugs, gambling, contests, medical advice, mature themes. Unrestricted web access: No. User-generated content: No. Result: 4+.

## Privacy Nutrition Labels

Tracking: No for both apps. No advertising or analytics SDK ships in either target.

Data linked to the person, collected only after sign-in:

| Data type | Use | Linked | Tracking |
|---|---|---|---|
| Contact info: email address | App functionality | Yes | No |
| User content: other user content (language systems, review history) | App functionality | Yes | No |
| Identifiers: user id | App functionality | Yes | No |

Not collected: location, contacts, health, financial info, browsing history, search history, diagnostics, audio data. Audio goes to Apple speech recognition only.

Polingual adds Purchases (purchase history, app functionality, linked) once App Store Server Notifications reach the backend.

## Review Notes For Polingual

"Onboarding runs three screens, then the subscription screen. Use a sandbox Apple Account to start the free trial. Sign-in is optional and uses a one-time email code. The microphone and speech recognition prompts appear on the first speaking exercise. Delete account is under Account."

Demo account: none needed. If App Review asks for one, the founder creates an email address whose code can be read by the reviewer.

## Open Items For The Founder

1. Deploy the `delete_account` action to production and confirm it before submitting either app.
2. Counsel reviews the privacy and terms text, then replace `{launch_date}` in the site pages.
3. Create the Vercel project and DNS for polingual.com so the three URLs resolve before submission.
4. Create both subscription products in App Store Connect with the ids, prices and intro offers above.
5. Provide Mac and iPhone screenshots for Bucket 2.0. Only Polingual screenshots exist in `apple/Polingual/AppStore/screenshots/`.
6. The Polingual account screen reuses the shared `AccountView`, whose Privacy and data link points at bucket.foundation/privacy. Point it at polingual.com/privacy in the Polingual build.
7. Run an archive and TestFlight upload from the Mac session. This Linux session cannot build iOS.
