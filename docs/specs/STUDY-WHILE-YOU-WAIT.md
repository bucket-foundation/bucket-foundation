# Study while you wait

Founder idea, 2026-10-19. When the founder hands work to Claude Code or Codex and waits, Bucket sends one desktop notification ("Agents are running. Open Bucket and study while you wait"). Bucket is already open in the background; the notification has an Open action that raises it on the Learn screen. Inside Bucket, a panel lists active agents and sessions and marks each one done when it returns, with a second notification ("Done: <project>") that opens Bucket on the agents strip.

## User flow
1. Founder submits a prompt in Claude Code, or a Claude Code session launches subagents, or Codex starts a turn.
2. Within 2s: one notification "Study while you wait" with actions Open Bucket and Mute 1h. Rate limit: at most one per 10 min across all sessions; none when a Bucket window is focused.
3. Bucket Learn shows a "Your agents" strip: session, project folder, tool (Claude or Codex), state (running, waiting on you, done), elapsed time, subagent count.
4. When the turn ends (Claude Stop, Codex agent-turn-complete) or Claude needs input (Notification hook, permission prompt): notification "Claude is waiting for you: <project>" or "Done: <project>"; the strip row flips state. Study state is saved first, so returning loses nothing.

## Mechanism

### Hook shim
- `bkt-wait-hook`, a POSIX sh script installed to `~/.local/share/bkt/bkt-wait-hook` (W-H1). It reads stdin into one JSON line with `head -c 65536`, extracts `session_id`, `hook_event_name`, `cwd` with a fixed `sed` pattern (no jq dependency), and appends one line `{"v":1,"ts":..,"tool":"claude","session":..,"event":..,"project":basename(cwd)}` with a single `printf >> file`. The line is capped at 512 bytes, under PIPE_BUF, so O_APPEND writes from parallel hooks do not interleave. Then it runs `setsid bkt-wait-notify >/dev/null 2>&1 </dev/null &` and exits 0 with empty stdout and stderr (W-N1). Every error path exits 0. The project name is reduced to `[A-Za-z0-9._ -]` and capped at 48 chars before it enters the JSON line, and any line that fails a strict shape check is dropped (W-N3).
- Tests: empty stdout for every event; quotes, backslashes and non-ASCII characters in cwd still produce valid JSON.
- Acceptance: p95 under 100ms over 200 cold runs on this machine (`hyperfine --prepare 'sync; echo 3 | sudo tee /proc/sys/vm/drop_caches'` when sudo is available, otherwise warm runs plus a note).

### Claude events
- Installed hooks: `UserPromptSubmit`, `PreToolUse` with matcher `Task` (Claude Code's subagent tool; `Agent` is added only if `claude` 2.1.303 lists it, checked at install from the transcript tool names), `SubagentStop`, `Stop`, `SessionEnd`, and `Notification` (matchers `permission_prompt` and `idle_prompt`).
- `idle_prompt` fires after about 60s, so "waiting for you" is late by design (W-M4). The `Stop` notification covers the common case.
- Install verifies the stdin keys on the first live event and records "verified" in `bkt wait status`.

### Codex events
- `notify = ["~/.local/share/bkt/bkt-wait-hook", "codex"]`. The shim takes the event JSON from the last argv; payload keys are verified on the first live event and shown in status, as with Claude (W-M3): `agent-turn-complete` marks done, `approval-requested` marks waiting.
- Turn start comes from the `UserPromptSubmit`-equivalent where Codex offers one. Otherwise Codex rows show only "done" and "waiting", and the plan claims no start notification for Codex (W-M3).
- No chat-sources scanning, so the Import consent toggles are untouched.
- Install refuses to replace an existing `notify` value; it prints the value and asks the user to merge. Uninstall restores the saved prior value.

### Notifier
- `bkt-wait-notify`, a second sh script. It is installed with the absolute paths of `notify-send` and the Bucket launcher recorded at install time from `selfArgv` (W-N5). It holds the 10-minute rate-limit stamp, which applies only to the "study while you wait" notification; done and waiting notifications are capped at one per session state change. and the mute stamp in `$XDG_STATE_HOME/bkt/`, taken with `flock` on `wait.lock` so parallel hooks send at most one notification (W-M2).
- It suppresses only when `focus.json` (written by the UI, see below) is fresher than 5s and says focused. A stale or missing report means it sends (fail open, W-H3).
- `notify-send -A open="Open Bucket" -A mute="Mute 1h"`. Open runs `xdg-open bucket://learn`. `lib.rs` `route_in` gains a `bucket://learn` branch beside `bucket://quiz/`, so a second launch routes the running window to Learn (W-H2). The Rust unit test covers `route_in`, and a packaged-AppImage check covers the path from second launch to Learn. Arguments are passed after `--`, and markup is stripped from the project name (W-N3).

### Store
- `$XDG_STATE_HOME/bkt/agents.jsonl` with mode 0600. The shim, the notifier and the sidecar all resolve the same directory through the one helper `waitDir()` = `$XDG_STATE_HOME/bkt`, which falls back to `~/.local/state/bkt` and versioned lines (`v:1`).
- Rotation happens only inside the notifier under the flock: rename at 1 MB, keep one old file.
- Readers skip torn or unparsable lines.
- No prompt text, transcript content or full paths are stored.

### Sidecar and UI
- New route `GET /local/agents` behind the existing nonce, bearer token and peer-uid guard in `serve.ts` (W-M1).
- It returns `{v:1, sessions:[{tool, session, project, state: running|waiting|done, since, subagents}]}` folded from the JSONL. It drops sessions idle for 30 minutes, keeps done rows for 10 minutes, and caps the list at 20.
- `POST /local/focus {focused, visible}` lets the UI write `focus.json`.
- bkt-ui Learn adds a "Your agents" strip that polls every 3s while visible and stops when hidden, and reports focus on focus, blur and visibilitychange, and sends a heartbeat every 2s while focused (W-N2). Tests cover a fresh focused report, which suppresses, and a stale one, which sends.

### Commands
- `bkt wait install` backs up `settings.json` and merges matcher groups into the existing hooks object, marking each added entry with the shim path. It is idempotent.
- `bkt wait uninstall` removes only the entries that point at the shim and restores the Codex `notify` value.
- `bkt wait status` shows hook state, whether each source is verified, and the last 5 events.
- The feature is off by default. The Learn strip offers "Turn on", which shows the consent text and then runs install.

## Scope
Linux first (notify-send, the founder's machine), matching the existing quiz notifier. macOS and Windows print the same unsupported message as `bkt quiz`. Web bucket.foundation is out of scope: agent state stays on the machine.

## Acceptance
- `bkt wait install` adds hooks idempotently; running twice yields one copy; uninstall restores the backup diff exactly.
- Hook timing test (p95 under 100ms) and a concurrency test (50 parallel shim runs produce 50 intact lines and 1 notification).
- Unit tests: event fold (start, subagent, stop, notification, idle drop-out), rate limit, focus suppression, hook exits 0 on malformed stdin within 100ms, Codex argv parse.
- Manual e2e on this machine: submit a Claude prompt, see the notification within 2s, Open raises Bucket Learn with the strip showing the session as running; Stop flips it to done with a second notification. Same for one Codex turn.
- Privacy: test asserts no prompt text or transcript content reaches agents.jsonl or a notification.

## Beads and branch
Bead first (source-founder). Branch feat/bkt-wait from dev in a worktree under ~/agfarms/.wt-bkt-wait; PR into dev; critic on plan and PR.

## Round 3 additions
- W-R1: Open first checks `xdg-mime query default x-scheme-handler/bucket`. If no handler is registered, it falls back to the absolute launcher with `app --route /learn`.
- W-R2: install writes the absolute shim path into the Codex `notify` array. No `~`.
- W-R3: the notifier keeps two stamps, `study.stamp` for the 10-minute limit and `mute.stamp` for Mute 1h. Both live in `waitDir()` under `wait.lock`.
- W-R4: when sanitization blanks a project name, the label becomes `project-<first 6 hex of sha1(cwd)>`.
