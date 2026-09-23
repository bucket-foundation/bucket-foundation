import { SIGNED_IN, type Probe } from "../route-characterization";

const reviewer = { "@/lib/research-os/reviewer": { verifyReviewer: async () => ({ id: "r1", email: "r@bucket.test" }) } };

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "reviewer, store down", stubs: () => reviewer },
  {
    ...SIGNED_IN,
    name: "reviewer, no classes",
    stubs: () => ({ ...reviewer, "@/lib/research-os/db": { loadClassesForReviewer: async () => [], loadClassMembers: async () => new Map() } }),
  },
  {
    ...SIGNED_IN,
    name: "reviewer, class read throws",
    stubs: () => ({
      ...reviewer,
      "@/lib/research-os/db": {
        loadClassesForReviewer: async () => {
          throw new Error("class store down");
        },
      },
    }),
  },
];
