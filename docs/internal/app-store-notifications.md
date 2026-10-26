# App Store Server Notifications

`POST https://bucket.foundation/api/app-store/notifications` takes App Store Server Notifications V2. Set it as the Production and Sandbox server URL for each app in App Store Connect. Bead `bkt-hikdo`.

## Verification

The body is `{ "signedPayload": "<JWS>" }`. The route checks the ES256 signature against the leaf in `x5c`, the leaf against the intermediate, and the intermediate against a root whose SHA-256 fingerprint matches the pinned Apple Root CA G3 in `src/lib/app-store/apple-root.ts`. The leaf must carry OID 1.2.840.113635.100.6.11.1 and the intermediate 1.2.840.113635.100.6.2.1, and every certificate must be valid at the payload's `signedDate`. The nested `signedTransactionInfo` and `signedRenewalInfo` pass the same check.

## Storage

One row per `notificationUUID` in `bucket.app_store_events`; a resent notification answers `duplicate` and writes nothing. `appAccountToken` links the row to the Supabase user; the apps set it to the user id at purchase. An unknown token stores the row with no user. Kinds: `trial`, `subscribe`, `renew`, `cancel`, `uncancel`, `refund`, `expire`, `billing_issue`, `other`.

## Responses

200 `{ outcome: "recorded" | "duplicate" | "ignored" }`; `ignored` when `APP_STORE_BUNDLE_IDS` is set and the bundle is not in it. 400 for a body or signature that fails, 413 past 64 KB, 500 on a write failure and 503 with no database; Apple retries non-200 answers.

## Admin

`GET /api/admin/app-store` with the `WAITLIST_ADMIN_KEY` bearer returns 90-day totals per kind and per product, with sandbox events and unlinked rows counted apart, for the growth dashboard.

## Test chain

`tests/fixtures/app-store/` holds a throwaway test root, intermediate and leaf with the Apple OIDs, plus the test leaf key used to sign fixture JWS. No production system trusts them.
