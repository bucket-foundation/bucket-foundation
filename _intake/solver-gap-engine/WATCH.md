# Formal-Conjectures Watch

Bead bkt-tafw. `watch.py` compares two commits of a formal-conjectures clone and stages one What's New generation for each problem whose tag moved from open to solved.

## Scheduling

The repo ships the script and this page. It installs no systemd unit, no timer and no cloud routine, and nothing in the repo runs `watch.py`. A person runs it by hand. A schedule needs the founder's word and its own bead.

## Run

```bash
git clone --bare https://github.com/google-deepmind/formal-conjectures fc-history.git
python3 watch.py --repo fc-history.git --state watch/state.json --outbox watch/outbox
```

The first run records the upstream head in the state file and stages nothing. The fetch is `refs/heads/*:refs/heads/*` with no force, so it fast-forwards the clone's branches and fails with git's error when upstream rewrote one; point `--repo` at a bare clone kept for this script. Each later run fetches, diffs the recorded commit against the new head, and writes `fc-solved-<name>-<hash>.json` into the outbox for each newly solved problem.

| Flag | Effect |
|---|---|
| `--since <commit>` | Diff from this commit and ignore the one in the state file |
| `--no-fetch` | Skip the fetch and diff against the clone as it stands |
| `--publish` | Post staged entries to What's New when both settings are present |

## Staged Entry

Each file is a `generation` in state `candidate` with `machine_generated` set. The claim quotes the docstring the problem carried while tagged open. The score is 1 when the upstream tag carries a `formal_proof` link and 0 otherwise; the script reads no proof. Evidence links the upstream commit that flipped the tag and the file at the new head.

## Posting

Staging is the default, and the environment alone never posts. The script posts only when `--publish` is passed and `BUCKET_WHATS_NEW_URL` and `BUCKET_WHATS_NEW_TOKEN` are both set; with the flag and a missing setting it prints a warning and stages. What's New is a public page, so `--publish` is a person's decision for each run. A posted file gains `posted_at`. A failed post gains `post_error`, the run exits 1, and the state stays at the old commit so the next run retries.

A rerun over the same range leaves staged files untouched, so one problem yields one entry.

## Tests

```bash
python3 -m unittest _intake/solver-gap-engine/tests/test_watch.py
```

The tests build a two-commit fixture clone, run the script with no network, and check the first-run, staging and rerun paths, that settings without `--publish` never post, and that the fetch carries no force.
