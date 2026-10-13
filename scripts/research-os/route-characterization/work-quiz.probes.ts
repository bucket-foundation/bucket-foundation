import { SIGNED_IN, type Probe } from "../route-characterization";

const STAFF = () => ({ "@/lib/research-os/staff": { isStaff: async () => true } });

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "staff, malformed json", methods: ["PUT"], body: "{", stubs: STAFF },
  { ...SIGNED_IN, name: "staff, store down", methods: ["PUT"], body: '{"languages":["la"]}', stubs: STAFF },
];
