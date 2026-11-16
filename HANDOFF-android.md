# Android Handoff

Branch `feat/android-polingual`, worktree `~/agfarms/.wt-android-polingual`. Plan: `docs/internal/android/ANDROID-NATIVE-PLAN.md`. Epic `bkt-292zc`.

## Milestones

| Bead | Milestone | State |
|---|---|---|
| bkt-292zc.4 | M1 skeleton, core, onboarding, email sign-in, guest pass | done |
| bkt-292zc.5 | M2 daily session, eight games, word detail, translate | done, critic pass 8.2 at 6139c90974 |
| bkt-292zc.6 | M3 Listen radio, Play Billing paywall | done; radio plays in the background on the emulator; plans need a Play device |
| bkt-292zc.7 | M4 lobbies, cross-play, bots, ads, UMP, locked preview | done; Android host plus a web guest on one code, scores agree |
| bkt-292zc.8 | M5 profile, username, delete account | done; checked against a local server on the hosted DB; critic pass 8.2 at 3e9e90ec33 for M3 to M5 |
| bkt-292zc.9 | M6 Bucket app on the shared core | built at 4cfb871df7; critic running |

## Next

1. Close the M6 critic, merge into dev.
2. Play verify and RTDN bead before any Play release (critic C4).
3. Native tiles and reveal lobby modes once the server lets native clients play them.
4. Founder items below.

## Monetization Rule

Founder decision 2026-11-12, bead `bkt-zapwl`, replaces AD9: games and live rooms are free for everyone. Every non-paying user sees AdMob ads in games and rooms, signed in or not, after UMP consent. Paid subscribers see no ads anywhere and get full learning. Today and Learn stay visible as a locked, designed preview behind the paywall. Google test ad ids until the founder supplies real ones.

## Open Items

- Engine study state stays on the device; per-system progress push to iOS format is not built.
- `/api/play/verify` and RTDN are not built; the client acknowledges Play purchases itself for now.
- Critic A9: release builds turn ads off unless `-PpolingualAdmobAppId` is set.
- Founder: Play account type (AD7), signing key, AdMob Android app id, Play Billing product ids, Google OAuth clients.
