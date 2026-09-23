import { LEARNER, SIGNED_IN, type Probe } from "../route-characterization";

const NODE = { id: "n1", visibility: "private", ownerId: LEARNER };
const owner = (extra: Record<string, unknown> = {}) => () => ({
  "@/lib/research-os/access-db": {
    loadViewerGroups: async () => ({ ok: true, value: [] }),
    loadNodeAccess: async () => ({ ok: true, value: NODE }),
    loadGrants: async () => ({ ok: true, value: [] }),
    loadRequestsForNode: async () => ({ ok: true, value: [] }),
    loadRequestsByRequester: async () => ({ ok: true, value: [] }),
    loadOwnedNodes: async () => ({ ok: true, value: [{ id: "n1", slug: "a", title: "A", visibility: "private" }] }),
    loadPendingCountsForNodes: async () => ({ ok: true, value: new Map([["n1", 2]]) }),
    setVisibility: async () => ({ ok: true, value: "shared" }),
    ...extra,
  },
});

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "mine, anonymous", methods: ["GET"], query: "?mine=1", learner: null },
  { ...SIGNED_IN, name: "mine, owner", methods: ["GET"], query: "?mine=1", stubs: owner() },
  { ...SIGNED_IN, name: "node, owner", methods: ["GET"], query: "?node=n1", stubs: owner() },
  { ...SIGNED_IN, name: "node, missing", methods: ["GET"], query: "?node=n1", stubs: owner({ loadNodeAccess: async () => ({ ok: true, value: null }) }) },
  { ...SIGNED_IN, name: "signed in, null body", methods: ["POST"], body: "null", stubs: owner() },
  { ...SIGNED_IN, name: "set visibility", methods: ["POST"], body: '{"action":"set_visibility","nodeId":"n1","visibility":"shared"}', stubs: owner() },
  { ...SIGNED_IN, name: "bad visibility", methods: ["POST"], body: '{"action":"set_visibility","nodeId":"n1","visibility":"secret"}', stubs: owner() },
  { ...SIGNED_IN, name: "unknown action", methods: ["POST"], body: '{"action":"archive","nodeId":"n1"}', stubs: owner() },
  {
    ...SIGNED_IN,
    name: "node read throws",
    query: "?node=n1",
    body: '{"action":"set_visibility","nodeId":"n1","visibility":"shared"}',
    stubs: owner({
      loadNodeAccess: async () => {
        throw new Error("access store down");
      },
    }),
  },
];
