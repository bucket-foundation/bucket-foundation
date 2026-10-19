import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import hookTemplate from "./wait/hook.sh" with { type: "text" };
import notifyTemplate from "./wait/notify.sh" with { type: "text" };
import { foldAgents, parseEvent, type AgentsBody } from "./wait-fold";
import { selfArgv } from "./notify";
import type { Route } from "./serve";

export const HOOK_NAME = "bkt-wait-hook";
export const NOTIFY_NAME = "bkt-wait-notify";
export const LINUX_ONLY = "bkt wait runs on Linux for now; macOS and Windows have no notifier yet";
export const USAGE = "usage: bkt wait install | bkt wait uninstall | bkt wait status";
export const FOCUS_BODY_BYTES = 128;
export const WAIT_BODY_BYTES = 64;
export const CONSENT = "Bucket adds hooks to Claude Code and Codex. Each hook writes the session id, the event name and the project folder name to a file on this computer, then shows a notification. No prompt text, transcript or full path leaves the hook.";

const CLAUDE_EVENTS: { event: string; matchers: (string | null)[] }[] = [
  { event: "UserPromptSubmit", matchers: [null] },
  { event: "PreToolUse", matchers: ["Task"] },
  { event: "SubagentStop", matchers: [null] },
  { event: "Stop", matchers: [null] },
  { event: "SessionEnd", matchers: [null] },
  { event: "Notification", matchers: ["permission_prompt", "idle_prompt"] },
];

export interface WaitDeps {
  os: string;
  home: string;
  env: Record<string, string | undefined>;
  self: string[];
  notifySend: string | null;
  out: (line: string) => void;
}

export function defaultWaitDeps(): WaitDeps {
  return { os: process.platform, home: process.env.HOME ?? homedir(), env: process.env, self: selfArgv(), notifySend: Bun.which("notify-send"), out: (l) => console.log(l) };
}

export function waitDir(env: Record<string, string | undefined>, home: string): string {
  return join(env.XDG_STATE_HOME || join(home, ".local", "state"), "bkt");
}

export const shareDir = (home: string, env: Record<string, string | undefined> = {}) => join(env.XDG_DATA_HOME || join(home, ".local", "share"), "bkt");
export const hookPath = (d: Pick<WaitDeps, "home" | "env">) => join(shareDir(d.home, d.env), HOOK_NAME);
const notifyPath = (d: Pick<WaitDeps, "home" | "env">) => join(shareDir(d.home, d.env), NOTIFY_NAME);
const claudeSettings = (home: string) => join(home, ".claude", "settings.json");
const codexConfig = (home: string) => join(home, ".codex", "config.toml");

export function shQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export function renderHook(notify: string): string {
  return hookTemplate.replace("@@NOTIFY@@", shQuote(notify));
}

export function renderNotify(notifySend: string, launcher: string[]): string {
  return notifyTemplate.replace("@@NOTIFY_SEND@@", shQuote(notifySend)).replace("@@LAUNCHER@@", launcher.map(shQuote).join(" "));
}

type HookEntry = { type?: string; command?: string };
type Group = { matcher?: string; hooks?: HookEntry[] };
type Settings = { hooks?: Record<string, Group[]> } & Record<string, unknown>;

const claudeCommand = (shim: string) => `${shQuote(shim)} claude`;
const ours = (shim: string) => (h: HookEntry) => typeof h.command === "string" && h.command.includes(shim);

function agentToolSeen(home: string): boolean {
  const root = join(home, ".claude", "projects");
  const files: { path: string; at: number }[] = [];
  try {
    for (const p of readdirSync(root)) {
      const dir = join(root, p);
      try {
        for (const f of readdirSync(dir)) if (f.endsWith(".jsonl")) files.push({ path: join(dir, f), at: statSync(join(dir, f)).mtimeMs });
      } catch {
        continue;
      }
    }
  } catch {
    return false;
  }
  return files
    .sort((a, b) => b.at - a.at)
    .slice(0, 5)
    .some((f) => {
      try {
        return /"type":"tool_use","id":"[^"]*","name":"Agent"/.test(readFileSync(f.path, "utf8"));
      } catch {
        return false;
      }
    });
}

export function mergeClaude(s: Settings, shim: string, agent: boolean): Settings {
  const hooks: Record<string, Group[]> = { ...(s.hooks ?? {}) };
  for (const { event, matchers } of CLAUDE_EVENTS) {
    const groups = [...(hooks[event] ?? [])];
    const want = event === "PreToolUse" && agent ? [...matchers, "Agent"] : matchers;
    for (const m of want) {
      const has = groups.some((g) => (g.matcher ?? null) === m && (g.hooks ?? []).some(ours(shim)));
      if (!has) groups.push({ ...(m === null ? {} : { matcher: m }), hooks: [{ type: "command", command: claudeCommand(shim) }] });
    }
    hooks[event] = groups;
  }
  return { ...s, hooks };
}

export function stripClaude(s: Settings, shim: string): Settings {
  if (!s.hooks) return s;
  const hooks: Record<string, Group[]> = {};
  for (const [event, groups] of Object.entries(s.hooks)) {
    const kept = groups
      .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !ours(shim)(h)) }))
      .filter((g, i) => g.hooks.length > 0 || (groups[i].hooks ?? []).length === 0);
    if (kept.length) hooks[event] = kept;
  }
  const { hooks: _h, ...rest } = s;
  return Object.keys(hooks).length ? { ...rest, hooks } : rest;
}

const NOTIFY_LINE = /^notify\s*=.*$/m;

function topLevel(toml: string): string {
  const i = toml.search(/^\s*\[/m);
  return i < 0 ? toml : toml.slice(0, i);
}

export function codexNotifyLine(shim: string): string {
  return `notify = [${JSON.stringify(shim)}, "codex"]`;
}

export type CodexPlan = { action: "add"; text: string } | { action: "kept"; text: string } | { action: "refuse"; existing: string };

export function mergeCodex(toml: string, shim: string): CodexPlan {
  const line = codexNotifyLine(shim);
  const found = NOTIFY_LINE.exec(topLevel(toml));
  if (found) return found[0].trim() === line ? { action: "kept", text: toml } : { action: "refuse", existing: found[0].trim() };
  return { action: "add", text: `${line}\n${toml}` };
}

export function stripCodex(toml: string, shim: string): string {
  const line = codexNotifyLine(shim);
  return toml.split("\n").filter((l) => l.trim() !== line).join("\n");
}

export function writeAtomic(path: string, text: string, mode = 0o600, write: (p: string, t: string) => void = (p, t) => writeFileSync(p, t, { mode })) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.bkt-wait.${process.pid}.tmp`;
  try {
    write(tmp, text);
    chmodSync(tmp, mode);
    renameSync(tmp, path);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}

const writePrivate = writeAtomic;

function readJson(path: string): Settings | null {
  if (!existsSync(path)) return {};
  try {
    const v = JSON.parse(readFileSync(path, "utf8"));
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Settings) : null;
  } catch {
    return null;
  }
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sortKeys(x)]));
  return v;
}

export async function waitInstall(d: WaitDeps): Promise<number> {
  if (d.os !== "linux") {
    d.out(LINUX_ONLY);
    return 2;
  }
  if (!d.notifySend) {
    d.out("bkt wait needs notify-send; install libnotify and run bkt wait install again");
    return 1;
  }
  const shim = hookPath(d);
  writePrivate(notifyPath(d), renderNotify(d.notifySend, d.self), 0o700);
  writePrivate(shim, renderHook(notifyPath(d)), 0o700);
  mkdirSync(waitDir(d.env, d.home), { recursive: true, mode: 0o700 });

  const sp = claudeSettings(d.home);
  const before = readJson(sp);
  let code = 0;
  if (before === null) {
    d.out(`${sp} is not a JSON object; Claude Code hooks were left alone`);
    code = 1;
  } else {
    const after = mergeClaude(before, shim, agentToolSeen(d.home));
    if (sameJson(before, after)) d.out("Claude Code hooks are already installed");
    else {
      const backup = `${sp}.bkt-wait.bak`;
      const absent = `${sp}.bkt-wait.absent`;
      if (!existsSync(sp) && !existsSync(backup)) writePrivate(absent, "");
      if (existsSync(sp) && !existsSync(backup) && !existsSync(absent)) writePrivate(backup, readFileSync(sp, "utf8"));
      writePrivate(sp, `${JSON.stringify(after, null, 2)}\n`);
      d.out(`Claude Code hooks added to ${sp}`);
    }
  }

  const cp = codexConfig(d.home);
  if (existsSync(dirname(cp))) {
    const toml = existsSync(cp) ? readFileSync(cp, "utf8") : "";
    const plan = mergeCodex(toml, shim);
    if (plan.action === "refuse") {
      d.out(`${cp} already sets ${plan.existing}; merge ${codexNotifyLine(shim)} by hand`);
      code = 1;
    } else if (plan.action === "kept") d.out("Codex notify is already installed");
    else {
      writePrivate(cp, plan.text);
      d.out(`Codex notify added to ${cp}`);
    }
  }
  d.out("Turned on. Run bkt wait status after your next prompt to see the first event.");
  return code;
}

export async function waitUninstall(d: WaitDeps): Promise<number> {
  if (d.os !== "linux") {
    d.out(LINUX_ONLY);
    return 2;
  }
  const shim = hookPath(d);
  const sp = claudeSettings(d.home);
  const now = readJson(sp);
  if (now && existsSync(sp)) {
    const stripped = stripClaude(now, shim);
    const backup = `${sp}.bkt-wait.bak`;
    const absent = `${sp}.bkt-wait.absent`;
    const saved = existsSync(backup) ? readJson(backup) : null;
    if (existsSync(absent) && sameJson(stripped, {})) rmSync(sp);
    else if (saved && sameJson(saved, stripped)) writeAtomic(sp, readFileSync(backup, "utf8"));
    else if (!sameJson(now, stripped)) writeAtomic(sp, `${JSON.stringify(stripped, null, 2)}\n`);
    rmSync(backup, { force: true });
    rmSync(absent, { force: true });
    d.out("Claude Code hooks removed");
  }
  const cp = codexConfig(d.home);
  if (existsSync(cp)) {
    const toml = readFileSync(cp, "utf8");
    const out = stripCodex(toml, shim);
    if (out !== toml) {
      writeAtomic(cp, out);
      d.out("Codex notify removed");
    }
  }
  rmSync(shim, { force: true });
  rmSync(notifyPath(d), { force: true });
  d.out("Turned off");
  return 0;
}

export function waitInstalled(d: Pick<WaitDeps, "home" | "env">): { claude: boolean; codex: boolean } {
  const shim = hookPath(d);
  const s = readJson(claudeSettings(d.home)) ?? {};
  const claude = existsSync(shim) && Object.values(s.hooks ?? {}).some((gs) => gs.some((g) => (g.hooks ?? []).some(ours(shim))));
  let codex = false;
  try {
    codex = existsSync(shim) && topLevel(readFileSync(codexConfig(d.home), "utf8")).split("\n").some((l) => l.trim() === codexNotifyLine(shim));
  } catch {
    codex = false;
  }
  return { claude, codex };
}

function readLog(dir: string): string {
  let text = "";
  for (const f of ["agents.jsonl.1", "agents.jsonl"]) {
    try {
      text += readFileSync(join(dir, f), "utf8");
    } catch {
      continue;
    }
  }
  return text;
}

export async function waitStatus(d: WaitDeps): Promise<number> {
  if (d.os !== "linux") {
    d.out(LINUX_ONLY);
    return 2;
  }
  const on = waitInstalled(d);
  const events = readLog(waitDir(d.env, d.home)).split("\n").map(parseEvent).filter((e) => e !== null);
  const verified = (tool: string) => events.some((e) => e.tool === tool);
  d.out(`Claude Code: ${on.claude ? "on" : "off"}, ${verified("claude") ? "verified" : "no event yet"}`);
  d.out(`Codex: ${on.codex ? "on" : "off"}, ${verified("codex") ? "verified" : "no event yet"}`);
  const last = events.slice(-5);
  if (last.length) d.out("last events:");
  for (const e of last) d.out(`  ${new Date(e.ts * 1000).toISOString()} ${e.tool} ${e.event} ${e.project} ${e.session.slice(0, 8)}`);
  return 0;
}

export async function waitCommand(args: string[], d: WaitDeps = defaultWaitDeps()): Promise<number> {
  const [cmd, ...rest] = args;
  if (rest.length === 0 && cmd === "install") return waitInstall(d);
  if (rest.length === 0 && cmd === "uninstall") return waitUninstall(d);
  if (rest.length === 0 && cmd === "status") return waitStatus(d);
  d.out(USAGE);
  return 2;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function agentsBody(d: Pick<WaitDeps, "home" | "env" | "os">, nowS: number): AgentsBody {
  const on = waitInstalled(d);
  return { v: 1, supported: d.os === "linux", installed: on.claude || on.codex, sessions: foldAgents(readLog(waitDir(d.env, d.home)), nowS) };
}

export function writeFocus(dir: string, focused: boolean, visible: boolean, nowMs: number): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tmp = join(dir, `focus.json.${process.pid}`);
  writeFileSync(tmp, JSON.stringify({ v: 1, focused, visible, ts: nowMs }), { mode: 0o600 });
  renameSync(tmp, join(dir, "focus.json"));
}

export function waitRoutes(deps: () => WaitDeps, now: () => number = Date.now): Record<string, Route> {
  return {
    "GET /local/agents": async () => json(agentsBody(deps(), Math.floor(now() / 1000))),
    "POST /local/focus": async (req) => {
      const b = (await req.json().catch(() => null)) as { focused?: unknown; visible?: unknown } | null;
      if (!b || typeof b.focused !== "boolean" || typeof b.visible !== "boolean") return json({ error: "send focused and visible as true or false" }, 400);
      const d = deps();
      writeFocus(waitDir(d.env, d.home), b.focused, b.visible, now());
      return json({ ok: true });
    },
    "POST /local/wait": async (req) => {
      const b = (await req.json().catch(() => null)) as { on?: unknown } | null;
      if (!b || typeof b.on !== "boolean") return json({ error: "send on as true or false" }, 400);
      const lines: string[] = [];
      const d = { ...deps(), out: (l: string) => lines.push(l) };
      const code = b.on ? await waitInstall(d) : await waitUninstall(d);
      return json({ ok: code === 0, lines, ...agentsBody(d, Math.floor(now() / 1000)) }, code === 2 ? 400 : 200);
    },
  };
}
