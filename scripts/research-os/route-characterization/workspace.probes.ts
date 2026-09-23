import { SIGNED_IN, type Probe } from "../route-characterization";

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "signed in, null body", body: "null" },
  { ...SIGNED_IN, name: "locate, no query", body: '{"action":"locate"}' },
  { ...SIGNED_IN, name: "locate, second source without node", body: '{"action":"locate","query":"light","mode":"secondSource"}' },
  { ...SIGNED_IN, name: "quote, no node", body: '{"action":"quote"}' },
  { ...SIGNED_IN, name: "quote, store down", body: '{"action":"quote","nodeId":"n1","text":"x"}' },
  { ...SIGNED_IN, name: "organize, empty", body: '{"action":"organize"}' },
  {
    ...SIGNED_IN,
    name: "quote, authorize throws",
    body: '{"action":"quote","nodeId":"n1","text":"x"}',
    stubs: () => ({
      "@/lib/research-os/read-access": {
        authorizeNode: async () => {
          throw new Error("access store down");
        },
      },
    }),
  },
];
