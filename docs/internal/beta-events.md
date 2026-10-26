# Beta Event Ingest

`POST /api/beta/events` records tester activity from the Bucket and Polingual iOS apps and the web app. Bead `bkt-5vsj4`.

## Auth

`Authorization: Bearer <access_token>`, the Supabase access token the apps already hold from `POST /api/academy/session`. Refresh it through the same route on a 401. The first accepted call enrolls the user in `bucket.beta_testers` with cohort `default`.

## Request

```json
{
  "app": "polingual",
  "events": [
    {
      "id": "6f1c2c1e-6c1b-4f0e-9a43-1f3f1b6b9c11",
      "name": "card_answered",
      "ts": "2026-10-26T11:00:00Z",
      "session_id": "0b8f6a4c-3e7d-4d8e-b1c2-9a8f7e6d5c4b",
      "props": { "correct": true, "ms": 1840, "deck": "es-a1" }
    }
  ]
}
```

| Field | Rule |
|---|---|
| `app` | `bucket`, `polingual` or `web` |
| `id` | UUID made on the device. Resending the same id is a no-op, so retry whole batches freely |
| `name` | `app_open`, `session_start`, `session_end`, `card_shown`, `card_answered`, `lesson_complete` |
| `ts` | ISO 8601 device time; at most 30 days old and 5 minutes ahead |
| `session_id` | optional UUID, one per foreground session |
| `props` | flat object: up to 16 keys matching `^[a-z][a-z0-9_]{0,31}$`; values string up to 128 chars, number, boolean or null; 2 KB total |

Props the metrics read: `card_answered.correct` (boolean) and `session_end.seconds` (number). Keys that name a device or a person are refused: `ip`, `ip_address`, `idfa`, `idfv`, `device_id`, `advertising_id`, `email`, `phone`, `lat`, `lng`, `latitude`, `longitude`, `location`. The server stores no IP address, user agent or device fingerprint. The key check covers names only: apps must keep personal data out of string values.

## Limits

100 events and 256 KB per request. 5000 stored events per user per UTC day, enforced inside one database transaction that locks the tester row; resent duplicates do not count.

## Responses

| Code | Body |
|---|---|
| 200 | `{ accepted, duplicate, rejected: [{ index, error }], cohort }`; `opted_out: true` when the tester opted out and nothing was stored |
| 400 | `{ error }`: `bad_request`, `bad_app`, `no_events`, `too_many_events` |
| 401 | `{ error: "unauthorized" }` |
| 413 | `{ error: "too_large" }` |
| 429 | `{ error: "rate_limited", cap, retryAfterSeconds }` plus `Retry-After` |
| 500 | `{ error: "write_failed" }`; retry the same batch later |
| 503 | `{ error: "events_unavailable" }` |

Per-event errors in `rejected`: `bad_event`, `bad_id`, `bad_name`, `bad_ts`, `ts_in_future`, `ts_too_old`, `bad_session_id`, `bad_props`, `bad_prop_key`, `forbidden_prop`, `prop_too_long`, `bad_prop_value`, `too_many_props`, `props_too_large`, `duplicate_in_batch`. Drop rejected events; do not resend them.

## Opt-out

`POST /api/beta/opt-out` with `{ "opted_out": true }` and the same bearer token stops storage and deletes the tester's beta events. `false` resumes. The apps show a switch for it; `/privacy` describes the tracking.

## Admin

`/admin/beta` shows per-tester and per-cohort sessions, cards, completions and D1/D7/D30 retention. It opens with `WAITLIST_ADMIN_KEY`. `POST /api/admin/beta` with `{ user_id, cohort }` and the same bearer key moves a tester to a cohort. Deleting the auth user deletes their rows. The report reads up to 100,000 events and sets `truncated: true` past that.
