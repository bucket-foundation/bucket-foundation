import { LEARNER, SIGNED_IN, type Probe } from "../route-characterization";

const VALID = '{"classId":"c1","learnerId":"l1","nodeId":"n1","toStage":"awareness"}';
const staff = (overrideLevel: () => Promise<unknown>) => () => ({
  "@/lib/research-os/class-db": {
    verifyClassStaff: async () => ({ ok: true, staff: { id: LEARNER, role: "teacher" } }),
    overrideLevel,
  },
});

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "signed in, null body", body: "null" },
  { ...SIGNED_IN, name: "signed in, array body", body: "[]" },
  { ...SIGNED_IN, name: "bad level", body: '{"classId":"c1","learnerId":"l1","nodeId":"n1","toStage":"mastery"}' },
  { ...SIGNED_IN, name: "valid body, store down", body: VALID },
  {
    ...SIGNED_IN,
    name: "valid body, not staff",
    body: VALID,
    stubs: () => ({ "@/lib/research-os/class-db": { verifyClassStaff: async () => ({ ok: true, staff: null }) } }),
  },
  { ...SIGNED_IN, name: "staff, override applied", body: VALID, stubs: staff(async () => ({ ok: true, value: { stage: "awareness" } })) },
  { ...SIGNED_IN, name: "staff, busy", body: VALID, stubs: staff(async () => ({ ok: false, error: "busy" })) },
  { ...SIGNED_IN, name: "staff, unavailable", body: VALID, stubs: staff(async () => ({ ok: false, error: "unavailable" })) },
  { ...SIGNED_IN, name: "staff, not a member", body: VALID, stubs: staff(async () => ({ ok: false, error: "not_a_member" })) },
  {
    ...SIGNED_IN,
    name: "staff, override throws",
    body: VALID,
    stubs: staff(async () => {
      throw new Error("override store down");
    }),
  },
];
