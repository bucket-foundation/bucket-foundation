# Auth

One session for the whole site. A person signs in once at `/sign-in` with an email one-time code and is signed in on every page, every API route, and the framed Academy app until they sign out.

## Pieces

| Piece | File | Job |
|---|---|---|
| Browser client | `src/lib/supabase/browser.ts` | `createBrowserClient` from `@supabase/ssr`; the session lives in cookies. `src/lib/supabase/client.ts` re-exports it for older imports. |
| Server clients | `src/lib/supabase/server.ts` | `getServerSupabase()` for server components and route handlers, `getRequestSupabase(req)` for a handler with a `NextRequest`, `getMiddlewareSupabase(req, res)` for middleware, `getSessionUser()` for the verified person. |
| Middleware | `src/middleware.ts` | Refreshes the session cookies on every request and sends anonymous visitors on a protected path to `/sign-in?next=<path>`. Keeps the Kruse preview gate. |
| Protected paths | `src/lib/auth/paths.ts` | `PROTECTED_PREFIXES`, `safeNextPath` (same-origin paths only), `signInUrl`. Tested in `scripts/test-auth-paths.ts`. |
| Request verifier | `src/lib/auth/verify.ts` | `verifyRequestUser(req)`: a Bearer access token first, else the cookie session; both through gotrue `getUser`. Every user-data route verifies here: Research OS through `verifyLearner` in `src/lib/research-os/db.ts`, the Academy routes, `/api/account`. |
| Session in React | `src/providers/SessionProvider.tsx` | `useSession()` gives `{ user, loading, enabled, accessToken, signOut }`; mounted once in the root layout; no server call, so static pages stay static. |
| Sign-in | `src/app/sign-in/` | Email, then code. `next` is sanitized. Under-13 copy points to the class flow. |
| Sign-out | `src/app/auth/sign-out/route.ts` | POST only; clears the session and returns home. The header and the app shell post to it. |
| Account | `src/app/account/`, `src/app/api/account/route.ts` | Email, handle, display name, linked wallet, sign-out. |
| Identity | `supabase/migrations/20260916000000_bucket_identities.sql`, `src/lib/auth/identity.ts` | `bucket.identities` keyed on `auth.users.id`: unique handle, unique wallet. `getIdentity` creates the row on a person's first read (no trigger on the shared `auth.users`). Reached through the service-role client bound to the private `bucket` schema. |
| Header | `src/components/auth/UserMenu.tsx` | Sign in, or the person's name and sign out. |
| Page gate | `src/components/auth/SignInGate.tsx` | Rendered by app pages for the moment before the browser client hydrates. |
| Academy bridge | `src/app/academy/AcademyFrame.tsx`, `learning/app/js/auth.js` `adoptSession` | The site posts its session into the frame on load, on request, and on every change; the frame's own sign-in link goes to the site's `/sign-in` when framed. Same origin only. |

## Flows

Sign in: `/sign-in` → `signInWithOtp` → code → `verifyOtp` → cookies written by the browser client → `router.replace(next)` and `router.refresh()` so server components see the session.

A page request: middleware reads the cookies, refreshes an expired access token, and either serves the page or redirects to `/sign-in`. The `(app)` layout under `/research-os` checks again with `getSessionUser()` and loads the identity row and staff roles for the shell.

An API call from a page: `fetch("/api/...")` sends the cookies; the handler calls `verifyRequestUser`. A Bearer header still works, so agents, scripts, and the framed Academy app are unchanged.

Sign out: a POST to `/auth/sign-out` from the header, the account page, or the app shell.

## Environment

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` turn sign-in on. `SUPABASE_SERVICE_ROLE_KEY` lets handlers reach the private schemas. Without the first two, `/sign-in` says so, the header shows no account control, and protected paths still redirect to `/sign-in`.

## Local development

`supabase/config.toml` runs the same stack on this machine through Docker: Postgres, Auth, PostgREST, and Inbucket for the one-time-code emails. Migrations apply on start; the seed is `npm run seed:research-os`.

```bash
npm run db:local          # start (first run pulls the images)
npm run db:local:status   # prints the local URL and keys as env lines
npm run db:local:reset    # drop, re-apply every migration
npm run db:local:stop
```

Put the local `API_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY` from `db:local:status` into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Sign-in codes land in Inbucket at http://localhost:54324. The hosted project gets the same migrations with `npx supabase link` and `npx supabase db push`; `graph` and `bucket` must be in its exposed schemas (Settings → API), which `config.toml` sets for the local stack.

## Launch List

Until Research OS opens, production `/sign-in` shows a launch list: email, an optional name, an optional role, and one email promised on launch day. Preview deployments and local dev keep the sign-in form. `src/lib/launch.ts` decides: `BUCKET_SIGNIN_OPEN=1` opens sign-in on production at launch, and `0` shows the launch list anywhere. The flag is read at build time, so a change needs a redeploy.

| Piece | File | Job |
|---|---|---|
| Rules | `src/lib/waitlist/core.ts` | Validation, one record per address, CSV export with formula cells defused. Tested in `scripts/test-waitlist.ts` (`npm run test:waitlist`). |
| Store | `src/lib/waitlist/store.ts` | The private Vercel Blob store `bucket-foundation-blob`, one JSON object per address at `waitlist/<sha256(email)>.json` on production and `waitlist-preview/` on previews. Off Vercel with no Blob credentials it writes the same layout under `.data/waitlist-local/`. |
| Route | `src/app/api/waitlist/route.ts` | `POST` adds or updates a signup and answers the same for new and known addresses; a filled honeypot field saves the signup under `suspect/` for review; 503 when no store is connected. `GET` with `Authorization: Bearer <WAITLIST_ADMIN_KEY>` returns the list and the suspects, `?format=csv` the list as a download. |
| List | `src/app/admin/waitlist/` | `/admin/waitlist`: count, roles, every entry, CSV download, copy all emails, and the signups the bot filter held. Asks for the list key. |
| Accounts | `src/app/sign-in/page.tsx` | `/sign-in?account=1` asks Supabase to sign in existing accounts only (`shouldCreateUser` off) and answers the same for a known and an unknown address. The flag comes from the browser; whether the project accepts new accounts is GoTrue's signup setting (`GOTRUE_DISABLE_SIGNUP` on the self-hosted stack), which is the server-side control. |

The Blob store keeps every object until someone deletes it; it lives on the Vercel account, apart from the Hetzner box. Connecting it to the project sets `BLOB_READ_WRITE_TOKEN`. `WAITLIST_ADMIN_KEY` (16 characters or more) turns the list view on. From a terminal:

```bash
curl -H "Authorization: Bearer $WAITLIST_ADMIN_KEY" "https://www.bucket.foundation/api/waitlist?format=csv" -o launch-list.csv
```

## Retired

NextAuth v4 (`src/lib/auth.ts`, `src/app/api/auth/[...nextauth]`, `next-auth`, `@auth/supabase-adapter`, `NEXTAUTH_*`, `EMAIL_SERVER`, `EMAIL_FROM`): `/api/chat` now reads `getSessionUser()`. The seven per-page one-time-code forms (six Research OS pages and `canon/signoff`). The Dynamic wallet providers now mount only under `/research`, the bucket 1.0 publish path; a wallet becomes an identity fact on `bucket.identities.wallet` when that flow links it.

## Register

Closes `docs/PROBLEM-REGISTER.md` PR-056 and PR-058, and the identity half of PR-004.
