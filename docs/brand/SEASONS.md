# Omega Seasons

Data: `src/data/omega-seasons.json`. Page: `/brand/seasons`. Images: `public/brand/seasons/`, rendered from `brand/omega-variants/out/scenes`.

## Stable Mark

- The gold inverse-omega lyre is the one logo: `src/components/InverseOmega.tsx`, `src/app/icon.svg`, `public/brand/omega-lyre-gold.png`, set in commit `7813303edf`.
- Its geometry, gold and proportions never change. A season skins the field around the lyre and never redraws the lyre.
- The stable mark is the default app icon, the favicon outside a season, the App Store icon and every legal or press use.
- Seasonal icons keep the lyre centered and readable at 29 px.

## Shipping a Month

1. **iOS icon.** Each season adds an entry `season-NN-<slug>` under `CFBundleAlternateIcons` in the app build that ships before the 1st. On the 1st the app offers the icon and calls `UIApplication.shared.setAlternateIconName("season-NN-<slug>")` when the user accepts. iOS shows its own confirmation alert; the app never switches silently. `setAlternateIconName(nil)` restores the stable mark.
2. **Web favicon.** The site layout reads the active month from the JSON and points `icon` metadata at the hero image for that month. Outside the calendar it serves `src/app/icon.svg`.
3. **Badges.** Four badges per month. Each is earned by an action in the feature tie-in for that month and issued as an Open Badges 3.0 credential on the user profile. No blockchain mint.
4. **Season pass.** The month name, the hero skin and the four-badge track form one season. A user who earns all four keeps the hero icon after the month ends.

## Rotation Rule

- One season per calendar month, starting December 2026, 24 seasons through November 2028.
- A month opens at 00:00 UTC on the 1st and closes at the end of the last day.
- Each month ties to a dated event inside it: solstices, equinoxes, Nobel week, Pi Day, language days or the April 14 Bucket anniversary.
- A scene appears as a hero once in the 24 months. Badges may repeat a hero scene from another year.
- Earned icons stay unlocked forever. Unearned icons leave the picker when the month closes.
