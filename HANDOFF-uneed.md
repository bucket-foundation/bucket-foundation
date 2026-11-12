# Uneed Handoff

Bead bkt-of9qi. URL tested: https://www.polingual.com, desktop 1366 and mobile 390 widths, Playwright, plus a link crawl of 290 internal paths.

## Failures Found

- `/d8/art/hero.svg` 404 on the landing page and all 29 language pages.
- `/api/founding` returned 503 on every landing load, logged as a console error.
- `/?_rsc=...` 404 on every Next page: header and 404 pages used `next/link` to `/`, which is a static rewrite to `/d8/index.html`.
- `/brand/kit/*.png` 404 for all six logo downloads on `/brand`.
- `/api/download/file` burned the one-time link before fetching the Blob artifact, so a suspended Blob store used up links.

Working: landing, words, beta signup form, `/join`, `/live` and `/app` sign-in screens, legal pages. Waitlist, invites, marks and What's new already prefer Supabase when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, and callers catch store failures.

## Fixed On This Branch

- Removed the dead hero image tag from `polingual/public/d8/*.html`.
- `/api/founding` GET answers 200 `{ open: false }` when offline.
- Home links use plain anchors.
- Logo PNGs copied from the press kit into `polingual/public/brand/kit/`.
- Download route fetches the artifact first and redeems the link only after the fetch succeeds.

## Left

- Critic review per `docs/agents/BUCKET-CRITIC.md`, then merge into `dev` and push.
- Re-run the browser sweep against the preview deploy.
- Root `npm test` stops at `scripts/test-academy-lang-audio.ts`, Arabic 201 of 244 clips. Fails on `dev` too.
- No test covers the download route ordering.

## Founder

- Confirm `supabase/migrations/20261103000000_waitlist_off_blob.sql` is applied to the hosted DB and the Supabase env vars are set on the `bucket-foundation` Vercel project. Not verified: the Supabase connector has no access to that project.
- Blob stores stay suspended until billing or limits change; only the download artifact still needs Blob.
- Resubmit at uneed.best/edit/waiting-line/71015 after the preview sweep is clean.
