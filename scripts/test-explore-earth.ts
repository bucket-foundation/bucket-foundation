import { readFileSync } from "fs";
import path from "path";
import { loadLandmask } from "../src/components/canon-globe/landmaskFromImage";
import { modeById } from "../src/lib/explore/modes";
import { GLOBE_RADIUS } from "../src/lib/explore/modes/globe";
import { earthMode, landPoints, onLand, placeOf } from "../src/lib/explore/modes/earth";
import { ALL_EVENTS } from "../src/lib/canon-explorer/markers";
import type { Hit } from "../src/lib/explore/search";
import { SAMPLE_HITS } from "./lib/explore-hits";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

async function main() {
  const publicDir = path.join(process.cwd(), "public");
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    const buf = readFileSync(path.join(publicDir, url));
    return { ok: true, json: async () => JSON.parse(buf.toString("utf-8")), arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
  }) as unknown as typeof fetch;
  const land = await loadLandmask("/textures/earth/landmask-2k.bin");
  globalThis.fetch = original;

  const ctx = { selected: null, scroll: 0, landmask: land };
  const base = SAMPLE_HITS[3];
  const paris: Hit = { ...base, id: "advisor:p", title: "A researcher in France", text: "worked in France on coherence" };
  const ocean: Hit = { ...base, id: "advisor:o", title: "Somewhere", text: "no place named" };
  const real = ALL_EVENTS[0];
  const eventHit: Hit = { ...SAMPLE_HITS[0], id: `excerpt:${real.branch}/${real.id}/r`, title: "excerpt", branch: real.branch };

  check("land mask loads the 2k bin", land.width === 2048 && land.height === 1024);
  check("the mask separates land from sea", land.isLand(48.8, 2.3) && !land.isLand(0, -30));
  check("an excerpt places at its timeline event", placeOf(eventHit)?.lat === real.lat);
  check("a country name in the text places a hit", placeOf(paris)?.name === "France");
  check("a hit with no place has none", placeOf(ocean) === null);
  check("a place off the mask is dropped", !onLand({ lat: 0, lng: -30, name: "sea" }, land) && onLand({ lat: 0, lng: -30, name: "sea" }, null));

  const layout = earthMode.layout([paris, ocean, eventHit], ctx);
  const ids = layout.nodes.map((n) => n.id);
  check("only placed hits become nodes", ids.includes("advisor:p") && !ids.includes("advisor:o"));
  check("nodes sit on the globe radius", layout.nodes.every((n) => Math.abs(Math.hypot(...n.position) - GLOBE_RADIUS) < 1e-6));
  check("land dots ride the guides", layout.guides.some((g) => g.kind === "points" && g.points.length > 300));
  check("land dots avoid the sea", landPoints(land).length > 300);

  const many: Hit[] = Array.from({ length: 5 }, (_, i) => ({ ...paris, id: `advisor:m${i}` }));
  const spread = earthMode.layout(many, ctx).nodes.map((n) => n.position.join(","));
  check("hits in one place spread apart", new Set(spread).size === many.length);

  const noMask = earthMode.layout([paris, ocean], { selected: null, scroll: 0 });
  check("layout works before the mask loads", noMask.nodes.length === 1 && noMask.guides.every((g) => g.kind !== "points"));
  check("earth registers as a mode", modeById("earth").id === "earth");
  check("earth handles no hits", earthMode.layout([], ctx).nodes.length === 0);

  if (failed) {
    console.error(`${failed} failed`);
    process.exit(1);
  }
  console.log("all passed");
}

main();
