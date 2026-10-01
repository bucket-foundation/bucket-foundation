# WebAssembly Inside the Compiled App

Date: 2026-10-01. Bun 1.3.11, Rust 1.96.0.

## Question

Does the ranking crate, built for `wasm32-unknown-unknown`, load inside a `bun build --compile` binary on the five targets the app ships, and what does it cost in bytes and start time.

## Command

```bash
s3-wasm-in-bun/build.sh
.data/s3/app-wasm search "entropy light"
.data/s3/app-wasm cases .data/s2/cases.jsonl
bun bench.mts 30 3 -- .data/s3/app-wasm search "entropy light"
bun bench.mts 30 3 -- .data/s3/app-ts search "entropy light"
```

`app.mts` embeds `rank.wasm` with `import ... with { type: "file" }`, compiles and instantiates it at start, and ranks 16 built-in texts. `baseline.mts` is the same program with the TypeScript ranker. The size added is the difference between the two binaries. The module has no imports and no bindings generator: seven exported functions over linear memory.

## Result on This Machine

Linux x64, 16 cores, load average 14 to 20 from other agents.

| Measure | Value |
|---|---|
| `rank.wasm`, release profile | 48,451 bytes |
| `rank.wasm`, `opt-level = "z"` | 42,389 bytes |
| Compiled binary with wasm | 99,348,270 bytes |
| Compiled binary with the TypeScript ranker | 99,297,402 bytes |
| Added | 50,868 bytes |
| Read, compile and instantiate, in process | 5.9 to 15.3 ms over 20 runs |
| 20,300 generated ranking cases through the embedded module | 0 mismatches |

Wall time per process, median of 30 runs, three repeats, warm page cache:

| Pass | With wasm | TypeScript ranker |
|---|---|---|
| 1 | 24.8 / 23.1 / 24.5 ms | 15.2 / 15.1 / 15.4 ms |
| 2 | 29.6 / 31.4 / 28.9 ms | 18.3 / 17.2 / 17.4 ms |

Cross-compiling both programs from this machine with `--target=bun-<target>`, the way `scripts/release/build-binaries.sh` builds releases, adds 50,868 bytes on both Linux targets, 49,536 on darwin-arm64, 49,152 on darwin-x64 and 51,200 on windows-x64.

## Result on GitHub Runners

Workflow `spike-rust-engine`, run 36919225743, native build and run on each runner, medians of 20 runs, three repeats:

| Target | Runner | Bytes added | Module load | With wasm | TypeScript ranker | Cases | Mismatches |
|---|---|---|---|---|---|---|---|
| linux-x64 | ubuntu-24.04 | 50,868 | 2.3 ms | 15.3 / 15.2 / 15.0 ms | 10.2 / 10.7 / 10.6 ms | 20,300 | 0 |
| linux-arm64 | ubuntu-24.04-arm | 50,868 | 1.6 ms | 11.5 / 11.4 / 11.5 ms | 8.6 / 8.3 / 8.6 ms | 20,300 | 0 |
| darwin-arm64 | macos-15 | 49,536 | 5.0 ms | 12.1 / 13.2 / 13.3 ms | 11.2 / 8.7 / 9.3 ms | 20,300 | 0 |
| darwin-x64 | macos-15-intel | 49,152 | 5.2 ms | 51.3 / 51.8 / 51.4 ms | 48.2 / 47.7 / 44.6 ms | 20,300 | 0 |
| windows-x64 | windows-2025 | 51,200 | 5.5 ms | 63.5 / 62.6 / 61.9 ms | 54.7 / 55.9 / 54.9 ms | 20,300 | 0 |

The first run, 36916128687, gave the same byte counts and the same zero mismatches.

## Reading

The module loads and returns bit-equal results on all five targets. It costs about 50 KB and 1 to 9 ms per process on idle runners, 8 to 12 ms on this loaded machine. The document's figure of 13 KB and 14 KB added does not hold for a module that carries `tokenRank`: lowercasing tables and the allocator bring it to 48 KB.

A static `import` of `node:fs` in the entry file added about 20 ms to the start of the compiled binary here. The numbers above use `Bun.file`.
