import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_TARGETS, PRESETS } from "@academy/lang-systems";
import { appHref, levelText, nextToPlace, presetsFor, ROOT_CHOICES, targetChoices, toggleTarget } from "./systems";

const sys = (placement: Record<string, number>, levels?: Record<string, string>) => ({ id: "en-es-fr", name: "x", root: "en", targets: ["es", "fr"], createdAt: 0, placement, levels });

test("toggleTarget adds, removes, skips the root and caps at MAX_TARGETS", () => {
  assert.deepEqual(toggleTarget([], "es", "en"), ["es"]);
  assert.deepEqual(toggleTarget(["es"], "es", "en"), []);
  assert.deepEqual(toggleTarget([], "en", "en"), []);
  const full = ROOT_CHOICES.map((c) => c.code).filter((c) => c !== "en").slice(0, MAX_TARGETS);
  assert.deepEqual(toggleTarget(full, "zz", "en"), full);
});

test("presetsFor drops presets holding the root and duplicates", () => {
  const en = presetsFor("en");
  assert.ok(en.length >= PRESETS.length);
  assert.equal(new Set(en.map((p) => [...p.targets].sort().join())).size, en.length);
  assert.ok(presetsFor("es").every((p) => !p.targets.includes("es")));
});

test("targetChoices leaves out the root", () => {
  assert.ok(!targetChoices("fr").some((c) => c.code === "fr"));
});

test("nextToPlace and levelText follow placement", () => {
  assert.equal(nextToPlace(sys({})), "es");
  assert.equal(nextToPlace(sys({ es: 2 })), "fr");
  assert.equal(nextToPlace(sys({ es: 2, fr: 0 })), null);
  assert.equal(levelText(sys({ es: 2 }, { es: "A2" }), "es"), "A2");
  assert.equal(levelText(sys({ es: 2 }), "es"), "Placed");
  assert.equal(levelText(sys({}), "fr"), "Not placed");
});

test("appHref encodes system ids", () => {
  assert.equal(appHref.place("en-es", "es"), "/app/en-es/place?lang=es");
  assert.equal(appHref.study("a b"), "/app/a%20b/study");
});
