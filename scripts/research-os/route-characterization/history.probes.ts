import { REVIEWER, SIGNED_IN, type Probe } from "../route-characterization";

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "reviewer, store down", body: "{}", stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, malformed json", methods: ["POST"], body: "{", stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, null body", methods: ["POST"], body: "null", stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, unknown action", methods: ["POST"], body: '{"action":"delete","silverId":"0f8c7a52-2b8e-4a3e-9f4e-3a8a0f1f2c11"}', stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, reject without reason", methods: ["POST"], body: '{"action":"reject","silverId":"0f8c7a52-2b8e-4a3e-9f4e-3a8a0f1f2c11"}', stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, link without a QID", methods: ["POST"], body: '{"action":"link","proposalId":"0f8c7a52-2b8e-4a3e-9f4e-3a8a0f1f2c11","qid":"x"}', stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, link, store down", methods: ["POST"], body: '{"action":"link","proposalId":"0f8c7a52-2b8e-4a3e-9f4e-3a8a0f1f2c11","qid":"Q935"}', stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, withdraw a link without a reason", methods: ["POST"], body: '{"action":"withdraw-link","qid":"Q935"}', stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, approve, store down", methods: ["POST"], body: '{"action":"approve","silverId":"0f8c7a52-2b8e-4a3e-9f4e-3a8a0f1f2c11"}', stubs: () => REVIEWER },
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
