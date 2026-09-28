# Nearest Neighbors in PCA Space

Bead `bkt-5g0x`. Every observation already has a PCA score vector s_i = x_i V_kᵀ from the prime-directions fit, so closeness needs no embedding model: the distance between observations i and j is ‖s_i − s_j‖₂. With orthonormal V_k this equals the distance between their rank-k reconstructions, ‖x̂_i − x̂_j‖₂.

## Function

`prime_directions.neighbors.neighbors(space, query, k, scope, index=None)` returns the k closest observations with exact distances.

| Scope | Candidates | Use |
|---|---|---|
| `local` | same canon cluster as the query | quiz on the query's own canon |
| `global` | every observation | idea neighbors |
| `cross` | every other canon cluster | quiz on cross-connecting ideas, bridge candidates |

`space.graph_space()` builds the space over the public Bucket graph with canon labels; `space.corpus_space(name)` does the same for a registry corpus. Advisor matching reads a CSV with one row per advisor and numeric columns: `advisor_space` standardizes the columns and fits a PCA, and `match_advisors` projects a student profile into the same space and returns the closest advisors.

```bash
python3 -m prime_directions neighbors --node academy-02-physics-waves --scope cross --k 5
python3 -m prime_directions neighbors --corpus 80k --doc <url> --scope local
python3 -m prime_directions neighbors --csv advisors.csv --profile '{"ml": 9, "bio": 2}' --k 5
python3 -m prime_directions neighbors-bench --out out/bench
```

## Research

| Method | Idea | Source |
|---|---|---|
| Brute force | one matrix product, then a partial sort; exact | baseline |
| KD-tree | axis-aligned space partition; expected log-time queries in low dimension | Bentley, CACM 18(9), 1975; Friedman, Bentley and Finkel, ACM TOMS 3(3), 1977 |
| Curse of dimensionality | tree and partition methods degrade toward a linear scan once dimension passes roughly 10 to 20 | Weber, Schek and Blott, VLDB 1998; Beyer et al., ICDT 1999 |
| LSH | hash so near points collide; sublinear approximate search with guarantees | Indyk and Motwani, STOC 1998 |
| HNSW | layered proximity graphs searched greedily from the top layer; the recall and latency leader on public benchmarks | Malkov and Yashunin, IEEE TPAMI 42(4), 2020, arXiv:1603.09320 |
| Product quantization | split vectors into subspaces and code each with a small codebook; compressed distances for billion-scale sets | Jégou, Douze and Schmid, IEEE TPAMI 33(1), 2011 |
| FAISS | library of flat, IVF, PQ and HNSW indexes on CPU and GPU | Johnson, Douze and Jégou, IEEE Trans. Big Data 7(3), 2021, arXiv:1702.08734 |
| pgvector | Postgres extension with exact scan, IVFFlat and HNSW indexes inside the database | github.com/pgvector/pgvector |
| Benchmarks | shared test suite for recall against queries per second | Aumüller, Bernhardsson and Faithfull, Information Systems 87, 2020 |

## Benchmark

One query thread, k = 10, 500 queries drawn from the data, run on 2026-09-28 on this machine: 16 CPU threads, load average 5 to 9 for the first table and near 22 for the second. Latency is the median of three passes of single queries, over 500 queries for the in-process backends and the first 100 for pgvector; batch is the per-query time of one 500-query call, which pgvector runs as the same per-row SQL loop. The pgvector index lives in a temporary table inside one transaction that `close()` rolls back, so a benchmark leaves nothing in the database. Tie-aware recall counts a returned neighbor as correct when its distance is within 1e-6 of the tenth true distance; the graph has 23 duplicate score vectors, so ID recall reads below 1 for exact methods there.

| Data | Backend | Build ms | Query µs | Batch µs | Recall | Tie-aware |
|---|---|---:|---:|---:|---:|---:|
| graph, 1,669 x 12 | brute | 0.14 | 32.5 | 22.1 | 1.000 | 1.000 |
| graph, 1,669 x 12 | KD-tree | 0.34 | 19.9 | 9.4 | 0.997 | 1.000 |
| graph, 1,669 x 12 | HNSW | 22.3 | 14.3 | 9.2 | 0.999 | 1.000 |
| graph, 1,669 x 12 | pgvector HNSW | 160 | 317 | 231 | 0.998 | 0.999 |
| 80k, 5,988 x 12 | brute | 0.19 | 73.8 | 59.8 | 1.000 | 1.000 |
| 80k, 5,988 x 12 | KD-tree | 1.28 | 33.0 | 20.4 | 1.000 | 1.000 |
| 80k, 5,988 x 12 | HNSW | 74.6 | 23.4 | 15.4 | 1.000 | 1.000 |
| 80k, 5,988 x 12 | pgvector HNSW | 596 | 307 | 299 | 1.000 | 1.000 |
| 80k, 5,988 x 64 | brute | 0.73 | 114 | 64.4 | 1.000 | 1.000 |
| 80k, 5,988 x 64 | KD-tree | 2.78 | 253 | 220 | 1.000 | 1.000 |
| 80k, 5,988 x 64 | HNSW | 84.9 | 29.3 | 23.7 | 0.999 | 0.999 |
| 80k, 5,988 x 64 | pgvector HNSW | 773 | 473 | 415 | 0.999 | 0.999 |

| Data | Backend | Build ms | Query µs | Batch µs | Recall |
|---|---|---:|---:|---:|---:|
| synthetic, 1,000,000 x 12 | brute | 463 | 14,535 | 48,740 | 1.000 |
| synthetic, 1,000,000 x 12 | KD-tree | 664 | 927 | 875 | 1.000 |
| synthetic, 1,000,000 x 12 | HNSW, 16 build threads | 92,679 | 154 | 97 | 1.000 |
| synthetic, 1,000,000 x 64 | brute | 273 | 145,216 | 170,875 | 1.000 |
| synthetic, 1,000,000 x 64 | KD-tree | 8,996 | 72,847 | 66,176 | 1.000 |
| synthetic, 1,000,000 x 64 | HNSW, 16 build threads | 412,803 | 1,483 | 904 | 0.967 |

The synthetic sets are 24 Gaussian clusters. pgvector was skipped above 200,000 rows. The 64-dimension rows ran under a load average near 40 and read as upper bounds.

## Choice

At Bucket's size today, every method answers under a third of a millisecond, and brute force is exact with no build. For 12 components, the KD-tree stays exact and answers a million rows in under a millisecond after a build under one second. At 64 components the KD-tree falls behind brute force on the 80k set, the effect Weber et al. describe, and HNSW is the method that stays fast, at 0.967 recall on a million rows with the default `efSearch` of 64. pgvector adds 0.3 ms of round trip per query and keeps the index next to the graph tables, which suits a server route. The module defaults to exact search and takes any index through the `index` argument for the global scope; local and cross scopes filter candidates and scan them exactly.
