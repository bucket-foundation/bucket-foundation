# Canon Connections — synthesis layer

The seven-branch grid is the entry-point. The actual structure of canon is
in this folder.

## Reading order

1. **[BRIDGES.md](BRIDGES.md)** — raw FTS data: per-branch totals, bridge-concept
   mass, author cross-branch presence. The numbers.

2. **[META-CANON.md](META-CANON.md)** — interpretive layer answering "what does
   the bridge data mean?". The four primary axes (time, light, information,
   energy), the cleanest fusion (Noether/symmetry), and the next-ingestion
   priorities.

3. **[COAUTHOR-MATRIX.md](COAUTHOR-MATRIX.md)** — canon-author collaboration
   graph from the OpenAlex publication records of 62 canon-target authors.
   Shows actual lineages: Marino+Becker (29 shared papers), Penrose+Hameroff
   (15), Rovelli+Smolin (12), Penrose+Hawking (11), Husserl+Heidegger (4),
   Darwin+Wallace (4), Pauling+Szent-Györgyi (2), Faraday+Lavoisier (2), etc.

4. **[../../bucket-canon/_bridges/INDEX.md](../../bucket-canon/_bridges/INDEX.md)**
   — the structured bridge entries, one per primary axis + secondary bridge.
   Each: branches it touches, primary sources, derivation status.

## Structured outputs

- `connections.json` — bridges + author cross-branch presence (machine-readable)
- `coauthor.json` — collaboration pairs (machine-readable)

## Web layer

- `/canon/bridges` — index of the 10 bridge entries (live, force-static SSG)
- `/canon/bridges/[slug]` — individual bridge page

## Re-running

When new ingestion lands and FTS rebuilds, re-run the synthesis:
```bash
agf-canon-connections bucket-foundation
agf-coauthor-matrix bucket-foundation
```

Both write under this folder.

## Why this matters

Canon is held in branches for navigation, but the actual *thesis* of Bucket
is that **AI + foundations + a small number of brilliant humans = the next
layer of reality**. That thesis works only if foundations cohere across
branches — i.e., if the bridges are real. The synthesis layer is where that
coherence is checked, made visible, and if it fails, where the failures
become apparent.

The current state: 4 primary axes spanning 10/10 branches with 800+ FTS hits
each, plus a handful of cleanly-derivable fusions (Noether's theorem being
the cleanest). That is enough evidence that the underlying weave is real.
The map can now be elaborated.
