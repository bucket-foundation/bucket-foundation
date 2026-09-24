import { SIGNED_IN, type Probe } from "../route-characterization";

const reviewer = { "@/lib/research-os/reviewer": { verifyClassTeacher: async () => ({ id: "r1", email: "r@bucket.test", staff: true }) } };

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "reviewer, store down", body: '{"kind":"production","decision":"approved","productionId":"p1"}', stubs: () => reviewer },
  { ...SIGNED_IN, name: "reviewer, null body", methods: ["POST"], body: "null", stubs: () => reviewer },
  { ...SIGNED_IN, name: "reviewer, bad kind", methods: ["POST"], body: '{"kind":"essay"}', stubs: () => reviewer },
  { ...SIGNED_IN, name: "reviewer, return without reason", methods: ["POST"], body: '{"kind":"production","decision":"returned"}', stubs: () => reviewer },
  {
    ...SIGNED_IN,
    name: "reviewer check throws",
    body: "{}",
    stubs: () => ({
      "@/lib/research-os/reviewer": {
        verifyClassTeacher: async () => {
          throw new Error("reviewer store down");
        },
      },
    }),
  },
];
