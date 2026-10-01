# bkt

Offline Bucket study app: a timed quiz and FSRS review over a local SQLite store, in the terminal and in a window. Download it at [bucket.foundation/download](https://www.bucket.foundation/download).

## Install

Release [bkt-v0.4.0](https://github.com/bucket-foundation/bucket-foundation/releases/tag/bkt-v0.4.0) ships signed binaries for Linux, macOS and Windows. The installers pick your architecture, check the checksum and the release signature, and refuse to replace a newer install.

macOS and Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/bucket-foundation/bucket-foundation/bkt-v0.4.0/scripts/install.sh -o install.sh
BKT_VERSION=0.4.0 sh install.sh
```

Windows, in PowerShell:

```powershell
iwr https://raw.githubusercontent.com/bucket-foundation/bucket-foundation/bkt-v0.4.0/scripts/install.ps1 -OutFile install.ps1
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

`BKT_VERSION` pins a release and `BKT_INSTALL_DIR` sets the target directory, default `~/.local/bin` on macOS and Linux and `%LOCALAPPDATA%\Programs\bkt` on Windows. `BKT_NO_MODIFY_PATH=1` leaves your shell profile alone on macOS and Linux. Then run `bkt init` and `bkt`.

## Window

`bkt app` starts `bkt serve` and opens the views from `packages/bkt-ui` in a window: a Chromium-family browser in app mode (Chrome, Chromium, Brave, Edge) when one is installed, the default browser otherwise. `bkt serve` prints the local URL without opening anything.

What a user gets today:

- **Linux x86_64:** `Bucket-0.4.0-x86_64.AppImage` on the [bkt-v0.4.0](https://github.com/bucket-foundation/bucket-foundation/releases/tag/bkt-v0.4.0) release. Run `chmod +x` on it and start it; with no arguments it runs `bkt app`, and any argument goes to `bkt`.
- **macOS and Windows:** the release carries the `bkt` binaries only, with no windowed installer. The binaries do not bundle the views, so `bkt app` needs a checkout: `cd packages/bkt-ui && bun install && bun run build`, then build `bkt` as below and run `BKT_UI_DIR=../bkt-ui/dist ./dist/bkt app` in `packages/bkt`.

`packages/bkt-desktop` is a Tauri shell around the same views and a `bkt` sidecar. Its release workflow builds `deb` and `AppImage` on Linux, `dmg` on macOS for arm64 and x64, and `msi` on Windows, and uploads them as `Bucket-desktop-<version>-<os>-<arch>.<ext>` to the `bkt-v*` release. No release has them yet: they arrive with the next tag. The shell opens `bucket://quiz/<YYYY-MM-DD>` as that day's quiz at `#/work/daily/<day>`.

## Build from source

```bash
bun install
bun test
bun run build
./dist/bkt init
./dist/bkt
```

`bun run build` exports the content pack from `learning/app/corpus` into `content/pack.json` and compiles one binary to `dist/bkt`.

## Commands

```bash
bkt --help
bkt help analyze
bkt stats --json
bkt whoami --json
```

`bkt --help`, `-h` and `help` print the command list; `bkt help <command>` and `bkt <command> --help` print one command's flags. The list comes from the table in `src/cli/table.ts`, which also drives parsing and the `:` palette. `whoami`, `init`, `stats`, `analyses`, `update` and `version` take `--json` and print one line shaped `{"v":1,...}` with keys, tokens and sealed content left out.

Exit codes: 0 ok, 1 failure, 2 usage, 3 no data, 130 cancelled. A usage error exits before bkt creates the data folder or calls the key store. `NO_COLOR` turns colour off. Without a terminal, or with `TERM=dumb`, the terminal app, `bkt hai` and `bkt analyze --tui` print usage and exit 2, and `bkt analyses` prints a plain list.

Each data folder holds a `keyring-scope` file with a random id, and its key store entries are named `db-data-key.<id>` and `device-ed25519.<id>`, so a second `BKT_HOME` has its own keys and its own device. A 0.4.0 folder has no scope file and keeps reading the unscoped `db-data-key` and `device-ed25519`; bkt no longer writes those names. bkt stores a key only under a newly drawn id, and a libsecret lookup that returns nothing while `secret-tool search` lists the entry counts as locked. `bkt.db` records the same id, and bkt restores a lost `keyring-scope` from it.

When `bkt.db` exists and the key store returns no data key, bkt stops with `keyring locked or key missing`, exit 1, and stores no new key. Unlock the key store and run it again, or move `bkt.db` aside to start fresh. An empty `bkt.db` counts as absent.

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

The suite runs in `analyze/bkt_analyze.py` on numpy: summary stats, histograms, Pearson and Spearman correlations, standardized PCA with the prime-directions sign convention, linear trend, seasonality when the index is regular and the residual ACF peak clears 2/sqrt(n) with at least 2 full cycles, IQR and 3 sd outliers, trend and PCA residuals. With a time index and two nonnegative numeric columns it writes a `table` input for `tools/helix` and runs it. Reports land in `$XDG_DATA_HOME/bucket/analyses/<name>-<date>/` as `report.md`, `report.json` and `helix/`; `BKT_ANALYSES` moves the root. Report dirs are mode 0700. Reads stop at `--max-rows`, default 1,000,000, and JSON files over 256 MB are refused.

The binary embeds the analyzer and helix sources and unpacks them on first use to `$XDG_CACHE_HOME/bkt/py/<hash>/`, mode 0700. It needs `python3` with numpy; helix also needs matplotlib and Parquet needs pyarrow, and each missing module prints its pip command. `BKT_ANALYZE_PY`, `BKT_HELIX_DIR` and `BKT_PYTHON` apply only with `--dev`. `q` or `esc` cancels a running `--tui` analysis, and ctrl-c cancels one on the CLI.

Browser keys: `j` `k` move or scroll, `g` `G` jump, `l` or `enter` open, `space` page, `n` `p` next or previous section, `h` `q` `esc` back.

Python tests: `python3 -m pytest analyze/tests`. `python3 analyze/make_fixtures.py` rebuilds the fixtures.

## Keys

`j` `k` move, `g` `G` jump, `enter` or `l` select, `1`-`4` answer or rate, `space` reveal, `q` or `esc` back, `?` help, `:` command palette.

## Human and AI probe

```bash
bkt hai freeze
bkt hai review --clear <item-id>
bkt hai score --pilot 200
bkt hai score --pilot 200 --yes
bkt hai score --collect
bkt hai
bkt hai export
bkt hai wipe
```

Measures the multiplier from bead bkt-7v10. `freeze` writes `hai/bank.json`: each pack item with 3 distractors fixed under seed `hai-bank-v1`, versioned by hash. `review` writes `hai/review.json` and flags duplicate choices, distractors that contain or overlap the answer, answers twice as long as any distractor, and distractors drawn from the same atom. Flagged items stay out of probes and scoring until cleared with `--clear`.

`score` prints the item count, a cost estimate and the worst case at `max_tokens` 400 for `claude-opus-5-5` at effort low, one run, and stops. `--yes` submits a Batches API job and needs `ANTHROPIC_API_KEY`; it refuses while an earlier batch is uncollected and when the worst case exceeds `--max-usd`, default 1.5 times the batched estimate. `--collect` writes `hai/ai-scores.json` when the batch ends; malformed or truncated replies are counted and left out of A and of probes.

A probe is 40 unseen items in 20 pairs matched on tier and AI correctness. One item of each pair is answered alone, the other with the AI answer shown after a 20 s think window. No scores are shown until the unaided retest 7 days later. Scores are guess-corrected, `(c - 1/4) / (3/4)`. The report gives D = J - max(H, A) first and m = J / max(H, A) beside it, retention R = H(t+7) - H(t), learning L = J(t+7) - H(t+7), and 95% CIs from a bootstrap over pairs. A is scored on the paired items only. Answers are sealed like attempts, and nothing leaves the device.

## Paths from the window

The window never sends a file path to `bkt serve`, with one exception: `POST /local/work-quiz/repo` takes the folder of a git repository for the work quiz. The folder must resolve, after symlinks, inside the user's home folder and hold a `.git` entry. Git runs there read-only with argv arrays, a 3 second timeout, no terminal prompt, system and global config off, and `core.fsmonitor`, `core.hooksPath`, `core.pager`, `diff.external` and signature checks overridden on the command line, so a repository's own config cannot start a program. Every other file reaches `bkt serve` as text from a file picker.

`bkt serve` also reads two folders the code fixes and the window cannot change: `~/.claude/projects` and `~/.codex/sessions`. The window sends two on and off switches through `POST /local/work-quiz/chat`; both start off. A root that is itself a symlink is refused, and each root must resolve, after symlinks in its parents, inside the home folder. Symlinked files and folders under a root are skipped, and files open with `O_NOFOLLOW`. One run reads `.jsonl` files changed in the last 2 days, at most 200 files, 64 MB in total, 8 MB a file, and stops after 3 seconds.

## Chat sources

Every line a chat session yields passes `secret-scan.ts` before any other use. A line is dropped when it holds a token or key shape (`sk-`, `ghp_`, `github_pat_`, `AKIA`, `xox`, `figd_`, a JWT, a PEM block), a `NAME=value` line, a key, token, secret or password assignment or a sentence that states one (`password is ...`), Stripe, SendGrid, Hugging Face and Slack webhook shapes, a URL with a password, an email address, or a run of 20 or more letters and digits with mixed entropy. Adjacent lines are also scanned joined, so a key split across two lines drops both. Each session becomes one fact stub: a hash of its path, the first surviving line of at most 80 characters, a day, and a message count. Stubs live in memory for one build. The quiz is sealed in `daily_quiz`, and the log line carries counts.

`GET /local/work-quiz/daily` builds today's quiz on first open when a chat switch is on. Templates write the questions by default. When `bkt-llm-server` answers on `http://127.0.0.1:11435` (`BKT_LLM_URL`, `BKT_LLM_MODEL`), the local model writes recall questions from the stubs and templates fill the rest. The address must be `http` on `127.0.0.1` or `[::1]`, redirects are refused, the reply is scanned for secrets and validated, and any failure or a 30 second timeout falls back to templates. Transcript text can steer the model's wording, so a model-written question can mislead; template questions carry counts, days and tool names the code computed.

## Daily quiz

`bkt serve` keeps each day's quiz sealed in the `daily_quiz` table of `bkt.db`, one row a day, at most 20 questions and 256 KB. The table is local and never syncs. `GET /local/work-quiz/daily?day=YYYY-MM-DD` returns the questions without answers; `POST /local/work-quiz/answer` with `day` grades one question once. A Fermi question is right when the answer sits within half an order of magnitude: `abs(log10(got / want))` at or under 0.5. The distance is stored beside the attempt in `log10_distance`; attempts from before schema 8 keep their grades and hold no distance. A zero or negative estimate is wrong. Forgetting the work quiz sources deletes the stored quizzes.

## History snapshot

The window reads productions from a file the user saves on the web: sign in at bucket.foundation, open `/api/research-os/production`, save the JSON, then open it under History. `bkt serve` keeps the last snapshot sealed in `bkt.db` (at most 4 MB after cleaning, 5000 productions), so History stays readable while the web or its API is down. A new export replaces it; Remove snapshot deletes it.
