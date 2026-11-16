# Founding Family

Founder ruling, 2026-11-16: the first 500 families who sign up at polingual.com get the Polingual Family plan free for life, up to 6 people through Apple Family Sharing.

## Signup

1. The home page row opens the sheet in `public/d8/founding.js`. The form posts to `POST /api/founding`.
2. `claim_founding_family` stores the address as pending and the server emails a link to `/founding?token=`.
3. The page button posts to `POST /api/founding/confirm`. `confirm_founding_family` marks the row confirmed and the server emails the confirmation.

A spot counts once it is confirmed. The home page counter and the cap of 500 both read confirmed rows. Gmail addresses lose dots, every address loses its plus tag, so one inbox holds one spot. One network can start 3 signups a day.

## Redemption

Default path: when family plans open, each confirmed founding family gets an App Store offer code or a RevenueCat promotional entitlement, granted by email to the confirmed address.

The page and both emails promise this much: "Founding families get the Family plan free for life. We email your code when family plans open."

Open decisions and the other options are in bead bkt-400zh. Family plans need a Family product in App Store Connect first, bead bkt-76gkh.

## Rollout

Apply `db/founding.sql`, set `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `POLINGUAL_DB_URL` and `POLINGUAL_DB_SERVICE_KEY`, then deploy. The offer row stays hidden until `GET /api/founding` reports a total.

Test: `FOUNDING_TEST_DB_URL=postgresql://... bash db/test-founding.sh`. CI runs it in the `db` job of `polingual-ci`.
