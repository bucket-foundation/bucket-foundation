import test from "node:test";
import assert from "node:assert/strict";
import { canonMarkers, fmtYear, geoMarkersFor, markerYears, markersUpTo } from "../src/lib/explore/globe-markers";
import canonSpace from "../src/data/explore/canon.space.json";
import { parseDataset } from "../src/lib/explore/space";

test("canon markers cover events and sites in year order with real coordinates", () => {
  const m = canonMarkers();
  assert.ok(m.length > 100);
  assert.ok(m.every((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng) && Math.abs(x.lat) <= 90 && Math.abs(x.lng) <= 180));
  const ys = m.map((x) => x.year as number);
  assert.deepEqual(ys, ys.slice().sort((a, b) => a - b));
  assert.ok(m.some((x) => x.kind === "archaeological-site") && m.some((x) => x.kind !== "archaeological-site"));
  assert.equal(new Set(m.map((x) => x.id)).size, m.length);
});

test("the time steps are the distinct marker years and the filter keeps earlier places", () => {
  const m = canonMarkers();
  const years = markerYears(m);
  assert.ok(years.length > 20);
  assert.deepEqual(years, years.slice().sort((a, b) => a - b));
  assert.equal(markersUpTo(m, years[years.length - 1]).length, m.length);
  const mid = years[Math.floor(years.length / 2)];
  const some = markersUpTo(m, mid);
  assert.ok(some.length > 0 && some.length < m.length);
  assert.ok(some.every((x) => (x.year as number) <= mid));
  assert.equal(markersUpTo([{ year: undefined }], -1e9).length, 1);
});

test("a data set is placed on the earth by the places its records have", () => {
  const canon = parseDataset(canonSpace);
  const geo = geoMarkersFor(canon);
  assert.ok(geo.length > 20 && geo.length < canon.obs.length);
  assert.ok(geo.every((g) => canon.obs.some((o) => o.id === g.id || `site:${g.id}` === o.id)));
  assert.deepEqual(geoMarkersFor({ obs: [{ id: "x", title: "x", scores: [], meta: {}, links: [] }] }), []);
  const own = geoMarkersFor({ obs: [{ id: "y", title: "Y", scores: [], t: 1990, meta: { lat: 10, lng: 20 }, links: [] }] });
  assert.deepEqual([own[0].lat, own[0].lng, own[0].year], [10, 20, 1990]);
});

test("years print with the era", () => {
  assert.equal(fmtYear(-570), "570 BCE");
  assert.equal(fmtYear(2020), "2020 CE");
});
