# Rust Engine Spikes

Throwaway code that measures the feasibility claims in `docs/ARCHITECTURE-TARGET.md` for epic `bkt-neoj`, bead `bkt-neoj.1`. Nothing here ships. Each folder holds one experiment and a `README.md` with its question, command, result and date.

| Folder | Question |
|---|---|
| `s1-two-writers` | Do a `bun:sqlite` writer and a `rusqlite` writer share one WAL database through `kill -9` without loss |
| `s2-ranking-parity` | Does a Rust port of `tokenRank` and `cosineRank` return the same ids, order and score bits |
| `s3-wasm-in-bun` | Does the ranking crate load as WebAssembly inside a `bun build --compile` binary, at what size and start time |
| `s4-native-engine` | How large is a minimal native engine and how fast does it start |
| `s5-cross-build` | Which of the five shipped targets build, on which runner, in what time |
| `s6-sealed-reader` | Does a Rust reader open every sealed column the TypeScript store writes |

Shared crates: `rank` holds the port, `rank-wasm` exports it for `wasm32-unknown-unknown`. Scratch data goes to `.data/`, which git ignores. The workflow `.github/workflows/spike-rust-engine.yml` runs on pushes to `spike/rust-engine` and on manual dispatch, reads no secrets and touches no release workflow.
