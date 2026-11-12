# Android Handoff

Branch `feat/android-polingual`, worktree `~/agfarms/.wt-android-polingual`. Plan: `docs/internal/android/ANDROID-NATIVE-PLAN.md`. Epic `bkt-292zc`.

## Milestones

| Bead | Milestone | State |
|---|---|---|
| bkt-292zc.4 | M1 skeleton, core modules, onboarding, email sign-in, guest pass | done, committed |
| bkt-292zc.5 | M2 daily session, eight games, word detail, translate with picker | done; critic round 1 scored 7.1, fixes A1 to A7, A10, A11 applied in this WIP commit; round 2 not yet run |
| bkt-292zc.6 | M3 Listen radio on Media3, Play Billing paywall and restore | code written in this WIP commit; last build started, result unchecked; not run on the emulator |
| bkt-292zc.7 | M4 lobbies, cross-play, ads, UMP | not started |
| bkt-292zc.8 | M5 account name, username, delete | not started; critic A8 lands here |
| bkt-292zc.9 | M6 Bucket app on the shared core | not started |

## Next

1. `cd android && ./gradlew test :polingual:assembleDebug`; fix any compile error in `Milestones.kt`, `Billing.kt`, `RadioService.kt`.
2. Boot `pol37` (`emulator -avd pol37 -no-window -gpu swangle_indirect`), screenshot Listen and Paywall into `android/polingual/screenshots/`, commit M3.
3. Resume the critic for M2 round 2 with the fix list above.
4. Build M4 and M5, critic after M5, then merge into dev locally and push dev. Never push main.
5. M6 Bucket.

## Monetization Rule

Founder decision 2026-11-12, bead `bkt-zapwl`, replaces AD9: games and live rooms are free for everyone. Every non-paying user sees AdMob ads in games and rooms, signed in or not, after UMP consent. Paid subscribers see no ads anywhere and get full learning. Today and Learn stay visible as a locked, designed preview behind the paywall. Google test ad ids until the founder supplies real ones.

## Open Items

- Engine study state stays on the device; per-system progress push to iOS format is not built.
- `/api/play/verify` and RTDN are not built; the client acknowledges Play purchases itself for now.
- Critic A9: release builds turn ads off unless `-PpolingualAdmobAppId` is set.
- Founder: Play account type (AD7), signing key, AdMob Android app id, Play Billing product ids, Google OAuth clients.
