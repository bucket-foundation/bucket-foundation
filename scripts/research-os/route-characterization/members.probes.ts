import { LEARNER, SIGNED_IN, type Probe } from "../route-characterization";

const staff = (extra: Record<string, unknown> = {}) => () => ({
  "@/lib/research-os/class-db": { verifyClassStaff: async () => ({ ok: true, staff: { id: LEARNER, roles: ["teacher"] } }), ...extra },
});
const VALID = '{"classId":"c1","userId":"u1","role":"learner"}';

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "class given, store down", methods: ["GET"], query: "?class=c1" },
  { ...SIGNED_IN, name: "staff, members listed", methods: ["GET"], query: "?class=c1", stubs: staff({ listMembers: async () => [{ userId: "u1", role: "learner" }] }) },
  {
    ...SIGNED_IN,
    name: "staff, members read throws",
    methods: ["GET"],
    query: "?class=c1",
    stubs: staff({
      listMembers: async () => {
        throw new Error("members store down");
      },
    }),
  },
  { ...SIGNED_IN, name: "signed in, null body", methods: ["POST"], body: "null" },
  { ...SIGNED_IN, name: "signed in, array body", methods: ["POST"], body: "[]" },
  { ...SIGNED_IN, name: "bad role", methods: ["POST"], body: '{"classId":"c1","userId":"u1","role":"dean"}' },
  { ...SIGNED_IN, name: "valid body, store down", methods: ["POST"], body: VALID },
  { ...SIGNED_IN, name: "staff, role set", methods: ["POST"], body: VALID, stubs: staff({ setMemberRole: async () => ({ ok: true, value: { userId: "u1", role: "learner" } }) }) },
  { ...SIGNED_IN, name: "staff, role refused", methods: ["POST"], body: VALID, stubs: staff({ setMemberRole: async () => ({ ok: false, error: "forbidden" }) }) },
  {
    ...SIGNED_IN,
    name: "staff check throws",
    query: "?class=c1",
    body: VALID,
    stubs: () => ({
      "@/lib/research-os/class-db": {
        verifyClassStaff: async () => {
          throw new Error("staff store down");
        },
      },
    }),
  },
  {
    ...SIGNED_IN,
    name: "staff, role write throws",
    methods: ["POST"],
    body: VALID,
    stubs: staff({
      setMemberRole: async () => {
        throw new Error("role store down");
      },
    }),
  },
];
