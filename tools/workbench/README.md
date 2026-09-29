# Workbench

One registry for every Research OS tool, served to the app at `/research-os/workbench` and to agents over the Bucket MCP server. Registry: `registry.json`. Plan: bead bkt-ya07.

## Run

```bash
cd tools/workbench
python3 -m workbench tools
python3 -m workbench token issue --user you@example.org --scopes read,local --ttl 7
python3 -m workbench token rotate <id>
python3 -m workbench token revoke <id>
WORKBENCH_SIGNING_KEYS=<32+ characters> python3 -m workbench serve
```

The MCP server (`mcp-server/bucket-mcp.py`) reads `BUCKET_WORKBENCH_TOKEN`. With no token it offers read tools only. Cadence tools appear with the `cadence_` prefix when `CADENCE_MCP_BIN` points at `cadence_mcp`.

## Access

| Scope | Who |
|-------|-----|
| read | anyone on this machine |
| local | staff: `RESEARCH_OS_REVIEWER_EMAILS` |
| personal | staff on their own data; the founder for anyone |
| gdrive, repo | the founder: `BUCKET_FOUNDER_EMAIL` |

The app route signs each call with the first key in `WORKBENCH_SIGNING_KEYS`; the service accepts any listed key, so a new key goes first and the old one leaves after a deploy. Signed calls expire after 60 seconds and a nonce is accepted once.

Rate limits per user a minute: 60 read, 10 write, 2 gdrive or repo. Four runs at once, two per user, one per visual, prime-directions or BucketMath group, and a queue of 20. Every call lands in `~/.local/share/bucket-profiles/workbench/audit.jsonl`.

## Outputs

Each run writes `call.json`, `stdout.txt`, `stderr.txt`, `result.json` and the tool's files to `~/.local/share/bucket-profiles/<user>/workbench/<group>/<stamp>-<tool>-<run>/`. Runs never overwrite.

## Tests

`python3 -m pytest -q tests`. `WORKBENCH_HELP_CHECK=1` also runs `--help` on every live CLI tool, which needs each tool's dependencies.
