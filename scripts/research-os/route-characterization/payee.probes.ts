import { SIGNED_IN, type Probe } from "../route-characterization";

function store(profile: unknown, updateError: { message: string } | null = null) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "update"]) builder[m] = () => builder;
  builder.maybeSingle = async () => ({ data: profile, error: null });
  builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: null, error: updateError });
  return () => ({ "@/lib/research-os/db": { graphService: () => ({ from: () => builder }) } });
}
function rereadFails(profile: unknown) {
  let reads = 0;
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "update"]) builder[m] = () => builder;
  builder.maybeSingle = async () => (reads++ === 0 ? { data: profile, error: null } : { data: null, error: { message: "down" } });
  builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null });
  return () => ({ "@/lib/research-os/db": { graphService: () => ({ from: () => builder }) } });
}
const PROFILE = { birth_year_bucket: "1990s", payee_type: "self", guardian_contact_hash: null, payee_visibility: true };

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "profile read", methods: ["GET"], stubs: store(PROFILE) },
  { ...SIGNED_IN, name: "signed in, null body", methods: ["POST"], body: "null" },
  { ...SIGNED_IN, name: "signed in, array body", methods: ["POST"], body: "[]" },
  { ...SIGNED_IN, name: "self, profile read fails", methods: ["POST"], body: '{"payeeType":"self"}' },
  { ...SIGNED_IN, name: "self, saved", methods: ["POST"], body: '{"payeeType":"self","visibility":false}', stubs: store(PROFILE) },
  { ...SIGNED_IN, name: "self, write fails", methods: ["POST"], body: '{"payeeType":"self"}', stubs: store(PROFILE, { message: "down" }) },
  { ...SIGNED_IN, name: "self, profile missing", methods: ["POST"], body: '{"payeeType":"self"}', stubs: store(null) },
  { ...SIGNED_IN, name: "no profile yet", methods: ["GET"], stubs: store(null) },
  { ...SIGNED_IN, name: "self, saved, reread fails", methods: ["POST"], body: '{"payeeType":"self"}', stubs: rereadFails(PROFILE) },
];
