import { describe, expect, test } from "bun:test";
import { COMMANDS } from "../src/app";
import { applyColor, colorEnabled, interactive, JSON_SHAPES, jsonLine, pick } from "../src/cli/out";
import { CancelledError, describeFailure, NoDataError, preflight, resolve, UsageError } from "../src/cli/run";
import { CLI_COMMANDS, commandHelp, EXIT, generalHelp, paletteEntries, TABLE } from "../src/cli/table";
import { VERSION } from "../src/version";

const tty = { stdin: true, stdout: true };
const piped = { stdin: false, stdout: false };

function run(argv: string[]) {
  const r = resolve(argv);
  if (r.kind !== "run") throw new Error(`expected a command, got help for ${argv.join(" ")}`);
  return r;
}

function help(argv: string[]) {
  const r = resolve(argv);
  if (r.kind !== "help") throw new Error(`expected help for ${argv.join(" ")}`);
  return r.text;
}

describe("command table", () => {
  test("drives the palette entries the terminal app had before the table", () => {
    expect(COMMANDS).toEqual(paletteEntries());
    expect(COMMANDS.map((c) => [c.name, c.run, c.hint])).toEqual([
      ["quiz", "quiz", "timed multiple choice"],
      ["review", "review", "due cards, self rated"],
      ["stats", "stats", "counts and device"],
      ["home", "home", "main menu"],
      ["help", "help", "key bindings"],
      ["quit", "quit", "exit bkt"],
    ]);
  });

  test("every command name is unique and every palette-only entry stays off the command line", () => {
    expect(new Set(TABLE.map((c) => c.name)).size).toBe(TABLE.length);
    for (const name of ["quiz", "review", "home", "quit"]) expect(() => resolve([name])).toThrow(`unknown command ${name}`);
  });

  test("general help lists every command and the exit codes", () => {
    const text = generalHelp(VERSION);
    for (const c of CLI_COMMANDS) expect(text).toContain(`  ${c.name}`);
    expect(text).toContain("exit codes: 0 ok, 1 failure, 2 usage, 3 no data, 130 cancelled");
    expect(EXIT).toEqual({ ok: 0, failure: 1, usage: 2, noData: 3, cancelled: 130 });
  });

  test("command help lists that command's flags", () => {
    const text = commandHelp(CLI_COMMANDS.find((c) => c.name === "analyze")!);
    expect(text.split("\n")[0]).toBe("usage: bkt analyze <file> [options]");
    for (const flag of ["--force", "--no-helix", "--name NAME", "--horizon N", "--max-rows N", "--out DIR", "--json", "--tui", "--dev", "-h, --help"]) expect(text).toContain(flag);
  });
});

describe("resolve", () => {
  test("help forms return text", () => {
    const general = generalHelp(VERSION);
    expect(help(["--help"])).toBe(general);
    expect(help(["-h"])).toBe(general);
    expect(help(["help"])).toBe(general);
    expect(help(["help", "stats"])).toBe(help(["stats", "--help"]));
    expect(help(["stats", "-h"])).toContain("usage: bkt stats [options]");
    expect(help(["help", "hai", "score"])).toContain("usage: bkt hai score [options]");
    expect(help(["hai", "score", "--help"])).toContain("--max-usd USD");
    expect(help(["stats", "--nope", "--help"])).toContain("usage: bkt stats");
  });

  test("the default command, flags before the command and inline values", () => {
    expect(run([]).command.name).toBe("tui");
    expect(run(["--version"]).command.name).toBe("version");
    expect(run(["--version", "--json"]).values.json).toBe(true);
    const r = run(["--keyring", "passphrase", "stats", "--passphrase-fd=3", "--json"]);
    expect(r.command.name).toBe("stats");
    expect(r.values).toMatchObject({ keyring: "passphrase", "passphrase-fd": "3", json: true });
    expect(run(["forget", "people"]).command.name).toBe("forget people");
    expect(run(["hai"]).command.name).toBe("hai");
    expect(run(["hai", "review", "--clear", "a", "--clear=b"]).values.clear).toEqual(["a", "b"]);
    expect(run(["analyses", "some/dir"]).positionals).toEqual(["some/dir"]);
    expect(run(["analyze", "f.csv", "--horizon", "3"]).args).toEqual(["f.csv", "--horizon", "3"]);
    expect(run(["update", "--check"]).values.check).toBe(true);
  });

  test("usage errors", () => {
    const bad: [string[], string][] = [
      [["bogus"], "unknown command bogus"],
      [["--nope"], "unknown option --nope"],
      [["stats", "--nope"], "unknown option --nope"],
      [["stats", "extra"], "unexpected argument extra"],
      [["version", "--keyring", "passphrase"], "unknown option --keyring"],
      [["stats", "--version"], "unknown option --version"],
      [["hai", "bogus"], "unknown hai command bogus; try freeze, review, score, export, wipe"],
      [["forget"], "forget needs a subcommand: people"],
      [["forget", "pets"], "unknown forget command pets"],
      [["analyze"], "analyze needs <file>"],
      [["analyze", "a.csv", "b.csv"], "unexpected argument b.csv"],
      [["analyze", "a.csv", "--horizon", "x"], "--horizon needs a whole number"],
      [["hai", "score", "--max-usd", "0"], "--max-usd needs a positive dollar amount"],
      [["stats", "--passphrase-fd", "x"], "file descriptor"],
      [["stats", "--keyring"], "keyring"],
      [["help", "bogus"], "unknown command bogus"],
      [["help", "stats", "extra"], "unexpected argument extra"],
      [["update", "now"], "unexpected argument now"],
    ];
    for (const [argv, message] of bad) {
      let caught: unknown;
      try {
        resolve(argv);
      } catch (e) {
        caught = e;
      }
      expect(caught, argv.join(" ")).toBeInstanceOf(UsageError);
      expect((caught as Error).message, argv.join(" ")).toContain(message);
    }
  });
});

describe("preflight", () => {
  test("screens need a terminal", () => {
    for (const argv of [[], ["tui"], ["hai"], ["analyze", "f.csv", "--tui"]]) {
      expect(() => preflight(run(argv), {}, piped, "linux"), argv.join(" ")).toThrow("needs a terminal");
      expect(() => preflight(run(argv), { TERM: "dumb" }, tty, "linux"), argv.join(" ")).toThrow(UsageError);
      expect(() => preflight(run(argv), { TERM: "xterm" }, tty, "linux")).not.toThrow();
    }
    expect(() => preflight(run(["stats"]), { TERM: "dumb" }, piped, "linux")).not.toThrow();
    expect(() => preflight(run(["analyze", "f.csv"]), {}, piped, "linux")).not.toThrow();
    expect(() => preflight(run(["analyses"]), {}, piped, "linux")).not.toThrow();
  });

  test("keyring names and the passphrase prompt are checked before anything opens", () => {
    expect(() => preflight(run(["stats", "--keyring", "bogus"]), {}, piped, "linux")).toThrow("unknown keyring bogus; use libsecret or passphrase");
    expect(() => preflight(run(["stats"]), { BKT_KEYRING: "bogus" }, piped, "linux")).toThrow(UsageError);
    expect(() => preflight(run(["stats", "--keyring", "passphrase"]), {}, piped, "linux")).toThrow("needs a terminal or --passphrase-fd N");
    expect(() => preflight(run(["stats", "--keyring", "passphrase", "--passphrase-fd", "0"]), {}, piped, "linux")).not.toThrow();
    expect(() => preflight(run(["stats", "--keyring", "keychain"]), {}, piped, "darwin")).not.toThrow();
    expect(() => preflight(run(["stats", "--keyring", "native"]), {}, piped, "win32")).not.toThrow();
  });
});

describe("exit codes", () => {
  test("map from the failure kind", () => {
    expect(describeFailure(new UsageError("bad")).code).toBe(2);
    expect(describeFailure(new NoDataError("none")).code).toBe(3);
    expect(describeFailure(new CancelledError()).code).toBe(130);
    expect(describeFailure(new Error("boom"))).toEqual({ code: 1, lines: ["bkt: boom"] });
    const spec = CLI_COMMANDS.find((c) => c.name === "stats")!;
    expect(describeFailure(new UsageError("bad", spec)).lines).toEqual(["bkt: bad", "usage: bkt stats [options]", "run bkt help stats for its options"]);
  });
});

describe("colour and terminals", () => {
  test("NO_COLOR, a pipe and TERM=dumb each turn colour off", () => {
    expect(colorEnabled({ TERM: "xterm" }, tty)).toBe(true);
    expect(colorEnabled({ NO_COLOR: "1" }, tty)).toBe(false);
    expect(colorEnabled({ NO_COLOR: "" }, tty)).toBe(true);
    expect(colorEnabled({ TERM: "dumb" }, tty)).toBe(false);
    expect(colorEnabled({}, { stdin: true, stdout: false })).toBe(false);
    expect(interactive({}, { stdin: false, stdout: true })).toBe(false);
    expect(interactive({ TERM: "dumb" }, tty)).toBe(false);
  });

  test("turning colour off sets FORCE_COLOR=0 before the screen loads", () => {
    const off: Record<string, string | undefined> = {};
    applyColor(off, false);
    expect(off.FORCE_COLOR).toBe("0");
    const on: Record<string, string | undefined> = {};
    applyColor(on, true);
    expect(on.FORCE_COLOR).toBeUndefined();
  });
});

describe("json output", () => {
  test("golden shapes", () => {
    expect(jsonLine("version", { version: "0.4.0" })).toBe('{"v":1,"version":"0.4.0"}');
    expect(jsonLine("update", { status: "current", version: "0.4.0" })).toBe('{"v":1,"status":"current","version":"0.4.0"}');
    expect(jsonLine("update", { status: "available", version: "0.5.0", tag: "bkt-v0.5.0", asset: "bkt-linux-x64", sha256: "ab", url: "https://example.org/a" })).toBe(
      '{"v":1,"status":"available","version":"0.5.0","tag":"bkt-v0.5.0","asset":"bkt-linux-x64","sha256":"ab","url":"https://example.org/a"}',
    );
    expect(jsonLine("update", { status: "error", error: "no bkt release found" })).toBe('{"v":1,"status":"error","error":"no bkt release found"}');
    expect(jsonLine("stats", { items: 4, seen: 3, due: 2, attempts: 1 })).toBe('{"v":1,"items":4,"seen":3,"due":2,"attempts":1}');
    expect(jsonLine("analyses", { analyses: [] })).toBe('{"v":1,"analyses":[]}');
    expect(jsonLine("analyses", { analyses: [{ name: "a", dir: "/d/a", mtime: 5 }] })).toBe('{"v":1,"analyses":[{"name":"a","dir":"/d/a","mtime":5}]}');
    expect(
      jsonLine("whoami", { device: "dev_1", publicKey: "PUB", newDevice: false, keyring: "libsecret", pack: "abc", imported: 0, journal: "wal" }),
    ).toBe('{"v":1,"device":"dev_1","publicKey":"PUB","newDevice":false,"keyring":"libsecret","pack":"abc","imported":0,"journal":"wal"}');
  });

  test("hai export golden", () => {
    const probe = { id: "p1", bank_version: "b1", seed: "s", started_at: 1, completed_at: 2, due_at: 3, retest_completed_at: null };
    const answer = { id: "a1", probeId: "p1", pairId: "x", itemId: "i", condition: "solo", phase: "t0", choice: 2, correct: true, acceptedAi: null, elapsedMs: 9, at: 4 };
    expect(jsonLine("hai export", { probes: [probe], answers: [answer] })).toBe(
      '{"v":1,"probes":[{"id":"p1","bank_version":"b1","seed":"s","started_at":1,"completed_at":2,"due_at":3,"retest_completed_at":null}],' +
        '"answers":[{"id":"a1","probeId":"p1","pairId":"x","itemId":"i","condition":"solo","phase":"t0","choice":2,"correct":true,"acceptedAi":null,"elapsedMs":9,"at":4}]}',
    );
    expect(jsonLine("hai export", { probes: [{ ...probe, response_enc: "v1:sealed" }], answers: [{ ...answer, response_enc: "v1:sealed", key: "k" }], key: "k" })).toBe(
      jsonLine("hai export", { probes: [probe], answers: [answer] }),
    );
  });

  test("every --json command has a shape, and a shape passes only the fields it names", () => {
    for (const c of CLI_COMMANDS.filter((c) => c.json)) expect(Object.keys(JSON_SHAPES), c.name).toContain(c.name === "init" ? "whoami" : c.name);
    const dirty = {
      device: "dev_1",
      publicKey: "PUB",
      keyring: "libsecret",
      privateKey: "x",
      token: "x",
      dataKey: "x",
      anythingNew: "x",
      journal: { nested: "object where a scalar belongs" },
      pack: ["array where a scalar belongs"],
    };
    expect(jsonLine("whoami", dirty)).toBe('{"v":1,"device":"dev_1","publicKey":"PUB","keyring":"libsecret"}');
    expect(pick(JSON_SHAPES.stats, null)).toEqual({});
    expect(jsonLine("analyses", { analyses: [{ name: "a", secret: "x" }, "stray"] })).toBe('{"v":1,"analyses":[{"name":"a"},{}]}');
  });
});
