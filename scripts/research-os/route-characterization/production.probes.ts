import { SIGNED_IN, type Probe } from "../route-characterization";

const readable = { "@/lib/research-os/read-access": { authorizeNodes: async (ids: string[]) => ({ ok: true, allowed: ids, nodes: new Map(), missing: [] }) } };

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "target given, store down", methods: ["GET"], query: "?targetNodeId=n1" },
  { ...SIGNED_IN, name: "signed in, null body", methods: ["POST"], body: "null" },
  { ...SIGNED_IN, name: "target hidden", methods: ["POST"], body: '{"targetNodeId":"n1"}', stubs: () => ({ "@/lib/research-os/read-access": { authorizeNodes: async () => ({ ok: true, allowed: [], nodes: new Map(), missing: [] }) } }) },
  { ...SIGNED_IN, name: "bad status", methods: ["POST"], body: '{"targetNodeId":"n1","status":"accepted"}', stubs: () => readable },
  { ...SIGNED_IN, name: "new draft, store down", methods: ["POST"], body: '{"targetNodeId":"n1","kind":"explanation","claim":"c"}', stubs: () => readable },
  {
    ...SIGNED_IN,
    name: "authorize throws",
    methods: ["POST"],
    body: '{"targetNodeId":"n1"}',
    stubs: () => ({
      "@/lib/research-os/read-access": {
        authorizeNodes: async () => {
          throw new Error("access store down");
        },
      },
    }),
  },
];
