import { SIGNED_IN, type Probe } from "../route-characterization";

export const probes: Probe[] = [
  {
    ...SIGNED_IN,
    name: "node given, access filter throws",
    query: "?node=n1",
    stubs: () => ({
      "@/lib/research-os/db": { loadSubgraph: async () => ({ nodes: [{ id: "n1", visibility: "private" }], edges: [] }) },
      "@/lib/research-os/access-db": {
        filterSubgraphForViewer: async () => {
          throw new Error("access store down");
        },
      },
    }),
  },
];
