import { REVIEWER, SIGNED_IN, type Probe } from "../route-characterization";

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "reviewer, malformed json", methods: ["POST"], body: "{", stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, no action", methods: ["POST"], body: "{}", stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, bad edge id", methods: ["POST"], body: '{"action":"purge","edgeId":"edge-1"}', stubs: () => REVIEWER },
  { ...SIGNED_IN, name: "reviewer, store down", methods: ["POST"], body: '{"action":"purge","edgeId":"00000000-0000-0000-0000-0000000000aa"}', stubs: () => REVIEWER },
];
