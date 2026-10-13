import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { isSidecar, PARENT_LINE_BYTES, parentGone, watchParent } from "../src/parent";

const WATCH = resolve(import.meta.dir, "fixtures/parent-watch.ts");
const HOLDER = resolve(import.meta.dir, "fixtures/parent-holder.ts");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const within = <T>(p: Promise<T>, ms: number): Promise<T | "timeout"> => Promise.race([p, sleep(ms).then(() => "timeout" as const)]);

function alive(pid: number): boolean {
  if (process.platform === "win32") return Bun.spawnSync(["tasklist", "/fi", `PID eq ${pid}`, "/fo", "csv", "/nh"]).stdout.toString().includes(`"${pid}"`);
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function gone(pid: number, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (!alive(pid)) return true;
    await sleep(100);
  }
  return !alive(pid);
}

async function* chunks(n: number, fail = false) {
  for (let i = 0; i < n; i++) yield new Uint8Array([i]);
  if (fail) throw new Error("broken pipe");
}

describe("parent watch", () => {
  test("only a sidecar watches its parent", async () => {
    expect(isSidecar({ BKT_SIDECAR: "1" })).toBe(true);
    for (const env of [{}, { BKT_SIDECAR: "0" }, { BKT_SIDECAR: "true" }, { BKT_SIDECAR: "" }]) expect(isSidecar(env)).toBe(false);
    let opened = 0;
    const idle = parentGone({}, () => (opened++, chunks(0)));
    expect(await within(idle, 100)).toBe("timeout");
    expect(opened).toBe(0);
  });

  test("the end of stdin, or a read error, counts as the parent going away", async () => {
    expect(await within(parentGone({ BKT_SIDECAR: "1" }, () => chunks(3)), 1000)).toBeUndefined();
    expect(await within(watchParent(chunks(2, true)), 1000)).toBeUndefined();
  });

  test("watchParent resolves on stdin end of file", async () => {
    const seen: string[] = [];
    const text = async function* () {
      yield new TextEncoder().encode("first li");
      yield new TextEncoder().encode("ne\nsecond line\r\nno line feed at the end");
    };
    expect(await within(watchParent(text(), (line) => seen.push(line)), 1000)).toBeUndefined();
    expect(seen).toEqual(["first line", "second line"]);
    expect(await within(watchParent(chunks(0), () => seen.push("never")), 1000)).toBeUndefined();
    expect(seen.length).toBe(2);
  });

  test("watchParent ignores a malformed consent line", async () => {
    const { answer, parseAnswer } = await import("../src/research-consent");
    const id = "A".repeat(22);
    const digest = "a".repeat(64);
    const good = `consent ${id} ${digest} allow`;
    const bad = ["", "consent", `consent ${id} ${digest}`, `consent ${id} ${digest} maybe`, `consent ${id.slice(1)} ${digest} allow`, `consent ${id} ${digest.slice(1)} allow`, `consent ${id} ${digest.toUpperCase()} allow`, ` consent ${id} ${digest} allow`, `consent ${id} ${digest} allow extra`, `consent  ${id} ${digest} allow`, `approve ${id} ${digest} allow`, `consent ${id} ${digest} allow\u0000`];
    for (const line of bad) expect({ line, parsed: parseAnswer(line) }).toEqual({ line, parsed: null });
    expect(parseAnswer(good)).toEqual({ id, digest, allow: true });
    expect(parseAnswer(`consent ${id} ${digest} deny`)).toEqual({ id, digest, allow: false });
    const decided: [string, string, boolean][] = [];
    const long = `consent ${id} ${digest} allow${" ".repeat(PARENT_LINE_BYTES)}`;
    const feed = async function* () {
      yield new TextEncoder().encode(`${bad.join("\n")}\n${long}\n${good}\n{"id":"${id}"}\n`);
    };
    await watchParent(feed(), (line) => void answer(line, (i, d, a) => decided.push([i, d, a])));
    expect(decided).toEqual([[id, digest, true]]);
    const thrown: string[] = [];
    await watchParent(feed(), (line) => void answer(line, () => { throw new Error("no build request matches that answer"); }, (e) => thrown.push(e.message)));
    expect(thrown).toEqual(["no build request matches that answer"]);
    await watchParent(feed(), () => { throw new Error("a listener that throws stops nothing"); });
    expect(PARENT_LINE_BYTES).toBe(256);
  });

  test("a sidecar exits when its stdin closes; a plain run with closed stdin keeps going", async () => {
    const sidecar = Bun.spawn([process.execPath, WATCH], { stdin: "pipe", stdout: "pipe", stderr: "inherit", env: { ...process.env, BKT_SIDECAR: "1" } });
    await sleep(500);
    expect(sidecar.exitCode).toBeNull();
    sidecar.stdin.end();
    expect(await within(sidecar.exited, 10_000)).toBe(0);
    expect(await new Response(sidecar.stdout).text()).toContain("parent gone");
    const env = { ...process.env } as Record<string, string | undefined>;
    delete env.BKT_SIDECAR;
    const plain = Bun.spawn([process.execPath, WATCH], { stdin: "pipe", stdout: "ignore", stderr: "inherit", env });
    plain.stdin.end();
    expect(await within(plain.exited, 1500)).toBe("timeout");
    plain.kill(9);
    await plain.exited;
  }, 20_000);

  test("a sidecar exits after its parent is killed outright", async () => {
    const holder = Bun.spawn([process.execPath, HOLDER, WATCH], { stdin: "ignore", stdout: "pipe", stderr: "inherit" });
    const reader = holder.stdout.getReader();
    const line = new TextDecoder().decode((await reader.read()).value);
    const pid = Number(line.match(/ready (\d+)/)?.[1]);
    expect(Number.isInteger(pid) && pid > 0).toBe(true);
    expect(alive(pid)).toBe(true);
    await sleep(300);
    expect(alive(pid)).toBe(true);
    holder.kill(9);
    await holder.exited;
    expect(await gone(pid, 10_000)).toBe(true);
  }, 20_000);
});
