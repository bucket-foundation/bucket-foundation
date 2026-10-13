# Cross-Building Five Targets

Date: 2026-10-01. Workflow `.github/workflows/spike-rust-engine.yml`, runs 36916128687 and 36919225743 on branch `spike/rust-engine`. Rust 1.96.0, Bun 1.3.11, no build cache.

## Question

Does the minimal engine from `s4-native-engine` build for linux-x64, linux-arm64, darwin-arm64, darwin-x64 and windows-x64, on which runner, and in what time. Does one Linux host build the other four.

## Command

```bash
bun s5-cross-build/ci.mts <label> 60
bash s5-cross-build/cross.sh
```

`ci.mts` runs on each native runner: the engine build, the ranking parity run, the wasm-in-Bun run, the sealed-reader test and a 60-second two-writer run. `cross.sh` runs on one `ubuntu-24.04` runner and builds the engine for the other four targets with `cargo zigbuild`. The `run-cross` job then runs each cross-built binary with `--selftest` on a native runner of its target.

## Native Builds

`cargo build --release --locked -p s4-native-engine`, bundled SQLite, fat LTO:

| Target | Runner | Cores | Build, run 1 | Build, run 2 | Size | Size at `opt-level = "z"` | `--version` start |
|---|---|---|---|---|---|---|---|
| linux-x64 | ubuntu-24.04 | 4 | 48.9 s | 49.3 s | 2,274,736 | 1,384,720 | 1.0 ms |
| linux-arm64 | ubuntu-24.04-arm | 4 | 49.9 s | 48.4 s | 2,182,672 | 1,461,880 | 0.8 ms |
| darwin-arm64 | macos-15 | 3 | 42.0 s | 24.8 s | 2,015,872 | 1,209,136 | 2.3 ms |
| darwin-x64 | macos-15-intel | 4 | 122.2 s | 44.8 s | 2,045,328 | 1,254,848 | 7.1 ms |
| windows-x64 | windows-2025 | 4 | 37.4 s | 39.8 s | 1,790,464 | 1,186,304 | 6.2 ms |

All five built on their native runner in both runs. Sizes and start times are from run 2.

## Cross-Builds From One Linux Runner

`cargo zigbuild --release --locked -p s4-native-engine --target <triple>` on `ubuntu-24.04`, with `ziglang` and `cargo-zigbuild` from PyPI and no macOS SDK:

| Triple | Built | Build, run 1 | Build, run 2 | Size | Ran `--selftest` on its target |
|---|---|---|---|---|---|
| aarch64-unknown-linux-gnu | yes | 49 s | 50 s | 1,946,400 | yes, ubuntu-24.04-arm |
| aarch64-apple-darwin | yes | 52 s | 54 s | 1,978,240 | yes, macos-15 |
| x86_64-apple-darwin | yes | 49 s | 51 s | 1,894,196 | yes, macos-15-intel |
| x86_64-pc-windows-gnu | yes | 99 s | 103 s | 1,957,888 | yes, windows-2025 |

## Other Experiments on Each Target

| Target | Ranking parity, native, f64 and ASCII boundary | Wasm cases | Sealed cells opened | Two writers, 60 s: rows, kills, lost, duplicated, integrity |
|---|---|---|---|---|
| linux-x64 | 0 mismatches of 20,300 | 0 of 20,300 | 23 of 23 | 51,865, 10, 0, 0, ok |
| linux-arm64 | 0 | 0 | 23 of 23 | 53,871, 10, 0, 0, ok |
| darwin-arm64 | 0 | 0 | 23 of 23 | 13,001, 10, 0, 0, ok |
| darwin-x64 | 0 | 0 | 23 of 23 | 12,477, 9, 0, 0, ok |
| windows-x64 | 0 | 0 | 23 of 23 | 25,158, 11, 0, 0, ok |

The f32 accumulator and the Unicode-aware `\b` variant gave the same mismatch counts on every target as in `s2-ranking-parity/README.md`.

Two platform differences showed up. On macOS `bun:sqlite` reports SQLite 3.43.2 and `pragma synchronous` 1; on Linux and Windows it reports 3.51.2 and 2. On macOS 28 code points lowercase differently between Bun and Rust; on Linux and Windows 55 do. None touches ASCII on any target.

## Limits

The engine links SQLite alone. A keyring library, an HTTP server and a search index are absent, and each can change the cross-build result: the macOS keychain framework needs the SDK, which zig does not carry. The Windows cross-build is the GNU target; the MSVC target was built on the Windows runner alone. No binary was signed or notarised.
