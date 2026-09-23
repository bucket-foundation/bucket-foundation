import { SIGNED_IN, type Probe } from "../route-characterization";

function store(rows: unknown[], existing: unknown = null) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in"]) builder[m] = () => builder;
  builder.maybeSingle = async () => ({ data: existing, error: null });
  builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null });
  return { from: () => builder };
}
const ROWS = [{ node_id: "n1", stage: "awareness", confidence: 0.5, updated_at: "2026-09-01T00:00:00Z" }];
const open = (extra: Record<string, unknown> = {}) => () => ({
  "@/lib/research-os/read-access": { authorizeNode: async () => ({ ok: true, node: { id: "n1", visibility: "public", ownerId: null } }) },
  "@/lib/research-os/db": { graphService: () => store([], { stage: "access" }), recordEvidence: async () => ({}) },
  ...extra,
});

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "node ids, store down", methods: ["GET"], query: "?nodeIds=n1,n2" },
  { ...SIGNED_IN, name: "node ids, states read", methods: ["GET"], query: "?nodeIds=n1", stubs: () => ({ "@/lib/research-os/db": { graphService: () => store(ROWS) } }) },
  { ...SIGNED_IN, name: "signed in, null body", methods: ["POST"], body: "null" },
  { ...SIGNED_IN, name: "unknown action", methods: ["POST"], body: '{"nodeId":"n1","action":"close"}' },
  { ...SIGNED_IN, name: "transfer, consent refused", methods: ["POST"], body: '{"nodeId":"n1","action":"transfer_item","answer":"x"}', consent: { allowed: false, reason: "no_profile" } },
  { ...SIGNED_IN, name: "transfer, no answer", methods: ["POST"], body: '{"nodeId":"n1","action":"transfer_item"}' },
  { ...SIGNED_IN, name: "open, store down", methods: ["POST"], body: '{"nodeId":"n1","action":"open"}' },
  { ...SIGNED_IN, name: "open, recorded", methods: ["POST"], body: '{"nodeId":"n1","action":"open","sessionId":"s1"}', stubs: open() },
  {
    ...SIGNED_IN,
    name: "open, evidence write throws",
    methods: ["POST"],
    body: '{"nodeId":"n1","action":"open"}',
    stubs: open({
      "@/lib/research-os/db": {
        graphService: () => store([], null),
        recordEvidence: async () => {
          throw new Error("evidence store down");
        },
      },
    }),
  },
];
