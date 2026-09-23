import { SIGNED_IN, type Probe } from "../route-characterization";

const snapshot = (bySlug: Map<string, unknown>) => () => ({ "@/lib/research-os/makeup": { makeupSnapshot: async () => ({ bySlug }) } });

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "slug given, store down", query: "?slug=force" },
  { ...SIGNED_IN, name: "slug given, unknown node", query: "?slug=force", stubs: snapshot(new Map()) },
  { ...SIGNED_IN, name: "slug given, not an idea", query: "?slug=force", stubs: snapshot(new Map([["force", { id: "n1", kind: "primary_source", provenanceType: null }]])) },
  {
    ...SIGNED_IN,
    name: "slug given, snapshot throws",
    query: "?slug=force",
    stubs: () => ({
      "@/lib/research-os/makeup": {
        makeupSnapshot: async () => {
          throw new Error("snapshot store down");
        },
      },
    }),
  },
];
