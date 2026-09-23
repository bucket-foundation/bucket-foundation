import { REVIEWER, SIGNED_IN, type Probe } from "../route-characterization";

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "reviewer, store down", body: "{}", stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, malformed json", methods: ["POST"], body: "{", stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, null body", methods: ["POST"], body: "null", stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, array body", methods: ["POST"], body: "[]", stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, no decision", methods: ["POST"], body: '{"id":"p1"}', stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, approve, store down", methods: ["POST"], body: '{"id":"p1","decision":"approved","title":" T "}', stubs: () => REVIEWER },
  {
    ...SIGNED_IN,
    name: "reviewer check throws",
    body: "{}",
    stubs: () => ({
      "@/lib/research-os/reviewer": {
        verifyGraphReviewer: async () => {
          throw new Error("reviewer store down");
        },
      },
    }),
  },
];
