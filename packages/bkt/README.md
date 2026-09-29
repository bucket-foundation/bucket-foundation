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

## Analyze

```bash
bkt analyze data.csv
bkt analyze data.csv --tui
bkt analyze bad.csv --force
bkt analyses
```

Reads CSV, TSV, JSON, JSON lines and Parquet through pyarrow. The form check infers types, units from headers such as `sales (USD)` or `temp_c`, a time index, missing values and duplicate rows. Ragged rows, duplicate or blank headers and a file without numeric columns stop the run with exit 2 unless `--force`; an unreadable file stops even with `--force`.

The suite runs in `analyze/bkt_analyze.py` on numpy: summary stats, histograms, Pearson and Spearman correlations, standardized PCA with the prime-directions sign convention, linear trend with autocorrelation seasonality, IQR and 3 sd outliers, trend and PCA residuals. With a time index and two nonnegative numeric columns it writes a `table` input for `tools/helix` and runs it. Reports land in `$XDG_DATA_HOME/bucket/analyses/<name>-<date>/` as `report.md`, `report.json` and `helix/`; `BKT_ANALYSES` moves the root. The compiled binary needs `BKT_ANALYZE_PY` set to the script path.

Browser keys: `j` `k` move or scroll, `g` `G` jump, `l` or `enter` open, `space` page, `n` `p` next or previous section, `h` `q` `esc` back.

Python tests: `python3 -m pytest analyze/tests`. `python3 analyze/make_fixtures.py` rebuilds the fixtures.

## Keys

`j` `k` move, `g` `G` jump, `enter` or `l` select, `1`-`4` answer or rate, `space` reveal, `q` or `esc` back, `?` help, `:` command palette.
