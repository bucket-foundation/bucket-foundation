import { REVIEWER, SIGNED_IN, type Probe } from "../route-characterization";

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "reviewer, store down", body: "{}", stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, malformed json", methods: ["POST"], body: "{", stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, null body", methods: ["POST"], body: "null", stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, array body", methods: ["POST"], body: "[]", stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, number body", methods: ["POST"], body: "3", stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, no decision", methods: ["POST"], body: '{"id":"p1"}', stubs: () => REVIEWER },
];
