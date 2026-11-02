import { createSystem, mergeSystems, normalizeSystemsDoc, type SystemsDoc } from "../src/lib/academy/lang-systems";

let failures = 0;
function ok(c: boolean, m: string) {
  if (c) console.log("  ok  " + m);
  else {
    console.error("  FAIL " + m);
    failures++;
  }
}

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() {
    return store.size;
  },
} as Storage;
(globalThis as unknown as { setTimeout: (f: () => void) => number }).setTimeout = (f) => {
  f();
  return 0;
};

const T = Date.now() - 1_000_000;
const romance = createSystem("en", ["fr", "es", "it"], [], T);
const asian = createSystem("en", ["zh", "ja"], [], T + 10);

{
  const deviceA: SystemsDoc = { systems: [{ ...romance, placement: { fr: 4 } }], removed: {} };
  const deviceB: SystemsDoc = { systems: [{ ...romance, placement: { es: 2, fr: 2 } }, asian], removed: {} };
  const m = mergeSystems(deviceA, deviceB);
  ok(m.systems.length === 2, "systems from both devices survive");
  const r = m.systems.find((s) => s.id === romance.id)!;
  ok(r.placement.fr === 4 && r.placement.es === 2, "placement merges per language by max");
  ok(JSON.stringify(mergeSystems(deviceB, deviceA)) === JSON.stringify(m), "merge is order independent");
  ok(JSON.stringify(mergeSystems(m, m)) === JSON.stringify(m), "merge is idempotent");
}
{
  const server: SystemsDoc = { systems: [{ ...romance, placement: { fr: 99, es: 3 } }], removed: {} };
  const reset: SystemsDoc = { systems: [{ ...romance, updatedAt: T + 500, placedAt: { fr: T + 500 }, placement: { fr: 0 } }], removed: {} };
  const r = mergeSystems(server, reset).systems[0];
  ok(r.placement.fr === 0 && r.placement.es === 3, "a newer placement reset beats an older higher tier and keeps other languages");
  ok(JSON.stringify(mergeSystems(reset, server)) === JSON.stringify(mergeSystems(server, reset)), "reset merge is order independent");
  const stale: SystemsDoc = { systems: [{ ...romance, updatedAt: T + 900, placedAt: { es: T + 900, fr: T + 100 }, placement: { es: 5, fr: 7 } }], removed: {} };
  const s2 = mergeSystems(mergeSystems(server, reset), stale).systems[0];
  ok(s2.placement.fr === 0 && s2.placement.es === 5, "a stale device placing es does not carry back its old fr tier");
}
{
  const m = mergeSystems({ systems: [romance, asian], removed: {} }, { systems: [], removed: { [asian.id]: T + 20 } });
  ok(m.systems.length === 1 && m.systems[0].id === romance.id, "a removal on one device wins over a stale copy");
  const again = mergeSystems(m, { systems: [{ ...asian, createdAt: T + 30 }], removed: {} });
  ok(again.systems.some((s) => s.id === asian.id), "recreating after removal brings it back");
}
ok(normalizeSystemsDoc({ systems: [romance], updatedAt: 5 }).systems.length === 1, "old docs without tombstones still load");
ok(normalizeSystemsDoc("junk").systems.length === 0, "junk input gives an empty doc");

async function main() {
  const { saveSystems, SYSTEMS_BRANCH } = await import("../src/lib/academy/lang-client");
  const posted: SystemsDoc[] = [];
  const serverDoc: SystemsDoc = { systems: [asian], removed: {} };
  let calls = 0;
  const r = await saveSystems(
    { upsert: romance },
    {
      pull: async () => ({ [SYSTEMS_BRANCH]: { data: serverDoc, updated_at: "" } }),
      post: async (doc) => {
        calls++;
        if (calls === 1) return new Response("", { status: 500 });
        posted.push(doc);
        return new Response("{}", { status: 200 });
      },
    }
  );
  ok(r.result === "synced" && calls === 2, "a failed write retries and then syncs");
  ok(posted[0].systems.length === 2, "the write carries the server's other-device system");

  const failed = await saveSystems({ upsert: asian }, { pull: async () => ({}), post: async () => new Response("", { status: 503 }) });
  ok(failed.result === "failed", "three failed writes report failure");
  ok(failed.systems.length === 2, "local copy keeps everything after a failure");

  const signedOut = await saveSystems({ remove: asian.id }, { pull: async () => null, post: async () => new Response("", { status: 200 }) });
  ok(signedOut.result === "local-only" && signedOut.systems.length === 1, "signed out saves locally and applies the removal");

  if (failures) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\nlang systems sync: all ok");
}
void main();
