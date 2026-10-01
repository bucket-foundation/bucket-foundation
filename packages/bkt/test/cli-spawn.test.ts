import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pack from "../content/pack.json" with { type: "json" };
import { DATA_KEY_ACCOUNT, DEVICE_ACCOUNT, ensureDataKey, ensureDevice } from "../src/device";
import { MemoryKeyring } from "../src/keyring";
import { keyAccounts, keyScope } from "../src/setup";
import { Store } from "../src/store";
import { PassphraseKeyring } from "../src/keyring";
import { VERSION } from "../src/version";

const CLI = join(import.meta.dir, "../src/cli.tsx");
const linux = process.platform === "linux";

let dir: string;
let home: string;
let keyringLog: string;
let keyringStore: string;
let lockFlag: string;
let env: Record<string, string>;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-cli-"));
  home = join(dir, "data");
  keyringLog = join(dir, "keyring.log");
  keyringStore = join(dir, "keyring-store");
  const bin = join(dir, "bin");
  mkdirSync(bin);
  mkdirSync(keyringStore);
  lockFlag = join(dir, "locked");
  writeFileSync(
    join(bin, "secret-tool"),
    [
      "#!/bin/bash",
      `echo "$1" >> "${keyringLog}"`,
      `f="${keyringStore}/\${@: -1}"`,
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
    BKT_ANALYSES: join(dir, "analyses"),
    DBUS_SESSION_BUS_ADDRESS: "unix:path=/nonexistent/bkt-test-bus",
  };
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function bkt(args: string[], o: { stdin?: string; env?: Record<string, string> } = {}) {
  const r = Bun.spawnSync([process.execPath, CLI, ...args], {
    env: { ...env, ...o.env },
    stdin: o.stdin === undefined ? "ignore" : Buffer.from(o.stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
}

const keyringCalls = () => (existsSync(keyringLog) ? readFileSync(keyringLog, "utf8").trim().split("\n") : []);
const untouched = () => !existsSync(home) && keyringCalls().length === 0;
const vault = ["--keyring", "passphrase", "--passphrase-fd", "0"];

describe("help", () => {
  test("--help, -h and help print the same usage and exit 0", () => {
    const outs = [["--help"], ["-h"], ["help"]].map((a) => bkt(a));
    for (const r of outs) {
      expect(r.code).toBe(0);
      expect(r.err).toBe("");
      expect(r.out).toContain("usage: bkt [command] [options]");
      expect(r.out).toBe(outs[0].out);
    }
    expect(untouched()).toBe(true);
  });

  test("help <command> and <command> --help print that command's usage", () => {
    const a = bkt(["help", "analyze"]);
    const b = bkt(["analyze", "--help"]);
    expect(a.code).toBe(0);
    expect(a.out).toBe(b.out);
    expect(a.out.split("\n")[0]).toBe("usage: bkt analyze <file> [options]");
    expect(bkt(["hai", "score", "-h"]).out).toContain("usage: bkt hai score [options]");
    expect(untouched()).toBe(true);
  });
});

describe("usage errors", () => {
  test("a bad command or flag exits 2 and leaves an empty BKT_HOME and the keyring alone", () => {
    const cases = [
      ["bogus"],
      ["sttas"],
      ["stats", "--nope"],
      ["--nope"],
      ["stats", "extra"],
      ["init", "--keyring", "bogus"],
      ["init", "--passphrase-fd", "x"],
      ["hai", "bogus"],
      ["forget"],
      ["analyze"],
      ["help", "bogus"],
      ["update", "--chek"],
    ];
    for (const args of cases) {
      const r = bkt(args);
      expect(r.code, args.join(" ")).toBe(2);
      expect(r.out, args.join(" ")).toBe("");
      expect(r.err, args.join(" ")).toStartWith("bkt: ");
      expect(r.err, args.join(" ")).toContain("usage: bkt");
      expect(untouched(), args.join(" ")).toBe(true);
    }
    expect(bkt(["bogus"]).err).toBe("bkt: unknown command bogus\nusage: bkt [command] [options]\nrun bkt help for the command list\n");
  });

  test("a screen without a terminal prints usage and exits 2", () => {
    for (const args of [[], ["tui"], ["hai"], ["analyze", "data.csv", "--tui"]]) {
      const r = bkt(args);
      expect(r.code, args.join(" ")).toBe(2);
      expect(r.err, args.join(" ")).toContain("needs a terminal");
      expect(r.err, args.join(" ")).toContain("usage: bkt");
      expect(r.out + r.err).not.toContain("\u001b[");
    }
    expect(bkt([], { env: { TERM: "dumb" } }).code).toBe(2);
    expect(untouched()).toBe(true);
  });

  test("the passphrase keyring without a terminal or --passphrase-fd exits 2 before the data dir exists", () => {
    const r = bkt(["init", "--keyring", "passphrase"]);
    expect(r.code).toBe(2);
    expect(r.err).toContain("needs a terminal or --passphrase-fd N");
    expect(untouched()).toBe(true);
  });
});

describe("json output", () => {
  test("version", () => {
    expect(bkt(["version", "--json"])).toEqual({ code: 0, out: `{"v":1,"version":"${VERSION}"}\n`, err: "" });
    expect(bkt(["--version", "--json"]).out).toBe(`{"v":1,"version":"${VERSION}"}\n`);
    expect(bkt(["--version"]).out).toBe(`${VERSION}\n`);
    expect(bkt(["version"], { env: { NO_COLOR: "1" } }).out).toBe(`${VERSION}\n`);
    expect(untouched()).toBe(true);
  });

  test("analyses lists as text and JSON, and exits 3 with none", () => {
    const none = bkt(["analyses", "--json"]);
    expect(none.code).toBe(3);
    expect(none.out).toBe('{"v":1,"analyses":[]}\n');
    expect(none.err).toBe("bkt: no saved analyses; run bkt analyze <file>\n");
    expect(bkt(["analyses"]).code).toBe(3);

    const one = join(env.BKT_ANALYSES, "sales-2026-10-01");
    mkdirSync(one, { recursive: true });
    writeFileSync(join(one, "report.md"), "# sales\n");
    const listed = bkt(["analyses", "--json"]);
    expect(listed.code).toBe(0);
    const body = JSON.parse(listed.out);
    expect(typeof body.analyses[0].mtime).toBe("number");
    body.analyses[0].mtime = 0;
    expect(JSON.stringify(body)).toBe(`{"v":1,"analyses":[{"name":"sales-2026-10-01","dir":${JSON.stringify(one)},"mtime":0}]}`);
    expect(bkt(["analyses"])).toEqual({ code: 0, out: `sales-2026-10-01\t${one}\n`, err: "" });
    expect(bkt(["analyses", join(dir, "elsewhere"), "--json"]).code).toBe(3);
    expect(untouched()).toBe(true);
  });

  test("whoami, init and stats through the passphrase vault, with no secret in any output", async () => {
    const first = bkt(["init", ...vault], { stdin: "pw\n" });
    expect(first.err).toBe("");
    expect(first.code).toBe(0);
    const legacy = JSON.parse(first.out);
    expect(legacy.v).toBeUndefined();
    expect(legacy.newDevice).toBe(true);
    expect(keyringCalls()).toEqual([]);

    const items = (pack as { items: unknown[]; version: string }).items.length;
    const who = bkt(["whoami", "--json", ...vault], { stdin: "pw\n" });
    expect(who.code).toBe(0);
    expect(who.out).toBe(
      `{"v":1,"device":"${legacy.device}","publicKey":"${legacy.publicKey}","newDevice":false,"keyring":"passphrase","pack":"${(pack as { version: string }).version}","imported":0,"journal":"wal"}\n`,
    );
    const init = bkt(["init", "--json", ...vault], { stdin: "pw\n" });
    expect(init.out).toBe(who.out);
    const stats = bkt(["stats", "--json", ...vault], { stdin: "pw\n" });
    expect(stats).toEqual({ code: 0, out: `{"v":1,"items":${items},"seen":0,"due":0,"attempts":0}\n`, err: "" });
    const text = bkt(["stats", ...vault], { stdin: "pw\n" });
    expect(text.out).toBe(`items     ${items}\nseen      0\ndue       0\nattempts  0\n`);
    const whoText = bkt(["whoami", ...vault], { stdin: "pw\n" });
    expect(whoText.out).toContain(`device     ${legacy.device}\n`);

    const kr = new PassphraseKeyring(join(home, "keyring.json"), "pw");
    const dataKey = (await kr.get(keyAccounts(home).data))!;
    const pem = (await kr.get(keyAccounts(home).device))!;
    const secrets = [dataKey, Buffer.from(dataKey, "hex").toString("base64"), pem.split("\n")[1], "PRIVATE KEY", "passphrase-fd", "pw\n"];
    const sealed = Object.values((JSON.parse(readFileSync(join(home, "keyring.json"), "utf8")) as { entries: Record<string, string> }).entries);
    expect(dataKey).toHaveLength(64);
    expect(sealed.length).toBe(2);
    const hai = bkt(["hai", "export", "--json", ...vault], { stdin: "pw\n" });
    expect(hai).toEqual({ code: 0, out: '{"v":1,"probes":[],"answers":[]}\n', err: "" });
    expect(JSON.parse(bkt(["hai", "export", ...vault], { stdin: "pw\n" }).out)).toEqual({ probes: [], answers: [] });
    for (const r of [first, who, init, stats, text, whoText, hai, bkt(["version", "--json"]), bkt(["analyses", "--json"])]) {
      for (const s of [...secrets, ...sealed]) expect(r.out + r.err).not.toContain(s);
    }
  }, 60_000);
});

describe("keyring guard through the command line", () => {
  test.skipIf(!linux)("a fresh home mints keys once, a locked collection later refuses and writes nothing", () => {
    const first = bkt(["init"]);
    expect(first.err).toBe("");
    expect(JSON.parse(first.out)).toMatchObject({ newDevice: true, keyring: "libsecret" });
    expect(keyringCalls().filter((c) => c === "store")).toHaveLength(2);
    expect(bkt(["stats", "--json"]).code).toBe(0);
    expect(keyringCalls().filter((c) => c === "store")).toHaveLength(2);

    const held = join(dir, "held");
    mkdirSync(held);
    for (const f of readdirSync(keyringStore)) {
      writeFileSync(join(held, f), readFileSync(join(keyringStore, f)));
      rmSync(join(keyringStore, f));
    }
    const db = readFileSync(join(home, "bkt.db"));
    for (const args of [["stats"], ["init"], ["whoami", "--json"]]) {
      const locked = bkt(args);
      expect(locked.code, args.join(" ")).toBe(1);
      expect(locked.out).toBe("");
      expect(locked.err).toContain("bkt: keyring locked or key missing");
      expect(locked.err).toContain("Unlock the login keyring");
    }
    expect(keyringCalls().filter((c) => c === "store")).toHaveLength(2);
    expect(readdirSync(keyringStore)).toEqual([]);
    expect(readFileSync(join(home, "bkt.db")).equals(db)).toBe(true);

    for (const f of readdirSync(held)) writeFileSync(join(keyringStore, f), readFileSync(join(held, f)));
    expect(bkt(["stats", "--json"]).code).toBe(0);
  }, 60_000);

  test("a vault that vanished beside a database refuses and stays gone", () => {
    expect(bkt(["init", ...vault], { stdin: "pw\n" }).code).toBe(0);
    rmSync(join(home, "keyring.json"));
    const db = readFileSync(join(home, "bkt.db"));
    const r = bkt(["stats", ...vault], { stdin: "pw\n" });
    expect(r.code).toBe(1);
    expect(r.err).toContain("bkt: keyring locked or key missing");
    expect(r.err).toContain("Put keyring.json back");
    expect(existsSync(join(home, "keyring.json"))).toBe(false);
    expect(readFileSync(join(home, "bkt.db")).equals(db)).toBe(true);
    expect(keyringCalls()).toEqual([]);
  }, 60_000);
});

const stored = () => Object.fromEntries(readdirSync(keyringStore).sort().map((f) => [f, readFileSync(join(keyringStore, f), "utf8")]));
const storeCalls = () => keyringCalls().filter((c) => c === "store").length;

async function legacyHome(): Promise<void> {
  const kr = new MemoryKeyring();
  const key = await ensureDataKey(kr);
  const device = await ensureDevice(kr);
  writeFileSync(join(keyringStore, DATA_KEY_ACCOUNT), (await kr.get(DATA_KEY_ACCOUNT))!);
  writeFileSync(join(keyringStore, DEVICE_ACCOUNT), (await kr.get(DEVICE_ACCOUNT))!);
  mkdirSync(home, { recursive: true });
  const store = new Store(join(home, "bkt.db"), key);
  store.recordDevice(device.id, device.publicKey, 1);
  store.close();
}

describe.skipIf(!linux)("keyring entries scoped to the data folder, through the command line", () => {
  test("a 0.4.0 home with unscoped entries still opens and nothing is stored", async () => {
    await legacyHome();
    const before = stored();
    const r = bkt(["whoami", "--json"]);
    expect(r.err).toBe("");
    expect(JSON.parse(r.out)).toMatchObject({ v: 1, newDevice: false, keyring: "libsecret" });
    expect(bkt(["stats", "--json"]).code).toBe(0);
    expect(storeCalls()).toBe(0);
    expect(stored()).toEqual(before);
    expect(keyScope(home)).toBeUndefined();
  }, 60_000);

  test("a second BKT_HOME stores under its own scope and leaves 0.4.0 entries and the first home alone", async () => {
    await legacyHome();
    const before = stored();
    const other = join(dir, "other");
    expect(bkt(["init"], { env: { BKT_HOME: other } }).code).toBe(0);
    const scope = keyScope(other)!;
    expect(Object.keys(stored()).sort()).toEqual([DATA_KEY_ACCOUNT, `${DATA_KEY_ACCOUNT}.${scope}`, DEVICE_ACCOUNT, `${DEVICE_ACCOUNT}.${scope}`].sort());
    expect(stored()[DATA_KEY_ACCOUNT]).toBe(before[DATA_KEY_ACCOUNT]);
    expect(stored()[DEVICE_ACCOUNT]).toBe(before[DEVICE_ACCOUNT]);
    expect(bkt(["stats", "--json"]).code).toBe(0);
    expect(bkt(["stats", "--json"], { env: { BKT_HOME: other } }).code).toBe(0);
  }, 60_000);

  test("a locked collection that reports absent never overwrites an entry, with the data folder present, emptied or elsewhere", async () => {
    expect(bkt(["init"]).code).toBe(0);
    const before = stored();
    const calls = storeCalls();
    writeFileSync(lockFlag, "");

    const withDb = bkt(["stats"]);
    expect(withDb.code).toBe(1);
    expect(withDb.err).toContain("keyring locked or key missing");

    const aside = join(dir, "aside");
    mkdirSync(aside);
    for (const f of readdirSync(home).filter((f) => f.startsWith("bkt.db"))) {
      writeFileSync(join(aside, f), readFileSync(join(home, f)));
      rmSync(join(home, f));
    }
    const noDb = bkt(["init"]);
    expect(noDb.code).toBe(1);
    expect(noDb.err).toContain("bkt: keyring locked");
    expect(noDb.err).toContain("Unlock the login keyring");
    expect(existsSync(join(home, "bkt.db"))).toBe(false);
    expect(storeCalls()).toBe(calls);
    expect(stored()).toEqual(before);

    const elsewhere = join(dir, "elsewhere");
    bkt(["init"], { env: { BKT_HOME: elsewhere } });
    for (const [name, secret] of Object.entries(before)) expect(stored()[name]).toBe(secret);

    rmSync(lockFlag);
    for (const f of readdirSync(aside)) writeFileSync(join(home, f), readFileSync(join(aside, f)));
    expect(bkt(["stats", "--json"]).code).toBe(0);
  }, 60_000);

  test("0.4.0 entries survive a locked collection when the data folder is missing", async () => {
    await legacyHome();
    const before = stored();
    rmSync(home, { recursive: true });
    writeFileSync(lockFlag, "");
    bkt(["init"]);
    bkt(["init"], { env: { BKT_HOME: join(dir, "elsewhere") } });
    expect(stored()[DATA_KEY_ACCOUNT]).toBe(before[DATA_KEY_ACCOUNT]);
    expect(stored()[DEVICE_ACCOUNT]).toBe(before[DEVICE_ACCOUNT]);
  }, 60_000);
});
