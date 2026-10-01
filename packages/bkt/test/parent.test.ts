import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { drained, isSidecar, parentGone } from "../src/parent";

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
    expect(await within(drained(chunks(2, true)), 1000)).toBeUndefined();
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
