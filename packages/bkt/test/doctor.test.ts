import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pack from "../content/pack.json" with { type: "json" };
import { jsonLine } from "../src/cli/out";
import { ANALYSIS_MODULES, doctorLines, doctorPassed, packChecksum, runDoctor, type Check, type DoctorDeps } from "../src/doctor";
import { KeyringHeldError, MemoryKeyring, REMEDY, type Keyring } from "../src/keyring";
import type { Pack } from "../src/pack/export";
import { platformFor, type ExecResult } from "../src/platform";
import { openSession } from "../src/setup";
import { SCHEMA_VERSION } from "../src/store";

const CLI = join(import.meta.dir, "../src/cli.tsx");
const linux = process.platform === "linux";
const unix = process.platform !== "win32";
const content = pack as Pack;

let dir: string;
let home: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-doctor-"));
  home = join(dir, "data");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function snapshot(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (p: string, rel: string) => {
    const st = statSync(p);
    out[rel || "."] = `${st.isDirectory() ? "dir" : st.size} ${st.mode.toString(8)} ${st.isDirectory() ? "" : st.mtimeMs}`;
    if (st.isDirectory()) for (const f of readdirSync(p).sort()) walk(join(p, f), rel ? `${rel}/${f}` : f);
  };
  if (existsSync(root)) walk(root, "");
  return out;
}

class CountingKeyring implements Keyring {
  readonly kind = "libsecret" as const;
  sets = 0;
  constructor(private mode: "held" | "empty") {}
  async get(): Promise<string | null> {
    if (this.mode === "held") throw new KeyringHeldError("keyring locked: the keyring holds the key and would not release it.");
    return null;
  }
  async set(): Promise<void> {
    this.sets++;
  }
}

const pythonOk = (missing = ""): ExecResult => ({ code: 0, stdout: `3.13.1\n${missing}\n`, stderr: "" });

function deps(over: Partial<DoctorDeps> = {}): DoctorDeps {
  const env = {};
  return {
    dir: home,
    env,
    platform: platformFor(process.platform, { env }),
    keyring: () => new MemoryKeyring(),
    pack: content,
    uiDir: join(dir, "ui"),
    runtimeDir: join(dir, "run"),
    tty: { stdin: true, stdout: true },
    columns: 120,
    run: () => pythonOk(),
    alive: () => false,
    ...over,
  };
}

const byId = (checks: Check[], id: string) => checks.find((c) => c.id === id)!;

async function madeHome(): Promise<MemoryKeyring> {
  const kr = new MemoryKeyring();
  const s = await openSession(kr, home);
  s.store.importPack(content.version, content.items);
  s.store.close();
  mkdirSync(join(dir, "ui"));
  writeFileSync(join(dir, "ui", "index.html"), "<p>views</p>");
  return kr;
}

describe("bkt doctor checks", () => {
  test("a healthy home passes every check and nothing is written", async () => {
    const kr = await madeHome();
    const before = snapshot(dir);
    const checks = await runDoctor(deps({ keyring: () => kr }));
    expect(checks.map((c) => [c.id, c.status])).toEqual([
      ["data-folder", "ok"],
      ["key-store", "ok"],
      ["database", "ok"],
      ["content-pack", "ok"],
      ["window-files", "ok"],
      ["open-window", "ok"],
      ["python", "ok"],
      ["terminal", "ok"],
    ]);
    expect(byId(checks, "database").result).toBe(`It opens at version ${SCHEMA_VERSION}.`);
    expect(byId(checks, "content-pack").result).toBe(`Version ${content.version}, ${content.items.length} items, checksum matches. The database holds the same version.`);
    expect(byId(checks, "python").result).toBe("python3 3.13.1 has numpy, matplotlib, pypdf, pyarrow.".replace("python3", platformFor().python()));
    expect(byId(checks, "terminal").result).toBe("A real terminal, 120 columns wide, colour on.");
    expect(doctorPassed(checks)).toBe(true);
    expect(doctorLines(checks).at(-1)).toBe("All checks passed.");
    for (const c of checks) expect(c.fix).toBeNull();
    expect(snapshot(dir)).toEqual(before);
    expect(readdirSync(home).filter((f) => f.startsWith("bkt.db"))).toEqual(["bkt.db"]);
  });

  test("a locked key store fails with the one thing to do, and no key is stored", async () => {
    await madeHome();
    const before = snapshot(dir);
    const locked = new CountingKeyring("held");
    const checks = await runDoctor(deps({ keyring: () => locked }));
    const c = byId(checks, "key-store");
    expect(c.status).toBe("fail");
    expect(c.result).toStartWith("Locked: ");
    expect(c.fix).toBe(REMEDY.libsecret);
    expect(byId(checks, "database").status).toBe("ok");
    expect(doctorPassed(checks)).toBe(false);
    expect(doctorLines(checks).at(-1)).toBe("1 of 8 checks failed.");
    expect(locked.sets).toBe(0);
    expect(snapshot(dir)).toEqual(before);
  });

  test("a key store that holds no key beside a database reads locked or missing", async () => {
    await madeHome();
    const before = snapshot(dir);
    const empty = new CountingKeyring("empty");
    const c = byId(await runDoctor(deps({ keyring: () => empty })), "key-store");
    expect([c.status, c.result.split(":")[0], c.fix]).toEqual(["fail", "Locked or missing", REMEDY.libsecret]);
    expect(empty.sets).toBe(0);
    expect(snapshot(dir)).toEqual(before);
  });

  test("an unavailable key store and a vanished passphrase vault each name their fix", async () => {
    await madeHome();
    const none = byId(await runDoctor(deps({ keyring: () => null })), "key-store");
    expect([none.status, none.fix]).toEqual(["fail", "Sign in to a desktop session, or run bkt init --keyring passphrase."]);
    const vault = byId(await runDoctor(deps({ keyringKind: "passphrase" })), "key-store");
    expect([vault.status, vault.fix]).toEqual(["fail", REMEDY.passphrase]);
    const odd = byId(await runDoctor(deps({ keyringKind: "bogus" })), "key-store");
    expect(odd.status).toBe("fail");
  });

  test("a missing database fails, creates no database and mints no key", async () => {
    const kr = await madeHome();
    for (const f of readdirSync(home).filter((f) => f.startsWith("bkt.db"))) rmSync(join(home, f));
    const before = snapshot(dir);
    const counting = new CountingKeyring("empty");
    const checks = await runDoctor(deps({ keyring: () => counting }));
    expect(byId(checks, "database")).toMatchObject({ status: "fail", result: "No database yet.", fix: "Run bkt init." });
    expect(byId(checks, "key-store").status).toBe("ok");
    expect(doctorPassed(checks)).toBe(false);
    expect(counting.sets).toBe(0);
    expect(snapshot(dir)).toEqual(before);
    expect(existsSync(join(home, "bkt.db"))).toBe(false);
    expect(doctorPassed(await runDoctor(deps({ keyring: () => kr })))).toBe(false);
  });

  test("a home that does not exist stays absent", async () => {
    const checks = await runDoctor(deps());
    expect(byId(checks, "data-folder")).toMatchObject({ status: "fail", fix: "Run bkt init." });
    expect(byId(checks, "database").status).toBe("fail");
    expect(existsSync(home)).toBe(false);
    expect(readdirSync(dir)).toEqual([]);
  });

  test("a damaged database, a newer database and an older database each read plainly", async () => {
    const kr = await madeHome();
    const db = join(home, "bkt.db");
    const set = (v: number) => {
      const h = new Database(db);
      h.run(`pragma user_version = ${v}`);
      h.close();
    };
    set(SCHEMA_VERSION + 1);
    const newer = byId(await runDoctor(deps({ keyring: () => kr })), "database");
    expect([newer.status, newer.fix]).toEqual(["fail", "Run bkt update and install the newer release."]);
    set(SCHEMA_VERSION - 1);
    const older = byId(await runDoctor(deps({ keyring: () => kr })), "database");
    expect(older).toMatchObject({ status: "ok", result: `It opens at version ${SCHEMA_VERSION - 1}. The next bkt command brings it to version ${SCHEMA_VERSION}.` });
    for (const f of readdirSync(home).filter((f) => f.startsWith("bkt.db-"))) rmSync(join(home, f));
    writeFileSync(db, "this is no database, only text that fills the first page".repeat(40));
    const damaged = byId(await runDoctor(deps({ keyring: () => kr })), "database");
    expect(damaged.status).toBe("fail");
    expect(damaged.fix).toContain("move it aside and run bkt init");
  });

  test.skipIf(!unix)("a data folder open to other users fails with the chmod to run", async () => {
    await madeHome();
    chmodSync(home, 0o755);
    const c = byId(await runDoctor(deps()), "data-folder");
    expect([c.status, c.fix]).toEqual(["fail", `Run chmod 700 ${home}`]);
    expect(statSync(home).mode & 0o777).toBe(0o755);
  });

  test("the content pack check recomputes the checksum", async () => {
    expect(packChecksum(content)).toBe(content.version);
    const c = byId(await runDoctor(deps({ pack: { ...content, version: "000000000000" } })), "content-pack");
    expect([c.status, c.fix]).toEqual(["fail", "Install bkt again: run bkt update."]);
  });

  test("window files, an open window, analysis tools and the terminal", async () => {
    const kr = await madeHome();
    rmSync(join(dir, "ui"), { recursive: true });
    mkdirSync(join(dir, "run"));
    const record = join(dir, "run", "app.json");
    writeFileSync(record, JSON.stringify({ pid: 4242, port: 5151 }));
    const calls: string[][] = [];
    const checks = await runDoctor(
      deps({
        alive: (pid) => pid === 4242,
        run: (argv) => (calls.push(argv), pythonOk("pypdf pyarrow")),
        tty: { stdin: false, stdout: false },
        columns: undefined,
        env: { NO_COLOR: "1" },
      }),
    );
    expect(byId(checks, "window-files")).toMatchObject({ status: "warn", fix: "Install the Bucket desktop app, or set BKT_UI_DIR to the built views." });
    expect(byId(checks, "open-window").result).toBe("A window is open on port 5151.");
    const py = platformFor().python();
    expect(byId(checks, "python")).toMatchObject({ status: "warn", result: `${py} 3.13.1 lacks pypdf, pyarrow.`, fix: `Run ${py} -m pip install --user pypdf pyarrow` });
    expect(calls[0].slice(-4)).toEqual(ANALYSIS_MODULES);
    expect(calls[0]).toContain("-B");
    expect(byId(checks, "terminal").result).toBe("No terminal here; the terminal app needs one, width unknown, colour off.");

    const stale = await runDoctor(deps({ keyring: () => kr, run: () => ({ code: 127, stdout: "", stderr: "" }) }));
    expect(byId(stale, "open-window").result).toBe("No window is open.");
    expect(existsSync(record)).toBe(true);
    expect(byId(stale, "python")).toMatchObject({ status: "warn", fix: "Install Python 3 from python.org." });
    expect(doctorLines(stale).at(-1)).toBe("No check failed. 2 of 8 carry a warning.");
  });

  test("the analysis modules match the analyzer's requirements", () => {
    const wanted = readFileSync(join(import.meta.dir, "../analyze/requirements.txt"), "utf8").trim().split("\n").map((l) => l.split("==")[0]);
    expect(ANALYSIS_MODULES).toEqual(wanted);
  });

  test("lines are one per check with the fix on a problem, and --json carries the same checks", () => {
    const checks: Check[] = [
      { id: "data-folder", name: "Data folder", status: "ok", result: "It is private to you.", fix: null },
      { id: "database", name: "Database", status: "fail", result: "No database yet.", fix: "Run bkt init." },
    ];
    expect(doctorLines(checks)).toEqual(["ok    Data folder  It is private to you.", "fail  Database     No database yet. Fix: Run bkt init.", "1 of 2 checks failed."]);
    expect(jsonLine("doctor", { ok: false, checks: checks.map((c) => ({ ...c, secret: "x" })) })).toBe(
      '{"v":1,"ok":false,"checks":[{"id":"data-folder","name":"Data folder","status":"ok","result":"It is private to you.","fix":null},{"id":"database","name":"Database","status":"fail","result":"No database yet.","fix":"Run bkt init."}]}',
    );
  });
});

describe("bkt doctor through the command line", () => {
  let env: Record<string, string>;
  let lockFlag: string;
  let keyringLog: string;

  beforeEach(() => {
    const bin = join(dir, "bin");
    const store = join(dir, "keyring-store");
    mkdirSync(bin);
    mkdirSync(store);
    mkdirSync(join(dir, "ui"));
    writeFileSync(join(dir, "ui", "index.html"), "<p>views</p>");
    lockFlag = join(dir, "locked");
    keyringLog = join(dir, "keyring.log");
    writeFileSync(
      join(bin, "secret-tool"),
      [
        "#!/bin/bash",
        `echo "$1" >> "${keyringLog}"`,
        `f="${store}/\${@: -1}"`,
        `if [ "$1" = search ]; then if [ -f "$f" ]; then echo "[/org/freedesktop/secrets/collection/login/1]"; fi; exit 0; fi`,
        `if [ "$1" = store ]; then IFS= read -r -d '' v; printf %s "$v" > "$f"; exit 0; fi`,
        `if [ -f "${lockFlag}" ]; then exit 1; fi`,
        `if [ -f "$f" ]; then printf %s "$(<"$f")"; else exit 1; fi`,
        "",
      ].join("\n"),
    );
    chmodSync(join(bin, "secret-tool"), 0o755);
    env = {
      PATH: bin,
      HOME: join(dir, "user"),
      BKT_HOME: home,
      BKT_UI_DIR: join(dir, "ui"),
      XDG_RUNTIME_DIR: join(dir, "run"),
      TMPDIR: dir,
      DBUS_SESSION_BUS_ADDRESS: "unix:path=/nonexistent/bkt-test-bus",
    };
  });

  function bkt(args: string[], stdin?: string) {
    const r = Bun.spawnSync([process.execPath, CLI, ...args], { env, stdin: stdin === undefined ? "ignore" : Buffer.from(stdin), stdout: "pipe", stderr: "pipe" });
    return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
  }
  const vault = ["--keyring", "passphrase", "--passphrase-fd", "0"];
  const stores = () => (existsSync(keyringLog) ? readFileSync(keyringLog, "utf8").split("\n").filter((c) => c === "store").length : 0);

  test("a fresh home exits 1, says run bkt init, and stays absent", () => {
    const r = bkt(["doctor", "--keyring", "passphrase"]);
    expect(r.code).toBe(1);
    expect(r.err).toBe("");
    expect(r.out).toContain("fail  Database        No database yet. Fix: Run bkt init.");
    expect(r.out.trimEnd().split("\n")).toHaveLength(9);
    expect(existsSync(home)).toBe(false);
    expect(existsSync(join(dir, "run"))).toBe(false);
    expect(stores()).toBe(0);
  }, 60_000);

  test("after init with a vault it exits 0, --json carries the same checks, and nothing is written", () => {
    expect(bkt(["init", ...vault], "pw\n").code).toBe(0);
    const before = snapshot(dir);
    const text = bkt(["doctor", "--keyring", "passphrase"]);
    expect(text.err).toBe("");
    expect(text.code).toBe(0);
    expect(text.out).toContain("ok    Key store       The passphrase vault is present. Doctor leaves it closed.");
    expect(text.out).toContain(`ok    Database        It opens at version ${SCHEMA_VERSION}.`);
    expect(text.out).toContain("ok    Window files  ");
    const json = bkt(["doctor", "--json", "--keyring", "passphrase"]);
    const body = JSON.parse(json.out) as { v: number; ok: boolean; checks: Check[] };
    expect(json.out.trimEnd().split("\n")).toHaveLength(1);
    expect([body.v, body.ok]).toEqual([1, true]);
    expect(body.checks.map((c) => c.id)).toEqual(["data-folder", "key-store", "database", "content-pack", "window-files", "open-window", "python", "terminal"]);
    expect(Object.keys(body.checks[0])).toEqual(["id", "name", "status", "result", "fix"]);
    expect(snapshot(dir)).toEqual(before);

    for (const f of readdirSync(home).filter((f) => f.startsWith("bkt.db"))) rmSync(join(home, f));
    const gone = bkt(["doctor", "--keyring", "passphrase"]);
    expect(gone.code).toBe(1);
    expect(gone.out).toContain("No database yet. Fix: Run bkt init.");
    expect(existsSync(join(home, "bkt.db"))).toBe(false);
  }, 120_000);

  test.skipIf(!linux)("a locked login keyring exits 1 with the unlock step and stores nothing", () => {
    expect(bkt(["init"]).code).toBe(0);
    const good = bkt(["doctor"]);
    expect(good.code).toBe(0);
    expect(good.out).toContain("ok    Key store       The login keyring holds the keys for this folder.");
    const minted = stores();
    writeFileSync(lockFlag, "");
    const before = snapshot(dir);
    const locked = bkt(["doctor"]);
    expect(locked.code).toBe(1);
    expect(locked.out).toContain(`fail  Key store       Locked: the login keyring holds the keys and would not release them. Fix: ${REMEDY.libsecret}`);
    expect(locked.out.trimEnd().split("\n").at(-1)).toBe("1 of 8 checks failed.");
    expect(stores()).toBe(minted);
    const after = snapshot(dir);
    delete before["keyring.log"];
    delete after["keyring.log"];
    expect(after).toEqual(before);
  }, 120_000);

  test("doctor and completion appear in bkt --help", () => {
    const help = bkt(["--help"]).out;
    expect(help).toContain("  doctor  ");
    expect(help).toContain("  completion <bash|zsh|fish>  ");
    expect(bkt(["help", "doctor"]).out).toContain("--keyring KIND");
  }, 60_000);
});
