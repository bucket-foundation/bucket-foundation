import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { graph } from "./mocks";
import { NextRequest } from "next/server";
import patents from "@/lib/research-os/patents-design-data.json";
import software from "@/lib/research-os/software-atlas-data.json";
import solvability from "@/lib/research-os/solvability-atlas-data.json";
import { ContractError, localRosSource, parseRos, ROS_PATHS, ROS_RESOURCES, webRosSource, type RosPayloads, type RosResource } from "@/lib/research-os/contract";
import { rosState } from "@/lib/research-os/use-ros-resource";
import { BUNDLED_ROS, rosRoutes } from "../../bkt/src/ros";
import { startServe, type Serve } from "../../bkt/src/serve";
import primes from "./fixtures/primes.json";

const FIXTURES: RosPayloads = {
  solvability: solvability as unknown as RosPayloads["solvability"],
  software: software as unknown as RosPayloads["software"],
  patents: patents as unknown as RosPayloads["patents"],
  primes: primes as unknown as RosPayloads["primes"],
};

async function webFetch(url: string): Promise<Response> {
  const path = new URL(url, "http://web.test").pathname;
  const req = new NextRequest(new URL(path, "http://web.test"));
  if (path === ROS_PATHS.primes.web) return (await import("@/app/api/research-os/primes-report/route")).GET(req, undefined);
  const name = path.slice("/api/research-os/atlas/".length);
  return (await import("@/app/api/research-os/atlas/[name]/route")).GET(req, { params: { name } });
}

let srv: Serve;
let token = "";
const UID = 5151;

beforeAll(async () => {
  srv = startServe({ uid: UID, resolvePeerUid: () => UID, routes: rosRoutes({ ...BUNDLED_ROS, primes: () => FIXTURES.primes }) });
  const host = { host: `127.0.0.1:${srv.port}` };
  const nonce = (await (await fetch(srv.url, { headers: host })).text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
  const r = await fetch(`${srv.url}session`, { method: "POST", headers: { ...host, origin: `http://127.0.0.1:${srv.port}`, "content-type": "application/json" }, body: JSON.stringify({ nonce }) });
  token = ((await r.json()) as { token: string }).token;
});
afterAll(() => srv.stop());

const localFetch = ((url: string, init: RequestInit = {}) =>
  fetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), host: `127.0.0.1:${srv.port}` } })) as typeof fetch;

describe("contract validators", () => {
  for (const r of ROS_RESOURCES)
    test(`${r} fixture passes`, () => {
      expect(parseRos(r, FIXTURES[r])).toBe(FIXTURES[r]);
    });

  test("every resource rejects a non-object and each missing required field", () => {
    for (const r of ROS_RESOURCES) {
      expect(() => parseRos(r, [])).toThrow(ContractError);
      const fields = Object.keys(FIXTURES[r] as object).filter((k) => {
        const copy = { ...(FIXTURES[r] as object) } as Record<string, unknown>;
        delete copy[k];
        try {
          parseRos(r, copy);
          return false;
        } catch {
          return true;
        }
      });
      expect(fields.length).toBeGreaterThan(2);
    }
  });

  test("a wrong type deep in a segment fails with its field", () => {
    const bad = { ...FIXTURES.patents, settled: [[{ t: "link", v: "x" }]] };
    expect(() => parseRos("patents", bad)).toThrow("patents payload breaks the contract at settled");
    const badRef = { ...FIXTURES.primes, penetrating: [{ title: 3 }] };
    expect(() => parseRos("primes", badRef)).toThrow("primes payload breaks the contract at penetrating");
  });
});

describe("web and local serve the same contract", () => {
  for (const r of ROS_RESOURCES)
    test(`${r} matches on /api/research-os and /local`, async () => {
      const web = await webRosSource({ fetch: webFetch as typeof fetch }).get(r as RosResource);
      const local = await localRosSource({ base: srv.url.slice(0, -1), token, fetch: localFetch }).get(r as RosResource);
      expect(web.ok).toBe(true);
      expect(local.ok).toBe(true);
      if (web.ok && local.ok) {
        expect(local.data).toEqual(web.data);
        expect(local.data).toEqual(FIXTURES[r]);
      }
    });

  test("local routes need the header token", async () => {
    const r = await localRosSource({ base: srv.url.slice(0, -1), token: "x".repeat(43), fetch: localFetch }).get("solvability");
    expect(r).toEqual({ ok: false, status: 401, error: "solvability 401" });
  });

  test("an unknown atlas is 404 on the web", async () => {
    expect((await webFetch("/api/research-os/atlas/nope")).status).toBe(404);
  });

  test("primes maps an unconfigured or failing graph to 503 and a missing local source to 404", async () => {
    const err = console.error;
    console.error = () => {};
    try {
      graph.state = "down";
      expect(rosState(await webRosSource({ fetch: webFetch as typeof fetch }).get("primes"))).toEqual({ status: "error", httpStatus: 503, error: "primes 503" });
      graph.state = "off";
      expect((await webFetch(ROS_PATHS.primes.web)).status).toBe(503);
    } finally {
      graph.state = "up";
      console.error = err;
    }
    const bare = startServe({ uid: UID, resolvePeerUid: () => UID, routes: rosRoutes() });
    try {
      const host = { host: `127.0.0.1:${bare.port}` };
      const nonce = (await (await fetch(bare.url, { headers: host })).text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
      const t = ((await (await fetch(`${bare.url}session`, { method: "POST", headers: { ...host, origin: `http://127.0.0.1:${bare.port}` }, body: JSON.stringify({ nonce }) })).json()) as { token: string }).token;
      const f = ((u: string, i: RequestInit = {}) => fetch(u, { ...i, headers: { ...(i.headers as Record<string, string>), ...host } })) as typeof fetch;
      const res = await localRosSource({ base: bare.url.slice(0, -1), token: t, fetch: f }).get("primes");
      expect(rosState(res)).toEqual({ status: "missing", error: "primes 404" });
    } finally {
      bare.stop();
    }
  });

  test("a local loader that breaks the contract answers 500 and reports it", async () => {
    const seen: string[] = [];
    const routes = rosRoutes({ patents: () => ({ memo: 1 }) as unknown as RosPayloads["patents"] }, (e) => seen.push(e.message));
    const res = await routes["GET /local/ros/patents"](new Request("http://x/local/ros/patents"), new URL("http://x/local/ros/patents"));
    expect(res.status).toBe(500);
    expect(seen).toEqual(["patents payload breaks the contract at memo"]);
  });
});
