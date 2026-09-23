import test from "node:test";
import assert from "node:assert/strict";
import { Linker, terms } from "../src/lib/research-os/ingest/link";

test("terms drop stopwords and short tokens and fold simple plurals", () => {
  assert.deepEqual(terms("The Rayleigh scattering law: waves and particles"), ["rayleigh", "scattering", "wave", "particle"]);
});

test("a claim links to the atom that names the same things, within its branch", () => {
  const l = new Linker([
    { id: "a", text: "Rayleigh scattering law. Scattering strength goes as the inverse fourth power of wavelength.", branch: "02-physics" },
    { id: "b", text: "Sets and functions. A set is a collection; a function assigns outputs.", branch: "01-mathematics" },
    { id: "c", text: "Waves have wavelength and frequency. A wave repeats in space and time.", branch: "02-physics" },
  ]);
  const hits = l.link("Blue light scatters more than red because scattering rises steeply as wavelength falls", { branch: "02-physics" });
  assert.equal(hits[0].id, "a");
  assert.ok(hits[0].shared.includes("scattering"));
  assert.deepEqual(l.link("A set is a collection of objects", { branch: "02-physics" }), []);
  assert.equal(l.link("A set is a collection of objects")[0]?.id, "b");
});
