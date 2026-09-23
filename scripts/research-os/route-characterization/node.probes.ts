import { SIGNED_IN, type Probe } from "../route-characterization";

function store(row: unknown) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "order", "range"]) builder[m] = () => builder;
  builder.maybeSingle = async () => ({ data: row, error: null });
  return { graphService: () => ({ from: () => builder }) };
}
const ROW = { id: "n1", slug: "light", title: "Light", kind: "concept", tier: 1, branch: "02-physics", summary: null, labels: null, provenance: null, worked_example: null, visibility: "private", owner_id: "o1", frontier_flag: null, created_at: "2026-09-01T00:00:00Z" };

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "bad slug", query: "?slug=../x" },
  { ...SIGNED_IN, name: "slug given, store down", query: "?slug=light" },
  { ...SIGNED_IN, name: "slug given, missing", query: "?slug=light", stubs: () => ({ "@/lib/research-os/db": store(null) }) },
  {
    ...SIGNED_IN,
    name: "slug given, hidden",
    query: "?slug=light",
    stubs: () => ({ "@/lib/research-os/db": store(ROW), "@/lib/research-os/read-access": { authorizeVerbs: async () => ({ ok: false, reason: "denied" }) } }),
  },
  {
    ...SIGNED_IN,
    name: "slug given, access store down",
    query: "?slug=light",
    stubs: () => ({ "@/lib/research-os/db": store(ROW), "@/lib/research-os/read-access": { authorizeVerbs: async () => ({ ok: false, reason: "unavailable" }) } }),
  },
  {
    ...SIGNED_IN,
    name: "authorize throws",
    query: "?slug=light",
    stubs: () => ({
      "@/lib/research-os/db": store(ROW),
      "@/lib/research-os/read-access": {
        authorizeVerbs: async () => {
          throw new Error("access store down");
        },
      },
    }),
  },
];
