# Kruse Index — Engineering Notes

Delivers **bkt-002** (`/kruse` private preview route) + **bkt-003** (tokenized URL
middleware). Read alongside `./README.md` (the pitch brief).

## Architecture

```
  magic link
  https://bucket.foundation/kruse?t=<HS256 JWT>
                 |
                 v
       src/middleware.ts   ─── matcher: /kruse, /kruse/*, /api/kruse/*
                 |
         ┌───────┴───────┐
         | valid token?  |
         | allow-listed? |
         | version ok?   |
         | not expired?  |
         └───────┬───────┘
                 |
    +--- no ----> 404 (opaque; route appears not to exist)
    |
    yes
    |
    v
  set bkt_kruse_access HttpOnly Secure SameSite=Lax cookie,
  302 -> /kruse  (URL strips the token so it isn't shareable via browser history)

  subsequent requests:
     cookie present + verifyToken() -> pass through
     cookie missing/stale -> 404, delete cookie
```

Nothing else on the site changes. Root layout still renders Header/Footer for
every other route; `src/app/kruse/layout.tsx` overlays a full-viewport container
so the Kruse preview has its own paper-like chrome.

## Files

| Path | Purpose |
|---|---|
| `src/lib/kruse-token.ts` | `mintToken()` / `verifyToken()` — HS256 via `jose`. Single source of truth for cookie name, env vars, allow-list. |
| `src/middleware.ts` | Edge-runtime gate. Matcher scoped to `/kruse` + `/api/kruse`. |
| `src/app/kruse/layout.tsx` | Fraunces + JetBrains Mono via `next/font/google`. Full-viewport overlay in `#0b0d0f`. `robots: noindex, nofollow`. |
| `src/app/kruse/page.tsx` | Server component. `dynamic = "force-dynamic"`. |
| `src/app/kruse/_components/KruseSearch.tsx` | Client component. Debounced input, three-mode toggle, 1–50 limit slider, 6 example chips, mode-tinted highlight of matched terms. |
| `src/app/kruse/_components/AboutDrawer.tsx` | Side-drawer explaining BM25 / MiniLM-L6-v2 / RRF in plain English. |
| `src/app/api/kruse/search/route.ts` | Same-origin-only proxy to `KRUSE_INDEX_URL` (defaults to `http://localhost:8765`). Re-verifies the cookie — **the gate is enforced twice**. |
| `scripts/mint-kruse-token.ts` | `npm run mint-kruse-token -- <recipient> [ttl_days]` |
| `scripts/revoke-kruse-token.ts` | Prints the next `BKT_KRUSE_TOKEN_VERSION` — paste into Vercel + redeploy. |
| `scripts/test-kruse-token.ts` | `npm test` — 6 roundtrip tests via `node:test`. |
| `.env.example` | Documents `BKT_KRUSE_TOKEN_SECRET`, `BKT_KRUSE_TOKEN_VERSION`, `BKT_KRUSE_ALLOWED_RECIPIENTS`, `KRUSE_INDEX_URL`. |

## Env vars (source of truth: Vercel Project → Environment Variables)

| Var | Default | Notes |
|---|---|---|
| `BKT_KRUSE_TOKEN_SECRET` | *(required, >=32 chars)* | HS256 signing key. Generate with `openssl rand -base64 48`. **Never commit.** |
| `BKT_KRUSE_TOKEN_VERSION` | `1` | Bump to revoke all outstanding tokens at once. |
| `BKT_KRUSE_ALLOWED_RECIPIENTS` | `kruse` | Comma-separated whitelist. Add founder for smoke testing if wanted. |
| `KRUSE_INDEX_URL` | `http://localhost:8765` | Upstream search server. In prod → the feed402 wrapper once bkt-005 ships. |

## Minting a token

```bash
# 1. Set the same secret Vercel has
export BKT_KRUSE_TOKEN_SECRET='...'     # from Vercel; do NOT paste in chat
export BKT_KRUSE_TOKEN_VERSION=1
export BKT_KRUSE_ALLOWED_RECIPIENTS=kruse

# 2. Mint
npm run mint-kruse-token -- kruse 90   # 90 days
# -> eyJhbGciOi...  (paste into the email link)
```

Link format:

```
https://bucket.foundation/kruse?t=<TOKEN>
```

On first click, middleware sets a 90-day `HttpOnly` cookie and redirects to
`/kruse` (no token in the browser history). Every subsequent visit is cookie-auth.

## Rotating (revoking all tokens)

```bash
# 1. Find the next version number
BKT_KRUSE_TOKEN_VERSION=$CURRENT npm run revoke-kruse-token
# -> prints e.g. "2"

# 2. Update Vercel: Settings → Environment Variables → BKT_KRUSE_TOKEN_VERSION = 2
# 3. Redeploy. Every prior cookie instantly fails verification.
# 4. Mint fresh tokens for anyone who still needs access.
```

Rotating only the secret works too (and does the same thing), but bumping the
version is the surgical revoke — you don't have to redistribute every variable
to other services that may start consuming this key.

## Vercel deploy checklist

- [ ] `BKT_KRUSE_TOKEN_SECRET` set (Production + Preview; never Development to
      avoid accidental leakage through `vercel env pull`)
- [ ] `BKT_KRUSE_TOKEN_VERSION=1`
- [ ] `BKT_KRUSE_ALLOWED_RECIPIENTS=kruse`
- [ ] `KRUSE_INDEX_URL` set (points at the Kruse Index server wherever it's hosted)
- [ ] `kruse.bucket.foundation` CNAME or apex rewrite → `bucket.foundation/kruse`
      (keeps the brand of the URL clean for the email)
- [ ] Middleware smoke test after deploy:
      ```
      curl -sI https://bucket.foundation/kruse             # expect 404
      curl -sI "https://bucket.foundation/kruse?t=INVALID" # expect 404
      curl -sI "https://bucket.foundation/kruse?t=<REAL>"  # expect 302 + Set-Cookie
      ```

## Security properties

1. **Opaque 404 on failure.** Scanners find no difference between `/kruse`
   existing and not existing. Only valid cookies ever see 200s.
2. **Secret is only in env.** `kruse-token.ts` reads from
   `process.env.BKT_KRUSE_TOKEN_SECRET` at call time. The secret is never written
   to disk by any script in this repo.
3. **Two-layer enforcement.** Middleware gates the page; the API route
   re-verifies the cookie. Someone who guesses `/api/kruse/search` still 404s.
4. **Same-origin CORS.** Proxy rejects cross-origin `Origin` headers with 404.
5. **URL strip.** The `?t=...` token is consumed once and replaced with a cookie
   — never persists in browser history, share menus, analytics, or server logs.
6. **`noindex,nofollow`.** Search engines won't index even if they somehow
   found the URL.

## Local dev

```bash
# 1. Start the Kruse Index server (separate repo)
cd ~/jackkruse && python3 server.py &   # listens on :8765

# 2. Start bucket-foundation with env wired up
cd ~/agfarms/bucket-foundation
BKT_KRUSE_TOKEN_SECRET='local-dev-secret-at-least-32-characters' \
BKT_KRUSE_TOKEN_VERSION=1 \
BKT_KRUSE_ALLOWED_RECIPIENTS=kruse \
KRUSE_INDEX_URL=http://localhost:8765 \
npm run dev

# 3. Mint + visit
TOKEN=$(npm run --silent mint-kruse-token -- kruse 1 | tail -1)
open "http://localhost:3000/kruse?t=$TOKEN"
```

## Deferred

- **bkt-005: feed402 wrapper.** The API proxy currently calls the plain
  `:8765/search` server. Once bkt-005 ships the x402 feed402 wrapper, change
  `KRUSE_INDEX_URL` in Vercel — no code change required.
- **Per-recipient telemetry.** Middleware already forwards `x-kruse-recipient`
  to downstream handlers. Once we have a logging sink we'll count which
  recipient hit which query (for the "Kruse clicked" vs "Kruse forwarded"
  signal in the pitch brief).
- **CSP.** Not added yet — the root layout loads Dynamic's SDK which injects
  inline scripts. Adding CSP is a cross-route concern (not `bkt-002` / `bkt-003`).

## Total footprint

- New files: 10 (including 3 scripts and 3 React components)
- Modified files: 3 (`package.json`, `.env.example`, `package-lock.json`)
- Lines of hand-written code: ~580
- New runtime dep: `jose` (one of the few JWT libs that works in the Edge runtime)
