# TestFlight Feedback

Pulls TestFlight screenshot feedback and crash submissions for Bucket Foundation and Polingual from the App Store Connect API through the shared client `apple/AppStore/beta_feedback.py --json`. On a machine without Swift the client mints its token from the `EXPO_ASC_*` variables. Each new item becomes a `bd` bead labeled `source-tester`, and one digest goes to Telegram through `agf-tg send`.

State lives in `~/.local/state/bucket-testflight-feedback/`: `state.json` maps feedback ids to beads, `completions.jsonl` logs each run. Set `TESTFLIGHT_STATE_DIR` to move it.

## Run

```bash
set -a; . ~/.derbyfish-secrets/asc-api-key.env; set +a
python3 apple/AppStore/beta_feedback.py
node tools/testflight-feedback/run.mjs --dry-run
node --test tools/testflight-feedback/test.mjs
```

## Install

```bash
cp tools/testflight-feedback/systemd/bucket-testflight-feedback.* ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now bucket-testflight-feedback.timer
```
