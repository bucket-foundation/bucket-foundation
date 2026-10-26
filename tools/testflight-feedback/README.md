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

The units run the tool from `TOOL_ROOT`, the main checkout by default. Before this branch merges, point both services at the worktree with a drop-in: `systemctl --user edit <unit>` and `Environment=TOOL_ROOT=<worktree>`.
