import test from "node:test";
import assert from "node:assert/strict";
import { onsetStress, swedishSj } from "./fix-ipa-stress.mjs";

test("stress moves to the start of the syllable", () => {
  assert.equal(onsetStress("nˈumeɾo"), "ˈnumeɾo");
  assert.equal(onsetStress("naːtˈyrlək"), "naːˈtyrlək");
  assert.equal(onsetStress("ˌaɪnən moːmˈɛnt bˈɪtə"), "ˌaɪnən moːˈmɛnt ˈbɪtə");
  assert.equal(onsetStress("θˌamaːnˈiːat"), "ˌθamaːˈniːat");
  assert.equal(onsetStress("vˈosʲimʲ"), "ˈvosʲimʲ");
});

test("consonant clusters split at a legal onset", () => {
  assert.equal(onsetStress("kɔntrˈoːl"), "kɔnˈtroːl");
  assert.equal(onsetStress("ɛmbˈɑːl"), "ɛmˈbɑːl");
  assert.equal(onsetStress("rɛstrˈɪŋ"), "rɛˈstrɪŋ");
  assert.equal(onsetStress("mutʃˈatʃo"), "muˈtʃatʃo");
});

test("correct stress stays where it is", () => {
  assert.equal(onsetStress("ˈnumeɾo"), "ˈnumeɾo");
  assert.equal(onsetStress("aˈtʃa"), "aˈtʃa");
  assert.equal(onsetStress("ˈaxt"), "ˈaxt");
});

test("Swedish sj sound uses its own symbol", () => {
  assert.equal(onsetStress(swedishSj("sxˈɛlvklɑːt")), "ˈɧɛlvklɑːt");
  assert.equal(onsetStress(swedishSj("kˈansxə")), "ˈkanɧə");
});
