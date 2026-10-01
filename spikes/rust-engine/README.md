# Rust Engine Spikes

Throwaway code that measures the feasibility claims in `docs/ARCHITECTURE-TARGET.md` for epic `bkt-neoj`, bead `bkt-neoj.1`. Nothing here ships. Each folder holds one experiment and a `README.md` with its question, command, result and date. All runs: 2026-10-01.

| Folder | Question | Result | Claim in the document |
|---|---|---|---|
| `s1-two-writers` | Do a `bun:sqlite` writer and a `rusqlite` writer share one WAL database through `kill -9` | 600 s twice, 144 kills, 0 rows lost, 0 duplicated, integrity ok, opens in both. 44% to 52% of deferred read-then-write transactions failed at once with `SQLITE_BUSY` | Supports shared access. Adds a failure mode the document omits |
| `s2-ranking-parity` | Does a Rust port return the same ids, order and score bits | 0 mismatches on the 243 ranker calls behind the 330-case fixture and on 20,300 generated cases, on five targets. f32 differs on 4,879 of 6,000 real inputs. Unicode `\b` differs on 1,576 of 5,000 non-ASCII inputs | Supports f64. Confirms the tokenizer difference. Corrects the f32 figure |
| `s3-wasm-in-bun` | Does the crate load as wasm inside a compiled Bun binary | Loads on five targets, 48 KB module, 49 to 51 KB added, 1.6 to 5.5 ms load on runners | Supports. Corrects the 13 KB figure |
| `s4-native-engine` | Size and start time of a minimal engine | 2.3 MB at `opt-level = 3`, 1.4 MB at `z`; one search in 3 to 6 ms; `bkt --version` takes 190 to 264 ms | Closes the row for SQLite and ranking alone |
| `s5-cross-build` | Which targets build where | Five of five on native runners in 25 to 122 s. Four of four cross-built from one Linux runner with `cargo zigbuild` | Supports native runners. Contradicts the cross-build sentence for SQLite alone |
| `s6-sealed-reader` | Does Rust open every sealed column | 23 of 23 cells in 11 columns, byte-equal, on five targets, through the passphrase vault | Supports the format freeze. OS keyrings stay open |

Shared crates: `rank` holds the port, `rank-wasm` exports it for `wasm32-unknown-unknown`. Scratch data goes to `.data/`, which git ignores. Scripts use `.mts` and `.cjs` so the site's `tsconfig.json` include skips them.

The workflow `.github/workflows/spike-rust-engine.yml` runs on pushes to `spike/rust-engine` and on manual dispatch, reads no secrets and touches no release workflow.

## Not Run

- Operating-system keyrings: libsecret, macOS keychain, Windows DPAPI. Reading them means touching a real key store, and spike S2 in the document covers it.
- An engine with one HTTP route and a keyring adapter. The size and start figures are for SQLite plus ranking.
- The installed 0.4.0 terminal app as a writer. The founder's data folder is off limits, so a test writer with the same pragmas stood in.
- A cold page cache. Dropping it needs root.
- A cross-build to `x86_64-pc-windows-msvc` from Linux. The GNU target was built instead.

## Sentences to Change in the Document

Feasibility Ledger:

- "A wasm module loads inside a `bun build --compile` binary | Evidenced on linux-x64 | Round 2 critic run: a 13 KB module loaded in 11 to 13 ms and added about 14 KB. Not rerun for this draft": evidenced on five targets; the module with `tokenRank` is 48 KB, adds 49 to 51 KB and loads in 1.6 to 5.5 ms on GitHub runners.
- "The same on linux-arm64, darwin-arm64, darwin-x64, windows-x64 | Unproven | Untested": evidenced, run 36919225743.
- "f64 matched in 2000 of 2000 trials, f32 mismatched in 2000 of 2000 ... Not rerun for this draft": f64 matched in 10,200 of 10,200 on five targets; f32 changed score bits in 4,879 of 6,000 real-valued cases and 0 of 4,000 small-integer cases.
- "Binary size and startup time of the Rust engine | Unproven | No build exists": a build with SQLite and ranking is 1.8 to 2.3 MB and starts in 1 to 7 ms; a route and a keyring adapter are unmeasured.
- "Rust regex word boundaries match the JavaScript tokenizer | Unproven, expected to differ": disproved for the default `\b`, evidenced for an ASCII boundary. Add that the PR #511 fixture cannot detect the difference.
- "Two `bun:sqlite` writers and one rusqlite reader share `bkt.db` in WAL mode without loss | Unproven": evidenced, with the deferred-transaction caveat.
- "Cross-build of five targets for the Rust workspace | Unproven | A one-day CI trial": evidenced for a crate that links SQLite.

Build and Update:

- "One native runner per operating system, since Rust with SQLite and a keyring library does not cross-build five targets from one host the way Bun does. Cross-building darwin and windows from Linux is unproven": with SQLite alone, one Linux runner cross-built all four other targets. The keyring library is the open part.

Path to a Verified Design: the rows "Wasm inside the compiled Bun binary on four targets", "f64 cosine parity", "Tokenizer agreement on non-ASCII text", "Concurrent access to `bkt.db` through phase 2", "Cross-build of five targets" and "Binary size and startup" move from unproven to evidenced. The ranking row keeps its Lean half.

Transport: "A ... Evidenced on linux-x64" and "Four targets unproven" become evidenced on five targets.

Additions the measurements call for:

- Data Migration, Writers: a transaction that reads and then writes must open with `begin immediate`. `store.ts` line 256 and `local.ts` lines 114 and 128 use the deferred shape today.
- Parity Tests: the Rust ranker rejects NaN and infinity before sorting, since `sort_by` panicked in 139 of 500 such cases.
- Feasibility Ledger: lowercasing differs between Rust 1.96 on Unicode 17 and Bun on Unicode 15.1 for 55 code points, 28 on macOS, none touching ASCII. Pin the rule to ASCII output.
- Data Migration, Sealing: on macOS `bun:sqlite` runs SQLite 3.43.2 with `synchronous` 1, and bundled `rusqlite` runs 3.46.0 with 2.
