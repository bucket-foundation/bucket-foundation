import test from "node:test";
import assert from "node:assert/strict";
import { SLOT_STYLE, WIDGET_SLOTS, groupBySlot, initialCollapsed, toggleCollapsed, type WidgetDef } from "../src/lib/explore/widgets";

const defs: WidgetDef[] = [
  { id: "search", slot: "top", title: "Search" },
  { id: "view", slot: "left", title: "View", collapsible: true },
  { id: "data", slot: "left", title: "Data", collapsible: true, defaultCollapsed: true, order: -1 },
  { id: "scrubber", slot: "bottom", title: "Scrubber" },
];

test("widgets group by slot and sort by order then declaration", () => {
  const g = groupBySlot(defs);
  assert.deepEqual(g.top.map((w) => w.id), ["search"]);
  assert.deepEqual(g.left.map((w) => w.id), ["data", "view"]);
  assert.deepEqual(g.bottom.map((w) => w.id), ["scrubber"]);
  assert.deepEqual(g.right, []);
});

test("every slot has a placement and they do not share a grid cell", () => {
  const cells = WIDGET_SLOTS.map((s) => `${SLOT_STYLE[s].gridColumn}|${SLOT_STYLE[s].gridRow}`);
  assert.equal(new Set(cells).size, WIDGET_SLOTS.length);
});

test("default collapsed widgets start shut and only collapsible widgets toggle", () => {
  const start = initialCollapsed(defs);
  assert.deepEqual(Array.from(start), ["data"]);
  const opened = toggleCollapsed(start, "data", defs);
  assert.equal(opened.has("data"), false);
  const shut = toggleCollapsed(opened, "view", defs);
  assert.equal(shut.has("view"), true);
  assert.equal(toggleCollapsed(shut, "search", defs), shut);
  assert.equal(toggleCollapsed(shut, "missing", defs), shut);
  assert.equal(start.has("data"), true);
});

import { FOCUSABLE, trapIndex } from "../src/lib/explore/focus";

test("the focus trap wraps at both ends", () => {
  assert.equal(trapIndex(0, 5, false), 1);
  assert.equal(trapIndex(4, 5, false), 0);
  assert.equal(trapIndex(0, 5, true), 4);
  assert.equal(trapIndex(3, 5, true), 2);
  assert.equal(trapIndex(-1, 5, false), 0);
  assert.equal(trapIndex(-1, 5, true), 4);
  assert.equal(trapIndex(9, 5, false), 0);
  assert.equal(trapIndex(0, 0, false), -1);
  assert.ok(FOCUSABLE.includes("button") && FOCUSABLE.includes('[role="slider"]'));
});
