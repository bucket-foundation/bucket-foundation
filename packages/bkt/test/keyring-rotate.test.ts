import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemoryKeyring, PassphraseKeyring, SecretToolKeyring, SERVICE, type Keyring } from "../src/keyring";
import { DpapiKeyring, KeychainKeyring, type Exec } from "../src/platform";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-rotate-"));
});
afterEach(() => {
  if (existsSync(join(dir, "vault"))) chmodSync(join(dir, "vault"), 0o700);
  rmSync(dir, { recursive: true, force: true });
});

function secretTool(): { kr: SecretToolKeyring; argv: () => string } {
  const store = join(dir, "store");
  const log = join(dir, "argv.log");
  const bin = join(dir, "secret-tool");
  writeFileSync(
    bin,
    [
      "#!/bin/bash",
      `printf '%s\\n' "$*" >> "${log}"`,
      `f="${store}.\${@: -1}"`,
      `case "$1" in`,
      `  store) [ -f "${join(dir, "fail")}" ] && { echo "write denied" >&2; exit 1; }; IFS= read -r -d '' v; printf %s "$v" > "$f"; exit 0;;`,
      `  lookup) [ -f "$f" ] && cat "$f" && exit 0; exit 1;;`,
      `  search) exit 0;;`,
      `  clear) rm -f "$f"; exit 0;;`,
      `esac`,
      "exit 2",
    ].join("\n"),
  );
  chmodSync(bin, 0o755);
  return { kr: new SecretToolKeyring(bin), argv: () => (existsSync(log) ? readFileSync(log, "utf8") : "") };
}

function security(fail: { on: boolean }) {
  const items = new Map<string, string>();
  const run: Exec = async (argv, stdin) => {
    if (argv[1] === "find-generic-password") {
      const v = items.get(argv[5]);
      return v === undefined ? { code: 44, stdout: "", stderr: "not found" } : { code: 0, stdout: `${v}\n`, stderr: "" };
    }
    if (argv[1] === "delete-generic-password") return items.delete(argv[5]) ? { code: 0, stdout: "", stderr: "" } : { code: 44, stdout: "", stderr: "not found" };
    if (argv[1] === "-i") {
      if (fail.on) return { code: 1, stdout: "", stderr: "write denied" };
      const m = stdin!.match(/^add-generic-password( -U)? -s (\S+) -a (\S+) -l "[^"]*" -w (\S+)\n$/);
      if (!m || m[2] !== SERVICE) return { code: 1, stdout: "", stderr: "bad line" };
      if (items.has(m[3]) && !m[1]) return { code: 45, stdout: "", stderr: "already exists" };
      items.set(m[3], m[4]);
      return { code: 0, stdout: "", stderr: "" };
    }
    return { code: 1, stdout: "", stderr: "unknown" };
  };
  return run;
}

function powershell(fail: { on: boolean }): Exec {
  return async (argv, stdin) => {
    const script = argv[argv.length - 1];
    const data = Buffer.from(stdin!.trim(), "base64");
    if (script.includes("::Protect(")) return fail.on ? { code: 1, stdout: "", stderr: "access denied" } : { code: 0, stdout: Buffer.concat([Buffer.from("DP"), data]).toString("base64"), stderr: "" };
    if (script.includes("::Unprotect(")) return { code: 0, stdout: data.subarray(2).toString("base64"), stderr: "" };
    return { code: 1, stdout: "", stderr: "unknown" };
  };
}

interface Backend {
  name: string;
  make: () => { kr: Keyring; fail: () => void };
}

const BACKENDS: Backend[] = [
  { name: "memory", make: () => ({ kr: new MemoryKeyring(), fail: () => {} }) },
  {
    name: "libsecret",
    make: () => ({ kr: secretTool().kr, fail: () => writeFileSync(join(dir, "fail"), "") }),
  },
  {
    name: "keychain",
    make: () => {
      const f = { on: false };
      return { kr: new KeychainKeyring(security(f)), fail: () => (f.on = true) };
    },
  },
  {
    name: "dpapi",
    make: () => {
      const f = { on: false };
      return { kr: new DpapiKeyring(join(dir, "keys"), powershell(f), undefined, "powershell.exe"), fail: () => (f.on = true) };
    },
  },
  {
    name: "passphrase",
    make: () => ({ kr: new PassphraseKeyring(join(dir, "vault", "keyring.json"), "pw"), fail: () => chmodSync(join(dir, "vault"), 0o500) }),
  },
];

for (const b of BACKENDS) {
  describe(`${b.name} keyring rotation`, () => {
    test("set refuses overwrite unless replace is asked", async () => {
      const { kr } = b.make();
      await kr.set("llm:a", "old-key-1");
      await expect(kr.set("llm:a", "new-key-2")).rejects.toThrow("refusing to overwrite");
      await kr.set("llm:a", "new-key-2", { replace: true });
      expect(await kr.get("llm:a")).toBe("new-key-2");
      await kr.set("llm:b", "fresh", { replace: true });
      expect(await kr.get("llm:b")).toBe("fresh");
    });

    test("delete removes one account and reports whether it existed", async () => {
      const { kr } = b.make();
      await kr.set("llm:a", "key-a");
      await kr.set("llm:b", "key-b");
      expect(await kr.delete("llm:a")).toBe(true);
      expect(await kr.get("llm:a")).toBeNull();
      expect(await kr.get("llm:b")).toBe("key-b");
      expect(await kr.delete("llm:a")).toBe(false);
    });

    test.skipIf(b.name === "memory" || (b.name === "passphrase" && process.getuid?.() === 0))("a failed replace leaves the old key intact", async () => {
      const { kr, fail } = b.make();
      await kr.set("llm:a", "old-key-1");
      fail();
      await expect(kr.set("llm:a", "new-key-2", { replace: true })).rejects.toThrow();
      expect(await kr.get("llm:a")).toBe("old-key-1");
    });
  });
}

test("passphrase replace survives a reopen and a failed replace is not visible after reopen", async () => {
  const file = join(dir, "vault", "keyring.json");
  const kr = new PassphraseKeyring(file, "pw");
  await kr.set("llm:a", "old-key-1");
  await kr.set("llm:a", "new-key-2", { replace: true });
  expect(await new PassphraseKeyring(file, "pw").get("llm:a")).toBe("new-key-2");
  if (process.getuid?.() !== 0) {
    chmodSync(join(dir, "vault"), 0o500);
    await expect(kr.set("llm:a", "new-key-3", { replace: true })).rejects.toThrow();
    chmodSync(join(dir, "vault"), 0o700);
    expect(await kr.get("llm:a")).toBe("new-key-2");
    expect(await new PassphraseKeyring(file, "pw").get("llm:a")).toBe("new-key-2");
  }
});

test("dpapi stores a colon account under a file name Windows accepts", async () => {
  const kr = new DpapiKeyring(join(dir, "keys"), powershell({ on: false }), undefined, "powershell.exe");
  await kr.set("llm:anthropic", "k1");
  expect(existsSync(join(dir, "keys", `${SERVICE}.llm%3Aanthropic.dpapi`))).toBe(true);
});

test("libsecret replace and delete keep the secret off argv", async () => {
  const { kr, argv } = secretTool();
  await kr.set("llm:a", "sk-ant-old-secret-0001");
  await kr.set("llm:a", "sk-ant-new-secret-0002", { replace: true });
  await kr.delete("llm:a");
  expect(argv()).not.toContain("secret-000");
  expect(argv()).toContain(`clear service ${SERVICE} account llm:a`);
});
