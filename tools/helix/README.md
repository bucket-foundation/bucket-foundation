# Helix

Plots any time series of prime measures as primes on a helix through time, with interpolation error, forward projection bands and a method card on every chart. Formal core: `lean/BucketMath/Helix.lean`.

## Run

```bash
cd tools/helix
python3 -m helix validate tests/fixtures/series.json
python3 -m helix run tests/fixtures/series.json --horizon 3
python3 -m helix run industries.csv --adapter damodaran --primes Software,Utilities --retrieved 2026-09-28
python3 -m helix run profile-timeline.json --adapter profiles --name "Profile" --slug profile \
  --source-title "Profile builder" --source-url local:profile --retrieved 2026-09-28 --license private
python3 -m helix publish ~/.local/share/bucket-profiles/helix/runs/<stamp>-<slug> --repo ../..
```

Adapters: `series` (`helix.series/v1` JSON, or CSV with a `.meta.json` sidecar), `table` (rows of t, prime, value for topics, work and longtermism), `profiles`, `damodaran` (market-cap share by default, `--measure revenue`), `corpus` (JSON lines of date and tags).

Runs land in `~/.local/share/bucket-profiles/helix/runs/<stamp>-<slug>/` (override with `HELIX_RUNS`). A run over 5 MB, `--mirror`, or `--raw` copies to `gdrive:AGFarms/Nucleus/bucket-foundation/helix/<slug>/<stamp>/` with 3 tries; a failed mirror exits 3.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | ok |
| 2 | input failed validation, error code on stderr |
| 3 | gdrive mirror failed, local run kept |
| 4 | publish refused: protected branch, detached HEAD or dirty tree |

## Publish

`publish` copies `manifest.json` and `chart.svg` into `public/helix/<slug>/<stamp>/` on a clean feature branch and never commits. The author opens a PR into `dev`; the founder reviews the chart and method card and merges.

## Golden Files

`HELIX_REGEN_GOLDEN=1 python3 -m pytest tests/test_render_golden.py` rewrites `tests/golden/`. The SVG comparison runs only on the matplotlib version recorded in `tests/golden/matplotlib.txt`.
