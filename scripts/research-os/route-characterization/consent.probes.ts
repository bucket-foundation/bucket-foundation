import { SIGNED_IN, type Probe } from "../route-characterization";

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "signed in, null body", methods: ["POST"], body: "null" },
  { ...SIGNED_IN, name: "request, bad vendor", methods: ["POST"], body: '{"action":"request","vendor":"nope"}' },
  { ...SIGNED_IN, name: "request, anonymous", methods: ["POST"], learner: null, body: '{"action":"request","vendor":"nope"}' },
  { ...SIGNED_IN, name: "record, no class", methods: ["POST"], body: '{"action":"record","learnerId":"l1","status":"verified"}' },
  { ...SIGNED_IN, name: "record, staff read fails", methods: ["POST"], body: '{"action":"record","classId":"c1","learnerId":"l1","status":"verified"}' },
  {
    ...SIGNED_IN,
    name: "class basis, bad basis",
    methods: ["POST"],
    body: '{"action":"class_basis","classId":"c1","basis":"maybe"}',
    stubs: () => ({ "@/lib/research-os/class-db": { verifyClassStaff: async () => ({ ok: true, staff: { id: "t1", roles: ["teacher"] } }) } }),
  },
  {
    ...SIGNED_IN,
    name: "staff check throws",
    methods: ["POST"],
    body: '{"action":"record","classId":"c1","learnerId":"l1","status":"verified"}',
    stubs: () => ({
      "@/lib/research-os/class-db": {
        verifyClassStaff: async () => {
          throw new Error("staff store down");
        },
      },
    }),
  },
];
