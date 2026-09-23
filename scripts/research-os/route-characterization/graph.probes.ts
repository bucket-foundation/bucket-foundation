import { SIGNED_IN, type Probe } from "../route-characterization";

const NODES = [{ id: "n1", slug: "light", title: "Light", kind: "concept", tier: 1, branch: "02-physics", visibility: "public" }];
function store() {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "is", "order", "range"]) builder[m] = () => builder;
  builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
  return { from: () => builder };
}
const graph = (extra: Record<string, Record<string, unknown>> = {}) => () => ({
  ...extra,
  "@/lib/research-os/db": { loadSubgraph: async () => ({ nodes: NODES, edges: [] }), graphService: store, ...(extra["@/lib/research-os/db"] ?? {}) },
  "@/lib/research-os/access-db": { filterSubgraphForViewer: async (nodes: unknown[], edges: unknown[]) => ({ ok: true, nodes, edges }), ...(extra["@/lib/research-os/access-db"] ?? {}) },
});

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "branch list, store down", query: "?list=1" },
  { ...SIGNED_IN, name: "branch list", query: "?list=1", stubs: () => ({ "@/lib/research-os/db": { graphService: store } }) },
  { ...SIGNED_IN, name: "bad branch", query: "?branch=../x" },
  { ...SIGNED_IN, name: "anonymous graph", learner: null, stubs: graph() },
  { ...SIGNED_IN, name: "signed-in graph", stubs: graph({ "@/lib/research-os/classes": { listMyClasses: async () => [] } }) },
  { ...SIGNED_IN, name: "access store down", stubs: graph({ "@/lib/research-os/access-db": { filterSubgraphForViewer: async () => ({ ok: false, reason: "unavailable" }) } }) },
  {
    ...SIGNED_IN,
    name: "access filter throws",
    stubs: graph({
      "@/lib/research-os/access-db": {
        filterSubgraphForViewer: async () => {
          throw new Error("access store down");
        },
      },
    }),
  },
];
