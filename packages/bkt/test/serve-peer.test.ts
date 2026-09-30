import { afterEach, describe, expect, test } from "bun:test";
import { startServe, type Serve } from "../src/serve";
import type { Owner, PeerCheck } from "../src/platform";

let s: Serve | undefined;
afterEach(() => s?.stop());

async function flow(peerCheck: PeerCheck, peer: Owner | null | undefined, uid: Owner = 7) {
  s = startServe({ uid, resolvePeerUid: () => peer, peerCheck });
  const host = `127.0.0.1:${s.port}`;
  const page = await fetch(`http://${host}/`);
  if (page.status !== 200) return { page: page.status };
  const nonce = (await page.text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
  const session = await fetch(`http://${host}/session`, { method: "POST", headers: { origin: `http://${host}`, "content-type": "application/json" }, body: JSON.stringify({ nonce }) });
  const { token } = (await session.json()) as { token: string };
  const ping = await fetch(`http://${host}/local/ping`, { headers: { authorization: `Bucket ${token}` } });
  const bare = await fetch(`http://${host}/local/ping`);
  return { page: 200, ping: ping.status, bare: bare.status };
}

describe("peer check modes", () => {
  test("best-effort serves the token flow when the owner lookup is unavailable", async () => {
    expect(await flow("best-effort", undefined)).toEqual({ page: 200, ping: 200, bare: 401 });
  });

  test("best-effort still refuses a socket owned by another user or not found", async () => {
    expect(await flow("best-effort", 8)).toEqual({ page: 403 });
    expect(await flow("best-effort", null)).toEqual({ page: 403 });
  });

  test("strict refuses when the owner lookup is unavailable", async () => {
    expect(await flow("strict", undefined)).toEqual({ page: 403 });
    expect(await flow("strict", 7)).toEqual({ page: 200, ping: 200, bare: 401 });
  });
});
