# bkt

Offline Bucket terminal app: timed quiz and FSRS review over a local SQLite store.

## Build

```bash
bun install
bun test
bun run build
./dist/bkt init
./dist/bkt
```

`bun run build` exports the content pack from `learning/app/corpus` into `content/pack.json` and compiles one binary to `dist/bkt`.

## Storage

- Database at `$BKT_HOME/bkt.db`, default `$XDG_DATA_HOME/bkt`, WAL mode.
- Attempt responses and outbox payloads are sealed with AES-256-GCM under a 32-byte data key.
- Plaintext on disk: the DB and WAL files themselves, item ids, the content pack, correctness, rating, timing, FSRS card state, timestamps and the device public key. Anyone who reads the files learns what you studied, when, and how well.
- The data key and the Ed25519 device key live in the libsecret keyring, service `bucket-bkt`. A keyring error stops bkt; only a clean not-found creates keys, first-run creation holds `keys.lock`, and an existing secret is never overwritten.
- Without libsecret bkt refuses to start. Pass `--keyring passphrase` for a vault in `keyring.json` sealed under scrypt N=2^17; the passphrase comes from a terminal prompt or `--passphrase-fd N`.
- The data dir is reset to mode 0700 on every start.
- `spike/sqlcipher.ts` reproduces the SQLCipher check: `Database.setCustomSQLite` on Linux keeps the bundled SQLite, `PRAGMA cipher_version` returns null, and the file stays plaintext.

## Keys

`j` `k` move, `g` `G` jump, `enter` or `l` select, `1`-`4` answer or rate, `space` reveal, `q` or `esc` back, `?` help, `:` command palette.
