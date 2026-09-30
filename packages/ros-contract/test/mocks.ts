import { mock } from "bun:test";
import type { NextRequest } from "next/server";
import { inLaunchScope } from "@/lib/research-os/launch-scope";
import * as realDb from "@/lib/research-os/db";
import * as realGate from "@/lib/research-os/launch-gate";
import * as realPrimes from "@/lib/research-os/primes-report";
import primes from "./fixtures/primes.json";

export const graph: { state: "up" | "down" | "off" } = { state: "up" };

export const viewer: { staff: boolean } = { staff: true };

mock.module("@/lib/research-os/db", () => ({
  ...realDb,
  configured: () => graph.state !== "off",
  graphService: () => ({}),
  verifyLearner: async () => null,
  verifyLearnerIdentity: async () => null,
}));

mock.module("@/lib/research-os/primes-report", () => ({
  ...realPrimes,
  loadPrimesReport: async () => {
    if (graph.state === "down") throw new Error("down");
    return primes;
  },
}));

const refusal = async (req: NextRequest) => (inLaunchScope(new URL(req.url).pathname) || viewer.staff ? null : realGate.launchNotFound());

mock.module("@/lib/research-os/launch-gate", () => ({
  ...realGate,
  launchRefusal: refusal,
  staffOnlyAtLaunch:
    <A extends unknown[]>(handler: (req: NextRequest, ...rest: A) => Promise<Response>) =>
    async (req: NextRequest, ...rest: A): Promise<Response> =>
      (await refusal(req)) ?? handler(req, ...rest),
}));
