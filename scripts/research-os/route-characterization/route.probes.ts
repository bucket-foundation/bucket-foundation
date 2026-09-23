import { SIGNED_IN, type Probe } from "../route-characterization";

const NODES = [
  { id: "n1", slug: "light", title: "Light", kind: "concept", tier: 1, branch: "02-physics", visibility: "public" },
  { id: "n2", slug: "why-the-sky-is-blue", title: "Why the sky is blue", kind: "concept", tier: 3, branch: "02-physics", visibility: "public" },
];
const EDGES = [{ id: "e1", fromId: "n2", toId: "n1", kind: "prerequisite", weight: 1, confidence: 0.9 }];
const graph = (extra: Record<string, unknown> = {}) => () => ({
  "@/lib/research-os/db": { loadSubgraph: async () => ({ nodes: NODES, edges: EDGES }), loadAncestorRows: async () => [] },
  "@/lib/research-os/access-db": { filterSubgraphForViewer: async (nodes: unknown[], edges: unknown[]) => ({ ok: true, nodes, edges }) },
  ...extra,
});

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "branch given, store down", query: "?branch=02-physics" },
  { ...SIGNED_IN, name: "bearer, no session", query: "?branch=02-physics", learner: null, headers: { authorization: "Bearer t" } },
  { ...SIGNED_IN, name: "anonymous frontier", query: "?branch=02-physics", stubs: graph() },
  { ...SIGNED_IN, name: "unknown target", query: "?branch=02-physics&target=nope", stubs: graph() },
  {
    ...SIGNED_IN,
    name: "access store down",
    query: "?branch=02-physics",
    stubs: graph({ "@/lib/research-os/access-db": { filterSubgraphForViewer: async () => ({ ok: false, reason: "unavailable" }) } }),
  },
  {
    ...SIGNED_IN,
    name: "ancestor read throws",
    query: "?branch=02-physics",
    stubs: () => ({
      ...graph()(),
      "@/lib/research-os/db": {
        loadSubgraph: async () => ({ nodes: NODES, edges: EDGES }),
        loadAncestorRows: async () => {
          throw new Error("ancestor store down");
        },
      },
    }),
  },
];
