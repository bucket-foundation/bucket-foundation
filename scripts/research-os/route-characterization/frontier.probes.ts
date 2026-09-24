import { SIGNED_IN, type Probe } from "../route-characterization";

function store(answer: { data: unknown; error: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "not", "order", "update"]) builder[m] = () => builder;
  builder.then = (resolve: (v: unknown) => unknown) => resolve(answer);
  return { "@/lib/research-os/db": { graphService: () => ({ from: () => builder }) } };
}
const reviewer = { "@/lib/research-os/reviewer": { verifyGraphReviewer: async () => ({ id: "r1" }) } };
const ROWS = [
  { id: "n1", slug: "a", title: "A", kind: "concept", tier: 1, frontier_flag: "open_question" },
  { id: "n2", slug: "b", title: "B", kind: "concept", tier: 2, frontier_flag: "frontier" },
];

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "flags listed", methods: ["GET"], stubs: () => store({ data: ROWS, error: null }) },
  { ...SIGNED_IN, name: "signed in, null body", methods: ["POST"], body: "null" },
  { ...SIGNED_IN, name: "signed in, array body", methods: ["POST"], body: "[]" },
  { ...SIGNED_IN, name: "bad flag", methods: ["POST"], body: '{"nodeId":"n1","flag":"closed"}' },
  { ...SIGNED_IN, name: "not allowed", methods: ["POST"], body: '{"nodeId":"n1","flag":"frontier"}' },
  { ...SIGNED_IN, name: "class given, staff read fails", methods: ["POST"], body: '{"nodeId":"n1","flag":"frontier","classId":"c1"}' },
  { ...SIGNED_IN, name: "reviewer, write fails", methods: ["POST"], body: '{"nodeId":"n1","flag":"frontier"}', stubs: () => ({ ...reviewer, ...store({ data: null, error: { message: "down" } }) }) },
  { ...SIGNED_IN, name: "reviewer, flag written", methods: ["POST"], body: '{"nodeId":"n1","flag":null}', stubs: () => ({ ...reviewer, ...store({ data: null, error: null }) }) },
  {
    ...SIGNED_IN,
    name: "reviewer check throws",
    methods: ["POST"],
    body: '{"nodeId":"n1","flag":"frontier"}',
    stubs: () => ({
      "@/lib/research-os/reviewer": {
        verifyGraphReviewer: async () => {
          throw new Error("reviewer store down");
        },
      },
    }),
  },
];
