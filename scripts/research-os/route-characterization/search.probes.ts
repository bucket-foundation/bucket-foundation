import { SIGNED_IN, type Probe } from "../route-characterization";

const ROWS = [
  { id: "n1", slug: "force", title: "Force", kind: "concept", tier: 1, branch: "02-physics", summary: "A push or a pull.", visibility: "public", owner_id: null },
  { id: "n2", slug: "mass", title: "Mass", kind: "concept", tier: 1, branch: "02-physics", summary: "Resistance to force.", visibility: "public", owner_id: null },
];

function store(rows: unknown[] | null, error: { message: string } | null = null) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "or", "limit", "eq", "in"]) builder[m] = () => builder;
  builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error });
  return { "@/lib/research-os/db": { graphService: () => ({ from: () => builder }) } };
}

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "query, store down", query: "?q=force" },
  { ...SIGNED_IN, name: "query, anonymous results", query: "?q=force", stubs: () => store(ROWS) },
  { ...SIGNED_IN, name: "query, signed in with standing", query: "?q=force", headers: { authorization: "Bearer t" }, stubs: () => store(ROWS) },
  {
    ...SIGNED_IN,
    name: "query, signed in, consent withheld",
    query: "?q=force",
    headers: { authorization: "Bearer t" },
    consent: { allowed: false, reason: "no_profile" },
    stubs: () => store(ROWS),
  },
  {
    ...SIGNED_IN,
    name: "query, access store down",
    query: "?q=force",
    stubs: () => ({ ...store(ROWS), "@/lib/research-os/read-access": { authorizeNodes: async () => ({ ok: false, reason: "unavailable", detail: "down" }) } }),
  },
  {
    ...SIGNED_IN,
    name: "query, access throws",
    query: "?q=force",
    stubs: () => ({
      ...store(ROWS),
      "@/lib/research-os/read-access": {
        authorizeNodes: async () => {
          throw new Error("access store down");
        },
      },
    }),
  },
];
