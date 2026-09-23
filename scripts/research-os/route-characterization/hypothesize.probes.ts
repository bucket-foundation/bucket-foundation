import { LEARNER, SIGNED_IN, type Probe } from "../route-characterization";

function store(production: unknown) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq"]) builder[m] = () => builder;
  builder.maybeSingle = async () => ({ data: production, error: null });
  return { "@/lib/research-os/db": { graphService: () => ({ from: () => builder }) } };
}
const PRODUCTION = { id: "p1", learner_id: LEARNER, target_node_id: "n1", status: "draft" };
const readable = { "@/lib/research-os/read-access": { authorizeNode: async () => ({ ok: true, node: { id: "n1", visibility: "public", ownerId: null } }) } };

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "signed in, null body", body: "null" },
  { ...SIGNED_IN, name: "production given, store down", body: '{"productionId":"p1"}' },
  { ...SIGNED_IN, name: "someone else's production", body: '{"productionId":"p1"}', stubs: () => store({ ...PRODUCTION, learner_id: "other" }) },
  {
    ...SIGNED_IN,
    name: "target hidden",
    body: '{"productionId":"p1"}',
    stubs: () => ({ ...store(PRODUCTION), "@/lib/research-os/read-access": { authorizeNode: async () => ({ ok: false, reason: "denied" }) } }),
  },
  { ...SIGNED_IN, name: "engine unreachable", body: '{"productionId":"p1"}', stubs: () => ({ ...store(PRODUCTION), ...readable }) },
  {
    ...SIGNED_IN,
    name: "authorize throws",
    body: '{"productionId":"p1"}',
    stubs: () => ({
      ...store(PRODUCTION),
      "@/lib/research-os/read-access": {
        authorizeNode: async () => {
          throw new Error("access store down");
        },
      },
    }),
  },
];
