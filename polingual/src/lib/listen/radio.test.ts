import { test } from "node:test";
import assert from "node:assert/strict";
import { filterStations, radioName, radioStations, type RadioStation } from "./radio";

const st = (name: string, votes = 20, url = "https://x.example/stream"): RadioStation => ({ stationuuid: name, name, url_resolved: url, country: "Spain", countrycode: "ES", tags: "news", favicon: "", votes });

test("radio names follow the apps", () => {
  assert.equal(radioName("es"), "spanish");
  assert.equal(radioName("zh"), "chinese");
  assert.equal(radioName("grc"), null);
});

test("stations need an https stream, ten votes and a unique name", () => {
  const out = filterStations([st(" Uno "), st("uno"), st("Dos", 3), st("Tres", 50, "http://plain"), st("Cuatro")], 10);
  assert.deepEqual(out.map((s) => s.name), ["Uno", "Cuatro"]);
});

test("stations fall through dead hosts", async () => {
  const seen: string[] = [];
  const f = (async (u: string) => {
    seen.push(u);
    if (u.includes("all.api")) return new Response(JSON.stringify([{ name: "a1.api.radio-browser.info" }]));
    if (u.includes("a1.api")) return new Response("", { status: 502 });
    return new Response(JSON.stringify([st("Radio Uno")]));
  }) as unknown as typeof fetch;
  const out = await radioStations("es", f);
  assert.equal(out[0].name, "Radio Uno");
  assert.ok(seen.some((u) => u.includes("language=spanish")));
});
