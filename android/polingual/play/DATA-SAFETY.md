# Polingual Play Console Answers

Answers for `com.polingual.app` version 1.0.2. They describe the production build with AdMob turned on. Privacy policy: https://polingual.com/privacy, updated for AdMob in PR #1293

## Data Safety Overview

- [ ] Does your app collect or share any of the required user data types? **Yes**
- [ ] Is all of the user data collected by your app encrypted in transit? **Yes**, every request goes over HTTPS
- [ ] Do you provide a way for users to request that their data is deleted? **Yes**
- [ ] Delete account URL: `https://polingual.com/delete-account`, added in PR #1293 and live once #1293 deploys. It names Account, Delete account in the app and the address privacy@polingual.com
- [ ] Account creation methods: **Username and other authentication**, a one-time email code. Sign-in is optional; guests can play games and live rooms

## Data Types

| Data type | Collected | Shared | Optional | Purposes | Source |
|---|---|---|---|---|---|
| Personal info: Email address | Yes | No | Yes | App functionality, Account management | email code sign-in |
| Personal info: Name | Yes | No | Yes | App functionality, Account management | display name on the profile |
| Personal info: User IDs | Yes | No | Yes | App functionality, Account management | account id and @username |
| App activity: App interactions | Yes | No | No | App functionality | study progress, game scores, language systems |
| Messages: Other in-app messages | Yes | No | Yes | App functionality | live room chat, up to 200 characters |
| App activity: Other user-generated content | Yes | No | Yes | App functionality | translation reports |
| App activity: App interactions, AdMob | Yes | Yes | No | Advertising or marketing, Analytics, Fraud prevention, security, and compliance | Google Mobile Ads SDK |
| Location: Approximate location | Yes | Yes | No | Advertising or marketing, Analytics, Fraud prevention, security, and compliance | AdMob derives it from the IP address |
| App info and performance: Crash logs, Diagnostics | Yes | Yes | No | Analytics, Fraud prevention, security, and compliance | Google Mobile Ads SDK |
| Device or other IDs | Yes | Yes | No | Advertising or marketing, Analytics, Fraud prevention, security, and compliance | Advertising ID, through AdMob |

Paid subscribers see no ads, but the form asks about the app as a whole, so keep the AdMob rows marked **not optional**.

## Data Not Collected

- [ ] Financial info: Google Play Billing takes the payment. Polingual receives no card data. Purchase history stays on the device until `/api/play/verify` ships; when it does, add **Financial info: Purchase history** as collected for App functionality, with sharing off
- [ ] Health, fitness, messages, photos, video, audio, files, calendar, contacts, web browsing, precise location
- [ ] Beta test events: the Android code has no events endpoint and no analytics calls, so leave them off the form. Add **App activity: Other actions** as collected for Analytics, with sharing off, the day a beta event logger ships

## Data Handling Questions

- [ ] Is data processed ephemerally? **No**
- [ ] Is collection required or can users choose? Sign-in data is **optional**; AdMob data is **required** for non-subscribers
- [ ] Shared data: AdMob is a Google service provider. Google treats data sent to a service provider as not shared only for the developer's own use; ads data goes to Google for ad delivery, so mark it **shared**

## Content Rating Questionnaire

- [ ] Category: **Reference, News, or Educational**
- [ ] Violence, fear, sexuality, profanity, crude humour, drugs, alcohol, tobacco: **No** to every question
- [ ] Gambling or simulated gambling: **No**. Live rooms award points with no stakes
- [ ] Does the app let users interact or exchange content? **Yes**: live room chat and public usernames
- [ ] Does the app share the user's current physical location with other users? **No**
- [ ] Does the app allow users to purchase digital goods? **Yes**: subscriptions and a lifetime unlock through Google Play Billing
- [ ] Is the app a web browser or search engine? **No**
- [ ] Expected result: IARC 3 or Everyone, with "Users Interact" and "In-App Purchases" descriptors

## App Content Declarations

- [ ] Privacy policy: `https://polingual.com/privacy`
- [ ] Ads: **Yes, my app contains ads**
- [ ] App access: **All functionality is available without special access**. Games and rooms are free; lessons sit behind the subscription. For review, add the reviewer's Gmail to License testing so test purchases are free
- [ ] Target audience: **13 to 15, 16 to 17, 18 and over** (plan AD10). Leave every under-13 band unchecked so the Families policy does not apply
- [ ] Appeals to children: **No**
- [ ] News app: **No**
- [ ] Government app: **No**
- [ ] Financial features: **None**
- [ ] Health: **None**
- [ ] Advertising ID: **Yes**, used for advertising and analytics through AdMob. The manifest already declares `com.google.android.gms.permission.AD_ID`
- [ ] Foreground service: **Media playback**, for Listen radio in the background. Attach a short screen recording of Listen playing with the screen off if Play asks

## Store Settings

- [ ] App category: **Education**
- [ ] Tags: Language learning, Vocabulary, Education
- [ ] Contact email: privacy@polingual.com, or the address on https://polingual.com/support
- [ ] Website: https://polingual.com
