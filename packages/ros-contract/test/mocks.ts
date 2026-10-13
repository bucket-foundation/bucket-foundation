import { mock } from "bun:test";
import type { NextRequest } from "next/server";
import { inLaunchScope } from "@/lib/research-os/launch-scope";
import * as realAccessDb from "@/lib/research-os/access-db";
import * as realClasses from "@/lib/research-os/classes";
import * as realConsent from "@/lib/research-os/consent";
import * as realDb from "@/lib/research-os/db";
import * as realReadAccess from "@/lib/research-os/read-access";
import * as realGate from "@/lib/research-os/launch-gate";
import * as realPrimes from "@/lib/research-os/primes-report";
import primes from "./fixtures/primes.json";
import { fakeService, fakeSubgraph, live } from "./live-fake";

export const graph: { state: "up" | "down" | "off" } = { state: "up" };

export const viewer: { staff: boolean } = { staff: true };

mock.module("@/lib/research-os/db", () => ({
  ...realDb,
  configured: () => graph.state !== "off",
  graphService: () => (live.learner ? fakeService() : {}),
  verifyLearner: async () => live.learner,
  verifyLearnerIdentity: async () => (live.learner ? { id: live.learner } : null),
  loadSubgraph: async (branch: string) => fakeSubgraph(branch),
  loadAncestorRows: async () => [],
  writeEdgeFlags: async () => {},
  isGuidanceEnabledForLearner: async () => true,
  loadRecentCheckEvents: async () => [],
  loadLearnerStates: async (_id: string, ids: string[]) =>
    (live.tables.learner_node_state ?? []).filter((r) => ids.includes(r.node_id as string)).map((r) => ({ nodeId: r.node_id, stage: r.stage, confidence: r.confidence ?? null })),
  loadGame: async () => (live.tables.game?.[0] as unknown) ?? null,
  recordEvidence: async () => {},
}));

mock.module("@/lib/research-os/access-db", () => ({
  ...realAccessDb,
  filterSubgraphForViewer: async <N, E>(nodes: N[], edges: E[]) => ({ ok: true as const, nodes, edges }),
}));

mock.module("@/lib/research-os/read-access", () => ({
  ...realReadAccess,
  authorizeNode: async () => ({ ok: true as const, node: { id: "", visibility: "public", ownerId: null } }),
  authorizeNodes: async (ids: string[]) => ({ ok: true as const, allowed: ids }),
  authorizeVerbs: async () => ({ ok: true as const, node: { id: "", visibility: "public", ownerId: null }, allowed: { view: true, continue: true } }),
}));

mock.module("@/lib/research-os/classes", () => ({ ...realClasses, listMyClasses: async () => [] }));

mock.module("@/lib/research-os/consent", () => ({ ...realConsent, requireConsent: async () => ({ allowed: true }) }));

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
