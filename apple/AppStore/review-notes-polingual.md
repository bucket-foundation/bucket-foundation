# Polingual 1.0 Review Notes

Paste the Notes section into App Review Information. Keep the Open Items section out of App Store Connect.

## Notes

PURPOSE AND AUDIENCE
Polingual teaches several languages at once. One deck shows each word in every language the learner picks, with spaced review, sentences, speaking practice, games and a Content section. It covers 29 languages. It is published by AGFarms LLC. The audience is adult and teen self-learners: [FOUNDER: confirm the audience and minimum age].

PAID CONTENT
The app needs a subscription after onboarding. Polingual Monthly (com.polingual.monthly) and Polingual Yearly (com.polingual.yearly) are auto-renewable and include a 3-day free trial for new subscribers. The paywall shows price, terms, privacy, Restore and offer code redemption. Please use a Sandbox account to start the trial.

SETUP AND LOGIN
No setup or special hardware. Finish onboarding, start the trial, then open the person icon at the top right and choose Account. An account is optional for study and required for sync and groups. There are two methods and no passwords: Sign in with Apple, or a one-time code sent to an email address. A first sign-in creates the account.
Demo account: Finish onboarding, start the trial with a Sandbox account, open the person icon, then Account and Sign in. Type the email below and tap Send code. No email goes out for this address. Type the code below and tap Verify. Signing in does not replace the subscription.
Email: [REVIEW_DEMO_EMAIL value, entered by hand in App Store Connect]
Code: [REVIEW_DEMO_CODE value, entered by hand in App Store Connect]
The account has a language set, progress and a group named Review Family with a second member, Sam, so report and block can be tried on Sam. Deleting this account ends the demo, so please test deletion on a new account made with Sign in with Apple or your own email.
Account deletion: Account, Delete account, Delete account and data.

USER-GENERATED CONTENT
Family and friends groups are private and join only by invite link or code. The only free text is the group name and each member's display name. There is no chat and no media.
Filtering: the server rejects profanity in group and display names.
Reporting: in a group, open a member and use the Report or block menu, or swipe or long press the member's row. Report group name sits at the bottom of the group screen.
Blocking: Block hides the two people from each other, stops cheers and nudges, and stops the blocked person from rejoining a group the blocker owns. Block this group leaves the group and refuses its invite link. Account, Blocked lists blocks and undoes them.
Contact: support@polingual.com.

EXTERNAL SERVICES
Supabase: accounts, one-time codes and synced progress.
Vercel: hosts the API at www.bucket.foundation and polingual.com, and audio clips.
Resend: email for moderation reports.
Apple: Sign in with Apple, StoreKit, App Store Server Notifications, push notifications, Speech recognition, Translation.
Wikipedia API: article text in Content.
Radio Browser (radio-browser.info): station directory, and the app plays third-party radio streams it lists.
YouTube: Watch rows open a YouTube search outside the app.
No advertising, tracking or third-party analytics SDK. The app calls no third-party AI service.

REGIONAL DIFFERENCES
The app has no region-specific code. Features and content are the same everywhere. Prices and currency follow the App Store storefront. Speech and Translation depend on the languages Apple supports on the device. Radio stations and YouTube results vary by what those services offer.

REGULATED OR THIRD-PARTY MATERIAL
Polingual is not a regulated service. It includes third-party language data under open licences: Wiktionary via Kaikki (CC BY-SA), Tatoeba sentences (CC BY 2.0 FR), Wikipedia text (CC BY-SA), wordfreq, CC-CEDICT, FrequencyWords, Dickinson College Commentaries and the Digital Corpus of Sanskrit word lists. Pronunciation clips are generated with eSpeak NG. Radio streams and YouTube videos belong to their owners and are not hosted by us.

## Open Items

| Item | What is unknown or missing |
|---|---|
| Recording | Physical device recording must be attached, including the paywall and a sandbox purchase. `apple/scripts/review-recording.sh polingual device` walks it |
| Demo account | Set `REVIEW_DEMO_EMAIL`, `REVIEW_DEMO_CODE` (8 to 10 digits) and `REVIEW_DEMO_UNTIL` (ISO date, sign-in stops at that date) in Vercel production, on an address the project controls. Run `npx tsx scripts/seed-review-demo.ts` against production with the migration applied, and rerun it between review rounds: it restores the account, group and member and clears the account's blocks. A deleted demo account refuses sign-in until the seed runs. |
| After approval | Remove `REVIEW_DEMO_EMAIL`, `REVIEW_DEMO_CODE` and `REVIEW_DEMO_UNTIL` from Vercel production, then redeploy. A past or missing date already turns the path off |
| Paywall | A demo sign-in alone does not pass the paywall. The reviewer needs a Sandbox account |
| Audience and age | Not stated in the code. The app has no age question |
| Prices | `Polingual.storekit` lists $9.99 monthly and $59.99 yearly. Live prices in App Store Connect were not checked |
| Family and Lifetime | Behind the `extra_plans` flag and not created in App Store Connect per `SUBMISSION-CHECKLIST.md`. Left out of the notes |
| Terms | polingual.com/terms carries the abuse clause after this PR deploys |
| Moderation response | Reports land in `bucket.group_reports` and email `MODERATION_EMAIL`, or `gianyrox@gmail.com` when it is unset. Nobody is named to act on them, and removal is manual SQL |
| Server | The migration `20261105000100_group_moderation.sql` and this PR must reach production before review. Without the migration, group loading fails |
| Email sender | Supabase sends the code email. Whether its SMTP goes through Resend is not in the repo; the notes list Resend for reports only |
| App privacy | Group names, display names, reports and blocks are new collected data. Check the policy and the App Privacy answers |
| Credits | Wordfreq, CC-CEDICT, FrequencyWords, Dickinson and Digital Corpus of Sanskrit data ships in `apple/Shared/Corpus/top1000` with no credit in the UI found |
| Licences | `lang-core.json` says CC BY-SA 3.0, `NOTICE.md` says 4.0. Decision D9 in `docs/internal/APPLE-NATIVE-PLAN.md`, Polingual languages on Apple surfaces after ShareAlike handling, is still open |
| Radio | Radio streams are a third-party rights question. No licence is held. Apple can ask for authorization under 5.2; removing the Listen rows would close it |
