# Growth Dashboard

`/admin/growth` opens with `WAITLIST_ADMIN_KEY`. Bead `bkt-ex4ff`.

## Sources

| Step | Source |
|---|---|
| Site visits | Vercel Web Analytics count for the last 7 days, read by the snapshot when `VERCEL_TOKEN` is set. On 2026-10-26 the API answered 404 "Web Analytics not found" for both projects, so the step shows `-` until Web Analytics is on |
| Beta signups | launch list, Blob store |
| TestFlight invites, installs | App Store Connect snapshot: testers in any state other than `NOT_INVITED`, and testers in `INSTALLED` |
| Active learners | testers with a beta event in the last 7 days |
| Retention | D1/D7/D30 over all testers, from beta events |

## Snapshot

`apple/AppStore/growth_snapshot.py` reads testers and builds through the shared client in `apple/AppStore/beta_feedback.py`, the same file as on the TestFlight feedback branch. It sends tester states only, never names or emails. For each build it looks up the git tag `<app>-build-<build number>` and takes `git log --format=%s` from the previous tag as the what-changed note. Without tags it takes the commits on `origin/dev` that touched that app's `apple/` paths between the previous upload and this one.

```bash
set -a; . ~/.derbyfish-secrets/asc-api-key.env; set +a
python3 apple/AppStore/growth_snapshot.py --dry-run
GROWTH_SNAPSHOT_URL=https://bucket.foundation/api/admin/growth/snapshot WAITLIST_ADMIN_KEY=... python3 apple/AppStore/growth_snapshot.py
```

`POST /api/admin/growth/snapshot` takes `{ takenAt, testers: [{ app, state }], builds: [{ app, version, build, uploadedAt, state, tag, notes }], visits?: { days, byApp } }` up to 1 MB with the admin bearer key, answers 200 `{ ok, testers, builds }`, 400 `{ error }`, 404 on a bad key, 413 past 1 MB. The dashboard reads the newest snapshot. The App Store Connect key stays on the machine that runs the script; Vercel holds no Apple credential.
