# Apple Token Key Rotation

`APPLE_TOKEN_ENC_KEY` seals the Apple refresh tokens in `bucket.apple_tokens` and `bucket.apple_revoke_pending` with AES-256-GCM. Rotation is manual and there is one key at a time.

Cost of changing the key: every token sealed under the old key stops decrypting. Revokes for those users fail with `decrypt_failed`, and those rows reach `failed` after five cron attempts, so Apple keeps those grants until the user removes the app in Apple ID settings.

Rotate only when the key may have leaked:

1. Run the retry cron once so the pending queue is empty.
2. Set the new key in Vercel and redeploy.
3. Delete rows in `bucket.apple_tokens` sealed under the old key. Each user's next Sign in with Apple stores a fresh token.

Support for a second decrypt key (`APPLE_TOKEN_ENC_KEY_PREVIOUS`) is open as a follow-up if rotation becomes routine.
