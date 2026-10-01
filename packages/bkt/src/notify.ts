import { spawn } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { changedChatFiles, CHAT_OFF, localDay, type ChatToggles } from "./chat-sources";
import { exec, platformFor, type Exec, type Platform } from "./platform";
import { dataDir } from "./setup";

export const UNIT = "bkt-quiz-notify";
export const DEFAULT_AT = "08:53";
export const TITLE = "Bucket daily quiz";
export const ACTION = { name: "open", label: "Open quiz" };
export const ROOTS_FILE = "quiz-roots.json";
export const STAMP_FILE = "quiz-notified";
export const LINUX_ONLY = "bkt quiz runs on Linux for now; macOS and Windows have no notifier or schedule yet";
export const USAGE = "usage: bkt quiz notify [--force] | bkt quiz schedule [--at HH:MM] | bkt quiz unschedule";

export function writeQuizRoots(dir: string, on: ChatToggles): void {
  const p = join(dir, ROOTS_FILE);
  writeFileSync(p, JSON.stringify({ claude: on.claude, codex: on.codex }), { mode: 0o600 });
  chmodSync(p, 0o600);
}

export function readQuizRoots(dir: string): ChatToggles {
  try {
    const r = JSON.parse(readFileSync(join(dir, ROOTS_FILE), "utf8")) as Partial<ChatToggles>;
    return { claude: r.claude === true, codex: r.codex === true };
  } catch {
    return CHAT_OFF;
  }
}

export function notificationBody(count: number): string {
  return `Today's quiz is ready. ${count} chat ${count === 1 ? "session" : "sessions"} changed in the last day.`;
}

export const quizLink = (day: string) => `bucket://quiz/${day}`;
export const quizRoute = (day: string) => `/work/daily/${day}`;

export function selfArgv(env: Record<string, string | undefined> = process.env, execPath = process.execPath, main = Bun.main): string[] {
  if (env.APPIMAGE) return [env.APPIMAGE];
  return main.startsWith("/$bunfs/") || main.startsWith("B:\\~BUN") ? [execPath] : [execPath, main];
}

export interface QuizDeps {
  platform: Platform;
  exec: Exec;
  dataDir: string;
  self: string[];
  home?: string;
  now: number;
  start: (argv: string[]) => void;
  out: (line: string) => void;
}

const startDetached = (argv: string[]) => {
  const child = spawn(argv[0], argv.slice(1), { detached: true, stdio: "ignore" });
  child.on("error", (e) => console.error(`bkt quiz: could not start ${argv[0]}: ${e.message}`));
  child.unref();
};

export function defaultDeps(): QuizDeps {
  return { platform: platformFor(), exec, dataDir: dataDir(), self: selfArgv(), now: Date.now(), start: startDetached, out: (l) => console.log(l) };
}

export type NotifyResult = { sent: false; why: "unsupported" | "off" | "already" | "quiet" | "failed" } | { sent: true; count: number; opened: string[] | null };

export async function quizNotify(d: QuizDeps, force = false): Promise<NotifyResult> {
  const day = localDay(d.now);
  const on = readQuizRoots(d.dataDir);
  if (!on.claude && !on.codex) return { sent: false, why: "off" };
  const stamp = join(d.dataDir, STAMP_FILE);
  let last = "";
  try {
    last = readFileSync(stamp, "utf8").trim();
  } catch {
    last = "";
  }
  if (last === day && !force) return { sent: false, why: "already" };
  const count = changedChatFiles(on, { home: d.home, now: d.now }).files;
  if (count === 0) return { sent: false, why: "quiet" };
  const argv = d.platform.notifyCommand(TITLE, notificationBody(count), ACTION);
  if (!argv) return { sent: false, why: "unsupported" };
  writeFileSync(stamp, day, { mode: 0o600 });
  const r = await d.exec(argv).catch(() => ({ code: 127, stdout: "", stderr: "" }));
  if (r.code !== 0) {
    rmSync(stamp, { force: true });
    d.out(`notify-send failed (exit ${r.code})`);
    return { sent: false, why: "failed" };
  }
  if (r.stdout.trim() !== ACTION.name) return { sent: true, count, opened: null };
  const handler = await d.exec(["xdg-mime", "query", "default", "x-scheme-handler/bucket"]).catch(() => ({ code: 127, stdout: "", stderr: "" }));
  const opened = handler.code === 0 && handler.stdout.trim() ? ["xdg-open", quizLink(day)] : [...d.self, "app", "--route", quizRoute(day)];
  d.start(opened);
  return { sent: true, count, opened };
}

export function parseAt(at: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(at);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new Error("--at takes a time written as HH:MM, such as 08:53");
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function unitArg(arg: string): string {
  if (/[\x00-\x1f\x7f]/.test(arg)) throw new Error("the bkt path holds a control character; move bkt and run the command again");
  return `"${arg.replace(/[\\"]/g, "\\$&").replace(/%/g, "%%").replace(/\$/g, "$$$$")}"`;
}

export function unitFiles(self: string[], at = DEFAULT_AT): { service: string; timer: string } {
  return {
    service: `[Unit]
Description=Bucket daily quiz notification

[Service]
Type=oneshot
ExecStart=${[...self, "quiz", "notify"].map(unitArg).join(" ")}
TimeoutStartSec=6h
`,
    timer: `[Unit]
Description=Bucket daily quiz notification, once a day

[Timer]
OnCalendar=*-*-* ${parseAt(at)}:00
Persistent=true

[Install]
WantedBy=timers.target
`,
  };
}

async function systemctl(d: QuizDeps, ...args: string[]): Promise<boolean> {
  const r = await d.exec(["systemctl", "--user", ...args]);
  if (r.code !== 0) d.out(`systemctl --user ${args.join(" ")} failed (exit ${r.code}): ${r.stderr.trim()}`);
  return r.code === 0;
}

export async function quizSchedule(d: QuizDeps, at = DEFAULT_AT): Promise<number> {
  const dir = d.platform.timerDir();
  if (!dir) {
    d.out(LINUX_ONLY);
    return 2;
  }
  const files = unitFiles(d.self, at);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${UNIT}.service`), files.service);
  writeFileSync(join(dir, `${UNIT}.timer`), files.timer);
  if (!(await systemctl(d, "daemon-reload")) || !(await systemctl(d, "enable", "--now", `${UNIT}.timer`))) return 1;
  d.out(`the daily quiz notification runs at ${parseAt(at)}; turn on a chat source under Import for it to fire`);
  return 0;
}

export async function quizUnschedule(d: QuizDeps): Promise<number> {
  const dir = d.platform.timerDir();
  if (!dir) {
    d.out(LINUX_ONLY);
    return 2;
  }
  await d.exec(["systemctl", "--user", "disable", "--now", `${UNIT}.timer`]);
  rmSync(join(dir, `${UNIT}.service`), { force: true });
  rmSync(join(dir, `${UNIT}.timer`), { force: true });
  if (!(await systemctl(d, "daemon-reload"))) return 1;
  d.out("the daily quiz notification is off");
  return 0;
}

export async function quizCommand(args: string[], d: QuizDeps = defaultDeps()): Promise<number> {
  const [cmd, ...rest] = args;
  if (cmd === "notify" && rest.every((a) => a === "--force")) {
    if (!d.platform.timerDir()) {
      d.out(LINUX_ONLY);
      return 2;
    }
    const r = await quizNotify(d, rest.includes("--force"));
    return r.sent || r.why !== "failed" ? 0 : 1;
  }
  if (cmd === "schedule" && (rest.length === 0 || (rest.length === 2 && rest[0] === "--at") || (rest.length === 1 && rest[0].startsWith("--at=")))) {
    try {
      return await quizSchedule(d, rest.length === 2 ? rest[1] : rest.length === 1 ? rest[0].slice(5) : DEFAULT_AT);
    } catch (e) {
      d.out((e as Error).message);
      return 2;
    }
  }
  if (cmd === "unschedule" && rest.length === 0) return quizUnschedule(d);
  d.out(USAGE);
  return 2;
}
