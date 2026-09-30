import { mock } from "bun:test";
import * as realDb from "@/lib/research-os/db";
import * as realGate from "@/lib/research-os/launch-gate";
import * as realPrimes from "@/lib/research-os/primes-report";
import primes from "./fixtures/primes.json";

export const graph: { state: "up" | "down" | "off" } = { state: "up" };

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

mock.module("@/lib/research-os/launch-gate", () => ({
  ...realGate,
  launchRefusal: async () => null,
}));
