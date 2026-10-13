# Canon Explorer Embeddings

`embed.py` embeds the canon timeline, sites and figures with `BAAI/bge-small-en-v1.5` at the revision pinned in the script, then writes `src/data/canon-embeddings.json` and `src/data/canon-embeddings.bin`.

## Committed Vectors Are Canonical

The committed `.bin` is the source of truth. Regenerating on another machine, CPU or torch build can shift float values and change the rank order. Regenerate only when the inputs change, and commit the new pair together.

## Commands

```bash
pip install -r scripts/canon-explorer/requirements.txt
python3 scripts/canon-explorer/embed.py
python3 scripts/canon-explorer/embed.py --check
python3 -m unittest scripts/canon-explorer/test_embed.py
```

`--check` fails when the inputs change, when `rank_version` is stale, or when the rank code changes without a `RANK_VERSION` bump. The rank-source hash covers `rank_order` and `load_vectors`. The unit test recomputes rank from the committed vectors.
