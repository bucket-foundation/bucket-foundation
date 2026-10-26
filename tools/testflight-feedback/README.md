# TestFlight Feedback

Pulls TestFlight screenshot feedback and crash submissions for Bucket Foundation and Polingual from the App Store Connect API through the shared client `apple/AppStore/beta_feedback.py --json`. On a machine without Swift the client mints its token from the `EXPO_ASC_*` variables. Each new item becomes a `bd` bead labeled `source-tester` with external ref `asc-<feedback id>`. Dedupe checks both the local state and the refs already in `bd`. A second timer sends one digest a day at 09:00 through `agf-tg send`, covering runs since the last digest.

State lives in `~/.local/state/bucket-testflight-feedback/`: `state.json` maps feedback ids to beads, `completions.jsonl` logs each run. Set `TESTFLIGHT_STATE_DIR` to move it.

## Run

```bash
set -a; . ~/.derbyfish-secrets/asc-api-key.env; set +a
python3 apple/AppStore/beta_feedback.py
node tools/testflight-feedback/run.mjs --dry-run
node tools/testflight-feedback/run.mjs --digest --dry-run
node --test tools/testflight-feedback/test.mjs
```

## Install

```bash
cp tools/testflight-feedback/systemd/bucket-testflight-feedback.* ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now bucket-testflight-feedback.timer bucket-testflight-digest.timer
```

The units run the tool from the main checkout (`TOOL_ROOT`, default `~/agfarms/bucket-foundation`), so install them only after this branch reaches the branch that checkout follows. Each run holds a `flock` lock and has a start timeout; one failing item is logged and the rest still file.

Beads carry no tester email and no screenshot URL: the tester is a short SHA-256 hash, screenshots are named by count and feedback id, and emails or links in a comment become `[email]` and `[link]`.
