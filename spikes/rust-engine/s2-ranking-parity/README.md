# Ranking Parity

Date: 2026-10-01. Rust 1.96.0, Bun 1.3.11, Linux x64.

## Question

Does a Rust port of `tokenRank` and `cosineRank` from `src/lib/canon-rank.ts` return the same ids, the same order and the same score bits as the TypeScript, and where does a naive port differ.

## Command

```bash
cargo build --profile parity -p s2-ranking-parity
cargo build --release -p bucket-rank-wasm-spike --target wasm32-unknown-unknown
bun s2-ranking-parity/gen.mts
target/parity/s2-parity .data/s2/cases.jsonl
s2-ranking-parity/fixture.sh
```

`gen.mts` builds seeded inputs and records what the TypeScript functions return, with each score as its 64 bits in hex. `fixture.sh` applies `fixture-hook.patch` to `canon-rank.ts` for the length of the run, records every ranker call behind `scripts/fixtures/canon-search-parity.json`, replays those calls in Rust, and reruns `scripts/test-canon-search-parity.ts` with the WebAssembly build in place of the TypeScript ranker. It reverses the patch on exit.

## Result

The 330-case fixture makes 243 ranker calls: 239 to `tokenRank`, 4 to `cosineRank`. The other cases are rejected before ranking.

| Fixture run | Mismatches |
|---|---|
| Native Rust replay of 243 calls, ids, order, score bits | 0 |
| Fixture test with wasm as the ranker, 243 calls answered by wasm | 0, both tests pass |

Generated inputs, 10,000 for each function plus edge classes:

| Function and variant | Cases | Id or order mismatches | Score bit mismatches |
|---|---|---|---|
| `tokenRank`, ASCII boundary scan, ASCII text | 5,000 | 0 | 0 |
| `tokenRank`, ASCII boundary scan, non-ASCII text | 5,000 | 0 | 0 |
| `tokenRank`, ASCII boundary scan, lone surrogates | 100 | 0 | 0 |
| `tokenRank`, `regex` crate with `(?-u:\b)`, all text | 10,100 | 0 | 0 |
| `tokenRank`, `regex` crate with default `\b`, ASCII text | 5,000 | 0 | 0 |
| `tokenRank`, `regex` crate with default `\b`, non-ASCII text | 5,000 | 1,576 | 1,725 |
| `cosineRank`, f64 accumulator, finite reals | 6,000 | 0 | 0 |
| `cosineRank`, f64 accumulator, small integers with ties | 4,000 | 0 | 0 |
| `cosineRank`, f64 accumulator, query length differs | 200 | 0 | 0 |
| `cosineRank`, f32 accumulator, finite reals | 6,000 | 0 | 4,879 |
| `cosineRank`, f32 accumulator, small integers with ties | 4,000 | 0 | 0 |
| `cosineRank`, f64 accumulator, NaN or infinity in the input | 500 | 69 | 69, and 139 panics |

The same 20,300 finite cases through the wasm build inside a compiled Bun binary: 0 mismatches. The workflow repeats both runs on five targets. See `s5-cross-build/README.md`.

## Tokenisation

The JavaScript splits the query on `/[^a-z0-9]+/` and counts `\bword\b` with no Unicode flag, so every non-ASCII character is a separator and a boundary. The `regex` crate treats `\b` as Unicode-aware: `é`, `Σ`, `д`, `水`, a combining mark and a fullwidth letter all count as word characters, so `lightΣ` or `light` followed by U+0301 loses the match. The port must use an ASCII boundary. The fixture cannot catch this: its text is ASCII English and the Unicode-aware variant also scored 0 mismatches on it.

Lowercasing: `str::to_lowercase` in Rust 1.96 follows Unicode 17, and `toLowerCase` in Bun 1.3.11 follows Unicode 15.1. Across all 1,112,064 code points, 55 lowercase differently: U+1C89, seven in U+A7CB to U+A7DC, U+10D50 to U+10D65, U+16EA0 to U+16EB8. None maps to or from an ASCII character, so no score changes. 5,000 context strings covering final sigma, `İ` and `ß` agree.

Lone surrogates cannot reach Rust: JSON and `TextEncoder` replace them with U+FFFD. Both sides treat either as a separator, so counts agree.

## Reading

An f64 accumulator matches to the last bit. An f32 accumulator changes score bits on 81% of real-valued inputs and on none of the small-integer inputs, and it changed no order in this sample.

With NaN or infinity in a vector the JavaScript comparator returns NaN and the engine's sort decides the order. Rust's `sort_by` panics on a comparator that is not a total order, in 139 of 500 such cases here. The Rust engine needs a finite-input check before ranking.

`topK` below zero is out of scope: the JavaScript `slice(0, topK)` drops from the end, and the port takes an unsigned count. `rankCanon` never passes one.
