import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServe } from "../src/serve";
import { foldAgents, parseEvent } from "../src/wait-fold";
import { writeAtomic, agentsBody, codexNotifyLine, GEMINI_HOOK_NAME, hookPath, mergeCodex, renderHook, renderNotify, waitCommand, waitDir, waitInstall, waitRoutes, waitStatus, waitUninstall, writeFocus, type WaitDeps } from "../src/wait";
import { AGENT_TOOLS, EVENT_KINDS, GEMINI_HOOKS, GEMINI_SUBAGENT_TOOL, NOTIFY_TYPES } from "../src/wait-events";

const roots: string[] = [];
afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

function scratch() {
  const home = mkdtempSync(join(process.env.BKT_WAIT_TMP ?? tmpdir(), "bkt-wait-"));
  roots.push(home);
  const env = { HOME: home, XDG_STATE_HOME: join(home, "state"), XDG_DATA_HOME: join(home, "share"), PATH: process.env.PATH };
  const sent = join(home, "sent.log");
  const fake = join(home, "fake-notify-send");
  writeFileSync(fake, `#!/bin/sh\nfor a in "$@"; do printf '%s\\t' "$a"; done >> ${JSON.stringify(sent)}\necho >> ${JSON.stringify(sent)}\n[ -n "$FAKE_CHOICE" ] && echo "$FAKE_CHOICE"\nexit 0\n`);
  chmodSync(fake, 0o755);
  const lines: string[] = [];
  const d: WaitDeps = { os: "linux", home, env, self: ["/opt/bucket/Bucket.AppImage"], notifySend: fake, out: (l) => lines.push(l) };
  const hook = join(home, "hook.sh");
  const notify = join(home, "notify.sh");
  writeFileSync(notify, renderNotify(fake, d.self));
  writeFileSync(hook, renderHook(notify));
  chmodSync(notify, 0o755);
  chmodSync(hook, 0o755);
  const state = waitDir(env, home);
  const log = () => (existsSync(join(state, "agents.jsonl")) ? readFileSync(join(state, "agents.jsonl"), "utf8") : "");
  const sentLines = () => (existsSync(sent) ? readFileSync(sent, "utf8").split("\n").filter(Boolean) : []);
  return { home, env, d, lines, hook, notify, state, log, sentLines, sent };
}

type S = ReturnType<typeof scratch>;

function run(s: S, input: string, args: string[] = ["claude"], extra: Record<string, string> = {}) {
  const t = performance.now();
  const p = Bun.spawnSync(["sh", s.hook, ...args], { stdin: new TextEncoder().encode(input), env: { ...s.env, ...extra } });
  return { ms: performance.now() - t, code: p.exitCode, stdout: p.stdout.toString(), stderr: p.stderr.toString() };
}

const claude = (event: string, session = "s-1", cwd = "/w/u/proj", more: Record<string, unknown> = {}) => JSON.stringify({ session_id: session, transcript_path: "/w/u/.claude/projects/x.jsonl", cwd, hook_event_name: event, ...more });

async function settle(s: S, count: number, ms = 3000) {
  const end = Date.now() + ms;
  while (Date.now() < end && s.sentLines().length < count) await Bun.sleep(25);
  await Bun.sleep(150);
}

describe("hook shim", () => {
  test("writes one line per event with empty stdout and stderr", () => {
    const s = scratch();
    for (const e of ["UserPromptSubmit", "PreToolUse", "SubagentStop", "Stop", "SessionEnd", "Notification"]) {
      const r = run(s, claude(e));
      expect([r.code, r.stdout, r.stderr]).toEqual([0, "", ""]);
    }
    const rows = s.log().trim().split("\n").map(parseEvent);
    expect(rows.map((r) => r?.event)).toEqual(["UserPromptSubmit", "PreToolUse", "SubagentStop", "Stop", "SessionEnd", "Notification"]);
    expect(rows.every((r) => r?.project === "proj" && r.tool === "claude" && r.session === "s-1")).toBe(true);
  });

  test("quotes, backslashes and non-ASCII in cwd still give a valid line", () => {
    const s = scratch();
    for (const cwd of ['/w/u/my "q" pr\\oj é', "/w/u/日本語", "/x/a'b`$(rm -rf ~)", "/x/<b>bold</b>"]) run(s, claude("Stop", "s-2", cwd));
    const rows = s.log().trim().split("\n");
    expect(rows.length).toBe(4);
    for (const r of rows) expect(parseEvent(r)).not.toBeNull();
    const names = rows.map((r) => parseEvent(r)!.project);
    expect(names[0]).toBe("my q proj");
    expect(names[1]).toMatch(/^project-[0-9a-f]{6}$/);
    expect(names[3]).not.toContain("<");
  });

  test("exits 0 fast on malformed stdin and writes nothing", () => {
    const s = scratch();
    for (const bad of ["", "not json", "{", '{"hook_event_name":"Stop"}', '{"session_id":"x","hook_event_name":"Evil"}', "\x00\xff".repeat(40000)]) {
      const r = run(s, bad);
      expect([r.code, r.stdout, r.stderr]).toEqual([0, "", ""]);
      expect(r.ms).toBeLessThan(100);
    }
    expect(s.log()).toBe("");
  });

  test("reads the Codex event from the last argument", () => {
    const s = scratch();
    run(s, "", ["codex", JSON.stringify({ type: "agent-turn-complete", "thread-id": "th-9", "turn-id": "t1", cwd: "/w/codexproj", "input-messages": ["hi"], "last-assistant-message": "ok" })]);
    run(s, "", ["codex", JSON.stringify({ type: "approval-requested", "thread-id": "th-9", cwd: "/w/codexproj" })]);
    const rows = s.log().trim().split("\n").map(parseEvent);
    expect(rows.map((r) => [r?.tool, r?.session, r?.event, r?.project])).toEqual([
      ["codex", "th-9", "agent-turn-complete", "codexproj"],
      ["codex", "th-9", "approval-requested", "codexproj"],
    ]);
  });

  test("keeps prompt text and transcript content out of the log and the notification", async () => {
    const s = scratch();
    const secret = "SECRET-PROMPT-7f3a";
    run(s, claude("UserPromptSubmit", "s-p", "/w/u/proj", { prompt: `${secret} "cwd":"/leak/${secret}"` }));
    run(s, claude("Stop", "s-p", "/w/u/proj", { last_assistant_message: secret, transcript: secret }));
    run(s, "", ["codex", JSON.stringify({ type: "agent-turn-complete", "thread-id": "c-p", cwd: "/w/x", "input-messages": [secret], "last-assistant-message": secret })]);
    await settle(s, 3);
    expect(s.log()).not.toContain(secret);
    expect(s.log()).not.toContain("/w/u");
    expect(s.log()).not.toContain(".claude");
    expect(s.sentLines().length).toBeGreaterThan(0);
    expect(s.sentLines().join("\n")).not.toContain(secret);
  });

  test("p95 under 100ms over 200 runs", () => {
    const s = scratch();
    const times: number[] = [];
    for (let i = 0; i < 200; i++) times.push(run(s, claude("SubagentStop", `t-${i}`)).ms);
    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    console.log(`bkt wait hook p95 ${p95.toFixed(1)}ms, median ${times[100].toFixed(1)}ms over 200 warm runs`);
    expect(p95).toBeLessThan(100);
  });

  test("50 parallel runs give 50 intact lines and one notification", async () => {
    const s = scratch();
    const procs = Array.from({ length: 50 }, (_, i) => Bun.spawn(["sh", s.hook, "claude"], { stdin: new TextEncoder().encode(claude("UserPromptSubmit", `par-${i}`, `/w/u/project-number-${i}-${"x".repeat(30)}`)), env: s.env }));
    await Promise.all(procs.map((p) => p.exited));
    await settle(s, 1);
    await Bun.sleep(500);
    const rows = s.log().split("\n").filter(Boolean);
    expect(rows.length).toBe(50);
    expect(rows.every((r) => parseEvent(r) !== null)).toBe(true);
    expect(new Set(rows.map((r) => parseEvent(r)!.session)).size).toBe(50);
    expect(s.sentLines().length).toBe(1);
    expect(s.sentLines()[0]).toContain("Study while you wait");
  });
});

describe("notifier", () => {
  const fire = (s: S, event: string, session = "n-1", extra: Record<string, string> = {}) => Bun.spawnSync(["sh", s.notify, "claude", session, event, "proj"], { env: { ...s.env, ...extra } });

  const perm = (s: S, type: string, session = "n-1") => Bun.spawnSync(["sh", s.notify, "claude", session, "Notification", "proj", type], { env: s.env });

  test("sends the study notification once per 10 minutes", () => {
    const s = scratch();
    fire(s, "UserPromptSubmit", "a");
    fire(s, "UserPromptSubmit", "b");
    fire(s, "PreToolUse", "c");
    expect(s.sentLines().length).toBe(1);
    expect(s.sentLines()[0]).toContain("Mute 1h");
    writeFileSync(join(s.state, "study.stamp"), String(Math.floor(Date.now() / 1000) - 601));
    fire(s, "UserPromptSubmit", "d");
    expect(s.sentLines().length).toBe(2);
  });

  test("sends done and waiting once per session state change", () => {
    const s = scratch();
    fire(s, "Stop");
    fire(s, "SessionEnd");
    fire(s, "UserPromptSubmit");
    perm(s, "permission_prompt");
    perm(s, "permission_prompt");
    fire(s, "Stop");
    const titles = s.sentLines().map((l) => l.split("\t").at(-3));
    expect(titles).toEqual(["Done: proj", "Study while you wait", "Claude is waiting for you: proj", "Done: proj"]);
  });

  test("idle_prompt after Stop neither flips nor notifies", () => {
    const s = scratch();
    fire(s, "Stop");
    perm(s, "idle_prompt");
    perm(s, "permission_prompt");
    expect(s.sentLines().length).toBe(1);
    fire(s, "UserPromptSubmit", "n-2");
    perm(s, "idle_prompt", "n-2");
    expect(s.sentLines().map((l) => l.split("\t").at(-3))).toEqual(["Done: proj", "Study while you wait"]);
  });

  test("a fresh focused report suppresses and a stale one sends", () => {
    const s = scratch();
    writeFocus(s.state, true, true, Date.now());
    fire(s, "Stop", "f-1");
    expect(s.sentLines().length).toBe(0);
    writeFocus(s.state, true, true, Date.now() - 6000);
    fire(s, "Stop", "f-2");
    expect(s.sentLines().length).toBe(1);
    writeFocus(s.state, false, true, Date.now());
    fire(s, "Stop", "f-3");
    expect(s.sentLines().length).toBe(2);
  });

  test("Mute 1h silences later notifications", () => {
    const s = scratch();
    fire(s, "UserPromptSubmit", "m-1", { FAKE_CHOICE: "mute" });
    const until = Number(readFileSync(join(s.state, "mute.stamp"), "utf8"));
    expect(until - Date.now() / 1000).toBeGreaterThan(3500);
    fire(s, "Stop", "m-2");
    expect(s.sentLines().length).toBe(1);
  });

  test("Open falls back to the launcher when no bucket handler is registered", () => {
    const s = scratch();
    const bin = join(s.home, "bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "xdg-mime"), "#!/bin/sh\nexit 0\n");
    chmodSync(join(bin, "xdg-mime"), 0o755);
    const notify = join(s.home, "notify-launch.sh");
    const launched = join(s.home, "launched");
    const launcher = join(s.home, "launcher");
    writeFileSync(launcher, `#!/bin/sh\necho "$@" > ${JSON.stringify(launched)}\n`);
    chmodSync(launcher, 0o755);
    writeFileSync(notify, renderNotify(s.d.notifySend!, [launcher]));
    Bun.spawnSync(["sh", notify, "claude", "o-1", "Stop", "proj"], { env: { ...s.env, PATH: `${bin}:${s.env.PATH}`, FAKE_CHOICE: "open" } });
    expect(readFileSync(launched, "utf8").trim()).toBe("app --route /learn");
  });

  test("rotates the log at 1 MB", () => {
    const s = scratch();
    mkdirSync(s.state, { recursive: true });
    writeFileSync(join(s.state, "agents.jsonl"), "x".repeat(1048577));
    fire(s, "Stop", "r-1");
    expect(existsSync(join(s.state, "agents.jsonl.1"))).toBe(true);
    expect(existsSync(join(s.state, "agents.jsonl"))).toBe(false);
  });
});

describe("fold", () => {
  const line = (ts: number, event: string, session = "s", tool = "claude") => JSON.stringify({ v: 1, ts, tool, session, event, project: "p" });

  test("start, subagents, stop and notification", () => {
    const t = 1_000_000;
    const text = [line(t, "UserPromptSubmit"), line(t + 1, "PreToolUse"), line(t + 2, "PreToolUse"), line(t + 3, "SubagentStop"), "torn{", line(t + 4, "Notification")].join("\n");
    expect(foldAgents(text, t + 5)).toEqual([{ tool: "claude", session: "s", project: "p", state: "waiting", since: t + 4, subagents: 1 }]);
    expect(foldAgents(`${text}\n${line(t + 9, "Stop")}`, t + 10)[0]).toMatchObject({ state: "done", since: t + 9, subagents: 0 });
  });

  test("a Notification after Stop keeps the session done", () => {
    const t = 1_000_000;
    const rows = foldAgents([line(t, "UserPromptSubmit"), line(t + 1, "Stop"), line(t + 70, "Notification")].join("\n"), t + 80);
    expect(rows[0]).toMatchObject({ state: "done", since: t + 1 });
  });

  test("drops idle sessions after 30 minutes and done rows after 10", () => {
    const t = 1_000_000;
    expect(foldAgents(line(t, "UserPromptSubmit"), t + 1799)).toHaveLength(1);
    expect(foldAgents(line(t, "UserPromptSubmit"), t + 1800)).toHaveLength(0);
    expect(foldAgents(line(t, "Stop"), t + 599)).toHaveLength(1);
    expect(foldAgents(line(t, "Stop"), t + 600)).toHaveLength(0);
  });

  test("caps the list at 20 and rejects off-shape lines", () => {
    const t = 1_000_000;
    const text = Array.from({ length: 30 }, (_, i) => line(t + i, "UserPromptSubmit", `s${i}`)).join("\n");
    const rows = foldAgents(text, t + 40);
    expect(rows).toHaveLength(20);
    expect(rows[0].session).toBe("s29");
    expect(parseEvent('{"v":1,"ts":1,"tool":"claude","session":"s","event":"Stop","project":"p","prompt":"x"}')).toBeNull();
    expect(parseEvent(line(1, "Evil"))).toBeNull();
  });
});

describe("install", () => {
  const ORIGINAL = `{\n    "model": "opus",\n    "hooks": {\n        "Stop": [{ "hooks": [{ "type": "command", "command": "echo mine" }] }]\n    }\n}\n`;

  test("adds hooks once, and uninstall restores the original bytes", async () => {
    const s = scratch();
    mkdirSync(join(s.home, ".claude"));
    mkdirSync(join(s.home, ".codex"));
    writeFileSync(join(s.home, ".claude", "settings.json"), ORIGINAL);
    writeFileSync(join(s.home, ".codex", "config.toml"), 'model = "o4"\n[profiles.x]\nnotify = "nested"\n');
    expect(await waitInstall(s.d)).toBe(0);
    const once = readFileSync(join(s.home, ".claude", "settings.json"), "utf8");
    expect(await waitInstall(s.d)).toBe(0);
    expect(readFileSync(join(s.home, ".claude", "settings.json"), "utf8")).toBe(once);
    const settings = JSON.parse(once);
    expect(settings.model).toBe("opus");
    expect(settings.hooks.Stop).toHaveLength(2);
    expect(settings.hooks.Stop[0].hooks[0].command).toBe("echo mine");
    expect(settings.hooks.PreToolUse[0].matcher).toBe("Task");
    expect(settings.hooks.Notification.map((g: { matcher: string }) => g.matcher)).toEqual(["permission_prompt", "idle_prompt"]);
    const toml = readFileSync(join(s.home, ".codex", "config.toml"), "utf8");
    expect(toml.split("\n")[0]).toBe(codexNotifyLine(hookPath(s.d)));
    expect(toml.match(/^notify = \[/gm)).toHaveLength(1);
    expect(hookPath(s.d).startsWith("/")).toBe(true);
    expect(existsSync(hookPath(s.d))).toBe(true);
    s.lines.length = 0;
    await waitStatus(s.d);
    expect(s.lines[0]).toBe("Claude Code: on, no event yet");
    expect(s.lines[1]).toBe("Codex: on, no event yet");
    expect(await waitUninstall(s.d)).toBe(0);
    expect(readFileSync(join(s.home, ".claude", "settings.json"), "utf8")).toBe(ORIGINAL);
    expect(readFileSync(join(s.home, ".codex", "config.toml"), "utf8")).toBe('model = "o4"\n[profiles.x]\nnotify = "nested"\n');
    expect(existsSync(hookPath(s.d))).toBe(false);
  });

  test("uninstall removes a settings file that install created", async () => {
    const s = scratch();
    mkdirSync(join(s.home, ".claude"));
    expect(await waitInstall(s.d)).toBe(0);
    expect(existsSync(join(s.home, ".claude", "settings.json"))).toBe(true);
    expect(await waitUninstall(s.d)).toBe(0);
    expect(existsSync(join(s.home, ".claude", "settings.json"))).toBe(false);
  });

  test("an interrupted write leaves the old file whole and no temp file", () => {
    const s = scratch();
    const p = join(s.home, "settings.json");
    writeFileSync(p, ORIGINAL);
    expect(() =>
      writeAtomic(p, "{\"new\":", 0o600, (tmp, t) => {
        writeFileSync(tmp, t.slice(0, 3));
        throw new Error("disk full");
      }),
    ).toThrow("disk full");
    expect(readFileSync(p, "utf8")).toBe(ORIGINAL);
    expect(require("node:fs").readdirSync(s.home).filter((f: string) => f.endsWith(".tmp"))).toEqual([]);
  });

  test("refuses to replace an existing Codex notify", async () => {
    const s = scratch();
    mkdirSync(join(s.home, ".codex"));
    writeFileSync(join(s.home, ".codex", "config.toml"), 'notify = ["my-notifier"]\n');
    expect(await waitInstall(s.d)).toBe(1);
    expect(readFileSync(join(s.home, ".codex", "config.toml"), "utf8")).toBe('notify = ["my-notifier"]\n');
    expect(s.lines.join("\n")).toContain('notify = ["my-notifier"]');
    expect(mergeCodex("", "/a/b").action).toBe("add");
  });

  test("the installed hook runs end to end in a scratch home", async () => {
    const s = scratch();
    expect(await waitInstall(s.d)).toBe(0);
    const settings = JSON.parse(readFileSync(join(s.home, ".claude", "settings.json"), "utf8"));
    const cmd: string = settings.hooks.Stop[0].hooks[0].command;
    const p = Bun.spawnSync(["sh", "-c", cmd], { stdin: new TextEncoder().encode(claude("Stop", "e2e")), env: s.env });
    expect([p.exitCode, p.stdout.toString()]).toEqual([0, ""]);
    await settle(s, 1);
    expect(s.sentLines()[0]).toContain("Done: proj");
    expect(agentsBody(s.d, Math.floor(Date.now() / 1000))).toMatchObject({ installed: true, sessions: [{ session: "e2e", state: "done" }] });
  });

  test("macOS and Windows print the unsupported message", async () => {
    const s = scratch();
    expect(await waitInstall({ ...s.d, os: "darwin" })).toBe(2);
    expect(s.lines[0]).toContain("Linux");
  });
});

describe("sidecar routes", () => {
  let s: S;
  beforeEach(() => {
    s = scratch();
  });

  test("GET /local/agents and POST /local/focus sit behind the token", async () => {
    const srv = startServe({ uid: 1, resolvePeerUid: () => 1, routes: waitRoutes(() => s.d), routeBodyBytes: { "POST /local/focus": 128 } });
    try {
      const anon = await fetch(`${srv.url}local/agents`);
      expect(anon.status).toBe(401);
      const r = waitRoutes(() => s.d);
      const body = await (await r["GET /local/agents"](new Request("http://x/local/agents"), new URL("http://x/local/agents"), { cli: false })).json();
      expect(body).toEqual({ v: 1, supported: true, installed: false, sessions: [] });
      const bad = await r["POST /local/focus"](new Request("http://x", { method: "POST", body: "{}" }), new URL("http://x"), { cli: false });
      expect(bad.status).toBe(400);
      const ok = await r["POST /local/focus"](new Request("http://x", { method: "POST", body: JSON.stringify({ focused: true, visible: true }) }), new URL("http://x"), { cli: false });
      expect(ok.status).toBe(200);
      const f = JSON.parse(readFileSync(join(s.state, "focus.json"), "utf8"));
      expect(f).toMatchObject({ v: 1, focused: true, visible: true });
    } finally {
      srv.stop();
    }
  });
});

const GEMINI_DIR = join(import.meta.dir, "fixtures", "gemini-0.45.0");
const gem = (name: string) => readFileSync(join(GEMINI_DIR, `${name}.json`), "utf8");
const gemJson = (name: string) => JSON.parse(gem(name)) as Record<string, string>;

describe("event map", () => {
  test("the rendered shims carry every mapped event and tool", () => {
    const hook = renderHook("/n");
    const notify = renderNotify("/ns", ["/b"]);
    expect(hook).not.toContain("@@");
    expect(notify).not.toContain("@@");
    for (const e of Object.keys(EVENT_KINDS)) expect(hook).toContain(e);
    for (const t of AGENT_TOOLS) expect(hook).toContain(t);
  });

  test("parseEvent accepts every tool and rejects an unknown one", () => {
    for (const tool of AGENT_TOOLS) expect(parseEvent(JSON.stringify({ v: 1, ts: 1, tool, session: "s", event: "Stop", project: "p" }))?.tool).toBe(tool);
    expect(parseEvent(JSON.stringify({ v: 1, ts: 1, tool: "cursor", session: "s", event: "Stop", project: "p" }))).toBeNull();
  });

  test("captured Gemini payloads name the matcher and notification type the install uses", () => {
    expect(gemJson("before-tool-invoke-agent").tool_name).toBe(GEMINI_SUBAGENT_TOOL);
    expect(gemJson("after-tool-invoke-agent").tool_name).toBe(GEMINI_SUBAGENT_TOOL);
    expect(NOTIFY_TYPES).toContain(gemJson("notification-tool-permission").notification_type);
    for (const h of GEMINI_HOOKS) expect(Object.hasOwn(EVENT_KINDS, h.event)).toBe(true);
    for (const f of ["before-agent", "before-tool-invoke-agent", "after-tool-invoke-agent", "after-agent", "session-end", "notification-tool-permission"]) {
      expect(GEMINI_HOOKS.map((h) => h.event)).toContain(gemJson(f).hook_event_name);
    }
  });
});

describe("gemini", () => {
  const order = ["session-start", "before-agent", "before-tool-invoke-agent", "after-tool-invoke-agent", "after-agent", "session-end"];

  test("captured payloads give one v1 line each, with no prompt text", async () => {
    const s = scratch();
    for (const f of order) {
      const r = run(s, gem(f), ["gemini"]);
      expect([r.code, r.stdout, r.stderr]).toEqual([0, "", ""]);
    }
    const rows = s.log().trim().split("\n").map(parseEvent);
    expect(rows.map((r) => r?.event)).toEqual(["BeforeAgent", "BeforeTool", "AfterTool", "AfterAgent", "SessionEnd"]);
    expect(rows.every((r) => r?.tool === "gemini" && r.project === "proj" && r.session === gemJson("before-agent").session_id)).toBe(true);
    for (const leak of ["CAPTURE", "say hi", "/w/u", "touch zz"]) expect(s.log()).not.toContain(leak);
    await settle(s, 2);
    expect(s.sentLines().some((l) => l.includes("proj"))).toBe(true);
  });

  test("a Gemini Notification of another type writes nothing", () => {
    const s = scratch();
    run(s, JSON.stringify({ ...gemJson("notification-tool-permission"), notification_type: "Other" }), ["gemini"]);
    expect(s.log()).toBe("");
    run(s, gem("notification-tool-permission"), ["gemini"]);
    expect(parseEvent(s.log().trim())?.event).toBe("Notification");
  });

  test("install --gemini prints the Gemini consent", async () => {
    const s = scratch();
    expect(await waitCommand(["install", "--gemini"], s.d)).toBe(0);
    expect(s.lines[0]).toContain("Gemini CLI");
  });

  test("the fold counts the invoke_agent subagent and ends done", () => {
    const s = scratch();
    const now = Math.floor(Date.now() / 1000);
    for (const f of order.slice(0, 3)) run(s, gem(f), ["gemini"]);
    expect(foldAgents(s.log(), now)[0]).toMatchObject({ tool: "gemini", state: "running", subagents: 1 });
    run(s, gem("after-tool-invoke-agent"), ["gemini"]);
    expect(foldAgents(s.log(), now)[0]).toMatchObject({ state: "running", subagents: 0 });
    run(s, gem("after-agent"), ["gemini"]);
    expect(foldAgents(s.log(), now)[0]).toMatchObject({ state: "done", subagents: 0 });
  });

  test("the ToolPermission notification marks the session waiting and notifies", async () => {
    const s = scratch();
    const n = gemJson("notification-tool-permission");
    run(s, JSON.stringify({ ...gemJson("before-agent"), session_id: n.session_id }), ["gemini"]);
    run(s, gem("notification-tool-permission"), ["gemini"]);
    expect(foldAgents(s.log(), Math.floor(Date.now() / 1000))[0]).toMatchObject({ tool: "gemini", session: n.session_id, state: "waiting" });
    await settle(s, 2);
    expect(s.sentLines().length).toBe(2);
    expect(s.log()).not.toContain("touch zz");
  });

  const ORIGINAL = `{\n  "security": { "auth": { "selectedType": "oauth-personal" } },\n  "hooks": {\n    "BeforeTool": [{ "matcher": "run_shell_command", "hooks": [{ "type": "command", "command": "echo mine" }] }]\n  }\n}\n`;

  test("install --gemini merges once, leaves Claude alone, and uninstall restores the bytes", async () => {
    const s = scratch();
    mkdirSync(join(s.home, ".gemini"));
    const sp = join(s.home, ".gemini", "settings.json");
    writeFileSync(sp, ORIGINAL);
    expect(await waitCommand(["install", "--gemini"], s.d)).toBe(0);
    const once = readFileSync(sp, "utf8");
    expect(await waitCommand(["install", "--gemini"], s.d)).toBe(0);
    expect(readFileSync(sp, "utf8")).toBe(once);
    expect(existsSync(join(s.home, ".claude", "settings.json"))).toBe(false);
    const settings = JSON.parse(once);
    expect(settings.security.auth.selectedType).toBe("oauth-personal");
    expect(settings.hooks.BeforeTool.map((g: { matcher?: string }) => g.matcher)).toEqual(["run_shell_command", "invoke_agent"]);
    expect(settings.hooks.BeforeTool[1].hooks[0]).toMatchObject({ name: GEMINI_HOOK_NAME, type: "command" });
    expect(settings.hooks.Notification[0].matcher).toBeUndefined();
    expect(Object.keys(settings.hooks).sort()).toEqual(["AfterAgent", "AfterTool", "BeforeAgent", "BeforeTool", "Notification", "SessionEnd"]);
    s.lines.length = 0;
    await waitStatus(s.d);
    expect(s.lines).toContain("Gemini CLI: on, no event yet");
    expect(s.lines.join("\n")).toContain("No event source yet: OpenCode, Aider");
    expect(await waitCommand(["uninstall", "--gemini"], s.d)).toBe(0);
    expect(readFileSync(sp, "utf8")).toBe(ORIGINAL);
    expect(existsSync(`${sp}.bkt-wait.bak`)).toBe(false);
    expect(existsSync(hookPath(s.d))).toBe(false);
  });

  test("uninstall --gemini keeps the Claude hooks and the shim", async () => {
    const s = scratch();
    mkdirSync(join(s.home, ".claude"));
    mkdirSync(join(s.home, ".gemini"));
    expect(await waitInstall(s.d)).toBe(0);
    expect(await waitCommand(["install", "--gemini"], s.d)).toBe(0);
    expect(await waitCommand(["uninstall", "--gemini"], s.d)).toBe(0);
    expect(existsSync(join(s.home, ".gemini", "settings.json"))).toBe(false);
    expect(existsSync(hookPath(s.d))).toBe(true);
    expect(JSON.parse(readFileSync(join(s.home, ".claude", "settings.json"), "utf8")).hooks.Stop).toHaveLength(1);
  });

  test("plain uninstall removes the Gemini hooks too", async () => {
    const s = scratch();
    mkdirSync(join(s.home, ".gemini"));
    writeFileSync(join(s.home, ".gemini", "settings.json"), ORIGINAL);
    expect(await waitCommand(["install", "--gemini"], s.d)).toBe(0);
    expect(await waitUninstall(s.d)).toBe(0);
    expect(readFileSync(join(s.home, ".gemini", "settings.json"), "utf8")).toBe(ORIGINAL);
  });

  test("a settings file with comments is left alone", async () => {
    const s = scratch();
    mkdirSync(join(s.home, ".gemini"));
    const text = '// mine\n{ "theme": "x" }\n';
    writeFileSync(join(s.home, ".gemini", "settings.json"), text);
    expect(await waitCommand(["install", "--gemini"], s.d)).toBe(1);
    expect(readFileSync(join(s.home, ".gemini", "settings.json"), "utf8")).toBe(text);
  });

  test("the installed Gemini hook runs end to end on a captured payload", async () => {
    const s = scratch();
    expect(await waitCommand(["install", "--gemini"], s.d)).toBe(0);
    const settings = JSON.parse(readFileSync(join(s.home, ".gemini", "settings.json"), "utf8"));
    const cmd: string = settings.hooks.AfterAgent[0].hooks[0].command;
    const p = Bun.spawnSync(["sh", "-c", cmd], { stdin: new TextEncoder().encode(gem("after-agent")), env: s.env });
    expect([p.exitCode, p.stdout.toString()]).toEqual([0, ""]);
    await settle(s, 1);
    expect(s.sentLines()[0]).toContain("Done: proj");
    expect(agentsBody(s.d, Math.floor(Date.now() / 1000))).toMatchObject({ installed: true, sessions: [{ tool: "gemini", state: "done" }] });
  });
});
