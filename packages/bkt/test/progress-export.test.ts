import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newDataKey } from "../src/crypto";
import { saveTextToDownloads } from "../src/downloads";
import { localRoutes } from "../src/local";
import { Store } from "../src/store";
import { normalizeState } from "../../../src/lib/academy/engine";

let dir: string;
let store: Store;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-progress-"));
  store = new Store(":memory:", newDataKey());
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

const post = (routes: ReturnType<typeof localRoutes>) => routes["POST /local/progress/export"](new Request("http://x/local/progress/export", { method: "POST", body: "{}" }), new URL("http://x/local/progress/export"));

test("progress export writes every studied branch to the downloads folder without overwriting", async () => {
  const routes = localRoutes(store, { now: () => Date.UTC(2026, 9, 19), saveExport: saveTextToDownloads(() => dir) });
  const state = normalizeState(null);
  state.stats.xp = 42;
  await routes["POST /local/progress"](new Request("http://x/local/progress", { method: "POST", body: JSON.stringify({ branch: "phys", data: state }) }), new URL("http://x/local/progress"));
  const first = (await (await post(routes)).json()) as { name: string; folder: string };
  const second = (await (await post(routes)).json()) as { name: string; folder: string };
  expect(first).toEqual({ name: "bucket-progress-2026-10-19.json", folder: dir });
  expect(second.name).toBe("bucket-progress-2026-10-19 (2).json");
  const saved = JSON.parse(readFileSync(join(dir, first.name), "utf8")) as { branches: Record<string, { data: { stats: { xp: number } } }> };
  expect(saved.branches.phys.data.stats.xp).toBe(42);
  expect(statSync(join(dir, first.name)).mode & 0o777).toBe(0o600);
});

test("without a save target the export route says it is unavailable", async () => {
  expect((await post(localRoutes(store))).status).toBe(501);
});
