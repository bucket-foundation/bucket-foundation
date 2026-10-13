# Two Writers on One Database

Date: 2026-10-01. Machine: Linux x64, 16 cores, btrfs on NVMe, other agents running tests during the run.

## Question

Does one WAL-mode SQLite file survive two processes writing it through different bindings, with `kill -9` at random points, under the pragmas `packages/bkt/src/store.ts` sets: `journal_mode = wal`, `foreign_keys = on`, `secure_delete = on`, `busy_timeout = 5000`.

## Command

```bash
cargo build --release -p s1-two-writers
bun s1-two-writers/run.mts 600 .data/s1
bun s1-two-writers/run.mts 600 .data/s1-doc target/release/s1-writer bun-writers-rust-reader
```

Each writer resumes from `max(seq)` for its name, commits one row plus a counter update in `begin immediate`, and appends the sequence number to an acknowledgement file after the commit returns. Every tenth operation is a deferred transaction that reads and then writes. The orchestrator kills one process with `SIGKILL` every 1.5 to 8 seconds, restarts it within 1.5 seconds, and ends by killing every process at once. A lost row is an acknowledged sequence number absent from the file. A gap or a duplicate in `seq` is a loss or a repeat.

## Result

Layout one, the task's: a `bun:sqlite` writer on SQLite 3.51.2 and a `rusqlite` writer on bundled SQLite 3.46.0. 600 seconds, load average 21 at the start, with the five-minute average reaching 46 during the run.

| Measure | bun:sqlite | rusqlite |
|---|---|---|
| Rows committed | 50,866 | 55,351 |
| `kill -9` received | 45 | 42 |
| Acknowledged rows missing | 0 | 0 |
| Duplicated rows | 0 | 0 |
| Gaps in sequence | 0 | 0 |
| Counter equals row count | yes | yes |
| Errors on `begin immediate` writes | 0 | 0 |
| Five-second busy timeouts | 0 | 0 |
| `SQLITE_BUSY` on deferred read-then-write | 2,612 of about 5,650 | 2,609 of about 6,150 |
| Longest successful commit | 6,540 ms | 2,962 ms |

`pragma integrity_check` returned `ok` from both bindings. After the final kill of both writers the WAL held 5.0 MB, and the file opened and took a write from each binding. `pragma synchronous` read 2 in both.

Layout two, the arrangement in the document: two `bun:sqlite` writers and a read-only `rusqlite` reader that checks counter, row count and maximum sequence inside one read transaction. 600 seconds, 57 kills across the three processes.

| Measure | Value |
|---|---|
| Rows committed | 59,822 and 57,842 |
| Lost, duplicated, gaps | 0, 0, 0 |
| Reader transactions logged | 18,200 |
| Reader errors | 0 |
| Inconsistent snapshots seen by the reader | 0 |
| `SQLITE_BUSY` on deferred read-then-write | 6,783 of about 13,070 |
| Integrity check, both bindings | ok |

The workflow repeated layout one for 60 seconds on each of the five targets. See `s5-cross-build/README.md`.

## Reading

Sharing the file is safe: no loss, no repeat, no corruption in 144 kills.

A deferred transaction that reads and then writes fails at once with `SQLITE_BUSY` or `SQLITE_BUSY_SNAPSHOT` when the other process commits in between. `busy_timeout` does not apply to that case, and 5,213 of the 5,221 failures in layout one returned in under 100 ms. This rate comes from writers that never pause for more than 4 ms. `store.ts` line 256 and `local.ts` lines 114 and 128 use that transaction shape today, so two Bun processes already carry this exposure.
