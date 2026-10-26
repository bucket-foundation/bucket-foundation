# App Store Server Notifications

`POST https://bucket.foundation/api/app-store/notifications` takes App Store Server Notifications V2. Set it as the Production and Sandbox server URL for each app in App Store Connect. Bead `bkt-hikdo`.

## Verification

The body is `{ "signedPayload": "<JWS>" }`. The route checks the ES256 signature against the leaf in `x5c`, the leaf against the intermediate, and the intermediate against a root whose SHA-256 fingerprint matches the pinned Apple Root CA G3 in `src/lib/app-store/apple-root.ts`. The leaf must carry OID 1.2.840.113635.100.6.11.1 and the intermediate 1.2.840.113635.100.6.2.1, and every certificate must be valid at the payload's `signedDate`. The nested `signedTransactionInfo` and `signedRenewalInfo` pass the same check.

## Storage

One row per `notificationUUID` in `bucket.app_store_events`; a resent notification answers `duplicate` and writes nothing. Each row keeps the full decoded transaction and renewal info and the raw `appAccountToken`. Kinds: `trial`, `subscribe`, `renew`, `cancel`, `uncancel`, `refund`, `refund_reversed`, `revoke`, `expire`, `billing_issue`, `other`.

## Account Link

The client chooses `appAccountToken`, so the route never trusts it as a user id. `POST /api/app-store/account-token` with the academy bearer token returns the user's server-issued token from `bucket.app_store_account_tokens`; the app passes that value to `.appAccountToken` at purchase. A notification links to a user only when its token matches an issued row. Any other token stores the row unlinked, and nothing grants an entitlement from it. The Polingual paywall still passes the user id and needs that one-line change.

## Responses

200 `{ outcome: "recorded" | "duplicate" | "ignored" }`; `ignored` when the bundle id is missing or outside `APP_STORE_BUNDLE_IDS`, which defaults to `foundation.bucket.app,com.polingual.app`. 400 for a body or signature that fails, 413 past 64 KB, 500 on a write failure and 503 with no database; Apple retries non-200 answers.

## Admin

`GET /api/admin/app-store` with the `WAITLIST_ADMIN_KEY` bearer returns 90-day totals per kind and per product, with sandbox events and unlinked rows counted apart, for the growth dashboard.

## Test chain

`tests/fixtures/app-store/` holds a throwaway test root, intermediate and leaf with the Apple OIDs, plus the test leaf key used to sign fixture JWS. `.gitignore` excepts these `.pem` files. No production system trusts them.
