import { afterEach, describe, expect, test } from "bun:test";
import { startServe, type PeerUidResolver, type Serve } from "../src/serve";
import { platformFor, type ExecSync, type Owner, type Platform } from "../src/platform";

let s: Serve | undefined;
afterEach(() => s?.stop());

async function flow(lookup: PeerUidResolver | Platform, uid: Owner = 7) {
  const errors: string[] = [];
  const onError = (e: Error) => void errors.push(e.message);
  s = typeof lookup === "function" ? startServe({ uid, resolvePeerUid: lookup, onError }) : startServe({ platform: lookup, onError });
  const host = `127.0.0.1:${s.port}`;
  const page = await fetch(`http://${host}/`);
  if (page.status !== 200) {
    const again = await fetch(`http://${host}/`);
    return { page: page.status, again: again.status, errors };
  }
  const nonce = (await page.text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
  const session = await fetch(`http://${host}/session`, { method: "POST", headers: { origin: `http://${host}`, "content-type": "application/json" }, body: JSON.stringify({ nonce }) });
  const { token } = (await session.json()) as { token: string };
  const ping = await fetch(`http://${host}/local/ping`, { headers: { authorization: `Bucket ${token}` } });
  const bare = await fetch(`http://${host}/local/ping`);
  return { page: 200, ping: ping.status, bare: bare.status, errors };
}

const UNAVAILABLE = "peer owner lookup is unavailable, so every request is refused";
const missingTool: ExecSync = () => ({ code: 127, stdout: "", stderr: "not found" });

describe("peer check", () => {
  test("serves the token flow when the lookup names the caller", async () => {
    expect(await flow(() => 7)).toEqual({ page: 200, ping: 200, bare: 401, errors: [] });
    s?.stop();
    expect(await flow(() => "pc\\ann", "pc\\ann")).toEqual({ page: 200, ping: 200, bare: 401, errors: [] });
  });

  test("refuses a socket owned by another user or not found", async () => {
    expect(await flow(() => 8)).toEqual({ page: 403, again: 403, errors: [] });
    s?.stop();
    expect(await flow(() => null)).toEqual({ page: 403, again: 403, errors: [] });
  });

  test("refuses when the lookup is unavailable and reports it once", async () => {
    expect(await flow(() => undefined)).toEqual({ page: 403, again: 403, errors: [UNAVAILABLE] });
  });

  test("refuses when the lookup throws and reports it once", async () => {
    const thrower: PeerUidResolver = () => {
      throw new Error("lsof crashed");
    };
    expect(await flow(thrower)).toEqual({ page: 403, again: 403, errors: ["lsof crashed"] });
  });

  test("macos and windows refuse when their lookup tools are missing and name the tool and the OS", async () => {
    const d = { env: { USERNAME: "Ann" }, home: "/h/u", execSync: missingTool, uid: () => 7 };
    expect(await flow(platformFor("darwin", d))).toEqual({
      page: 403,
      again: 403,
      errors: ["peer owner lookup on darwin could not run /usr/sbin/lsof, so every request is refused; restore it and start bkt serve again"],
    });
    s?.stop();
    expect(await flow(platformFor("win32", d))).toEqual({
      page: 403,
      again: 403,
      errors: [
        "peer owner lookup on win32 could not run C:\\Windows\\System32\\netstat.exe or C:\\Windows\\System32\\tasklist.exe, so every request is refused; restore it and start bkt serve again",
      ],
    });
  });
});
