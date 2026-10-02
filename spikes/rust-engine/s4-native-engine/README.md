# Minimal Native Engine

Date: 2026-10-01. Linux x64, 16 cores, load average between 15 and 36 from other agents during timing.

## Question

How large is a Rust binary that opens a copy of the canon pack, answers one search and exits, and how does its start time compare with `bkt --version`.

## Command

```bash
(cd ../../packages/bkt && bun install --frozen-lockfile && bun run pack:content)
bun s4-native-engine/make-db.mts
cargo build --release -p s4-native-engine
cargo build --profile small -p s4-native-engine
bun s4-native-engine/check.mts
(cd ../../packages/bkt && bun build --compile --minify src/cli.tsx --outfile ../../spikes/rust-engine/.data/s4/bkt-dev)
BENCH_HOME=$PWD/.data/home bun bench.mts 30 3 -- .data/s4/bkt-dev --version
bun bench.mts 30 3 -- target/release/engine-min .data/s4/canon.db "speed of light" 30
```

`make-db.mts` writes pack `246f1a6cea3e`, 364 excerpts, into a fresh database with the TypeScript `Store` and `syncCanon`. `engine-min` links `rusqlite` with bundled SQLite 3.46.0, opens that file read-only, reads `canon_excerpts` and runs the ported `tokenRank`. `bkt-dev` is built from `origin/dev` at `b8af4d78c` and run with `HOME` and the XDG folders pointed at an empty spike folder.

## Result

Five queries return the same ids and scores as `rankCanon` in TypeScript.

| Binary | Size |
|---|---|
| `engine-min`, release, fat LTO, stripped, `opt-level = 3` | 2,323,920 bytes |
| `engine-min`, same with `opt-level = "z"` | 1,355,152 bytes |
| `bkt-dev`, `bun build --compile --minify` | 105,785,908 bytes |

Wall time per process, median of 30 runs, three repeats, spawn cost included:

| Command | Repeat 1 | Repeat 2 | Repeat 3 |
|---|---|---|---|
| `bkt-dev --version`, first pass | 239.9 ms | 220.3 ms | 190.2 ms |
| `bkt-dev --version`, second pass | 223.0 ms | 255.2 ms | 263.9 ms |
| `engine-min --version`, first pass | 0.89 ms | 0.85 ms | 0.94 ms |
| `engine-min --version`, second pass | 1.42 ms | 1.51 ms | 1.45 ms |
| `engine-min` one search over 364 excerpts, first pass | 3.19 ms | 3.36 ms | 3.27 ms |
| `engine-min` one search over 364 excerpts, second pass | 5.03 ms | 5.54 ms | 6.29 ms |
| `/bin/true` | 0.62 ms | 0.57 ms | 0.54 ms |

## Limits

The binary has no HTTP route, no keyring adapter and no full-text index, so 2.3 MB is a floor for the engine. The row in the document names a build with one route and the keyring adapter; that build was not made here. Timings come from a loaded machine with a warm page cache. Sizes and `--version` start times for the other four targets are in `s5-cross-build/README.md`.
