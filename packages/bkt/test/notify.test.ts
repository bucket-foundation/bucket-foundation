import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { changedChatFiles, localDay } from "../src/chat-sources";
import { boundedExec, KILL_MS, UNIT_TIMEOUT, WAIT_MS, LINUX_ONLY, notificationBody, parseAt, quizCommand, quizNotify, readQuizRoots, selfArgv, STAMP_FILE, unitFiles, USAGE, writeQuizRoots, type QuizDeps } from "../src/notify";
import { platformFor, type ExecResult } from "../src/platform";
import { resolve } from "../src/cli/run";
import { findCommand } from "../src/cli/table";
import { checkRoute, routeUrl, takeRoute, writeRoute } from "../src/window";

const NOW = Date.parse("2026-10-01T12:00:00Z");
const DAY = localDay(NOW);
const SECRET = "ghp_FAKEfixture00000000000000000000";
const LABEL = "Wire the Fermi grader into the daily quiz route";

let home: string;
let data: string;
let calls: string[][];
let started: string[][];
let out: string[];
let answers: Record<string, ExecResult>;

function session(rel: string, at = NOW) {
  const path = join(home, rel);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ type: "user", message: { role: "user", content: `${LABEL} ${SECRET}` } })}\n`);
  utimesSync(path, at / 1000, at / 1000);
}

function deps(os = "linux", over: Partial<QuizDeps> = {}): QuizDeps {
  return {
    platform: platformFor(os, { env: {}, home, which: () => null, exists: () => false }),
    exec: async (argv) => {
      calls.push(argv);
      return answers[argv[0]] ?? { code: 0, stdout: "", stderr: "" };
    },
    dataDir: data,
    self: ["/opt/bucket/bkt"],
    home,
    now: NOW,
    start: (argv) => started.push(argv),
    out: (l) => out.push(l),
    ...over,
  };
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "bkt-notify-home-"));
  data = join(home, "data");
  mkdirSync(data);
  calls = [];
  started = [];
  out = [];
  answers = {};
});
afterEach(() => rmSync(home, { recursive: true, force: true }));

describe("changed chat files", () => {
  test("counts files changed in the last day under the roots that are on, by stat alone", () => {
    session(".claude/projects/p/new.jsonl");
    session(".claude/projects/p/old.jsonl", NOW - 25 * 3_600_000);
    session(".codex/sessions/2026/10/01/r.jsonl");
    writeFileSync(join(home, ".claude/projects/p/notes.txt"), "x");
    symlinkSync(join(home, ".codex/sessions/2026/10/01/r.jsonl"), join(home, ".claude/projects/p/link.jsonl"));
    expect(changedChatFiles({ claude: true, codex: false }, { home, now: NOW })).toEqual({ files: 1, timedOut: false });
    expect(changedChatFiles({ claude: true, codex: true }, { home, now: NOW }).files).toBe(2);
    expect(changedChatFiles({ claude: false, codex: false }, { home, now: NOW }).files).toBe(0);
  });

  test("the file cap and the time cap hold", () => {
    for (let i = 0; i < 6; i++) session(`.claude/projects/p/s${i}.jsonl`);
    expect(changedChatFiles({ claude: true, codex: false }, { home, now: NOW, caps: { files: 4 } }).files).toBe(4);
    let t = 0;
    expect(changedChatFiles({ claude: true, codex: false }, { home, now: NOW, clock: () => (t += 2000) })).toEqual({ files: 0, timedOut: true });
  });

  test("an unreadable file still counts, so no content is read", () => {
    session(".claude/projects/p/locked.jsonl");
    chmodSync(join(home, ".claude/projects/p/locked.jsonl"), 0o000);
    expect(changedChatFiles({ claude: true, codex: false }, { home, now: NOW }).files).toBe(1);
  });
});

describe("bkt quiz notify", () => {
  test("is silent while the roots file is missing or off", async () => {
    session(".claude/projects/p/new.jsonl");
    expect(await quizNotify(deps())).toEqual({ sent: false, why: "off" });
    writeQuizRoots(data, { claude: false, codex: false });
    expect(await quizNotify(deps())).toEqual({ sent: false, why: "off" });
    writeFileSync(join(data, "quiz-roots.json"), "not json");
    expect(readQuizRoots(data)).toEqual({ claude: false, codex: false });
    expect(calls).toEqual([]);
  });

  test("is silent when no source file changed in a day", async () => {
    writeQuizRoots(data, { claude: true, codex: true });
    session(".claude/projects/p/old.jsonl", NOW - 30 * 3_600_000);
    expect(await quizNotify(deps())).toEqual({ sent: false, why: "quiet" });
    expect(calls).toEqual([]);
    expect(existsSync(join(data, STAMP_FILE))).toBe(false);
  });

  test("sends a fixed line plus the count, with no transcript text, and opens no database", async () => {
    writeQuizRoots(data, { claude: true, codex: true });
    session(".claude/projects/p/a.jsonl");
    session(".codex/sessions/b.jsonl");
    expect(await quizNotify(deps())).toEqual({ sent: true, count: 2, opened: null });
    expect(calls).toEqual([
      ["notify-send", "--app-name=Bucket", "--expire-time=600000", "--action=open=Open quiz", "--", "Bucket daily quiz", "2 chat sessions changed in the last day. Open Bucket to build today's quiz from them."],
    ]);
    expect(notificationBody(1)).toBe("1 chat session changed in the last day. Open Bucket to build today's quiz from them.");
    const said = JSON.stringify([calls, out, started]);
    expect(said.includes(SECRET) || said.includes(LABEL) || said.includes("Fermi")).toBe(false);
    expect(readdirSync(data).sort()).toEqual(["quiz-notified", "quiz-roots.json"]);
    expect(readFileSync(join(data, STAMP_FILE), "utf8")).toBe(DAY);
    expect(readFileSync(join(import.meta.dir, "../src/notify.ts"), "utf8")).not.toMatch(/store|sqlite|keyring|readChatSources|openSession/i);
  });

  test("fires at most once a day unless forced", async () => {
    writeQuizRoots(data, { claude: true, codex: false });
    session(".claude/projects/p/a.jsonl");
    expect((await quizNotify(deps())).sent).toBe(true);
    expect(await quizNotify(deps())).toEqual({ sent: false, why: "already" });
    expect(calls).toHaveLength(1);
    expect((await quizNotify(deps(), true)).sent).toBe(true);
    expect(await quizNotify(deps("linux", { now: NOW + 90_000_000 }))).toEqual({ sent: false, why: "quiet" });
    session(".claude/projects/p/b.jsonl", NOW + 88_000_000);
    expect((await quizNotify(deps("linux", { now: NOW + 90_000_000 }))).sent).toBe(true);
  });

  test("a click opens the registered link, else bkt app --route", async () => {
    writeQuizRoots(data, { claude: true, codex: false });
    session(".claude/projects/p/a.jsonl");
    answers = { "notify-send": { code: 0, stdout: "open\n", stderr: "" }, "xdg-mime": { code: 0, stdout: "Bucket.desktop\n", stderr: "" } };
    await quizNotify(deps(), true);
    answers["xdg-mime"] = { code: 0, stdout: "\n", stderr: "" };
    await quizNotify(deps(), true);
    answers["xdg-mime"] = { code: 3, stdout: "", stderr: "" };
    await quizNotify(deps("linux", { self: ["/usr/bin/bun", "/src/cli.tsx"] }), true);
    expect(started).toEqual([
      ["xdg-open", `bucket://quiz/${DAY}`],
      ["/opt/bucket/bkt", "app", "--route", `/work/daily/${DAY}`],
      ["/usr/bin/bun", "/src/cli.tsx", "app", "--route", `/work/daily/${DAY}`],
    ]);
  });

  test("a failed notify-send clears the stamp and exits 1", async () => {
    writeQuizRoots(data, { claude: true, codex: false });
    session(".claude/projects/p/a.jsonl");
    answers = { "notify-send": { code: 1, stdout: "", stderr: "no daemon" } };
    expect(await quizCommand(["notify"], deps())).toBe(1);
    expect(existsSync(join(data, STAMP_FILE))).toBe(false);
    const thrown = deps("linux", {
      exec: async () => {
        throw new Error("ENOENT");
      },
    });
    expect(await quizNotify(thrown)).toEqual({ sent: false, why: "failed" });
  });
});

describe("bounded wait", () => {
  test("an ignored notification returns within the bound and still counts as sent", async () => {
    writeQuizRoots(data, { claude: true, codex: false });
    session(".claude/projects/p/a.jsonl");
    const never = deps("linux", { waitMs: 20, graceMs: 20, exec: () => new Promise(() => {}) });
    const t = Date.now();
    const got = await Promise.race([quizNotify(never), new Promise((done) => setTimeout(() => done("hung"), 2000))]);
    expect(got).toEqual({ sent: true, count: 1, opened: null });
    expect(Date.now() - t).toBeLessThan(1500);
    expect(readFileSync(join(data, STAMP_FILE), "utf8")).toBe(DAY);
    expect([WAIT_MS, KILL_MS, UNIT_TIMEOUT]).toEqual([600_000, 630_000, "15min"]);
  });

  test("the real runner kills a process that outlives the bound", async () => {
    const t = Date.now();
    const r = await boundedExec(150)(["sleep", "5"]);
    expect(r.code).toBe(124);
    expect(Date.now() - t).toBeLessThan(2000);
    expect((await boundedExec(2000)(["true"])).code).toBe(0);
  });

  test("a silent run prints one line with the reason", async () => {
    expect(await quizCommand(["notify"], deps())).toBe(0);
    expect(out).toEqual(["bkt quiz notify: silent, both chat sources are off, or the Bucket window has not run with this data folder"]);
    writeQuizRoots(data, { claude: true, codex: false });
    out = [];
    expect(await quizCommand(["notify"], deps())).toBe(0);
    expect(out).toEqual(["bkt quiz notify: silent, no chat session changed in the last 24 hours"]);
  });
});

describe("bkt quiz schedule", () => {
  test("the unit carries BKT_HOME when it is set at schedule time", async () => {
    expect(unitFiles(["/opt/bucket/bkt"], "08:53", { BKT_HOME: '/h/my "data" 50%' }).service).toBe(
      '[Unit]\nDescription=Bucket daily quiz notification\n\n[Service]\nType=oneshot\nEnvironment="BKT_HOME=/h/my \\"data\\" 50%%"\nExecStart="/opt/bucket/bkt" "quiz" "notify"\nTimeoutStartSec=15min\nKillMode=process\n',
    );
    expect(unitFiles(["/h/$x/bkt"], "08:53", { BKT_HOME: "/h/$data/100%" }).service).toContain('Environment="BKT_HOME=/h/$data/100%%"\nExecStart="/h/$$x/bkt" "quiz" "notify"\n');
    expect(unitFiles(["/b"], "08:53", { BKT_HOME: "" }).service).not.toContain("Environment");
    expect(() => unitFiles(["/b"], "08:53", { BKT_HOME: "/h\nExecStartPre=/bin/evil" })).toThrow("control character");
    expect(await quizCommand(["schedule"], deps("linux", { env: { BKT_HOME: "/h/alt" } }))).toBe(0);
    expect(readFileSync(join(home, ".config/systemd/user/bkt-quiz-notify.service"), "utf8")).toContain('Environment="BKT_HOME=/h/alt"\n');
  });

  test("the unit files are fixed text around the bkt path and the time", () => {
    expect(unitFiles(["/opt/bucket/bkt"])).toEqual({
      service: '[Unit]\nDescription=Bucket daily quiz notification\n\n[Service]\nType=oneshot\nExecStart="/opt/bucket/bkt" "quiz" "notify"\nTimeoutStartSec=15min\nKillMode=process\n',
      timer: "[Unit]\nDescription=Bucket daily quiz notification, once a day\n\n[Timer]\nOnCalendar=*-*-* 08:53:00\nPersistent=true\n\n[Install]\nWantedBy=timers.target\n",
    });
    expect(unitFiles(['/h/my "apps"/50%/$x/bkt'], "7:05").service).toContain('ExecStart="/h/my \\"apps\\"/50%%/$$x/bkt" "quiz" "notify"');
    expect(unitFiles(["/b"], "7:05").timer).toContain("OnCalendar=*-*-* 07:05:00");
    expect(() => unitFiles(["/h/a\nExecStartPre=/bin/evil"])).toThrow("control character");
    for (const bad of ["24:00", "8", "08:60", "08:53; rm", "*:00", ""]) expect(() => parseAt(bad)).toThrow("HH:MM");
  });

  test("schedule writes both units under the config folder and enables the timer", async () => {
    expect(await quizCommand(["schedule"], deps())).toBe(0);
    const dir = join(home, ".config/systemd/user");
    expect(readdirSync(dir).sort()).toEqual(["bkt-quiz-notify.service", "bkt-quiz-notify.timer"]);
    expect(readFileSync(join(dir, "bkt-quiz-notify.service"), "utf8")).toBe(unitFiles(["/opt/bucket/bkt"]).service);
    expect(readFileSync(join(dir, "bkt-quiz-notify.timer"), "utf8")).toBe(unitFiles(["/opt/bucket/bkt"]).timer);
    expect(calls).toEqual([
      ["systemctl", "--user", "daemon-reload"],
      ["systemctl", "--user", "enable", "--now", "bkt-quiz-notify.timer"],
    ]);
    calls = [];
    expect(await quizCommand(["schedule"], deps())).toBe(0);
    expect(await quizCommand(["schedule", "--at", "21:30"], deps())).toBe(0);
    expect(readFileSync(join(dir, "bkt-quiz-notify.timer"), "utf8")).toContain("OnCalendar=*-*-* 21:30:00");
    writeFileSync(join(dir, "bkt-quiz-notify.timer"), unitFiles(["/b"]).timer.replace("08:53:00", "08:53:00\nRandomizedDelaySec=1h"));
    expect(await quizCommand(["schedule", "--at", "21:30"], deps())).toBe(1);
    expect(out.at(-1)).toContain("bkt-quiz-notify.timer differs from what bkt would write; pass --force to replace");
    expect(readFileSync(join(dir, "bkt-quiz-notify.timer"), "utf8")).toContain("RandomizedDelaySec");
    writeFileSync(join(dir, "bkt-quiz-notify.timer"), unitFiles(["/b"]).timer.replace("08:53:00", "Mon 08:53:00"));
    expect(await quizCommand(["schedule"], deps())).toBe(1);
    expect(await quizCommand(["schedule", "--at", "21:30", "--force"], deps())).toBe(0);
    expect(await quizCommand(["schedule", "--force", "--at=6:00"], deps())).toBe(0);
    writeFileSync(join(dir, "bkt-quiz-notify.service"), "edited by hand");
    expect(await quizCommand(["schedule", "--at", "6:00"], deps())).toBe(1);
    expect(readFileSync(join(dir, "bkt-quiz-notify.service"), "utf8")).toBe("edited by hand");
    expect(await quizCommand(["schedule", "--at", "6:00", "--force"], deps())).toBe(0);
    expect(readFileSync(join(dir, "bkt-quiz-notify.timer"), "utf8")).toContain("OnCalendar=*-*-* 06:00:00");
    expect(await quizCommand(["schedule", "--at", "25:00"], deps())).toBe(2);
  });

  test("unschedule disables the timer, removes both units and leaves other units alone", async () => {
    const dir = join(home, ".config/systemd/user");
    await quizCommand(["schedule"], deps());
    writeFileSync(join(dir, "bkt-daily-critic-quiz.timer"), "founder");
    calls = [];
    expect(await quizCommand(["unschedule"], deps())).toBe(0);
    expect(readdirSync(dir)).toEqual(["bkt-daily-critic-quiz.timer"]);
    expect(calls).toEqual([
      ["systemctl", "--user", "disable", "--now", "bkt-quiz-notify.timer"],
      ["systemctl", "--user", "daemon-reload"],
    ]);
  });

  test("a systemctl failure exits 1 with the reason", async () => {
    answers = { systemctl: { code: 1, stdout: "", stderr: "Failed to connect to bus" } };
    expect(await quizCommand(["schedule"], deps())).toBe(1);
    expect(out.join("\n")).toContain("Failed to connect to bus");
  });

  test("macOS and Windows print that it is Linux only and exit 2", async () => {
    for (const os of ["darwin", "win32"])
      for (const cmd of ["schedule", "unschedule", "notify"]) {
        out = [];
        expect(await quizCommand([cmd], deps(os))).toBe(2);
        expect(out).toEqual([LINUX_ONLY]);
      }
    expect(calls).toEqual([]);
    expect(platformFor("darwin", { env: {}, home }).notifyCommand("t", "b", { name: "open", label: "Open" }, 1000)).toBeNull();
  });

  test("unknown arguments print usage and exit 2", async () => {
    for (const bad of [[], ["nope"], ["notify", "--loud"], ["schedule", "--at"], ["unschedule", "now"]]) expect(await quizCommand(bad, deps())).toBe(2);
    expect(out.every((l) => l === USAGE || l.includes("HH:MM"))).toBe(true);
    expect(calls).toEqual([]);
  });

  test("the unit points at the AppImage, the compiled binary or the script", () => {
    expect(selfArgv({ APPIMAGE: "/h/Bucket.AppImage" }, "/tmp/.mount_x/bkt", "/$bunfs/root/bkt")).toEqual(["/h/Bucket.AppImage"]);
    expect(selfArgv({}, "/usr/local/bin/bkt", "/$bunfs/root/bkt")).toEqual(["/usr/local/bin/bkt"]);
    expect(selfArgv({}, "/usr/bin/bun", "/src/cli.tsx")).toEqual(["/usr/bin/bun", "/src/cli.tsx"]);
  });
});

describe("bkt app --route", () => {
  test("a route is a plain path", () => {
    expect(checkRoute("/work/daily/2026-10-01")).toBe("/work/daily/2026-10-01");
    for (const ok of ["/work", "/import", "/learn", "/work/daily/2028-02-29"]) expect(checkRoute(ok)).toBe(ok);
    for (const bad of ["work", "/a/../b", "//evil.test", "/work?x=1", "/work#b", "/work ", "/a%2f", "javascript:alert(1)", "http://evil.test", "/unknown", "/work/daily", "/work/daily/2026-13-40", "/work/daily/2026-10-01/x", "/work/daily/../import", "/learn/deck", "/WORK", "", null, 5])
      expect(() => checkRoute(bad)).toThrow("--route takes /work/daily/YYYY-MM-DD");
    expect(routeUrl("http://127.0.0.1:5/", "/work/daily/2026-10-01")).toBe("http://127.0.0.1:5/#/work/daily/2026-10-01");
    expect(routeUrl("http://127.0.0.1:5/", null)).toBe("http://127.0.0.1:5/");
  });

  test("the command table carries the flag and the three quiz commands", () => {
    const run = (argv: string[]) => {
      const r = resolve(argv);
      if (r.kind !== "run") throw new Error("help");
      return [r.command.name, r.values];
    };
    expect(run(["app", "--route", "/work/daily/2026-10-01"])).toEqual(["app", { route: "/work/daily/2026-10-01" }]);
    expect(run(["quiz", "notify", "--force"])).toEqual(["quiz notify", { force: true }]);
    expect(run(["quiz", "schedule", "--at", "07:00"])).toEqual(["quiz schedule", { at: "07:00" }]);
    expect(run(["quiz", "unschedule"])[0]).toBe("quiz unschedule");
    expect(() => resolve(["quiz"])).toThrow("quiz needs a subcommand");
    expect(() => resolve(["quiz", "notify", "--loud"])).toThrow();
    expect(findCommand("quiz notify")!.session).toBeUndefined();
  });

  test("a waiting route is handed over once and a bad one is dropped", () => {
    const dir = join(home, "run");
    writeRoute(dir, "/work/daily/2026-10-01");
    expect(takeRoute(dir)).toBe("/work/daily/2026-10-01");
    expect(takeRoute(dir)).toBeNull();
    writeFileSync(join(dir, "app-route"), "//evil.test");
    expect(takeRoute(dir)).toBeNull();
    expect(existsSync(join(dir, "app-route"))).toBe(false);
    expect(() => writeRoute(dir, "../x")).toThrow("--route takes");
  });
});
