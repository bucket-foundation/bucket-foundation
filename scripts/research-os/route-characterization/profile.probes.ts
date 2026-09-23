import { SIGNED_IN, type Probe } from "../route-characterization";

const ROW = { role: "student", birth_year_bucket: "18plus", consent_status: "not_required", updated_at: "2026-09-01T00:00:00Z" };

function store(row: unknown, error: { message: string } | null = null) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "upsert"]) builder[m] = () => builder;
  builder.maybeSingle = async () => ({ data: row, error });
  return () => ({ "@/lib/research-os/db": { graphService: () => ({ from: () => builder }), loadGame: async () => null } });
}

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "profile read", methods: ["GET"], stubs: store(ROW) },
  { ...SIGNED_IN, name: "no profile yet", methods: ["GET"], stubs: store(null) },
  { ...SIGNED_IN, name: "signed in, null body", methods: ["POST"], body: "null" },
  { ...SIGNED_IN, name: "signed in, array body", methods: ["POST"], body: "[]" },
  { ...SIGNED_IN, name: "bad role", methods: ["POST"], body: '{"role":"wizard","birthYearBucket":"18plus"}' },
  { ...SIGNED_IN, name: "valid, store down", methods: ["POST"], body: '{"role":"student","birthYearBucket":"18plus"}' },
  { ...SIGNED_IN, name: "valid, saved", methods: ["POST"], body: '{"role":"student","birthYearBucket":"18plus"}', stubs: store(ROW) },
];
