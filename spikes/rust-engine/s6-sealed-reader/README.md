# Sealed Column Reader

Date: 2026-10-01. Linux x64, Rust 1.96.0, Bun 1.3.11.

## Question

Can Rust open every sealed column that the TypeScript store writes, with the layout in `packages/bkt/src/crypto.ts`: `v1:` then base64 of a 12-byte IV, a 16-byte tag and the ciphertext, AES-256-GCM, with a per-row associated-data string.

## Command

```bash
cargo build --release -p s6-sealed-reader
bun test ./s6-sealed-reader/sealed.test.mts
```

The test creates a passphrase vault with `PassphraseKeyring`, makes the device key and the data key with `ensureDevice` and `ensureDataKey`, and fills a schema version 8 database through `Store`, `NotesStore`, `HaiStore`, `HistoryStore`, `DailyQuizStore`, `PeopleStore` and `WorkQuizStore`. The Rust reader gets the database, `keyring.json` and the passphrase. It derives the vault key with scrypt at N 2^17, r 8, p 1 over the NFKC passphrase, opens the data key, then scans every text cell of every table for the `v1:` prefix and opens each with its own associated-data rule. The test compares each plaintext with what `open` in `crypto.ts` returns.

## Result

| Check | Result |
|---|---|
| Vault check value, data key, device key opened from `keyring.json` | yes, 0.5 to 0.8 s for scrypt |
| Passphrase with a non-ASCII letter and a compatibility character | accepted after NFKC |
| Tables scanned | 20 |
| Sealed columns found | 11, in 10 tables |
| Sealed cells opened | 23 of 23, byte-equal to the TypeScript plaintext |
| Cells with no associated-data rule | 0 |
| Wrong key rejected | 23 of 23 |
| Wrong associated data rejected | 23 of 23 |
| Wrong passphrase rejected | yes |

Sealed columns and their associated data:

| Column | Associated data |
|---|---|
| `meta.v` where `k = 'key_check'` | `key_check` |
| `attempts.response_enc` | `attempt:<id>` |
| `outbox.payload_enc` | `outbox:<ref_id>` |
| `hai_answer.response_enc` | `hai:<id>` |
| `notes.doc` | `note:<id>` |
| `history_snapshot.doc` | `history_snapshot` |
| `daily_quiz.body` | `daily_quiz:<day>` |
| `advisor_review.meta` | `advisor_review` |
| `advisor_rows.data` | `advisor_row:<rank>` |
| `work_quiz_source.beads` | `work_quiz_beads` |
| `work_quiz_source.repo` | `work_quiz_repo` |

The workflow repeats the test on five targets. See `s5-cross-build/README.md`.

## Limits

The operating-system keyrings were not read: libsecret, the macOS keychain and the Windows DPAPI file stay open under spike S2 in the document. The passphrase vault path is the one covered. The reader opens the file read-only after the TypeScript store closed it.
