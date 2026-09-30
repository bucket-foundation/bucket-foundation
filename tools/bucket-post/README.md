# bucket-post

Posts research to Bucket from any agent session. Run from the repo root.

```bash
python3 tools/bucket-post/post.py whats-new --title T --summary S --pr N --image fig.png --image-alt A --link "PR N=https://..."
python3 tools/bucket-post/post.py history --title T --summary S
python3 tools/bucket-post/post.py report --title T --summary S --body body.md
```

- `whats-new` prepends a production entry to `data/whats-new.json` and converts the figure to `public/whats-new/<id>.webp`. It shows on /whats-new.
- `history` appends a dated line under Research additions in `HISTORY.md`.
- `report` writes `reports/<date>-<slug>.md`. Quantitative claims follow `docs/agents/MATH-CONTRACT.md`.

Tests: `python3 tools/bucket-post/test_post.py`.
