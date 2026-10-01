import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [bin, expected, mode] = process.argv.slice(2);
if (!bin || !expected || (mode !== undefined && mode !== "--cli-only")) throw new Error("usage: smoke.ts BKT_BINARY EXPECTED_VERSION [--cli-only]");

const home = mkdtempSync(join(tmpdir(), "bkt-smoke-"));
const env = { ...process.env, BKT_HOME: join(home, "data"), BKT_UI_DIR: join(home, "no-ui") };
const native = { linux: "libsecret", darwin: "keychain", win32: "dpapi" }[process.platform as "linux" | "darwin" | "win32"];

function check(ok: unknown, what: string): void {
  if (!ok) throw new Error(`smoke: ${what}`);
  console.log(`ok ${what}`);
}

function run(args: string[]): string {
  const r = Bun.spawnSync([bin, ...args], { env, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) throw new Error(`bkt ${args.join(" ")} exited ${r.exitCode}: ${r.stderr.toString()}`);
  return r.stdout.toString();
}

function attempt(args: string[]): { code: number; out: string; err: string } {
  const r = Bun.spawnSync([bin, ...args], { env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
}

function cliChecks(): void {
  const help = attempt(["--help"]);
  check(help.code === 0 && help.out.includes("usage: bkt [command] [options]") && help.out.includes(`bkt ${expected}`), "bkt --help prints usage and exits 0");
  check(attempt(["-h"]).out === help.out && attempt(["help"]).out === help.out, "-h and help print the same usage");
  const one = attempt(["help", "stats"]);
  check(one.code === 0 && one.out.startsWith("usage: bkt stats [options]") && attempt(["stats", "--help"]).out === one.out, "help stats and stats --help print that command's usage");
  check(attempt(["version", "--json"]).out.trim() === JSON.stringify({ v: 1, version: expected }), "version --json is the v1 shape");
  const parsed = attempt(["analyses", "--json", `--keyring=x`]);
  check(parsed.code === 2 && parsed.err.includes("unknown option --keyring"), "parseArgs rejects a flag the command does not take");
  for (const args of [["bogus"], ["stats", "--nope"], ["init", "--keyring", "bogus"], []]) {
    const r = attempt(args);
    check(r.code === 2 && r.err.includes("usage: bkt") && !existsSync(env.BKT_HOME), `bkt ${args.join(" ")} exits 2 and leaves BKT_HOME absent`);
  }
}

function raw(port: number, request: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const s = connect(port, "127.0.0.1", () => s.end(request));
    let out = "";
    s.on("data", (d) => (out += d.toString()));
    s.on("end", () => resolve(out));
    s.on("error", reject);
  });
}

async function readUrl(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  let buf = "";
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += new TextDecoder().decode(value);
    const m = buf.match(/http:\/\/127\.0\.0\.1:\d+\//);
    if (m) {
      reader.releaseLock();
      return m[0];
    }
  }
  throw new Error(`bkt serve printed no url: ${buf}`);
}

try {
  check(run(["--version"]).trim() === expected, `bkt --version prints ${expected}`);
  cliChecks();
  if (mode === "--cli-only") console.log("cli smoke passed");
  else await full();
} finally {
  rmSync(home, { recursive: true, force: true });
}

async function full(): Promise<void> {

  const first = JSON.parse(run(["init", "--json"]));
  const plain = run(["init"]);
  check(plain.startsWith("Bucket is ready on this device.\nThis device  ") && !plain.includes("{"), "bkt init prints labelled rows");
  const second = JSON.parse(run(["init", "--json"]));
  check(first.keyring === native, `bkt init uses the ${native} keystore (got ${first.keyring})`);
  check(first.newDevice === true && second.newDevice === false, "the device key round trips through the keystore");
  check(first.device === second.device && first.publicKey === second.publicKey, "the second run reads the same device");

  const stats = JSON.parse(run(["stats", "--json"]));
  check(stats.v === 1 && stats.items > 0 && stats.attempts === 0, "stats --json is the v1 shape");
  const who = JSON.parse(run(["whoami", "--json"]));
  check(who.v === 1 && who.device === first.device && who.keyring === native, "whoami --json names the same device");

  const data = env.BKT_HOME;
  if (process.platform === "win32") {
    const acl = Bun.spawnSync(["icacls", data], { stdout: "pipe" }).stdout.toString();
    check(!/Everyone|BUILTIN\\Users|Authenticated Users/i.test(acl) && acl.toLowerCase().includes(process.env.USERNAME!.toLowerCase()), `data dir ACL names the current user alone:\n${acl}`);
  } else {
    check((statSync(data).mode & 0o777) === 0o700, "data dir is 0700");
  }

  const serve = Bun.spawn([bin, "serve"], { env, stdout: "pipe", stderr: "inherit" });
  try {
    const url = await readUrl(serve.stdout);
    const origin = url.replace(/\/$/, "");
    const port = Number(new URL(url).port);
    check((await fetch(`${url}local/ping`)).status === 401, "a request without the token is refused");
    check((await raw(port, `GET / HTTP/1.1\r\nHost: evil.example:${port}\r\nConnection: close\r\n\r\n`)).startsWith("HTTP/1.1 403"), "a foreign Host is refused");
    check((await fetch(url, { headers: { origin: "http://evil.example" } })).status === 403, "a foreign Origin is refused");
    const pageRes = await fetch(url);
    check(pageRes.status === 200, "the launch page loads for the same user");
    const nonce = (await pageRes.text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)?.[1];
    check(nonce, "the page carries a launch nonce");
    const session = await fetch(`${url}session`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ nonce }) });
    const { token } = (await session.json()) as { token: string };
    check(session.status === 200 && token, "the nonce trades for a session token");
    check((await fetch(`${url}local/ping`, { headers: { authorization: `Bucket ${token}` } })).status === 200, "a request with the token is served");
    check((await fetch(`${url}local/ping`, { headers: { authorization: `Bucket ${"A".repeat(43)}` } })).status === 401, "a wrong token is refused");
  } finally {
    serve.kill();
    await serve.exited;
  }
  console.log("smoke passed");
}
