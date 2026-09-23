import { LEARNER, SIGNED_IN, type Probe } from "../route-characterization";

const staff = (extra: Record<string, unknown> = {}) => () => ({
  "@/lib/research-os/class-db": { verifyClassStaff: async () => ({ ok: true, staff: { id: LEARNER, roles: ["teacher"] } }), ...extra },
});
const CREATE = '{"action":"create","classId":"c1","targetSlug":"force","title":"Read force"}';

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "mine, anonymous", methods: ["GET"], query: "?mine=1", learner: null },
  { ...SIGNED_IN, name: "mine, store down", methods: ["GET"], query: "?mine=1" },
  { ...SIGNED_IN, name: "mine, listed", methods: ["GET"], query: "?mine=1", stubs: staff({ listAssignmentsForLearner: async () => ({ ok: true, assignments: [{ id: "a1" }] }) }) },
  { ...SIGNED_IN, name: "class given, store down", methods: ["GET"], query: "?class=c1" },
  { ...SIGNED_IN, name: "staff, listed", methods: ["GET"], query: "?class=c1", stubs: staff({ listAssignments: async () => ({ ok: true, assignments: [{ id: "a1" }] }) }) },
  { ...SIGNED_IN, name: "staff, list unavailable", methods: ["GET"], query: "?class=c1", stubs: staff({ listAssignments: async () => ({ ok: false }) }) },
  { ...SIGNED_IN, name: "signed in, null body", methods: ["POST"], body: "null" },
  { ...SIGNED_IN, name: "signed in, array body", methods: ["POST"], body: "[]" },
  { ...SIGNED_IN, name: "create, store down", methods: ["POST"], body: CREATE },
  { ...SIGNED_IN, name: "staff, no target", methods: ["POST"], body: '{"action":"create","classId":"c1","targetSlug":" "}', stubs: staff() },
  {
    ...SIGNED_IN,
    name: "staff, created",
    methods: ["POST"],
    body: CREATE,
    stubs: () => ({
      ...staff({ createAssignment: async () => ({ ok: true, value: { id: "a1", targetNodeId: "n1" } }) })(),
      "@/lib/research-os/access-db": { loadNodeAccess: async () => ({ ok: true, value: { id: "n1", visibility: "public", ownerId: null } }) },
    }),
  },
  { ...SIGNED_IN, name: "staff, create refused", methods: ["POST"], body: CREATE, stubs: staff({ createAssignment: async () => ({ ok: false, error: "unavailable" }) }) },
  { ...SIGNED_IN, name: "staff, close without id", methods: ["POST"], body: '{"action":"close","classId":"c1"}', stubs: staff() },
  { ...SIGNED_IN, name: "staff, closed", methods: ["POST"], body: '{"action":"close","classId":"c1","assignmentId":"a1"}', stubs: staff({ closeAssignment: async () => ({ ok: true }) }) },
  { ...SIGNED_IN, name: "staff, unknown action", methods: ["POST"], body: '{"action":"archive","classId":"c1"}', stubs: staff() },
  {
    ...SIGNED_IN,
    name: "staff check throws",
    query: "?class=c1",
    body: CREATE,
    stubs: () => ({
      "@/lib/research-os/class-db": {
        verifyClassStaff: async () => {
          throw new Error("staff store down");
        },
      },
    }),
  },
];
