# Polingual on Google Play

Upload files sit in `~/agfarms/polingual-play/` on charizard. The same text and images live in `android/polingual/play/` in the repo; the bundle stays out of git.

| File | Use |
|---|---|
| `polingual-1.0.2.aab` | signed upload bundle, versionCode 263240615 |
| `title.txt`, `short-description.txt`, `full-description.txt` | store listing text |
| `graphics/icon-512.png`, `graphics/feature-graphic-1024x500.png` | listing graphics |
| `screenshots/phone-0*.png` | five phone screenshots, 1080x1920 |
| `DATA-SAFETY.md` | data safety, content rating and app content answers |

## 1. Create the Developer Account

1. Open https://play.google.com/console/signup and sign in with the Google account that will own Polingual.
2. Pick the account type. This is plan decision AD7.
   - **Personal**: fastest, needs a government ID. Accounts created after 2023-11-13 must run a closed test with **at least 12 testers opted in for 14 days in a row** before Play unlocks production.
   - **Organization**: in the name of AGFarms LLC. Needs a D-U-N-S number, which takes up to 30 days to issue if AGFarms has none. Organization accounts skip the 12 testers rule.
3. Pay the 25 USD registration fee.
4. Verify identity, contact email and phone, and confirm you own an Android phone through the Play Console app.
5. The app sells subscriptions, so Play shows a developer address on the listing. Use a business address or a mailbox.
6. Setup, Payments profile: create the merchant account. Subscriptions cannot be created without it.

## 2. Create the App

1. Home, Create app.
2. App name `Polingual: Learn Languages`, default language English (United States), App, Free.
3. Accept the Developer Program Policies and US export laws declarations, then Create app.

## 3. Upload to Internal Testing

1. Test and release, Testing, Internal testing, Create new release.
2. Play App Signing: keep **Use Google-generated key**. The key that signed the first upload becomes the upload key, so uploading `polingual-1.0.2.aab` enrolls `~/.config/polingual/upload.jks` automatically.
3. Upload `polingual-1.0.2.aab`. Release name `1.0.2`. Release notes: paste the first paragraph of `full-description.txt` or a line of your own.
4. Next, Save, then Start rollout to Internal testing.
5. Testers tab: Create email list `Polingual testers`, add up to 100 Gmail addresses, Save.
6. Copy the **Join on the web** link and send it to testers. Each tester opens it, taps Accept, then installs from the Play Store link on the same page.
7. Setup, License testing: add the same addresses so their subscription purchases cost nothing.

## 4. Record the Signing Fingerprints

Test and release, Setup, App signing. Copy the **App signing key** SHA-1 and SHA-256. The upload key fingerprints are:

- SHA-1 `37:DD:B2:8B:1C:12:7A:93:29:62:34:B9:B2:60:CB:B8:21:3A:4E:6E`
- SHA-256 `F0:4E:2E:E0:C5:02:97:76:A4:07:89:29:1F:12:5C:E7:9C:8C:B6:E5:09:2A:0D:4B:9C:D1:73:CE:83:8C:2A:F9`

Give both app signing values to the agent. Google sign-in OAuth clients and `assetlinks.json` need them.

## 5. Fill the Store Listing and App Content

1. Grow users, Store presence, Main store listing: paste the three text files, upload the icon, feature graphic and the five screenshots.
2. Policy, App content: answer every section from `DATA-SAFETY.md`. Privacy policy URL `https://polingual.com/privacy`. Delete account URL `https://polingual.com/delete-account`, live once PR #1293 deploys.
3. Store settings: category Education, contact email from `DATA-SAFETY.md`.

## 6. Create the Subscription Products

Monetize with Play, Products. Use the iOS ids so the server entitlement map covers both stores.

1. Subscriptions: `com.polingual.monthly`, `com.polingual.yearly`, `com.polingual.family.yearly`. Give each one auto-renewing base plan at the App Store price. On yearly, add an offer with a 7-day free trial for new customers. Monthly has no trial.
2. One-time products: `com.polingual.lifetime` at the App Store price.
3. Activate each product.

## 7. Closed Testing

1. Testing, Closed testing, Create track, name it `Beta`.
2. Promote the internal release to `Beta`, or upload a newer bundle.
3. Testers: a Google Group is easiest. Create one at https://groups.google.com, add 12 or more people, and paste the group address.
4. Countries: United States and any others you want.
5. Send the release for review. The first review takes a few days.
6. Keep 12 or more testers opted in for 14 days in a row. Ask them to open the app a few times; Play asks about their engagement when you apply.
7. Dashboard, Apply for production. Answer the questions about the test, then wait for approval.

## Before Production

- [ ] Real AdMob ids. Release builds turn ads off until they are set; pass `-PpolingualAdmobAppId=...`, `-PpolingualBannerUnit=...` and `-PpolingualInterstitialUnit=...`.
- [ ] Merge PR #1293, which updates https://polingual.com/privacy for AdMob.
- [ ] Server purchase check `/api/play/verify` and Real-time developer notifications (plan critic C4).
- [ ] Back up `~/.config/polingual/upload.jks` and `upload.env` to the password manager. If the upload key is lost, Play support can reset it, which takes days.

## Rebuild a Bundle

On charizard, from `android/` in a checkout of this branch:

```
set -a; . ~/.config/polingual/upload.env; set +a
./gradlew :polingual:bundleRelease -PfreeBeta=false
```

The versionCode comes from the UTC time, so each release build uploads as a new version. Debug builds keep versionCode 1. Pass `-PpolingualVersionCode=N` to pin it. Without the `POLINGUAL_UPLOAD_*` variables the bundle builds unsigned.
