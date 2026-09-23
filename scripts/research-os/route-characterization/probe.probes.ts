import { SIGNED_IN, type Probe } from "../route-characterization";

const NODES = [
  { id: "n1", slug: "light", title: "Light", kind: "concept", tier: 1, branch: "02-physics", visibility: "public" },
  { id: "n2", slug: "why-the-sky-is-blue", title: "Why the sky is blue", kind: "concept", tier: 3, branch: "02-physics", visibility: "public" },
];
const EDGES = [{ id: "e1", fromId: "n1", toId: "n2", kind: "prerequisite", weight: 1, confidence: 0.9 }];
const graph = (extra: Record<string, unknown> = {}) => () => ({
  "@/lib/research-os/db": { loadSubgraph: async () => ({ nodes: NODES, edges: EDGES }), loadLearnerStates: async () => [] },
  "@/lib/research-os/access-db": { filterSubgraphForViewer: async (nodes: unknown[], edges: unknown[]) => ({ ok: true, nodes, edges }) },
  ...extra,
});
function node(row: unknown) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in"]) builder[m] = () => builder;
  builder.maybeSingle = async () => ({ data: row, error: null });
  builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
  return { graphService: () => ({ from: () => builder }) };
}
const continuable = { "@/lib/research-os/read-access": { authorizeNode: async () => ({ ok: true, node: { id: "n1", visibility: "public", ownerId: null } }) } };

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "probe built", methods: ["GET"], stubs: graph() },
  { ...SIGNED_IN, name: "unknown target", methods: ["GET"], query: "?target=nope", stubs: graph() },
  {
    ...SIGNED_IN,
    name: "access filter throws",
    methods: ["GET"],
    stubs: graph({
      "@/lib/research-os/access-db": {
        filterSubgraphForViewer: async () => {
          throw new Error("access store down");
        },
      },
    }),
  },
  { ...SIGNED_IN, name: "signed in, null body", methods: ["POST"], body: "null" },
  { ...SIGNED_IN, name: "no answer", methods: ["POST"], body: '{"nodeId":"n1"}' },
  { ...SIGNED_IN, name: "answer, store down", methods: ["POST"], body: '{"nodeId":"n1","answer":"light scatters"}' },
  {
    ...SIGNED_IN,
    name: "answer, no grader configured",
    methods: ["POST"],
    body: '{"nodeId":"n1","answer":"light scatters"}',
    stubs: () => ({ ...continuable, "@/lib/research-os/db": node({ id: "n1", title: "Light", summary: null, provenance: null }) }),
  },
];
