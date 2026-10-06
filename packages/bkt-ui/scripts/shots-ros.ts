import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { newDataKey } from "../../bkt/src/crypto";
import { localRoutes } from "../../bkt/src/local";
import type { Pack } from "../../bkt/src/pack/export";
import { RosGraph, rosLiveRoutes, rosNodeId, syncRosGraph } from "../../bkt/src/ros";
import { startServe } from "../../bkt/src/serve";
import { Store } from "../../bkt/src/store";

const out = resolve(import.meta.dir, "../shots/ros");
mkdirSync(out, { recursive: true });

const content = JSON.parse(readFileSync(resolve(import.meta.dir, "../../bkt/content/pack.json"), "utf8")) as Pack;
const store = new Store(":memory:", newDataKey());
store.importPack(content.version, content.items);
syncRosGraph(store.db, content.version, content.atoms ?? {});
const graph = new RosGraph(store.db);
const routes = rosLiveRoutes(graph);
const physics = (content.atoms?.["02-physics"] ?? []).slice(0, 14);
for (const a of physics) {
  const url = new URL(`http://x/local/ros/state`);
  await routes["POST /local/ros/state"](new Request(url, { method: "POST", body: JSON.stringify({ nodeId: rosNodeId("02-physics", a.id), action: "open" }) }), url);
}
store.db.query("update ros_state set stage = 'understanding' where rowid % 3 = 0").run();
const focus = physics.find((a) => (a.requires ?? []).length > 0) ?? physics[0];

const srv = startServe({ routes: { ...localRoutes(store, { content }), ...rosLiveRoutes(graph) }, uiDir: resolve(import.meta.dir, "../dist") });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && !m.text().includes("status of 404") && errors.push(m.text()));

await page.goto(srv.url);
await page.waitForSelector("nav");
await page.evaluate(() => (window.location.hash = "#/graph/02-physics"));
await page.waitForSelector('svg[role="img"]');
await page.screenshot({ path: join(out, "1-graph.png") });

await page.evaluate((slug) => (window.location.hash = `#/node/${encodeURIComponent(slug)}`), rosNodeId("02-physics", focus.id));
await page.waitForSelector(".ros-grid");
await page.screenshot({ path: join(out, "2-node.png"), fullPage: true });

await page.evaluate(() => (window.location.hash = "#/progress"));
await page.waitForTimeout(800);
await page.screenshot({ path: join(out, "3-progress.png"), fullPage: true });

await page.evaluate(() => (window.location.hash = "#/profile"));
await page.waitForSelector(".ros-form");
await page.screenshot({ path: join(out, "4-profile.png") });

await browser.close();
srv.stop();
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`shots in ${out}`);
