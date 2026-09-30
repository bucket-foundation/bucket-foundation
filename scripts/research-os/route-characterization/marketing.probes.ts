import { SIGNED_IN, type Probe } from "../route-characterization";

const KEYS = { active: "k1", keys: {} };
const FILE = { filename: "sales.csv", media_type: "text/csv", bytes: 10, sha256: "a".repeat(64), storage_path: "p/sales.csv" };

const graph = { "@/lib/research-os/db": { graphService: () => ({}) } };
const sealKeys = (value: unknown) => ({ "@/lib/research-os/marketing/seal": { parseSealKeys: () => value } });
const store = (extra: Record<string, unknown> = {}) => ({
  "@/lib/research-os/marketing/store": {
    createMarketingImport: async () => "import-1",
    marketingImport: async () => ({ id: "import-1", title: "Q3" }),
    findReport: async () => null,
    deleteMarketingImport: async () => ({ ok: true, files: 2, objectsRemoved: 2 }),
    analyzerVersion: () => "v1",
    removerFrom: () => ({}),
    ...extra,
  },
});
const files = (rows: unknown[]) => ({ "@/lib/research-os/import-upload": { listImportFiles: async () => rows, pathConflict: async () => null } });
const stubs = (...parts: Record<string, Record<string, unknown>>[]) => () => Object.assign({}, graph, ...parts);

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "create", methods: ["POST"], body: '{"action":"create","title":"Q3"}', stubs: stubs(store()) },
  { ...SIGNED_IN, name: "create, blank title", methods: ["POST"], body: '{"action":"create","title":"  "}', stubs: stubs(store()) },
  { ...SIGNED_IN, name: "create, store down", methods: ["POST"], body: '{"action":"create","title":"Q3"}', stubs: stubs(store({ createMarketingImport: async () => { throw new Error("db down"); } })) },
  { ...SIGNED_IN, name: "null body", methods: ["POST"], body: "null", stubs: stubs(store()) },
  { ...SIGNED_IN, name: "unknown action", methods: ["POST"], body: '{"action":"purge"}', stubs: stubs(store()) },
  { ...SIGNED_IN, name: "analyze, no import id", methods: ["POST"], body: '{"action":"analyze"}', stubs: stubs(store()) },
  { ...SIGNED_IN, name: "analyze, no seal key", methods: ["POST"], body: '{"action":"analyze","importId":"import-1"}', stubs: stubs(store(), sealKeys(null)) },
  { ...SIGNED_IN, name: "analyze, import missing", methods: ["POST"], body: '{"action":"analyze","importId":"import-1"}', stubs: stubs(store({ marketingImport: async () => null }), sealKeys(KEYS)) },
  { ...SIGNED_IN, name: "analyze, no files", methods: ["POST"], body: '{"action":"analyze","importId":"import-1"}', stubs: stubs(store(), files([]), sealKeys(KEYS)) },
  { ...SIGNED_IN, name: "analyze, unsupported type", methods: ["POST"], body: '{"action":"analyze","importId":"import-1"}', stubs: stubs(store(), files([{ ...FILE, filename: "a.exe", media_type: "application/octet-stream" }]), sealKeys(KEYS)) },
  { ...SIGNED_IN, name: "analyze, file too large", methods: ["POST"], body: '{"action":"analyze","importId":"import-1"}', stubs: stubs(store(), files([{ ...FILE, bytes: 1_000_000_000 }]), sealKeys(KEYS)) },
  { ...SIGNED_IN, name: "analyze, path shared", methods: ["POST"], body: '{"action":"analyze","importId":"import-1"}', stubs: stubs(store(), { "@/lib/research-os/import-upload": { listImportFiles: async () => [FILE], pathConflict: async () => "path_shared" } }, sealKeys(KEYS)) },
  { ...SIGNED_IN, name: "analyze, store down", methods: ["POST"], body: '{"action":"analyze","importId":"import-1"}', stubs: stubs(store({ marketingImport: async () => { throw new Error("db down"); } }), sealKeys(KEYS)) },
  { ...SIGNED_IN, name: "get, no import param", methods: ["GET"], stubs: stubs(store()) },
  { ...SIGNED_IN, name: "get, no seal key", methods: ["GET"], query: "?import=import-1", stubs: stubs(store(), sealKeys(null)) },
  { ...SIGNED_IN, name: "get, import missing", methods: ["GET"], query: "?import=import-1", stubs: stubs(store({ marketingImport: async () => null }), sealKeys(KEYS)) },
  { ...SIGNED_IN, name: "get, no report", methods: ["GET"], query: "?import=import-1", stubs: stubs(store(), sealKeys(KEYS)) },
  { ...SIGNED_IN, name: "delete, no import param", methods: ["DELETE"], stubs: stubs(store()) },
  { ...SIGNED_IN, name: "delete, import missing", methods: ["DELETE"], query: "?import=import-1", stubs: stubs(store({ marketingImport: async () => null })) },
  { ...SIGNED_IN, name: "delete", methods: ["DELETE"], query: "?import=import-1", stubs: stubs(store()) },
  { ...SIGNED_IN, name: "delete, storage failed", methods: ["DELETE"], query: "?import=import-1", stubs: stubs(store({ deleteMarketingImport: async () => ({ ok: false, error: "storage_failed", detail: "x" }) })) },
  { ...SIGNED_IN, name: "delete, write failed", methods: ["DELETE"], query: "?import=import-1", stubs: stubs(store({ deleteMarketingImport: async () => ({ ok: false, error: "write_failed", detail: "x" }) })) },
];
