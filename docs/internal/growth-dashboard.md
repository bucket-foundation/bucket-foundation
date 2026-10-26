# Growth Dashboard

`/admin/growth` opens with `WAITLIST_ADMIN_KEY`. Bead `bkt-ex4ff`.

## Sources

| Step | Source |
|---|---|
| Site visits | Vercel Web Analytics; no API source in the repo, shown as `-` |
| Beta signups | launch list, Blob store |
| TestFlight invites, installs | App Store Connect snapshot: testers in any state other than `NOT_INVITED`, and testers in `INSTALLED` |
| Active learners | testers with a beta event in the last 7 days |
| Retention | D1/D7/D30 over all testers, from beta events |

## Snapshot

`apple/AppStore/growth_snapshot.py` reads testers and builds through the shared client in `apple/AppStore/beta_feedback.py` (PR #1009). It sends tester states only, never names or emails. For each build it looks up the git tag `<app>-build-<build number>` and takes `git log --format=%s` from the previous tag as the what-changed note. Builds without a tag show "no build tag"; tag each TestFlight upload to fill them.

```bash
set -a; . ~/.derbyfish-secrets/asc-api-key.env; set +a
python3 apple/AppStore/growth_snapshot.py --dry-run
GROWTH_SNAPSHOT_URL=https://bucket.foundation/api/admin/growth/snapshot WAITLIST_ADMIN_KEY=... python3 apple/AppStore/growth_snapshot.py
```

`POST /api/admin/growth/snapshot` takes `{ takenAt, testers: [{ app, state }], builds: [{ app, version, build, uploadedAt, state, tag, notes }] }` up to 1 MB with the admin bearer key, answers 200 `{ ok, testers, builds }`, 400 `{ error }`, 404 on a bad key, 413 past 1 MB. The dashboard reads the newest snapshot. The App Store Connect key stays on the machine that runs the script; Vercel holds no Apple credential.
