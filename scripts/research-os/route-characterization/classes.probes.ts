import { SIGNED_IN, type Probe } from "../route-characterization";

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "signed in, null body", methods: ["POST"], body: "null" },
  { ...SIGNED_IN, name: "signed in, array body", methods: ["POST"], body: "[]" },
  { ...SIGNED_IN, name: "create, store down", methods: ["POST"], body: '{"action":"create","name":"Physics 1"}' },
  { ...SIGNED_IN, name: "create, bad name", methods: ["POST"], body: '{"action":"create","name":""}' },
  { ...SIGNED_IN, name: "join, store down", methods: ["POST"], body: '{"action":"join","code":"ABC123"}' },
  { ...SIGNED_IN, name: "join, bad code", methods: ["POST"], body: '{"action":"join","code":""}' },
  {
    ...SIGNED_IN,
    name: "classes listed",
    methods: ["GET"],
    stubs: () => ({ "@/lib/research-os/classes": { listMyClasses: async () => [{ id: "c1", name: "Physics 1" }] } }),
  },
  {
    ...SIGNED_IN,
    name: "create throws",
    methods: ["POST"],
    body: '{"action":"create","name":"Physics 1"}',
    stubs: () => ({
      "@/lib/research-os/classes": {
        createClass: async () => {
          throw new Error("class store down");
        },
      },
    }),
  },
];
