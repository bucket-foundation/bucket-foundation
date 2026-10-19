# Agents in bkt

Epic bkt-fy3i6, founder initiative 2026-10-19. Builds on bkt-x706v (PR #895: the `bkt wait` shim, `waitDir()` event log, `/local/agents`, the Learn agents strip).

## Outcome
In bkt desktop and the bkt TUI the founder sees every coding agent running on the machine, launches one from Bucket, and talks to a Bucket agent that answers from the canon. The Bucket agent runs on his own API key or on a local model. Nothing leaves the machine with a local model; with a hosted key only the user's messages and open-licence canon passages leave, enforced by the egress policy test.

## Slice 2: more agent CLIs feed the same event log
- Extend the PR #895 shim with a `tool` argument; every source writes the same v1 line.
- Gemini CLI 0.45.0: hooks in `~/.gemini/settings.json` use its own event names. An event map in one module, `wait-events.ts`, is shared by `hook.sh` (generated table), `parseEvent` and `wait-fold.ts`: BeforeAgent→prompt, BeforeTool(matcher subagent tool)→subagent, AfterAgent→stop, Notification→waiting. `AgentTool` and the tool regex widen to `claude|codex|gemini|opencode|aider` together. Per-tool fixture tests from real captured payloads (B1).
- OpenCode 1.17.11: a plugin using `@opencode-ai/plugin` `Hooks.event` on `session.idle` and `session.updated`. The load path is verified first by a spike PR step: a plugin that writes one line, loaded on this machine. If the load path cannot be confirmed, OpenCode is deferred to its own bead; the `opencode serve` fallback is dropped (B7).
- Aider: not installed here; deferred to its own bead until installed and verified (B8).
- Goose, Crush, Continue cli, Qwen Code: listed in `bkt wait status` as "no event source" until each is verified; Qwen Code follows the Gemini path if its settings accept hooks.
- Install merges and backs up every file, refuses to overwrite an existing single-command setting, uninstall removes only marked entries (same rules as #895).

## Slice 3: provider layer
- `packages/bkt/src/llm/` with one interface: `chat(messages, tools, opts) -> stream`. Providers: Anthropic (`@anthropic-ai/sdk`, already a dependency), OpenAI-compatible (covers OpenAI, OpenRouter, Ollama, llama.cpp server, vLLM, LM Studio via base URL), Gemini through its OpenAI-compatible endpoint.
- Keys live in the existing `keyring.ts` service `bucket-bkt`, account `llm:<provider>`. `keyring.ts` gains `set(account, value, {replace:true})` and `delete(account)` on all three backends, with tests, so keys can rotate and be revoked (B2). Keys are read from the keyring at call time and sent only in request headers; never env, argv, files or logs. Provider error bodies pass through `log-guard.ts` and `secret-scan.ts` redaction before display (B5). `bkt llm add <provider>` prompts with hidden input; `bkt llm local` probes `127.0.0.1:11434`, `:8080`, `:8000` for an OpenAI-compatible `/v1/models`.
- Recommended local model: `qwen3:8b`, the model the slice 5 critic run used for tool calls.
- Local status: Ollama's `/v1/models` answers on 127.0.0.1:11434 with 7 models; GPU inference is untested and bkt-s9ey (runner core-dumps) may still apply, so doctor runs one completion and reports CPU or GPU (B9). The layer ships without depending on it; `bkt llm doctor` reports the GPU (AMD RX 7600 8GB via ROCm, or CPU), the runner, and one test completion with tokens per second.
- No usage leaves the machine for a local provider. Hosted calls show provider and model in the panel. Metered spend for hosted keys is the user's own key; Viatika metering applies only to Bucket-paid inference, which this slice does not add.

## Slice 4: agent panel
- bkt-ui: an Agents screen beside Learn listing sessions from `/local/agents` (external CLIs) and Bucket agent chats, with launch buttons for installed CLIs (opens a terminal in the chosen folder through the desktop shell; no embedded PTY in this slice).
- TUI: `bkt agents` (ink) shows the same list and opens a Bucket agent chat.
- Launching a CLI: one new Tauri command `launch_agent(tool, folder)`. `tool` must be in a fixed allowlist of installed CLIs found at startup; `folder` must resolve (realpath) inside a user-approved folder list stored by the sidecar; everything else is rejected. The capabilities file and the lib.rs page-call test extend to exactly this command, with reject tests (B4).
- Bucket agent chat: streaming, cancel, provider and model picker, per-chat folder scope. Chats are stored in their own store `chats.jsonl` (v1: id, provider, model, started, state) separate from the agent event log; `/local/agents` v2 merges both with a `kind` field, and v1 readers keep working (B6).

## Slice 5: canon tools for the Bucket agent
- Tools: `canon_search`, `canon_get_claim`, `cite` from the existing pack (`canon.ts`, `search`), offline first; `bucket_research` only when online and the user enabled it.
- Egress policy (B3): every tool result carries the source licence and tier from the pack. For a hosted provider, results whose licence is not open (CC0, CC BY, CC BY-SA, public domain) or whose source is private (Kruse corpus, Tier-B) are withheld and replaced by title and citation only; local providers get full text. A test asserts no private or closed passage reaches a hosted request body.
- Every answer that states a quantitative claim follows the Math Contract tags.

## Out of scope
Embedded terminals, running external agents inside Bucket's process, remote compute (bkt-v5ay), mobile.

## Acceptance
- Slice 2: one live event from Gemini CLI reaches `/local/agents` on this machine, and the OpenCode spike result is recorded; install and uninstall restore files byte for byte in a scratch HOME.
- Slice 3: provider unit tests with recorded fixtures; a key never appears in logs, files or process args (test); `bkt llm local` finds a running OpenAI-compatible server in a test double; doctor output on this machine recorded in the PR.
- Slice 4: UI tests for list, launch, chat stream and cancel; TUI snapshot tests.
- Slice 5: tool-call tests against the packed canon; answers carry citations.

## Work
Four PRs into dev, one per slice, each with its own bead under bkt-fy3i6 and a critic pass. Order: slice 3 and slice 2 in parallel, then 4, then 5.

## Beads
Each slice gets a child bead under bkt-fy3i6 labelled source-founder (founder asked for this initiative): slice 2 Gemini events, slice 3 providers and keyring rotation, slice 4 panel and launch, slice 5 canon tools and egress. OpenCode and Aider get separate deferred beads.

## Round 2 additions
- R2-1, egress mapping. The pack build adds a column to every evidence row, `licence_kind`, resolved at pack time from `source_path` through the `canon_licences` table (kind to licence). Rows under the Kruse corpus path or tagged Tier-B get `private`. The egress filter reads only this column. A passage with no column value, an unknown kind, or `private` is withheld from hosted providers (fail closed); only CC0, CC BY, CC BY-SA and public domain pass. Tests assert on the hosted request body for an unmapped passage, a Kruse passage, a Tier-B passage, and a `canon_get_claim` call whose evidence expands to mixed rows.
- R2-2, folder approval. Folders join the approved list only through a native folder-picker dialog opened by the Tauri shell from its own menu or a shell-rendered confirm. No page-callable route or command writes the list; the sidecar exposes it read-only. Tests reject a page attempt to write the list, and reject a launch folder that is a symlink pointing outside an approved folder. The list lives in `agent-folders.json`, a 0600 file in the user's state folder; any process running as the same user can edit it, so the approval guards against the page alone.
- R2-3, versioning. The `/local/agents` response keeps every v1 field and adds `v: 2` and `kind` on each row; v1 readers ignore unknown fields. A test parses v2 output with the v1 fold and gets the same external-CLI rows.
- R2-4, what leaves the machine with a hosted key: the user's messages, the agent's tool call arguments (search queries, claim ids) and open-licence passages. The Bucket agent in these slices has no file-reading tool, so folder names and file contents do not leave; adding file tools needs its own bead and egress review.

## Round 3 additions
- R3-1: the same fail-closed licence check applies to `canon_excerpts.text`, with a request-body test.
- R3-2: the new column bumps `canon_pack_version`, with a `syncCanon` migration test; null rows stay withheld.
- R3-3: Gemini matcher and Notification names verified from captured fixtures in slice 2.
- R3-4: test that a failed keyring replace leaves the old key intact.
